-- Sheen schema v11: REALTIME (run this once in the Supabase SQL editor).
-- Makes posts, likes, comments, follows, friend requests and profile changes arrive instantly.
-- Safe to re-run.
do $$
declare t text;
begin
  foreach t in array array['posts','post_likes','post_comments','follows','friendships','profiles','messages','dm_messages'] loop
    if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename=t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

-- Lets DELETE events carry the full old row (so a removed like/comment can be applied live).
alter table public.posts replica identity full;
alter table public.post_likes replica identity full;
alter table public.post_comments replica identity full;
alter table public.friendships replica identity full;
alter table public.dm_messages replica identity full;
