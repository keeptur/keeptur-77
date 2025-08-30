-- Fix admin_metrics security issue by adding admin-only access control
-- Since views don't support RLS directly, we'll use a security definer function approach

-- First, revoke public access to the admin_metrics view
REVOKE ALL ON admin_metrics FROM PUBLIC;
REVOKE ALL ON admin_metrics FROM authenticated;
REVOKE ALL ON admin_metrics FROM anon;

-- Grant access only to admins through a security definer function
-- Create a secure function that wraps admin_metrics access
CREATE OR REPLACE FUNCTION public.get_admin_metrics()
RETURNS TABLE (
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
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  -- Only return data if user is an admin
  SELECT 
    am.total_users,
    am.total_admins,
    am.active_subscriptions,
    am.active_trials,
    am.total_monthly_revenue_cents,
    am.revenue_growth_percentage,
    am.subscription_growth_percentage,
    am.average_ticket_cents
  FROM admin_metrics am
  WHERE has_role(auth.uid(), 'admin'::app_role);
$$;

-- Grant execute permission to authenticated users (function will handle authorization)
GRANT EXECUTE ON FUNCTION public.get_admin_metrics() TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION public.get_admin_metrics() IS 'Secure access to admin metrics - only returns data for admin users';