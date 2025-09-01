-- Ensure email automation trigger is attached to subscribers
DROP TRIGGER IF EXISTS trg_queue_automation_emails ON public.subscribers;
CREATE TRIGGER trg_queue_automation_emails
AFTER INSERT OR UPDATE ON public.subscribers
FOR EACH ROW
EXECUTE FUNCTION public.queue_automation_emails();

-- Optional: backfill to fire trial_start for users inserted today (will enqueue emails now)
-- Note: This will touch updated_at and trigger emails for rows without subscribed=true
UPDATE public.subscribers
SET updated_at = now()
WHERE created_at >= (now() - interval '1 day')
  AND (subscribed IS FALSE OR subscribed IS NULL);