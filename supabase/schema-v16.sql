-- Rippl schema v16: security hardening + stats function. REVIEW BEFORE RUNNING, then run once in the Supabase SQL editor.
-- Run AFTER schema.sql … schema-v15.sql. Safe to re-run. It changes no table or column names and deletes no data.
--
--  1) A server's owner can no longer be changed, and only the owner can switch a server public/private.
--  2) Member removal now respects rank (moderator < admin < owner); the owner cannot leave/be removed (delete the server instead).
--  3) Direct messages: the recipient can only mark a message read (cannot rewrite image_url or un-read it).
--  4) Usernames are unique ignoring letter case (matches the sign-up availability check).
--  5) Image buckets accept only JPEG/PNG/WebP up to 5 MB (the app only uploads re-encoded JPEGs).
--  6) user_total_likes(): one fast query used by the Rippl API for the profile "Likes" number.

-- 1) servers: protect owner_id and visibility ------------------------------------------------
create or replace function public.servers_guard_update()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.owner_id is distinct from old.owner_id then
    raise exception 'The server owner cannot be changed';
  end if;
  if new.is_public is distinct from old.is_public and old.owner_id is distinct from auth.uid() then
    raise exception 'Only the owner can change whether a server is public';
  end if;
  return new;
end;
$$;
drop trigger if exists servers_guard_update on public.servers;
create trigger servers_guard_update before update on public.servers
for each row execute procedure public.servers_guard_update();

-- 2) server_members: rank-aware removal ------------------------------------------------------
create or replace function public.my_server_role(target_server uuid)
returns text language sql stable security definer set search_path = '' as $$
  select sm.role from public.server_members sm where sm.server_id = target_server and sm.user_id = auth.uid();
$$;

revoke execute on function public.my_server_role(uuid) from public, anon;
grant execute on function public.my_server_role(uuid) to authenticated;

drop policy if exists "admins manage members" on public.server_members;
drop policy if exists "remove members by rank" on public.server_members;
create policy "remove members by rank" on public.server_members for delete to authenticated using (
  (user_id = auth.uid() and role <> 'owner')                                   -- leave a server (not the owner)
  or (user_id <> auth.uid() and (
        public.my_server_role(server_id) = 'owner'                               -- owner removes anyone else
     or (public.my_server_role(server_id) = 'admin'     and role in ('moderator', 'member'))
     or (public.my_server_role(server_id) = 'moderator' and role = 'member')
  ))
);

-- 3) dm_messages: recipient may only set read_at (once) ---------------------------------------
create or replace function public.dm_guard_update()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.sender_id <> old.sender_id
     or new.recipient_id <> old.recipient_id
     or new.content <> old.content
     or new.created_at <> old.created_at
     or new.image_url is distinct from old.image_url then
    raise exception 'Only read_at can be updated';
  end if;
  if old.read_at is not null and new.read_at is distinct from old.read_at then
    raise exception 'A message that was read cannot be changed back';
  end if;
  return new;
end;
$$;

-- 4) usernames unique ignoring case (skipped with a notice if case-variant duplicates already exist) ----
do $$
begin
  if exists (select 1 from public.profiles where username is not null group by lower(username) having count(*) > 1) then
    raise notice 'profiles_username_lower_idx NOT created: some usernames differ only by letter case. Fix them, then re-run this file.';
  else
    create unique index if not exists profiles_username_lower_idx on public.profiles (lower(username)) where username is not null;
  end if;
end $$;

-- 5) storage buckets: type and size limits ----------------------------------------------------
update storage.buckets
set file_size_limit = 5242880, allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
where id in ('avatars', 'post-images', 'chat-images');

-- 6) stats ------------------------------------------------------------------------------------
create index if not exists posts_author_idx on public.posts (author_id, created_at desc);
create or replace function public.user_total_likes(uid uuid)
returns bigint language sql stable security invoker set search_path = '' as $$
  select count(*) from public.post_likes pl join public.posts p on p.id = pl.post_id where p.author_id = uid;
$$;
revoke execute on function public.user_total_likes(uuid) from public, anon;
grant execute on function public.user_total_likes(uuid) to authenticated;
