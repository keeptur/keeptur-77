-- Add Stripe keys to settings so admins can change them in the app
ALTER TABLE public.settings
ADD COLUMN IF NOT EXISTS stripe_publishable_key text,
ADD COLUMN IF NOT EXISTS stripe_secret_key text;