-- Sheen schema v8: posts, likes, comments, post images. Run AFTER schema.sql + schema-v2.sql. Safe to re-run.

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users(id) on delete cascade,
  content text not null default '' check (char_length(content) <= 4000),
  image_url text,
  created_at timestamptz not null default now(),
  check (char_length(content) > 0 or image_url is not null)
);
create index if not exists posts_created_idx on public.posts (created_at desc);

create table if not exists public.post_likes (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table if not exists public.post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  content text not null check (char_length(content) between 1 and 1000),
  created_at timestamptz not null default now()
);
create index if not exists post_comments_post_idx on public.post_comments (post_id, created_at);

alter table public.posts enable row level security;
alter table public.post_likes enable row level security;
alter table public.post_comments enable row level security;

drop policy if exists "posts readable" on public.posts;
create policy "posts readable" on public.posts for select to authenticated using (true);
drop policy if exists "posts insert own" on public.posts;
create policy "posts insert own" on public.posts for insert to authenticated with check (author_id = auth.uid());
drop policy if exists "posts delete own" on public.posts;
create policy "posts delete own" on public.posts for delete to authenticated using (author_id = auth.uid());

drop policy if exists "likes readable" on public.post_likes;
create policy "likes readable" on public.post_likes for select to authenticated using (true);
drop policy if exists "likes insert own" on public.post_likes;
create policy "likes insert own" on public.post_likes for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "likes delete own" on public.post_likes;
create policy "likes delete own" on public.post_likes for delete to authenticated using (user_id = auth.uid());

drop policy if exists "comments readable" on public.post_comments;
create policy "comments readable" on public.post_comments for select to authenticated using (true);
drop policy if exists "comments insert own" on public.post_comments;
create policy "comments insert own" on public.post_comments for insert to authenticated with check (author_id = auth.uid());
drop policy if exists "comments delete own or post owner" on public.post_comments;
create policy "comments delete own or post owner" on public.post_comments for delete to authenticated
using (author_id = auth.uid() or exists (select 1 from public.posts p where p.id = post_id and p.author_id = auth.uid()));

-- Post images: public bucket, each user writes only inside their own folder (<user_id>/<file>)
insert into storage.buckets (id, name, public) values ('post-images', 'post-images', true) on conflict (id) do nothing;
drop policy if exists "post images public read" on storage.objects;
create policy "post images public read" on storage.objects for select using (bucket_id = 'post-images');
drop policy if exists "post images upload own folder" on storage.objects;
create policy "post images upload own folder" on storage.objects for insert to authenticated
with check (bucket_id = 'post-images' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "post images delete own folder" on storage.objects;
create policy "post images delete own folder" on storage.objects for delete to authenticated
using (bucket_id = 'post-images' and (storage.foldername(name))[1] = auth.uid()::text);
