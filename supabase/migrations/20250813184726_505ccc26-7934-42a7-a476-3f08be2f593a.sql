-- Remove Stripe secret key from settings table for security
-- Secret keys should only be stored as environment variables
ALTER TABLE public.settings DROP COLUMN IF EXISTS stripe_secret_key;