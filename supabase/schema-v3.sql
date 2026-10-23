-- Sheen schema v3 (patch): new accounts start with an EMPTY profile.
-- Run AFTER schema.sql and schema-v2.sql. Safe to run more than once.

-- 1) New accounts get no auto-generated name or username.
alter table public.profiles alter column display_name set default '';

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

-- 2) Clear values that were generated automatically for existing accounts.
--    (Names/usernames you chose yourself are not touched.)
update public.profiles set display_name = '' where display_name = 'Sheen User';
update public.profiles set username = null where username ~ '^user_[0-9a-f]{12}$';
