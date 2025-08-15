
-- Adicionar campos necessários na tabela plan_kits
ALTER TABLE public.plan_kits 
ADD COLUMN IF NOT EXISTS stripe_price_id_monthly TEXT,
ADD COLUMN IF NOT EXISTS stripe_price_id_yearly TEXT,
ADD COLUMN IF NOT EXISTS features TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS description TEXT;

-- Criar tabela para configurações globais de planos e descontos
CREATE TABLE IF NOT EXISTS public.plan_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trial_days INTEGER NOT NULL DEFAULT 14,
  auto_trial BOOLEAN NOT NULL DEFAULT true,
  auto_billing BOOLEAN NOT NULL DEFAULT true,
  annual_discount INTEGER NOT NULL DEFAULT 20,
  coupons_enabled BOOLEAN NOT NULL DEFAULT true,
  first_purchase_discount INTEGER NOT NULL DEFAULT 15,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Inserir configurações padrão se não existirem
INSERT INTO public.plan_settings (trial_days, auto_trial, auto_billing, annual_discount, coupons_enabled, first_purchase_discount)
SELECT 14, true, true, 20, true, 15
WHERE NOT EXISTS (SELECT 1 FROM public.plan_settings);

-- Adicionar RLS para plan_settings
ALTER TABLE public.plan_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "plan_settings_admin_select" ON public.plan_settings
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "plan_settings_admin_update" ON public.plan_settings
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "plan_settings_admin_insert" ON public.plan_settings
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Criar trigger para atualizar updated_at
CREATE OR REPLACE TRIGGER update_plan_settings_updated_at
    BEFORE UPDATE ON public.plan_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
