-- Garantir que usuários admin tenham status vitalício no sistema
-- Esta migração cria registros de assinatura vitalícia para admins que não possuem

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
  ur.user_id,
  p.email,
  true, -- Admin é sempre assinante
  'Enterprise', -- Tier mais alto para admins
  '2099-12-31 23:59:59'::timestamptz, -- Data bem distante no futuro (vitalício)
  NULL, -- Admin não tem trial
  NULL, -- Admin não tem trial
  NOW(),
  NOW()
FROM public.user_roles ur
JOIN public.profiles p ON ur.user_id = p.id
WHERE ur.role = 'admin'
  AND NOT EXISTS (
    SELECT 1 FROM public.subscribers s 
    WHERE s.user_id = ur.user_id
  )
ON CONFLICT (email) 
DO UPDATE SET
  subscribed = true,
  subscription_tier = 'Enterprise',
  subscription_end = '2099-12-31 23:59:59'::timestamptz,
  trial_start = NULL,
  trial_end = NULL,
  updated_at = NOW();

-- Criar função para automaticamente dar status vitalício para novos admins
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
$$ LANGUAGE plpgsql SECURITY DEFINER;