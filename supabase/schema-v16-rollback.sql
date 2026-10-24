-- Rollback for schema-v16.sql. Run in the Supabase SQL editor ONLY if v16 caused a problem. Deletes no data.
-- 1) servers guard
drop trigger if exists servers_guard_update on public.servers;
drop function if exists public.servers_guard_update();
-- 2) members policy back to the v2 version
drop policy if exists "remove members by rank" on public.server_members;
drop policy if exists "admins manage members" on public.server_members;
create policy "admins manage members" on public.server_members for delete to authenticated
using (role <> 'owner' and (public.is_server_admin(server_id) or user_id = auth.uid()));
drop function if exists public.my_server_role(uuid);
-- 3) dm guard back to the v2 version (the trigger itself was created in v2 and stays)
create or replace function public.dm_guard_update()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.sender_id <> old.sender_id or new.recipient_id <> old.recipient_id
     or new.content <> old.content or new.created_at <> old.created_at then
    raise exception 'Only read_at can be updated';
  end if;
  return new;
end;
$$;
-- 4) username index
drop index if exists public.profiles_username_lower_idx;
-- 5) bucket limits removed
update storage.buckets set file_size_limit = null, allowed_mime_types = null where id in ('avatars', 'post-images', 'chat-images');
-- 6) stats (the API falls back to its slower path automatically)
drop function if exists public.user_total_likes(uuid);
drop index if exists public.posts_author_idx;
