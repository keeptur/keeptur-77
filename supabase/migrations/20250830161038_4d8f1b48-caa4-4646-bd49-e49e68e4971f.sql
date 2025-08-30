-- Check specifically for views with security definer property
-- Look at the admin_metrics view definition
SELECT pg_get_viewdef('admin_metrics'::regclass) as view_definition;

-- Check if admin_metrics is defined as security definer
\d+ admin_metrics