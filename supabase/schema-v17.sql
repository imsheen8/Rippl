-- Rippl schema v17: verification badge (✓). REVIEW BEFORE RUNNING, then run once in the Supabase SQL editor.
-- Safe to re-run. It only ADDS a column and a guard; it changes no existing column and deletes no data.
--
--  * profiles.verified (boolean, default false): shown as a blue ✓ next to the user's name in the app.
--  * Members can NOT set or change it themselves (a guard rejects it). Only the Rippl team can, through the
--    admin panel of the Rippl API (service role), or by hand in the SQL editor.

alter table public.profiles add column if not exists verified boolean not null default false;

create or replace function public.profiles_guard_verified()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    if new.verified and auth.role() in ('authenticated', 'anon') then new.verified := false; end if;
  elsif new.verified is distinct from old.verified and auth.role() in ('authenticated', 'anon') then
    raise exception 'Only the Rippl team can change verification';
  end if;
  return new;
end;
$$;
drop trigger if exists profiles_guard_verified on public.profiles;
create trigger profiles_guard_verified before insert or update on public.profiles
for each row execute procedure public.profiles_guard_verified();

create index if not exists profiles_verified_idx on public.profiles (id) where verified;
