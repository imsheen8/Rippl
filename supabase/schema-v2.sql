-- Rippl schema v2 (patch). Run AFTER schema.sql, in Supabase SQL Editor.
-- Safe to run more than once.

-- =====================================================
-- 1) Security fixes
-- =====================================================

-- 1a) Joining a server: role must be 'member' (prevents self-promotion to owner/admin).
drop policy if exists "join public server as self" on public.server_members;
create policy "join public server as self"
on public.server_members for insert to authenticated
with check (
  user_id = auth.uid()
  and role = 'member'
  and exists (select 1 from public.servers s where s.id = server_id and s.is_public = true)
);

-- 1b) Only the owner can change roles; nobody can create/demote the owner role this way.
create or replace function public.is_server_owner(target_server uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.server_members sm
    where sm.server_id = target_server and sm.user_id = auth.uid() and sm.role = 'owner'
  );
$$;

drop policy if exists "owner changes roles" on public.server_members;
create policy "owner changes roles"
on public.server_members for update to authenticated
using (public.is_server_owner(server_id) and role <> 'owner')
with check (public.is_server_owner(server_id) and role <> 'owner');

-- 1c) Admins can remove members, but never the owner. Anyone can leave (except the owner).
drop policy if exists "admins manage members" on public.server_members;
create policy "admins manage members"
on public.server_members for delete to authenticated
using (
  role <> 'owner'
  and (public.is_server_admin(server_id) or user_id = auth.uid())
);

-- 1d) Messages: edits only by the author, only while still a member, and only content may change.
drop policy if exists "authors edit own messages" on public.messages;
create policy "authors edit own messages"
on public.messages for update to authenticated
using (
  author_id = auth.uid()
  and exists (select 1 from public.channels c where c.id = channel_id and public.is_server_member(c.server_id))
)
with check (author_id = auth.uid());

create or replace function public.messages_guard_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.channel_id is distinct from old.channel_id
     or new.author_id is distinct from old.author_id
     or new.created_at is distinct from old.created_at then
    raise exception 'Only message content can be edited';
  end if;
  if new.content is distinct from old.content then
    new.edited_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists messages_guard_update on public.messages;
create trigger messages_guard_update
before update on public.messages
for each row execute procedure public.messages_guard_update();

-- =====================================================
-- 2) Profiles: status, banner, username format
-- =====================================================

alter table public.profiles add column if not exists banner_url text;
alter table public.profiles add column if not exists status text not null default 'invisible';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_status_check') then
    alter table public.profiles
      add constraint profiles_status_check check (status in ('online','idle','dnd','invisible'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'profiles_username_format') then
    alter table public.profiles
      add constraint profiles_username_format check (username is null or username ~ '^[A-Za-z0-9_]{3,20}$');
  end if;
end $$;

-- =====================================================
-- 3) Friends
-- =====================================================

create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users(id) on delete cascade,
  addressee_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted')),
  created_at timestamptz not null default now(),
  check (requester_id <> addressee_id)
);

-- One relationship per pair, regardless of direction.
create unique index if not exists friendships_pair_idx
on public.friendships (least(requester_id, addressee_id), greatest(requester_id, addressee_id));
create index if not exists friendships_addressee_idx on public.friendships(addressee_id, status);

alter table public.friendships enable row level security;

drop policy if exists "see own friendships" on public.friendships;
create policy "see own friendships"
on public.friendships for select to authenticated
using (requester_id = auth.uid() or addressee_id = auth.uid());

drop policy if exists "send friend request" on public.friendships;
create policy "send friend request"
on public.friendships for insert to authenticated
with check (requester_id = auth.uid() and status = 'pending');

-- Only the person who received the request can accept it.
drop policy if exists "accept friend request" on public.friendships;
create policy "accept friend request"
on public.friendships for update to authenticated
using (addressee_id = auth.uid() and status = 'pending')
with check (addressee_id = auth.uid() and status = 'accepted');

drop policy if exists "remove friendship" on public.friendships;
create policy "remove friendship"
on public.friendships for delete to authenticated
using (requester_id = auth.uid() or addressee_id = auth.uid());

create or replace function public.friendships_guard_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.requester_id <> old.requester_id or new.addressee_id <> old.addressee_id then
    raise exception 'Cannot change friendship parties';
  end if;
  return new;
end;
$$;

drop trigger if exists friendships_guard_update on public.friendships;
create trigger friendships_guard_update
before update on public.friendships
for each row execute procedure public.friendships_guard_update();

create or replace function public.are_friends(a uuid, b uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.friendships f
    where f.status = 'accepted'
      and ((f.requester_id = a and f.addressee_id = b)
        or (f.requester_id = b and f.addressee_id = a))
  );
$$;

-- =====================================================
-- 4) Direct messages (friends only)
-- =====================================================

create table if not exists public.dm_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  content text not null check (char_length(content) between 1 and 4000),
  created_at timestamptz not null default now(),
  read_at timestamptz,
  check (sender_id <> recipient_id)
);

create index if not exists dm_pair_idx
on public.dm_messages (least(sender_id, recipient_id), greatest(sender_id, recipient_id), created_at desc);
create index if not exists dm_recipient_unread_idx
on public.dm_messages (recipient_id) where read_at is null;

alter table public.dm_messages enable row level security;

drop policy if exists "read own dms" on public.dm_messages;
create policy "read own dms"
on public.dm_messages for select to authenticated
using (sender_id = auth.uid() or recipient_id = auth.uid());

drop policy if exists "send dm to friend" on public.dm_messages;
create policy "send dm to friend"
on public.dm_messages for insert to authenticated
with check (sender_id = auth.uid() and public.are_friends(sender_id, recipient_id));

-- Recipient may update (to mark as read); trigger below limits it to read_at only.
drop policy if exists "recipient marks read" on public.dm_messages;
create policy "recipient marks read"
on public.dm_messages for update to authenticated
using (recipient_id = auth.uid())
with check (recipient_id = auth.uid());

drop policy if exists "sender deletes own dm" on public.dm_messages;
create policy "sender deletes own dm"
on public.dm_messages for delete to authenticated
using (sender_id = auth.uid());

create or replace function public.dm_guard_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.sender_id <> old.sender_id
     or new.recipient_id <> old.recipient_id
     or new.content <> old.content
     or new.created_at <> old.created_at then
    raise exception 'Only read_at can be updated';
  end if;
  return new;
end;
$$;

drop trigger if exists dm_guard_update on public.dm_messages;
create trigger dm_guard_update
before update on public.dm_messages
for each row execute procedure public.dm_guard_update();

-- =====================================================
-- 5) Storage: public avatars bucket, each user writes only to their own folder
--    File path must be:  <user_id>/<filename>
-- =====================================================

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "avatars public read" on storage.objects;
create policy "avatars public read"
on storage.objects for select
using (bucket_id = 'avatars');

drop policy if exists "avatars upload own folder" on storage.objects;
create policy "avatars upload own folder"
on storage.objects for insert to authenticated
with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatars update own folder" on storage.objects;
create policy "avatars update own folder"
on storage.objects for update to authenticated
using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatars delete own folder" on storage.objects;
create policy "avatars delete own folder"
on storage.objects for delete to authenticated
using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- =====================================================
-- 6) Realtime for chat tables
-- =====================================================

do $$
begin
  if not exists (select 1 from pg_publication_tables
                 where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages') then
    alter publication supabase_realtime add table public.messages;
  end if;
  if not exists (select 1 from pg_publication_tables
                 where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'dm_messages') then
    alter publication supabase_realtime add table public.dm_messages;
  end if;
end $$;
