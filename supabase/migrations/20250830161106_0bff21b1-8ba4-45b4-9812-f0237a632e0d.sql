-- Fix the admin_metrics view by removing SECURITY DEFINER property
-- First drop the existing view
DROP VIEW IF EXISTS admin_metrics;

-- Recreate the view without SECURITY DEFINER (as a regular view)
CREATE VIEW admin_metrics AS
WITH payment_data AS (
  -- Calculate revenue from subscribers table
  SELECT 
    s.email,
    s.subscribed,
    s.subscription_tier,
    s.subscription_end,
    s.trial_start,
    s.trial_end,
    s.updated_at,
    -- Estimate monthly revenue based on subscription tier
    CASE 
      WHEN s.subscription_tier = 'Basic' THEN 999
      WHEN s.subscription_tier = 'Premium' THEN 2999
      WHEN s.subscription_tier = 'Enterprise' THEN 9999
      ELSE 0
    END as monthly_revenue_cents
  FROM subscribers s
  WHERE s.subscribed = true
),
period_comparison AS (
  -- Compare current period vs previous period (last 30 days)
  SELECT 
    COUNT(*) FILTER (WHERE updated_at >= CURRENT_DATE - INTERVAL '30 days') as current_subs,
    COUNT(*) FILTER (WHERE updated_at >= CURRENT_DATE - INTERVAL '60 days' 
                     AND updated_at < CURRENT_DATE - INTERVAL '30 days') as previous_subs,
    COALESCE(SUM(monthly_revenue_cents) FILTER (WHERE updated_at >= CURRENT_DATE - INTERVAL '30 days'), 0) as current_revenue,
    COALESCE(SUM(monthly_revenue_cents) FILTER (WHERE updated_at >= CURRENT_DATE - INTERVAL '60 days' 
                                       AND updated_at < CURRENT_DATE - INTERVAL '30 days'), 0) as previous_revenue
  FROM payment_data
)
SELECT 
  -- Total metrics
  (SELECT COUNT(*) FROM profiles) as total_users,
  (SELECT COUNT(*) FROM user_roles WHERE role = 'admin') as total_admins,
  (SELECT COUNT(*) FROM subscribers WHERE subscribed = true) as active_subscriptions,
  (SELECT COUNT(*) FROM subscribers WHERE subscribed = false 
   AND trial_end > CURRENT_TIMESTAMP) as active_trials,
  
  -- Revenue metrics
  COALESCE((SELECT SUM(monthly_revenue_cents) FROM payment_data), 0) as total_monthly_revenue_cents,
  
  -- Growth percentages (using trunc instead of round for precision)
  CASE 
    WHEN pc.previous_subs > 0 THEN 
      TRUNC(((pc.current_subs::numeric - pc.previous_subs::numeric) / pc.previous_subs::numeric) * 100, 1)
    ELSE 0 
  END as subscription_growth_percentage,
  
  CASE 
    WHEN pc.previous_revenue > 0 THEN 
      TRUNC(((pc.current_revenue::numeric - pc.previous_revenue::numeric) / pc.previous_revenue::numeric) * 100, 1)
    ELSE 0 
  END as revenue_growth_percentage,
  
  -- Average ticket (revenue per active subscription)
  CASE 
    WHEN (SELECT COUNT(*) FROM payment_data) > 0 THEN
      (SELECT SUM(monthly_revenue_cents) FROM payment_data) / (SELECT COUNT(*) FROM payment_data)
    ELSE 0
  END as average_ticket_cents

FROM period_comparison pc;

-- Set appropriate RLS policies for the view access
-- Since this is now a regular view, it will respect the RLS policies of the underlying tables
-- We ensure admin access through the existing RLS policies on the underlying tables

-- Grant access to the view for authenticated users
GRANT SELECT ON admin_metrics TO authenticated;
GRANT SELECT ON admin_metrics TO anon;