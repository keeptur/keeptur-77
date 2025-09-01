-- Fix RLS policy for subscribers insert to allow service role inserts without auth.uid()
-- The current policy requires admin role which checks auth.uid(), but service role doesn't have auth.uid()

-- Drop existing insert policy  
DROP POLICY IF EXISTS "subscribers_admin_only_insert" ON public.subscribers;

-- Create new insert policy that allows service role inserts
CREATE POLICY "subscribers_service_role_insert" 
ON public.subscribers 
FOR INSERT 
WITH CHECK (
  -- Allow if user is admin
  has_role(auth.uid(), 'admin'::app_role) 
  OR 
  -- Allow service role access (when auth.uid() is null but we're using service key)
  auth.uid() IS NULL
);