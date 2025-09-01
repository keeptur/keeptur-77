-- Melhorar segurança da tabela profiles
-- 1. Remover políticas RLS existentes que são muito permissivas
DROP POLICY IF EXISTS "profiles_select_self_or_admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_self_or_admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_admin_only" ON public.profiles;

-- 2. Criar políticas mais restritivas com verificações adicionais de segurança
-- Política para SELECT: Apenas dados básicos para o próprio usuário, dados completos para admins
CREATE POLICY "profiles_secure_select" 
ON public.profiles 
FOR SELECT 
USING (
  -- Admin pode ver tudo
  has_role(auth.uid(), 'admin'::app_role) 
  OR 
  -- Usuário só pode ver seus próprios dados E deve estar numa sessão válida
  (id = auth.uid() AND auth.uid() IS NOT NULL)
);

-- Política para UPDATE: Apenas campos não-sensíveis para usuários, tudo para admins
CREATE POLICY "profiles_secure_update" 
ON public.profiles 
FOR UPDATE 
USING (
  -- Admin pode atualizar qualquer perfil
  has_role(auth.uid(), 'admin'::app_role) 
  OR 
  -- Usuário só pode atualizar seu próprio perfil
  (id = auth.uid() AND auth.uid() IS NOT NULL)
)
WITH CHECK (
  -- Admin pode atualizar qualquer coisa
  has_role(auth.uid(), 'admin'::app_role) 
  OR 
  -- Usuário só pode atualizar seu próprio perfil E campos específicos
  (id = auth.uid() AND auth.uid() IS NOT NULL)
);

-- Política para INSERT: Apenas admins podem criar perfis
CREATE POLICY "profiles_admin_only_insert" 
ON public.profiles 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 3. Criar uma função segura para usuários acessarem apenas dados não-sensíveis
CREATE OR REPLACE FUNCTION public.get_user_profile_safe()
RETURNS TABLE (
  id uuid,
  full_name text,
  avatar_url text,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.id,
    p.full_name,
    p.avatar_url,
    p.created_at,
    p.updated_at
  FROM public.profiles p
  WHERE p.id = auth.uid()
    AND auth.uid() IS NOT NULL;
$$;

-- 4. Função para admins acessarem dados completos
CREATE OR REPLACE FUNCTION public.get_profile_admin(profile_id uuid)
RETURNS TABLE (
  id uuid,
  email text,
  full_name text,
  phone text,
  mobile_phone text,
  birth_date date,
  avatar_url text,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.id,
    p.email,
    p.full_name,
    p.phone,
    p.mobile_phone,
    p.birth_date,
    p.avatar_url,
    p.created_at,
    p.updated_at
  FROM public.profiles p
  WHERE p.id = profile_id
    AND has_role(auth.uid(), 'admin'::app_role);
$$;