-- Moderator accounts: who may sign in to /admin (with Google), and their sign-in sessions.
-- Applied by `npm run db:migrate`. New tables only; nothing existing changes.
--
-- The owner (OWNER_EMAIL, set on the server) is added here on first sign-in and can add or
-- remove everyone else. Removing a moderator deletes their row, which ends their sessions too.

create table public.moderators (
  email     text primary key,                 -- lowercased; the Google account's verified email
  name      text not null default '',
  role      text not null default 'moderator',
  added_at  timestamptz not null default now(),
  added_by  text not null,

  constraint moderators_role_check check (role in ('owner', 'moderator')),
  constraint moderators_email_lowercase check (email = lower(email))
);

-- Only a hash of each session token is stored, so a leaked table can't be used to sign in.
create table public.moderator_sessions (
  token_hash  text primary key,
  email       text not null references public.moderators (email) on delete cascade,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null
);

create index moderator_sessions_email_idx on public.moderator_sessions (email);

-- Lock down like the other migrations: RLS on with no policies; hosted-API browser roles get nothing.
alter table public.moderators         enable row level security;
alter table public.moderator_sessions enable row level security;

do $$
declare
  r text;
begin
  foreach r in array array['anon', 'anonymous', 'authenticated'] loop
    if exists (select 1 from pg_roles where rolname = r) then
      execute format('revoke all on public.moderators, public.moderator_sessions from %I', r);
    end if;
  end loop;
end
$$;
