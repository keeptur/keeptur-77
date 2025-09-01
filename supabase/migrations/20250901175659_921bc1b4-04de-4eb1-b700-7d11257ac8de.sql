-- Configurar cron job para processar emails automaticamente a cada 5 minutos
SELECT cron.schedule(
  'process-email-queue',
  '*/5 * * * *', -- A cada 5 minutos
  $$
  SELECT net.http_post(
    url := 'https://lquuoriatdcspbcvgsbg.supabase.co/functions/v1/process-email-jobs',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxxdXVvcmlhdGRjc3BiY3Znc2JnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUwMjQ2ODUsImV4cCI6MjA3MDYwMDY4NX0.N5SiWXF7IcJwksRkCRClUQyXhkmctIYJ_dQ8YCqo-IM"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);

-- Processar imediatamente os emails pendentes
SELECT net.http_post(
  url := 'https://lquuoriatdcspbcvgsbg.supabase.co/functions/v1/process-email-jobs',
  headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxxdXVvcmlhdGRjc3BiY3Znc2JnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUwMjQ2ODUsImV4cCI6MjA3MDYwMDY4NX0.N5SiWXF7IcJwksRkCRClUQyXhkmctIYJ_dQ8YCqo-IM"}'::jsonb,
  body := '{}'::jsonb
) as process_now;