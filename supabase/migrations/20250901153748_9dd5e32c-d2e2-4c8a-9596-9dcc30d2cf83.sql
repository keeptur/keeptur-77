-- Secure admin_metrics view by revoking direct access and enforcing RPC-only access
-- 1) Revoke all privileges on the view from PUBLIC, anon and authenticated
REVOKE ALL ON public.admin_metrics FROM PUBLIC;
REVOKE ALL ON public.admin_metrics FROM anon;
REVOKE ALL ON public.admin_metrics FROM authenticated;

-- 2) Add security barrier to the view for safer evaluation
ALTER VIEW public.admin_metrics SET (security_barrier = on);

-- 3) Recreate get_admin_metrics to ensure admin-only access via RPC (idempotent)
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
  FROM public.admin_metrics am
  WHERE has_role(auth.uid(), 'admin'::app_role);
$$;
