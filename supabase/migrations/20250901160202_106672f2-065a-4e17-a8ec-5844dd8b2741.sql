-- Ensure admin_metrics is protected by RLS if it's a TABLE (not a view)
DO $$
DECLARE
  relkind char;
BEGIN
  SELECT c.relkind
    INTO relkind
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname = 'admin_metrics';

  -- If it's a regular table ('r') or partitioned table ('p'), enable RLS and add admin-only policy
  IF relkind IN ('r','p') THEN
    -- Enable RLS (idempotent)
    EXECUTE 'ALTER TABLE public.admin_metrics ENABLE ROW LEVEL SECURITY';

    -- Create admin-only SELECT policy if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' 
        AND tablename = 'admin_metrics' 
        AND policyname = 'admin_metrics_admin_select'
    ) THEN
      EXECUTE $$
        CREATE POLICY "admin_metrics_admin_select"
        ON public.admin_metrics
        FOR SELECT
        USING (has_role(auth.uid(), 'admin'::app_role));
      $$;
    END IF;

    -- Optionally lock down mutations by NOT creating INSERT/UPDATE/DELETE policies
    -- With RLS enabled and no policies for these commands, they are denied by default.
  END IF;
END $$;

-- Keep RPC-only access pattern intact
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