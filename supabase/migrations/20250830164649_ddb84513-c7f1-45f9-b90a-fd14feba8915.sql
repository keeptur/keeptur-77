-- Adicionar campo de senha na tabela smtp_settings
ALTER TABLE smtp_settings ADD COLUMN IF NOT EXISTS password TEXT;