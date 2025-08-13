
-- 1) Adicionar campos de perfil faltantes (admin poderá editar na tela de Perfil)
alter table public.profiles
  add column if not exists phone text,
  add column if not exists mobile_phone text,
  add column if not exists birth_date date;

-- Observações:
-- - A tabela public.profiles já possui RLS e políticas para o próprio usuário editar e admin editar todos.
-- - avatar_url e full_name já existem; email já é único.
-- - Não removemos nenhuma tabela existente neste passo para não quebrar telas atuais.
