-- Check for SECURITY DEFINER views specifically
SELECT 
    n.nspname as schema_name,
    c.relname as view_name,
    pg_get_viewdef(c.oid) as view_definition
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relkind = 'v' 
AND n.nspname = 'public'
AND pg_get_viewdef(c.oid) ILIKE '%security definer%';