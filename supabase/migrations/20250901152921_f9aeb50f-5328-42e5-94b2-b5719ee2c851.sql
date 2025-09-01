
-- 1) Tornar a view admin_metrics segura com security_invoker
ALTER VIEW public.admin_metrics SET (security_invoker = on);

-- 2) Função que enfileira e-mails de automação
CREATE OR REPLACE FUNCTION public.queue_automation_emails()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trial_days integer := 14;
  v_rule RECORD;
  v_days_before integer;
  v_scheduled timestamptz;
  v_subdomain text;
  v_vars jsonb;
BEGIN
  -- Trial days (se existir configuração)
  SELECT ps.trial_days
    INTO v_trial_days
  FROM public.plan_settings ps
  ORDER BY ps.created_at DESC
  LIMIT 1;

  -- Subdomínio derivado do e-mail
  v_subdomain := split_part(split_part(NEW.email, '@', 2), '.', 1);

  -- Variáveis comuns ao template
  v_vars := jsonb_build_object(
    'nome_usuario', COALESCE(NEW.display_name, NEW.username, split_part(NEW.email, '@', 1)),
    'email', NEW.email,
    'nome_sistema', 'Keeptur',
    'empresa', v_subdomain,
    'subdominio', v_subdomain,
    'link_acesso', 'https://' || COALESCE(NULLIF(v_subdomain, ''), 'app') || '.keeptur.com',
    'dias_trial', v_trial_days::text,
    'data_vencimento', CASE WHEN NEW.trial_end IS NOT NULL THEN to_char(NEW.trial_end, 'DD/MM/YYYY') ELSE NULL END,
    'link_pagamento', 'https://' || COALESCE(NULLIF(v_subdomain, ''), 'app') || '.keeptur.com/subscription'
  );

  -- 2.1) INSERT: trial_start + programações relacionadas ao trial
  IF TG_OP = 'INSERT' THEN
    -- trial_start
    FOR v_rule IN
      SELECT * FROM public.automation_rules
      WHERE active = true AND trigger = 'trial_start'
    LOOP
      v_scheduled := now() + (v_rule.delay_hours || ' hours')::interval;
      INSERT INTO public.email_jobs (to_email, template_type, variables, scheduled_for, status)
      VALUES (NEW.email, v_rule.template_type, v_vars, v_scheduled, 'pending');
    END LOOP;

    -- trial_ending (se houver trial_end)
    IF NEW.trial_end IS NOT NULL THEN
      FOR v_rule IN
        SELECT * FROM public.automation_rules
        WHERE active = true AND trigger = 'trial_ending'
      LOOP
        v_days_before := COALESCE((v_rule.conditions->>'days_before')::int, 7);
        v_scheduled := NEW.trial_end
                        - (v_days_before || ' days')::interval
                        + (v_rule.delay_hours || ' hours')::interval;
        IF v_scheduled < now() THEN
          v_scheduled := now();
        END IF;

        INSERT INTO public.email_jobs (to_email, template_type, variables, scheduled_for, status)
        VALUES (
          NEW.email,
          v_rule.template_type,
          v_vars || jsonb_build_object('dias_restantes', v_days_before::text),
          v_scheduled,
          'pending'
        );
      END LOOP;

      -- trial_ended
      FOR v_rule IN
        SELECT * FROM public.automation_rules
        WHERE active = true AND trigger = 'trial_ended'
      LOOP
        v_scheduled := NEW.trial_end + (v_rule.delay_hours || ' hours')::interval;
        INSERT INTO public.email_jobs (to_email, template_type, variables, scheduled_for, status)
        VALUES (NEW.email, v_rule.template_type, v_vars, v_scheduled, 'pending');
      END LOOP;
    END IF;
  END IF;

  -- 2.2) UPDATE: subscription_welcome quando subscribed muda de false -> true
  IF TG_OP = 'UPDATE'
     AND NEW.subscribed IS TRUE
     AND COALESCE(OLD.subscribed, FALSE) IS DISTINCT FROM TRUE
  THEN
    FOR v_rule IN
      SELECT * FROM public.automation_rules
      WHERE active = true AND trigger = 'subscription_welcome'
    LOOP
      v_scheduled := now() + (v_rule.delay_hours || ' hours')::interval;
      INSERT INTO public.email_jobs (to_email, template_type, variables, scheduled_for, status)
      VALUES (
        NEW.email,
        v_rule.template_type,
        v_vars || jsonb_build_object('nome_plano', COALESCE(NEW.subscription_tier, 'Premium')),
        v_scheduled,
        'pending'
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

-- 3) Trigger em subscribers para enfileirar automações
DROP TRIGGER IF EXISTS subscribers_queue_automation ON public.subscribers;

CREATE TRIGGER subscribers_queue_automation
AFTER INSERT OR UPDATE OF subscribed, trial_end
ON public.subscribers
FOR EACH ROW
EXECUTE PROCEDURE public.queue_automation_emails();

-- 4) Índice para processar filas com eficiência
CREATE INDEX IF NOT EXISTS email_jobs_status_scheduled_for_idx
  ON public.email_jobs (status, scheduled_for);
