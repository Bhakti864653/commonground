-- CommonGround: communities created at runtime, moderators' source/contact changes, and
-- "ask for CommonGround in my place" requests (previously in memory only).
--
-- The built-in communities (src/data/communities: Santiago de Veraguas, the fictional demo)
-- stay in code and are never stored here; the app lists them first, then these. Each config is
-- stored whole as jsonb and validated by CommunityConfigSchema when read. Applied by
-- `npm run db:migrate`. Same privacy lock-down as 0001_init.sql.

-- ---------------------------------------------------------------------------------------------
-- Communities created by a moderator (/admin/communities) or started by a visitor adding a place.
-- name_key and case_prefix are unique so two servers can't create the same place twice or two
-- communities whose case numbers would collide (the app checks the built-ins itself).
-- ---------------------------------------------------------------------------------------------
create table public.communities (
  id          text primary key,
  seq         bigint generated always as identity,
  name_key    text not null unique,      -- accent/case-insensitive display name
  case_prefix text not null unique,      -- casePrefix(id), e.g. "CDP"
  status      text not null,
  config      jsonb not null,            -- the full CommunityConfig
  created_at  timestamptz not null default now(),

  constraint communities_status_check check (status in ('pilot', 'active', 'demo', 'starter'))
);

-- ---------------------------------------------------------------------------------------------
-- A moderator's changes to a community's sources and contacts (/admin/sources). Keyed by
-- community id with no foreign key, because built-in communities (not in the table above) can
-- be changed too. Same shape as the in-memory store's overrides.
-- ---------------------------------------------------------------------------------------------
create table public.community_info_overrides (
  community_id text primary key,
  sources      jsonb not null default '[]'::jsonb,   -- added SourceConfig entries
  contacts     jsonb not null default '[]'::jsonb,   -- added ContactConfig entries
  removed_ids  jsonb not null default '[]'::jsonb,   -- ids removed (built in or added)
  reverified   jsonb not null default '{}'::jsonb    -- entry id -> date a reviewer re-checked it
);

create table public.community_info_log (
  id           uuid primary key default gen_random_uuid(),
  seq          bigint generated always as identity,
  community_id text not null,
  action       text not null,
  detail       text not null,                        -- the entry's name, never anything private
  actor_id     text not null,
  occurred_at  timestamptz not null default now(),

  constraint community_info_log_action_check check (action in (
    'add_source', 'remove_source', 'add_contact', 'remove_contact', 'reverify_source', 'reverify_contact'
  ))
);

-- ---------------------------------------------------------------------------------------------
-- Anonymous requests for CommonGround in a place that isn't set up. No name or contact details
-- exist to store. The app keeps the newest 1,000 (an anonymous endpoint must not grow forever).
-- ---------------------------------------------------------------------------------------------
create table public.community_requests (
  id         uuid primary key default gen_random_uuid(),
  seq        bigint generated always as identity,
  place_name text not null,
  parts      jsonb,
  place_key  text not null,
  note       text,
  language   text not null,
  created_at timestamptz not null default now(),

  constraint community_requests_place_name_length check (char_length(place_name) between 1 and 250),
  constraint community_requests_note_length check (note is null or char_length(note) <= 500),
  constraint community_requests_language_check check (language in ('es', 'en', 'pt', 'fr', 'zh', 'hi', 'it'))
);

create index community_requests_place_key_idx on public.community_requests (place_key);

-- ---------------------------------------------------------------------------------------------
-- Lock down like 0001_init.sql: RLS on with no policies; hosted-API browser roles get nothing.
-- ---------------------------------------------------------------------------------------------
alter table public.communities              enable row level security;
alter table public.community_info_overrides enable row level security;
alter table public.community_info_log       enable row level security;
alter table public.community_requests       enable row level security;

do $$
declare
  r text;
begin
  foreach r in array array['anon', 'anonymous', 'authenticated'] loop
    if exists (select 1 from pg_roles where rolname = r) then
      execute format(
        'revoke all on public.communities, public.community_info_overrides, public.community_info_log,
           public.community_requests from %I', r);
    end if;
  end loop;
end
$$;
