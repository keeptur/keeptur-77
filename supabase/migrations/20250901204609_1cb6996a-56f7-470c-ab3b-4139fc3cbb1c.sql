-- Fix auth_attempts table INSERT policy to restrict access
-- Remove the unrestricted INSERT policy
DROP POLICY IF EXISTS "Allow auth attempt logging" ON public.auth_attempts;

-- Create a new restricted policy that only allows system/admin logging
CREATE POLICY "auth_attempts_system_insert_only" 
ON public.auth_attempts 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Add a function to safely log auth attempts from edge functions
CREATE OR REPLACE FUNCTION public.log_auth_attempt_system(
  user_email text, 
  client_ip inet DEFAULT NULL::inet, 
  was_successful boolean DEFAULT false
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  INSERT INTO public.auth_attempts (email, ip_address, success)
  VALUES (user_email, client_ip, was_successful);
$$;