-- Drop the current admin_metrics view
DROP VIEW IF EXISTS public.admin_metrics;

-- Create a simpler view without security definer issues
-- Instead, the security is handled in the get_admin_metrics() function
CREATE VIEW public.admin_metrics
SECURITY INVOKER
AS
WITH payment_data AS (
  SELECT s.email,
    s.subscribed,
    s.subscription_tier,
    s.subscription_end,
    s.trial_start,
    s.trial_end,
    s.updated_at,
    CASE
      WHEN (s.subscription_tier = 'Basic'::text) THEN 999
      WHEN (s.subscription_tier = 'Premium'::text) THEN 2999
      WHEN (s.subscription_tier = 'Enterprise'::text) THEN 9999
      ELSE 0
    END AS monthly_revenue_cents
  FROM subscribers s
  WHERE (s.subscribed = true)
), period_comparison AS (
  SELECT count(*) FILTER (WHERE (payment_data.updated_at >= (CURRENT_DATE - '30 days'::interval))) AS current_subs,
    count(*) FILTER (WHERE ((payment_data.updated_at >= (CURRENT_DATE - '60 days'::interval)) AND (payment_data.updated_at < (CURRENT_DATE - '30 days'::interval)))) AS previous_subs,
    COALESCE(sum(payment_data.monthly_revenue_cents) FILTER (WHERE (payment_data.updated_at >= (CURRENT_DATE - '30 days'::interval))), (0)::bigint) AS current_revenue,
    COALESCE(sum(payment_data.monthly_revenue_cents) FILTER (WHERE ((payment_data.updated_at >= (CURRENT_DATE - '60 days'::interval)) AND (payment_data.updated_at < (CURRENT_DATE - '30 days'::interval)))), (0)::bigint) AS previous_revenue
  FROM payment_data
)
SELECT 
  -- Only return data for admin users, null for everyone else
  CASE 
    WHEN has_role(auth.uid(), 'admin'::app_role) THEN (SELECT count(*) FROM profiles)
    ELSE null
  END AS total_users,
  CASE 
    WHEN has_role(auth.uid(), 'admin'::app_role) THEN (SELECT count(*) FROM user_roles WHERE role = 'admin'::app_role)
    ELSE null
  END AS total_admins,
  CASE 
    WHEN has_role(auth.uid(), 'admin'::app_role) THEN (SELECT count(*) FROM subscribers WHERE subscribed = true)
    ELSE null
  END AS active_subscriptions,
  CASE 
    WHEN has_role(auth.uid(), 'admin'::app_role) THEN (SELECT count(*) FROM subscribers WHERE subscribed = false AND trial_end > CURRENT_TIMESTAMP)
    ELSE null
  END AS active_trials,
  CASE 
    WHEN has_role(auth.uid(), 'admin'::app_role) THEN COALESCE((SELECT sum(monthly_revenue_cents) FROM payment_data), 0::bigint)
    ELSE null
  END AS total_monthly_revenue_cents,
  CASE 
    WHEN has_role(auth.uid(), 'admin'::app_role) THEN 
      CASE
        WHEN pc.previous_subs > 0 THEN trunc((((pc.current_subs::numeric - pc.previous_subs::numeric) / pc.previous_subs::numeric) * 100::numeric), 1)
        ELSE 0::numeric
      END
    ELSE null
  END AS subscription_growth_percentage,
  CASE 
    WHEN has_role(auth.uid(), 'admin'::app_role) THEN 
      CASE
        WHEN pc.previous_revenue > 0 THEN trunc((((pc.current_revenue::numeric - pc.previous_revenue::numeric) / pc.previous_revenue::numeric) * 100::numeric), 1)
        ELSE 0::numeric
      END
    ELSE null
  END AS revenue_growth_percentage,
  CASE 
    WHEN has_role(auth.uid(), 'admin'::app_role) THEN 
      CASE
        WHEN (SELECT count(*) FROM payment_data) > 0 THEN ((SELECT sum(monthly_revenue_cents) FROM payment_data) / (SELECT count(*) FROM payment_data))
        ELSE 0::bigint
      END
    ELSE null
  END AS average_ticket_cents
FROM period_comparison pc;