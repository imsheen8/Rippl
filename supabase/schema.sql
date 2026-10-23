-- Rippl MVP schema for Supabase (PostgreSQL)
-- Run this whole file in Supabase Dashboard > SQL Editor > New query.
-- Security note: RLS is enabled. Never put the service_role key in index.html.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  display_name text not null default 'Rippl User',
  avatar_url text,
  bio text not null default '',
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    'user_' || substr(replace(new.id::text, '-', ''), 1, 12),
    coalesce(nullif(new.raw_user_meta_data->>'display_name', ''), 'Rippl User')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

create table if not exists public.servers (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 80),
  description text not null default '',
  owner_id uuid not null references auth.users(id) on delete cascade,
  is_public boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.server_members (
  server_id uuid not null references public.servers(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner','admin','moderator','member')),
  joined_at timestamptz not null default now(),
  primary key (server_id, user_id)
);

create table if not exists public.channels (
  id uuid primary key default gen_random_uuid(),
  server_id uuid not null references public.servers(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  topic text not null default '',
  channel_type text not null default 'text' check (channel_type in ('text','announcement')),
  position integer not null default 0,
  created_at timestamptz not null default now(),
  unique (server_id, name)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references public.channels(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  content text not null check (char_length(content) between 1 and 4000),
  created_at timestamptz not null default now(),
  edited_at timestamptz
);

create index if not exists channels_server_id_idx on public.channels(server_id, position);
create index if not exists messages_channel_created_idx on public.messages(channel_id, created_at desc);
create index if not exists server_members_user_idx on public.server_members(user_id);

-- Helper functions avoid recursive RLS policies on server_members.
create or replace function public.is_server_member(target_server uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.server_members sm
    where sm.server_id = target_server and sm.user_id = auth.uid()
  );
$$;

create or replace function public.is_server_admin(target_server uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.server_members sm
    where sm.server_id = target_server
      and sm.user_id = auth.uid()
      and sm.role in ('owner','admin','moderator')
  );
$$;

create or replace function public.add_server_owner()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  insert into public.server_members (server_id, user_id, role)
  values (new.id, new.owner_id, 'owner')
  on conflict (server_id, user_id) do nothing;
  insert into public.channels (server_id, name, topic, position)
  values (new.id, 'general', 'General discussion', 0)
  on conflict (server_id, name) do nothing;
  return new;
end;
$$;

drop trigger if exists on_server_created on public.servers;
create trigger on_server_created
after insert on public.servers
for each row execute procedure public.add_server_owner();

alter table public.profiles enable row level security;
alter table public.servers enable row level security;
alter table public.server_members enable row level security;
alter table public.channels enable row level security;
alter table public.messages enable row level security;

-- Profiles: authenticated users can view public profile fields; each user edits only their own.
drop policy if exists "profiles readable by authenticated" on public.profiles;
create policy "profiles readable by authenticated"
on public.profiles for select to authenticated using (true);

drop policy if exists "users update own profile" on public.profiles;
create policy "users update own profile"
on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "users insert own profile" on public.profiles;
create policy "users insert own profile"
on public.profiles for insert to authenticated with check (id = auth.uid());

-- Servers: members can read; any signed-in user can create a public server and becomes owner.
drop policy if exists "members read server" on public.servers;
create policy "members read server"
on public.servers for select to authenticated using (public.is_server_member(id) or is_public = true);

drop policy if exists "authenticated create server" on public.servers;
create policy "authenticated create server"
on public.servers for insert to authenticated with check (owner_id = auth.uid());

drop policy if exists "admins update server" on public.servers;
create policy "admins update server"
on public.servers for update to authenticated using (public.is_server_admin(id)) with check (public.is_server_admin(id));

drop policy if exists "owner delete server" on public.servers;
create policy "owner delete server"
on public.servers for delete to authenticated using (owner_id = auth.uid());

-- MVP joining: authenticated users may join public servers. Private invite flow will be added later.
drop policy if exists "members view roster" on public.server_members;
create policy "members view roster"
on public.server_members for select to authenticated using (public.is_server_member(server_id));

drop policy if exists "join public server as self" on public.server_members;
create policy "join public server as self"
on public.server_members for insert to authenticated
with check (user_id = auth.uid() and exists (
  select 1 from public.servers s where s.id = server_id and s.is_public = true
));

drop policy if exists "admins manage members" on public.server_members;
create policy "admins manage members"
on public.server_members for delete to authenticated using (
  public.is_server_admin(server_id) or user_id = auth.uid()
);

-- Channels and messages are accessible only to members of their server.
drop policy if exists "members read channels" on public.channels;
create policy "members read channels"
on public.channels for select to authenticated using (public.is_server_member(server_id));

drop policy if exists "admins create channels" on public.channels;
create policy "admins create channels"
on public.channels for insert to authenticated with check (public.is_server_admin(server_id));

drop policy if exists "admins update channels" on public.channels;
create policy "admins update channels"
on public.channels for update to authenticated using (public.is_server_admin(server_id)) with check (public.is_server_admin(server_id));

drop policy if exists "admins delete channels" on public.channels;
create policy "admins delete channels"
on public.channels for delete to authenticated using (public.is_server_admin(server_id));

drop policy if exists "members read messages" on public.messages;
create policy "members read messages"
on public.messages for select to authenticated using (
  exists (
    select 1 from public.channels c
    where c.id = channel_id and public.is_server_member(c.server_id)
  )
);

drop policy if exists "members send own messages" on public.messages;
create policy "members send own messages"
on public.messages for insert to authenticated with check (
  author_id = auth.uid() and exists (
    select 1 from public.channels c
    where c.id = channel_id and public.is_server_member(c.server_id)
  )
);

drop policy if exists "authors edit own messages" on public.messages;
create policy "authors edit own messages"
on public.messages for update to authenticated using (author_id = auth.uid()) with check (author_id = auth.uid());

drop policy if exists "authors or admins delete messages" on public.messages;
create policy "authors or admins delete messages"
on public.messages for delete to authenticated using (
  author_id = auth.uid() or exists (
    select 1 from public.channels c
    where c.id = channel_id and public.is_server_admin(c.server_id)
  )
);

-- To enable realtime message updates in Supabase:
-- Dashboard > Database > Publications > supabase_realtime > add public.messages
