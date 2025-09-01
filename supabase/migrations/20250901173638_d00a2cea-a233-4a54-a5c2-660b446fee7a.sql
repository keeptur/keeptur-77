-- Secure admin_metrics with RLS and admin-only access
-- 1) Enable Row Level Security (idempotent)
ALTER TABLE public.admin_metrics ENABLE ROW LEVEL SECURITY;

-- Optionally enforce RLS for owners as well (good hardening)
ALTER TABLE public.admin_metrics FORCE ROW LEVEL SECURITY;

-- 2) Create admin-only SELECT policy if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'admin_metrics' 
      AND policyname = 'admin_metrics_admin_select'
  ) THEN
    CREATE POLICY "admin_metrics_admin_select"
    ON public.admin_metrics
    FOR SELECT
    USING (has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;