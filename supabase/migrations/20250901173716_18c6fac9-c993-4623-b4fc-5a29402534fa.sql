-- Drop the vulnerable view and replace with admin-only RPC access
DROP VIEW IF EXISTS public.admin_metrics;

-- Create a secure function that replaces the view functionality
CREATE OR REPLACE FUNCTION public.get_admin_metrics()
RETURNS TABLE(
  total_users bigint,
  total_admins bigint,
  active_subscriptions bigint,
  active_trials bigint,
  total_monthly_revenue_cents bigint,
  revenue_growth_percentage numeric,
  subscription_growth_percentage numeric,
  average_ticket_cents bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH payment_data AS (
    SELECT s.email,
           s.subscribed,
           s.subscription_tier,
           s.subscription_end,
           s.trial_start,
           s.trial_end,
           s.updated_at,
           CASE
               WHEN s.subscription_tier = 'Basic' THEN 999
               WHEN s.subscription_tier = 'Premium' THEN 2999
               WHEN s.subscription_tier = 'Enterprise' THEN 9999
               ELSE 0
           END AS monthly_revenue_cents
    FROM subscribers s
    WHERE s.subscribed = true
  ), period_comparison AS (
    SELECT count(*) FILTER (WHERE payment_data.updated_at >= (CURRENT_DATE - interval '30 days')) AS current_subs,
           count(*) FILTER (WHERE payment_data.updated_at >= (CURRENT_DATE - interval '60 days') 
                                AND payment_data.updated_at < (CURRENT_DATE - interval '30 days')) AS previous_subs,
           COALESCE(sum(payment_data.monthly_revenue_cents) FILTER (WHERE payment_data.updated_at >= (CURRENT_DATE - interval '30 days')), 0) AS current_revenue,
           COALESCE(sum(payment_data.monthly_revenue_cents) FILTER (WHERE payment_data.updated_at >= (CURRENT_DATE - interval '60 days') 
                                                                          AND payment_data.updated_at < (CURRENT_DATE - interval '30 days')), 0) AS previous_revenue
    FROM payment_data
  )
  SELECT
    -- Only return data if user is admin, otherwise access is denied by function-level security
    (SELECT count(*) FROM profiles)::bigint as total_users,
    (SELECT count(*) FROM user_roles WHERE role = 'admin')::bigint as total_admins,
    (SELECT count(*) FROM subscribers WHERE subscribed = true)::bigint as active_subscriptions,
    (SELECT count(*) FROM subscribers WHERE subscribed = false AND trial_end > CURRENT_TIMESTAMP)::bigint as active_trials,
    COALESCE((SELECT sum(monthly_revenue_cents) FROM payment_data), 0)::bigint as total_monthly_revenue_cents,
    CASE 
      WHEN pc.previous_subs > 0 THEN trunc(((pc.current_subs::numeric - pc.previous_subs::numeric) / pc.previous_subs::numeric) * 100, 1)
      ELSE 0::numeric
    END as subscription_growth_percentage,
    CASE 
      WHEN pc.previous_revenue > 0 THEN trunc(((pc.current_revenue::numeric - pc.previous_revenue::numeric) / pc.previous_revenue::numeric) * 100, 1)
      ELSE 0::numeric
    END as revenue_growth_percentage,
    CASE 
      WHEN (SELECT count(*) FROM payment_data) > 0 THEN ((SELECT sum(monthly_revenue_cents) FROM payment_data) / (SELECT count(*) FROM payment_data))::bigint
      ELSE 0::bigint
    END as average_ticket_cents
  FROM period_comparison pc
  WHERE has_role(auth.uid(), 'admin'::app_role);
$$;