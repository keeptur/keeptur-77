-- Clean up orphaned subscriber data and add constraint
-- Delete subscribers without proper user_id linkage (security risk)
DELETE FROM public.subscribers 
WHERE user_id IS NULL;

-- Add constraint to prevent future orphaned records
ALTER TABLE public.subscribers 
ADD CONSTRAINT subscribers_user_id_required 
CHECK (user_id IS NOT NULL);