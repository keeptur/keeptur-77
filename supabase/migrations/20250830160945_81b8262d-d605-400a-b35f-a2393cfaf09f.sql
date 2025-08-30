-- Fix Security Definer View issue
-- First, let's check current views and their properties
SELECT 
    schemaname,
    viewname,
    definition
FROM pg_views 
WHERE schemaname = 'public';

-- Check for any security definer functions
SELECT 
    routine_name,
    routine_type,
    security_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND security_type = 'DEFINER';