-- Restrict direct access to the admin_metrics view via PostgREST
REVOKE ALL ON VIEW public.admin_metrics FROM anon;
REVOKE ALL ON VIEW public.admin_metrics FROM authenticated;
-- Ensure internal usage (e.g., service functions) remains allowed
GRANT SELECT ON VIEW public.admin_metrics TO service_role;