-- Add unique constraint to prevent duplicate subscribers by email
ALTER TABLE public.subscribers 
ADD CONSTRAINT subscribers_email_unique UNIQUE (email);

-- Function to get the first admin user (super admin)
CREATE OR REPLACE FUNCTION public.get_first_admin_user_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT user_id 
  FROM public.user_roles 
  WHERE role = 'admin' 
  ORDER BY created_at ASC 
  LIMIT 1;
$$;

-- Function to check if user is the super admin
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT _user_id = public.get_first_admin_user_id();
$$;