-- Comprehensive check for any remaining SECURITY DEFINER objects
-- Check all views in detail
SELECT 
    schemaname,
    viewname,
    viewowner,
    definition
FROM pg_views 
WHERE schemaname = 'public'
ORDER BY viewname;

-- Check for any materialized views  
SELECT 
    schemaname,
    matviewname,
    matviewowner,
    definition
FROM pg_matviews 
WHERE schemaname = 'public';

-- Check for any functions that might be creating views with SECURITY DEFINER
SELECT 
    n.nspname,
    p.proname,
    pg_get_functiondef(p.oid) as definition
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
AND pg_get_functiondef(p.oid) ILIKE '%create%view%'
AND pg_get_functiondef(p.oid) ILIKE '%security%definer%';