-- Remove the constraint that prevents inserts with null user_id
ALTER TABLE public.subscribers 
DROP CONSTRAINT IF EXISTS subscribers_user_id_required;

-- Verify email automation trigger exists on subscribers table
SELECT schemaname, tablename, actiontiming, event, tgname 
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE c.relname = 'subscribers' AND n.nspname = 'public';

-- Check if there are active automation rules for trial_start
SELECT id, name, trigger, template_type, active, delay_hours
FROM public.automation_rules 
WHERE active = true AND trigger = 'trial_start';