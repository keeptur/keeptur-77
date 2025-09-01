-- Enable Row Level Security on admin_metrics table
ALTER TABLE public.admin_metrics ENABLE ROW LEVEL SECURITY;

-- Create policy to allow only admin users to select from admin_metrics
CREATE POLICY "admin_metrics_admin_select" 
ON public.admin_metrics 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create policy to allow only admin users to insert into admin_metrics
CREATE POLICY "admin_metrics_admin_insert" 
ON public.admin_metrics 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create policy to allow only admin users to update admin_metrics
CREATE POLICY "admin_metrics_admin_update" 
ON public.admin_metrics 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create policy to allow only admin users to delete from admin_metrics
CREATE POLICY "admin_metrics_admin_delete" 
ON public.admin_metrics 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));