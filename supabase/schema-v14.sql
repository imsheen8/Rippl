-- v14: username availability check for the sign-up screen
-- Run once in Supabase Dashboard > SQL Editor. Safe to re-run.
-- Lets the sign-up form tell people "that username is taken" BEFORE the account is created.
create or replace function public.username_available(u text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select not exists (select 1 from public.profiles where lower(username) = lower(u));
$$;

grant execute on function public.username_available(text) to anon, authenticated;
