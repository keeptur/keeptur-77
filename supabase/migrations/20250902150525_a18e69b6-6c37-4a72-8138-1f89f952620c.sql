-- Ensure column exists for tracking extra trial days
ALTER TABLE public.subscribers
ADD COLUMN IF NOT EXISTS additional_trial_days integer NOT NULL DEFAULT 0;

-- Create index if missing
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'idx_subscribers_additional_trial_days' AND n.nspname = 'public'
  ) THEN
    CREATE INDEX idx_subscribers_additional_trial_days ON public.subscribers(additional_trial_days);
  END IF;
END $$;

COMMENT ON COLUMN public.subscribers.additional_trial_days IS 'Additional trial days granted by admin, added to the base trial period';