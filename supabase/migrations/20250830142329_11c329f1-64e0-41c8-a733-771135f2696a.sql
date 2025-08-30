-- Add user_email field to subscribers table to store the Monde user email
ALTER TABLE public.subscribers 
ADD COLUMN user_email text;

-- Add index for user_email for better performance
CREATE INDEX idx_subscribers_user_email ON public.subscribers(user_email);

-- Update RLS policies to include user_email in selection
DROP POLICY IF EXISTS "subscribers_select_self_or_admin" ON public.subscribers;
CREATE POLICY "subscribers_select_self_or_admin" ON public.subscribers
FOR SELECT
USING (
  (user_id = auth.uid()) OR 
  (email = auth.email()) OR 
  (user_email = auth.email()) OR 
  has_role(auth.uid(), 'admin'::app_role)
);

-- Add comment to clarify the difference between email fields
COMMENT ON COLUMN public.subscribers.email IS 'Primary email used for billing and Stripe (e.g., bradpitty@cvc.com.br)';
COMMENT ON COLUMN public.subscribers.user_email IS 'Monde user email used for login (e.g., bradpitty@allanacaires.monde.com.br)';