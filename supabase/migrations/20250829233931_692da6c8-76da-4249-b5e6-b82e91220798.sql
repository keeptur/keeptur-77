-- Add username column to subscribers to store Monde username/alias
ALTER TABLE public.subscribers
ADD COLUMN IF NOT EXISTS username TEXT;