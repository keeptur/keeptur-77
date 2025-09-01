-- Limpar registros duplicados de plan_settings, mantendo apenas o mais recente
WITH latest_setting AS (
  SELECT id
  FROM public.plan_settings
  ORDER BY created_at DESC
  LIMIT 1
)
DELETE FROM public.plan_settings
WHERE id NOT IN (SELECT id FROM latest_setting);

-- Criar constraint única para evitar múltiplos registros de configuração
-- Como só queremos um registro global, vamos adicionar uma coluna singleton
ALTER TABLE public.plan_settings 
ADD COLUMN IF NOT EXISTS singleton_check INTEGER DEFAULT 1;

-- Criar constraint única na coluna singleton_check para garantir apenas um registro
DROP INDEX IF EXISTS plan_settings_singleton_idx;
CREATE UNIQUE INDEX plan_settings_singleton_idx 
ON public.plan_settings (singleton_check);

-- Atualizar o registro existente para ter o valor singleton
UPDATE public.plan_settings 
SET singleton_check = 1 
WHERE singleton_check IS NULL;

-- Adicionar trigger para garantir que novos registros substituam o antigo
CREATE OR REPLACE FUNCTION public.ensure_single_plan_settings()
RETURNS TRIGGER AS $$
BEGIN
  -- Deletar qualquer registro existente antes de inserir o novo
  DELETE FROM public.plan_settings WHERE id != NEW.id;
  
  -- Garantir que o novo registro tenha singleton_check = 1
  NEW.singleton_check = 1;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

-- Criar trigger para INSERT
DROP TRIGGER IF EXISTS plan_settings_singleton_trigger ON public.plan_settings;
CREATE TRIGGER plan_settings_singleton_trigger
  BEFORE INSERT ON public.plan_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_single_plan_settings();