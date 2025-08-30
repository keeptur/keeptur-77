-- Find all views that are SECURITY DEFINER and check admin_metrics specifically
-- First, get all views in public schema
SELECT 
    schemaname, 
    viewname,
    viewowner
FROM pg_views 
WHERE schemaname = 'public';

-- Check if any views exist that need to be altered
-- The issue is that PostgreSQL creates views as SECURITY DEFINER by default
-- We need to ALTER them to SECURITY INVOKER

-- Fix the admin_metrics view by explicitly setting it to SECURITY INVOKER
ALTER VIEW admin_metrics SET (security_invoker = true);