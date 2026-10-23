-- Rippl schema v15: connections screen (Following / Followers / Friends / Suggested).
-- Run once in the Supabase SQL editor AFTER schema-v9.sql (follows). Safe to re-run.

-- 1) "Remove this follower": the person being followed may delete the follow row that points at them.
--    (v9 only lets the follower delete their own row, i.e. unfollow.)
drop policy if exists "remove follower" on public.follows;
create policy "remove follower" on public.follows
  for delete to authenticated using (followee_id = auth.uid());

-- 2) "Customize name": a private nickname that only the owner sees.
create table if not exists public.follow_nicknames (
  owner_id  uuid not null references auth.users(id) on delete cascade,
  target_id uuid not null references auth.users(id) on delete cascade,
  nickname  text not null check (char_length(nickname) between 1 and 30),
  updated_at timestamptz not null default now(),
  primary key (owner_id, target_id),
  check (owner_id <> target_id)
);
alter table public.follow_nicknames enable row level security;

drop policy if exists "nick read own" on public.follow_nicknames;
create policy "nick read own" on public.follow_nicknames
  for select to authenticated using (owner_id = auth.uid());
drop policy if exists "nick insert own" on public.follow_nicknames;
create policy "nick insert own" on public.follow_nicknames
  for insert to authenticated with check (owner_id = auth.uid());
drop policy if exists "nick update own" on public.follow_nicknames;
create policy "nick update own" on public.follow_nicknames
  for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
drop policy if exists "nick delete own" on public.follow_nicknames;
create policy "nick delete own" on public.follow_nicknames
  for delete to authenticated using (owner_id = auth.uid());
