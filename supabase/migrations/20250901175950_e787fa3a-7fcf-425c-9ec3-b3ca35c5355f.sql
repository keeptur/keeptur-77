-- Dropar e recriar a função com assinatura correta
DROP FUNCTION IF EXISTS public.manual_process_emails();

CREATE OR REPLACE FUNCTION public.manual_process_emails()
RETURNS TABLE (
  job_id uuid,
  to_email text,
  template_type text,
  job_status text,
  error_message text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  job_record record;
  template_record record;
BEGIN
  -- Processar emails pendentes um por um
  FOR job_record IN 
    SELECT ej.* FROM public.email_jobs ej
    WHERE ej.status = 'pending' 
      AND ej.scheduled_for <= now()
    ORDER BY ej.scheduled_for ASC
    LIMIT 10
  LOOP
    BEGIN
      -- Buscar template
      SELECT * INTO template_record
      FROM public.email_templates
      WHERE type = job_record.template_type;
      
      IF template_record IS NULL THEN
        -- Marcar como falhou
        UPDATE public.email_jobs 
        SET status = 'failed', 
            last_error = 'Template não encontrado',
            updated_at = now()
        WHERE id = job_record.id;
        
        RETURN QUERY SELECT 
          job_record.id,
          job_record.to_email,
          job_record.template_type,
          'failed'::text,
          'Template não encontrado'::text;
      ELSE
        -- Marcar como pronto para envio
        UPDATE public.email_jobs 
        SET status = 'ready_to_send',
            updated_at = now(),
            attempts = job_record.attempts + 1
        WHERE id = job_record.id;
        
        RETURN QUERY SELECT 
          job_record.id,
          job_record.to_email,
          job_record.template_type,
          'ready_to_send'::text,
          ''::text;
      END IF;
      
    EXCEPTION WHEN OTHERS THEN
      -- Marcar como falhou
      UPDATE public.email_jobs 
      SET status = 'failed', 
          last_error = SQLERRM,
          updated_at = now()
      WHERE id = job_record.id;
      
      RETURN QUERY SELECT 
        job_record.id,
        job_record.to_email,
        job_record.template_type,
        'failed'::text,
        SQLERRM::text;
    END;
  END LOOP;
END;
$$;