-- Sheen schema v9: follows. Run AFTER schema.sql + schema-v2.sql. Safe to re-run.
create table if not exists public.follows (
  follower_id uuid not null references auth.users(id) on delete cascade,
  followee_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followee_id),
  check (follower_id <> followee_id)
);
create index if not exists follows_followee_idx on public.follows (followee_id);
alter table public.follows enable row level security;
drop policy if exists "follows readable" on public.follows;
create policy "follows readable" on public.follows for select to authenticated using (true);
drop policy if exists "follow as self" on public.follows;
create policy "follow as self" on public.follows for insert to authenticated with check (follower_id = auth.uid());
drop policy if exists "unfollow as self" on public.follows;
create policy "unfollow as self" on public.follows for delete to authenticated using (follower_id = auth.uid());
