-- Criar função simples para processar emails manualmente via painel admin
CREATE OR REPLACE FUNCTION public.manual_process_emails()
RETURNS TABLE (
  job_id uuid,
  to_email text,
  template_type text,
  status text,
  error_message text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  job_record record;
  template_record record;
  result_record record;
BEGIN
  -- Processar emails pendentes um por um
  FOR job_record IN 
    SELECT * FROM public.email_jobs 
    WHERE status = 'pending' 
      AND scheduled_for <= now()
    ORDER BY scheduled_for ASC
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
        -- Marcar como processado (vai ser enviado pela edge function)
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