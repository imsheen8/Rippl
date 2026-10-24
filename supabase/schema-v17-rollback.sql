-- Rollback for schema-v17.sql. Removes the verification badge data. Run ONLY if v17 caused a problem.
drop trigger if exists profiles_guard_verified on public.profiles;
drop function if exists public.profiles_guard_verified();
drop index if exists public.profiles_verified_idx;
alter table public.profiles drop column if exists verified;
