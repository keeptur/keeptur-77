
-- 1) Criar bucket público para avatares (se não existir)
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- 2) Políticas de acesso no storage.objects para o bucket 'avatars'
-- Observação: não alteramos outras buckets.

-- Leitura pública dos arquivos do bucket 'avatars'
create policy if not exists "avatars_public_read"
on storage.objects
for select
to public
using (bucket_id = 'avatars');

-- Upload (insert) apenas para usuários autenticados, no próprio diretório {auth.uid()}/*
create policy if not exists "avatars_auth_upload_own_folder"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and split_part(name, '/', 1) = auth.uid()::text
);

-- Atualizar (update) apenas arquivos do próprio diretório {auth.uid()}/*
create policy if not exists "avatars_auth_update_own_folder"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'avatars'
  and split_part(name, '/', 1) = auth.uid()::text
)
with check (
  bucket_id = 'avatars'
  and split_part(name, '/', 1) = auth.uid()::text
);

-- Excluir (delete) apenas arquivos do próprio diretório {auth.uid()}/*
create policy if not exists "avatars_auth_delete_own_folder"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'avatars'
  and split_part(name, '/', 1) = auth.uid()::text
);
