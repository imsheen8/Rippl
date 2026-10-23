-- Sheen schema v10: chat images + groups (private servers you build from friends). Run AFTER schema.sql + schema-v2.sql. Safe to re-run.

-- 1) Images in direct messages and channel messages
alter table public.dm_messages add column if not exists image_url text;
alter table public.messages add column if not exists image_url text;

alter table public.dm_messages drop constraint if exists dm_messages_content_check;
alter table public.dm_messages drop constraint if exists dm_content_or_image;
alter table public.dm_messages add constraint dm_content_or_image
  check (image_url is not null or char_length(content) between 1 and 4000);

alter table public.messages drop constraint if exists messages_content_check;
alter table public.messages drop constraint if exists msg_content_or_image;
alter table public.messages add constraint msg_content_or_image
  check (image_url is not null or char_length(content) between 1 and 4000);

insert into storage.buckets (id, name, public) values ('chat-images', 'chat-images', true) on conflict (id) do nothing;
drop policy if exists "chat images public read" on storage.objects;
create policy "chat images public read" on storage.objects for select using (bucket_id = 'chat-images');
drop policy if exists "chat images upload own folder" on storage.objects;
create policy "chat images upload own folder" on storage.objects for insert to authenticated
with check (bucket_id = 'chat-images' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "chat images delete own folder" on storage.objects;
create policy "chat images delete own folder" on storage.objects for delete to authenticated
using (bucket_id = 'chat-images' and (storage.foldername(name))[1] = auth.uid()::text);

-- 2) Groups: a server owner/admin may add FRIENDS as plain members (needed for private groups)
drop policy if exists "admins add friends" on public.server_members;
create policy "admins add friends" on public.server_members for insert to authenticated
with check (
  public.is_server_admin(server_id)
  and role = 'member'
  and user_id <> auth.uid()
  and public.are_friends(auth.uid(), user_id)
);
