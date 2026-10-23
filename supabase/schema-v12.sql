-- Sheen schema v12: new accounts start as "Online" (instead of "Invisible").
-- Run once in the Supabase SQL editor. Safe to re-run.
alter table public.profiles alter column status set default 'online';

-- OPTIONAL: switch every existing account that is currently "invisible" to "online".
-- This overrides people who chose Invisible on purpose, so it is left commented out.
-- Remove the two dashes in front of the next line to run it.
-- update public.profiles set status = 'online' where status = 'invisible';
