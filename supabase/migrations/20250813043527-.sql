-- Storage policies for avatars bucket
-- Allow public read
create policy "avatars_public_read"
on storage.objects
for select
using ( bucket_id = 'avatars' );

-- Allow authenticated users to upload files inside a folder named with their user id
create policy "avatars_user_insert_own_folder"
on storage.objects
for insert
with check (
  bucket_id = 'avatars' 
  and auth.role() = 'authenticated'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to update their own files
create policy "avatars_user_update_own_folder"
on storage.objects
for update
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to delete their own files
create policy "avatars_user_delete_own_folder"
on storage.objects
for delete
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);
