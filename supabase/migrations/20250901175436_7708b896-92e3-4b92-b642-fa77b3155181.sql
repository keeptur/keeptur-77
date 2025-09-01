-- Habilitar extensões necessárias para processamento automático de emails
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Simplificar a função de processamento automático
CREATE OR REPLACE FUNCTION public.process_pending_emails_simple()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pending_count integer;
BEGIN
  -- Verificar quantos emails estão pendentes
  SELECT count(*) INTO pending_count
  FROM public.email_jobs
  WHERE status = 'pending' 
    AND scheduled_for <= now();
  
  RETURN jsonb_build_object(
    'success', true,
    'message', format('Existem %s emails pendentes para processamento', pending_count),
    'pending_emails', pending_count,
    'next_step', 'Chame manualmente a edge function process-email-jobs'
  );
END;
$$;