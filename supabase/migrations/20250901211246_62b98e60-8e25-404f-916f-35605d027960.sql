-- Remove the constraint that prevents inserts with null user_id
ALTER TABLE public.subscribers 
DROP CONSTRAINT IF EXISTS subscribers_user_id_required;

-- Check if there are active automation rules for trial_start
SELECT id, name, trigger, template_type, active, delay_hours
FROM public.automation_rules 
WHERE active = true AND trigger = 'trial_start';