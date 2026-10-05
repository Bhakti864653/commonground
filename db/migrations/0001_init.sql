-- CommonGround: cases and everything attached to them.
--
-- Applied by `npm run db:migrate` (scripts/db.mjs), which records it in schema_migrations so it
-- runs once. Then `npm run db:seed` adds the demonstration cases (db/seed.sql). Plain Postgres:
-- runs on Neon (production), PGlite (tests), or any Postgres 13+.
--
-- Mirrors the Zod schemas in src/lib/schema/report.ts. The allowed values in each CHECK
-- constraint must match those schemas; src/lib/store/__tests__/db-sql.test.ts fails if
-- they drift apart. Timestamps are timestamptz (stored in UTC). Small objects that always travel
-- with a case (its approximate area, consent record, image metadata...) are jsonb columns.
--
-- Privacy: only the app's server connects, as the database owner, with DATABASE_URL (a
-- server-only secret; nothing in the browser can reach the database). As a safety net, Row
-- Level Security is ON for every table with NO policies — any other role that ever gets access
-- (e.g. if a hosted "Data API" is switched on) sees nothing. The owner bypasses RLS, so the
-- app is unaffected. Private fields (management_token, notes, moderation actions, suggestions,
-- flags) never need a policy because nothing else can reach them.

-- ---------------------------------------------------------------------------------------------
-- Cases
-- ---------------------------------------------------------------------------------------------
create table public.cases (
  id                 uuid primary key default gen_random_uuid(),
  case_number        text not null unique,          -- "SV-2026-0001"; unique across every server
  community_id       text not null,
  type               text not null,
  category_id        text not null,
  description        text not null,
  approximate_area   jsonb not null,                -- never an exact address
  created_at         timestamptz not null default now(),
  status             text not null default 'received',
  verification_state text not null,
  source_type        text not null,
  verified_source    jsonb,
  image              jsonb,                         -- metadata only; the image itself is never kept
  consent            jsonb not null,
  is_duplicate_of    text,
  deleted_at         timestamptz,
  removal            jsonb,
  management_token   text not null,                 -- private: proof of ownership, never public

  constraint cases_type_check check (type in ('report', 'proposal')),
  constraint cases_description_length check (char_length(description) between 1 and 2000),
  constraint cases_status_check check (status in (
    'received', 'under_review', 'in_discussion', 'referred', 'in_progress', 'updated', 'closed', 'not_verifiable'
  )),
  constraint cases_verification_state_check check (verification_state in (
    'community_report', 'officially_verified', 'needs_verification', 'demonstration_data'
  )),
  constraint cases_source_type_check check (source_type in ('community', 'demonstration'))
);

create index cases_community_created_idx on public.cases (community_id, created_at desc);

-- ---------------------------------------------------------------------------------------------
-- Public timeline (statusHistory). `seq` keeps insertion order, like the in-memory array, even
-- when two entries share a timestamp (the AI's "prepared" and "awaiting approval" steps do).
-- ---------------------------------------------------------------------------------------------
create table public.case_events (
  id          uuid primary key default gen_random_uuid(),
  seq         bigint generated always as identity,
  case_id     uuid not null references public.cases (id) on delete cascade,
  occurred_at timestamptz not null default now(),
  status      text not null,
  actor_type  text not null,
  kind        text,                                  -- null means a status change
  contact_id  text,
  note        text,
  note_es     text,
  notes       jsonb,

  constraint case_events_status_check check (status in (
    'received', 'under_review', 'in_discussion', 'referred', 'in_progress', 'updated', 'closed', 'not_verifiable'
  )),
  constraint case_events_actor_type_check check (actor_type in ('system', 'moderator', 'verified_source', 'agent')),
  constraint case_events_kind_check check (kind is null or kind in (
    'status', 'ai_reviewed', 'referral_prepared', 'awaiting_approval', 'referral_approved', 'referral_declined'
  ))
);

create index case_events_case_idx on public.case_events (case_id, seq);

-- ---------------------------------------------------------------------------------------------
-- Private to moderators: AI suggestions, moderation log, notes, residents' inaccuracy flags.
-- ---------------------------------------------------------------------------------------------
create table public.agent_suggestions (
  id              uuid primary key default gen_random_uuid(),
  seq             bigint generated always as identity,
  case_id         uuid not null references public.cases (id) on delete cascade,
  kind            text not null,
  suggested_value text not null,
  reasoning       text not null,
  status          text not null default 'pending',
  created_at      timestamptz not null default now(),
  reviewed_at     timestamptz,
  referral        jsonb,                             -- office, urgency, reason, Spanish message

  constraint agent_suggestions_kind_check check (kind in ('duplicate', 'status', 'verification', 'referral')),
  constraint agent_suggestions_status_check check (status in ('pending', 'approved', 'rejected'))
);

create index agent_suggestions_case_idx on public.agent_suggestions (case_id, seq);

create table public.moderation_actions (
  id          uuid primary key default gen_random_uuid(),
  seq         bigint generated always as identity,
  case_id     uuid not null references public.cases (id) on delete cascade,
  actor_id    text not null,
  actor_email text,
  action      text not null,
  occurred_at timestamptz not null default now(),
  detail      text,

  constraint moderation_actions_action_check check (action in (
    'status_change', 'mark_duplicate', 'mark_verified', 'mark_unverified', 'add_source',
    'remove_content', 'restore_content', 'add_note', 'approve_referral', 'reject_referral'
  ))
);

create index moderation_actions_case_idx on public.moderation_actions (case_id, seq);

create table public.admin_notes (
  id         uuid primary key default gen_random_uuid(),
  seq        bigint generated always as identity,
  case_id    uuid not null references public.cases (id) on delete cascade,
  author_id  text not null,
  note       text not null,
  created_at timestamptz not null default now()
);

create index admin_notes_case_idx on public.admin_notes (case_id, seq);

create table public.inaccuracy_flags (
  id          uuid primary key default gen_random_uuid(),
  seq         bigint generated always as identity,
  case_id     uuid not null references public.cases (id) on delete cascade,
  note        text,
  occurred_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create index inaccuracy_flags_case_idx on public.inaccuracy_flags (case_id, seq);

-- ---------------------------------------------------------------------------------------------
-- Case numbers: one counter row per community per year.
-- ---------------------------------------------------------------------------------------------
create table public.case_number_counters (
  community_id text not null,
  year         integer not null,
  last_value   integer not null,
  primary key (community_id, year)
);

-- ---------------------------------------------------------------------------------------------
-- create_case: numbers and inserts a case, plus its first "received" timeline entry, in ONE
-- transaction (a function body always runs as one).
--
-- The counter upsert locks that community+year's row until the transaction ends, so two
-- servers submitting at the same moment get consecutive numbers — never the same one. If
-- anything fails, the whole thing rolls back, so no number is used up by a failed insert.
-- The unique constraint on cases.case_number is a second safety net.
--
-- The app computes the prefix ("SV") with casePrefix() in format-case-number.ts, the same code
-- the in-memory store uses, so both stores number cases identically.
-- ---------------------------------------------------------------------------------------------
create function public.create_case(
  p_community_id       text,
  p_case_prefix        text,
  p_type               text,
  p_category_id        text,
  p_description        text,
  p_approximate_area   jsonb,
  p_created_at         timestamptz,
  p_verification_state text,
  p_source_type        text,
  p_image              jsonb,
  p_consent            jsonb,
  p_management_token   text
)
returns table (id uuid, case_number text)
language plpgsql
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_year   integer := extract(year from p_created_at at time zone 'utc');
  v_seq    integer;
  v_number text;
  v_id     uuid;
begin
  insert into public.case_number_counters as c (community_id, year, last_value)
  values (p_community_id, v_year, 1)
  on conflict (community_id, year) do update set last_value = c.last_value + 1
  returning c.last_value into v_seq;

  -- Zero-padded to at least 4 digits, never truncated (lpad would cut "12345" to "1234").
  v_number := p_case_prefix || '-' || v_year || '-' ||
    case when v_seq < 10000 then lpad(v_seq::text, 4, '0') else v_seq::text end;

  insert into public.cases (
    case_number, community_id, type, category_id, description, approximate_area, created_at,
    status, verification_state, source_type, image, consent, management_token
  ) values (
    v_number, p_community_id, p_type, p_category_id, p_description, p_approximate_area, p_created_at,
    'received', p_verification_state, p_source_type, p_image, p_consent, p_management_token
  )
  returning cases.id into v_id;

  insert into public.case_events (case_id, occurred_at, status, actor_type)
  values (v_id, p_created_at, 'received', 'system');

  return query select v_id, v_number;
end;
$$;

-- ---------------------------------------------------------------------------------------------
-- Lock everything down: RLS on with no policies; no one but the owner may create cases; and
-- the roles hosted APIs hand to browsers (Supabase's anon/authenticated, Neon Data API's
-- anonymous/authenticated) get nothing, if they exist on this server.
-- ---------------------------------------------------------------------------------------------
alter table public.cases                enable row level security;
alter table public.case_events          enable row level security;
alter table public.agent_suggestions    enable row level security;
alter table public.moderation_actions   enable row level security;
alter table public.admin_notes          enable row level security;
alter table public.inaccuracy_flags     enable row level security;
alter table public.case_number_counters enable row level security;

-- New functions are executable by everyone (PUBLIC) by default; only the owner may create cases.
revoke execute on function public.create_case(
  text, text, text, text, text, jsonb, timestamptz, text, text, jsonb, jsonb, text
) from public;

do $$
declare
  r text;
begin
  foreach r in array array['anon', 'anonymous', 'authenticated'] loop
    if exists (select 1 from pg_roles where rolname = r) then
      execute format(
        'revoke all on public.cases, public.case_events, public.agent_suggestions, public.moderation_actions,
           public.admin_notes, public.inaccuracy_flags, public.case_number_counters from %I', r);
      execute format(
        'revoke execute on function public.create_case(text, text, text, text, text, jsonb, timestamptz, text, text, jsonb, jsonb, text) from %I', r);
    end if;
  end loop;
end
$$;
