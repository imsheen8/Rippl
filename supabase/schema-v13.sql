-- Rippl schema v13: PUSH EVERYTHING (run once in the Supabase SQL editor). Safe to re-run.
-- The app no longer asks the server "is there anything new?" on a timer. The server pushes every change.
-- v11 already pushes posts, likes, comments, follows, friend requests, profiles and messages.
-- This adds the rest: servers/groups, who is a member, and channels.
do $$
declare t text;
begin
  foreach t in array array['servers','server_members','channels'] loop
    if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename=t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

-- Lets DELETE events carry the full old row (so an unfollow / removed member / deleted channel can be applied live).
alter table public.follows replica identity full;
alter table public.server_members replica identity full;
alter table public.channels replica identity full;
alter table public.servers replica identity full;
