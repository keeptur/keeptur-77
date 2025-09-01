-- Corrigir vulnerabilidades de segurança na tabela subscribers
-- 1. Remover políticas RLS inseguras existentes
DROP POLICY IF EXISTS "subscribers_insert_any" ON public.subscribers;
DROP POLICY IF EXISTS "subscribers_update_self_or_admin" ON public.subscribers;
DROP POLICY IF EXISTS "subscribers_select_self_or_admin" ON public.subscribers;

-- 2. Criar políticas RLS mais seguras e restritivas

-- Política SELECT: Apenas o próprio usuário (por user_id) ou admins
CREATE POLICY "subscribers_secure_select" 
ON public.subscribers 
FOR SELECT 
USING (
  -- Admin pode ver todos os dados
  has_role(auth.uid(), 'admin'::app_role) 
  OR 
  -- Usuário só pode ver seus próprios dados (apenas por user_id, não por email)
  (user_id = auth.uid() AND auth.uid() IS NOT NULL)
);

-- Política UPDATE: Apenas o próprio usuário ou admins
CREATE POLICY "subscribers_secure_update" 
ON public.subscribers 
FOR UPDATE 
USING (
  -- Admin pode atualizar qualquer registro
  has_role(auth.uid(), 'admin'::app_role) 
  OR 
  -- Usuário só pode atualizar seus próprios dados
  (user_id = auth.uid() AND auth.uid() IS NOT NULL)
)
WITH CHECK (
  -- Admin pode atualizar qualquer coisa
  has_role(auth.uid(), 'admin'::app_role) 
  OR 
  -- Usuário só pode atualizar seus próprios dados
  (user_id = auth.uid() AND auth.uid() IS NOT NULL)
);

-- Política INSERT: Apenas admins ou edge functions com service role
CREATE POLICY "subscribers_admin_only_insert" 
ON public.subscribers 
FOR INSERT 
WITH CHECK (
  -- Apenas admins podem inserir diretamente
  has_role(auth.uid(), 'admin'::app_role)
  -- Edge functions usam service role key que bypassa RLS
);

-- Política DELETE: Apenas admins
CREATE POLICY "subscribers_admin_only_delete" 
ON public.subscribers 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- 3. Criar função segura para usuários acessarem apenas seus dados básicos
CREATE OR REPLACE FUNCTION public.get_user_subscription_safe()
RETURNS TABLE (
  subscribed boolean,
  subscription_tier text,
  subscription_end timestamptz,
  trial_start timestamptz,
  trial_end timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    s.subscribed,
    s.subscription_tier,
    s.subscription_end,
    s.trial_start,
    s.trial_end
  FROM public.subscribers s
  WHERE s.user_id = auth.uid()
    AND auth.uid() IS NOT NULL;
$$;

-- 4. Função para edge functions atualizarem dados de subscription (bypass RLS)
CREATE OR REPLACE FUNCTION public.upsert_subscriber_secure(
  p_user_id uuid,
  p_email text,
  p_stripe_customer_id text DEFAULT NULL,
  p_subscribed boolean DEFAULT false,
  p_subscription_tier text DEFAULT NULL,
  p_subscription_end timestamptz DEFAULT NULL,
  p_trial_start timestamptz DEFAULT NULL,
  p_trial_end timestamptz DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.subscribers (
    user_id,
    email,
    stripe_customer_id,
    subscribed,
    subscription_tier,
    subscription_end,
    trial_start,
    trial_end,
    updated_at
  )
  VALUES (
    p_user_id,
    p_email,
    p_stripe_customer_id,
    p_subscribed,
    p_subscription_tier,
    p_subscription_end,
    p_trial_start,
    p_trial_end,
    now()
  )
  ON CONFLICT (email) 
  DO UPDATE SET
    user_id = EXCLUDED.user_id,
    stripe_customer_id = EXCLUDED.stripe_customer_id,
    subscribed = EXCLUDED.subscribed,
    subscription_tier = EXCLUDED.subscription_tier,
    subscription_end = EXCLUDED.subscription_end,
    trial_start = EXCLUDED.trial_start,
    trial_end = EXCLUDED.trial_end,
    updated_at = now();
END;
$$;