-- Add restrictive DELETE policy for admin_audit_log table
-- Only allows super admin (first admin user) to delete logs older than 1 year
CREATE POLICY "super_admin_delete_old_audit_logs" 
ON public.admin_audit_log 
FOR DELETE 
USING (
  -- Only super admin (first admin user) can delete
  auth.uid() = public.get_first_admin_user_id()
  -- And only logs older than 1 year
  AND created_at < (now() - interval '1 year')
);