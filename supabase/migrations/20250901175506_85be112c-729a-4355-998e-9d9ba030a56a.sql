-- Criar função que será chamada pelo trigger para processar emails automaticamente
CREATE OR REPLACE FUNCTION public.trigger_email_processing()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  supabase_url text;
  supabase_key text;
BEGIN
  -- Log do trigger
  RAISE LOG 'Email trigger disparado para: %', NEW.to_email;
  
  -- Usar pg_net para chamar a edge function de auto-processamento
  -- Isso será executado de forma assíncrona
  PERFORM net.http_post(
    url := format('%s/functions/v1/auto-process-emails', 
           coalesce(current_setting('app.supabase_url', true), 'https://lquuoriatdcspbcvgsbg.supabase.co')),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', format('Bearer %s', 
                      coalesce(current_setting('app.supabase_anon_key', true), 
                              'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxxdXVvcmlhdGRjc3BiY3Znc2JnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUwMjQ2ODUsImV4cCI6MjA3MDYwMDY4NX0.N5SiWXF7IcJwksRkCRClUQyXhkmctIYJ_dQ8YCqo-IM'))
    ),
    body := '{}'::jsonb
  );
  
  RETURN NEW;
END;
$$;

-- Criar trigger que dispara quando novos emails são inseridos
DROP TRIGGER IF EXISTS trigger_process_new_emails ON public.email_jobs;
CREATE TRIGGER trigger_process_new_emails
  AFTER INSERT ON public.email_jobs
  FOR EACH ROW
  WHEN (NEW.status = 'pending')
  EXECUTE FUNCTION public.trigger_email_processing();

-- Criar função para processar emails pendentes manualmente (via RPC)
CREATE OR REPLACE FUNCTION public.process_pending_emails()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
  pending_count integer;
BEGIN
  -- Verificar se há emails pendentes
  SELECT count(*) INTO pending_count
  FROM public.email_jobs
  WHERE status = 'pending' 
    AND scheduled_for <= now();
  
  IF pending_count = 0 THEN
    RETURN jsonb_build_object(
      'success', true,
      'message', 'Nenhum email pendente',
      'pending_emails', 0
    );
  END IF;
  
  -- Tentar chamar a função de auto-processamento
  PERFORM net.http_post(
    url := 'https://lquuoriatdcspbcvgsbg.supabase.co/functions/v1/auto-process-emails',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxxdXVvcmlhdGRjc3BiY3Znc2JnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUwMjQ2ODUsImV4cCI6MjA3MDYwMDY4NX0.N5SiWXF7IcJwksRkCRClUQyXhkmctIYJ_dQ8YCqo-IM'
    ),
    body := '{}'::jsonb
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'message', format('Processamento iniciado para %s emails', pending_count),
    'pending_emails', pending_count
  );
END;
$$;