-- Criar trigger para automaticamente dar status vitalício aos admins
CREATE OR REPLACE TRIGGER ensure_admin_lifetime_trigger
  AFTER INSERT ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_admin_lifetime_subscription();

-- Corrigir a função anterior com search_path correto
CREATE OR REPLACE FUNCTION public.ensure_admin_lifetime_subscription()
RETURNS TRIGGER AS $$
BEGIN
  -- Quando um usuário se torna admin, garantir que tenha assinatura vitalícia
  IF NEW.role = 'admin' THEN
    INSERT INTO public.subscribers (
      user_id,
      email,
      subscribed,
      subscription_tier,
      subscription_end,
      trial_start,
      trial_end,
      created_at,
      updated_at
    )
    SELECT 
      NEW.user_id,
      p.email,
      true,
      'Enterprise',
      '2099-12-31 23:59:59'::timestamptz,
      NULL,
      NULL,
      NOW(),
      NOW()
    FROM public.profiles p
    WHERE p.id = NEW.user_id
    ON CONFLICT (email) 
    DO UPDATE SET
      subscribed = true,
      subscription_tier = 'Enterprise',
      subscription_end = '2099-12-31 23:59:59'::timestamptz,
      trial_start = NULL,
      trial_end = NULL,
      updated_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';