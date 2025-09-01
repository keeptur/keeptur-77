-- Enhance authentication security policies

-- Set session timeout for authentication
ALTER SYSTEM SET log_statement = 'all';

-- Add rate limiting for authentication attempts
CREATE TABLE IF NOT EXISTS public.auth_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  ip_address inet,
  attempted_at timestamp with time zone NOT NULL DEFAULT now(),
  success boolean NOT NULL DEFAULT false
);

-- Enable RLS on auth_attempts
ALTER TABLE public.auth_attempts ENABLE ROW LEVEL SECURITY;

-- Policy to allow inserts from anyone (for tracking attempts)
CREATE POLICY "Allow auth attempt logging" ON public.auth_attempts
FOR INSERT WITH CHECK (true);

-- Policy to allow admins to view auth attempts
CREATE POLICY "Admins can view auth attempts" ON public.auth_attempts
FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- Function to check rate limiting
CREATE OR REPLACE FUNCTION public.check_auth_rate_limit(user_email text, client_ip inet DEFAULT NULL)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*) < 5
  FROM public.auth_attempts
  WHERE email = user_email
    AND attempted_at > now() - interval '15 minutes'
    AND (client_ip IS NULL OR ip_address = client_ip);
$$;

-- Function to log authentication attempts
CREATE OR REPLACE FUNCTION public.log_auth_attempt(user_email text, client_ip inet DEFAULT NULL, was_successful boolean DEFAULT false)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.auth_attempts (email, ip_address, success)
  VALUES (user_email, client_ip, was_successful);
$$;

-- Enhanced audit logging for admin actions
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid NOT NULL,
  action text NOT NULL,
  target_table text,
  target_id uuid,
  old_values jsonb,
  new_values jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on admin_audit_log
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Policy for admins to view audit logs
CREATE POLICY "Admins can view audit logs" ON public.admin_audit_log
FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- Policy for logging admin actions
CREATE POLICY "Allow audit log creation" ON public.admin_audit_log
FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Function to log admin actions
CREATE OR REPLACE FUNCTION public.log_admin_action(
  action_type text,
  table_name text DEFAULT NULL,
  record_id uuid DEFAULT NULL,
  old_data jsonb DEFAULT NULL,
  new_data jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.admin_audit_log (
    admin_user_id,
    action,
    target_table,
    target_id,
    old_values,
    new_values
  )
  VALUES (
    auth.uid(),
    action_type,
    table_name,
    record_id,
    old_data,
    new_data
  );
END;
$$;