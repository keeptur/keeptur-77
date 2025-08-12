
-- Inserir o usuário admin manualmente na tabela auth.users
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  invited_at,
  confirmation_token,
  confirmation_sent_at,
  recovery_token,
  recovery_sent_at,
  email_change_token_new,
  email_change,
  email_change_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  created_at,
  updated_at,
  phone,
  phone_confirmed_at,
  phone_change,
  phone_change_token,
  phone_change_sent_at,
  email_change_token_current,
  email_change_confirm_status,
  banned_until,
  reauthentication_token,
  reauthentication_sent_at
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'contato@keeptur.com',
  crypt('Farosi06@@', gen_salt('bf')),
  now(),
  now(),
  '',
  now(),
  '',
  null,
  '',
  '',
  null,
  null,
  '{"provider":"email","providers":["email"]}',
  '{}',
  false,
  now(),
  now(),
  null,
  null,
  '',
  '',
  null,
  '',
  0,
  null,
  '',
  null
) ON CONFLICT (email) DO UPDATE SET
  encrypted_password = crypt('Farosi06@@', gen_salt('bf')),
  updated_at = now();

-- Inserir o role de admin para este usuário
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'
FROM auth.users 
WHERE email = 'contato@keeptur.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- Inserir na tabela accounts
INSERT INTO public.accounts (email, owner_user_id, subscribed, seats_purchased, updated_at)
SELECT 
  'contato@keeptur.com',
  id,
  false,
  1,
  now()
FROM auth.users 
WHERE email = 'contato@keeptur.com'
ON CONFLICT (email) DO UPDATE SET
  owner_user_id = EXCLUDED.owner_user_id,
  updated_at = now();
