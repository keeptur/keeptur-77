-- Inserir ou atualizar o usuário bradpitty@gmail.com na tabela subscribers
INSERT INTO public.subscribers (
  email, 
  display_name, 
  trial_start, 
  trial_end, 
  subscribed, 
  source,
  last_login_at
) 
VALUES (
  'bradpitty@gmail.com',
  'Brad Pitt',
  NOW(),
  NOW() + INTERVAL '2 days',
  false,
  'keeptur',
  NOW()
)
ON CONFLICT (email) 
DO UPDATE SET
  trial_start = NOW(),
  trial_end = NOW() + INTERVAL '2 days',
  subscribed = false,
  last_login_at = NOW(),
  updated_at = NOW();