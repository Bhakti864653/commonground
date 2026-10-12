import { DEMO_CASE_SEEDS, DEMO_COMMUNITY_ID } from "@/lib/store/demo-seed";
import { DEMO_PIPELINE_RECORDS, DEMO_MODERATOR, type DemoRecords } from "./demo-pipeline-records";
import { asTimelineNote } from "./demo-pipeline-data";

/**
 * SQL that adds the demonstration cases' example pipeline history (demo-pipeline-data.ts) — the
 * same records the in-memory store seeds. Used twice: at the end of db/seed.sql (fresh
 * databases) and in migration 0007 (databases seeded before the pipeline existed). Finds each
 * case by its fixed demo text, skips any case that already has pipeline state, and never touches
 * a resident's case. Times are anchored to each case's own creation time, like the in-memory store.
 */

const lit = (value: string) => `'${value.replace(/'/g, "''")}'`;
/** The production address, as publicCaseUrl() gives it without overrides. */
const SITE = "https://commonground-psi.vercel.app";

function at(caseDaysAgo: number, daysAgo: number): string {
  const offset = Math.round((caseDaysAgo - daysAgo) * 24 * 60 * 60);
  return `v_created + interval '${offset} seconds'`;
}

/** A JSON value with {CASE}/{URL}/{DUPn} placeholders, filled in SQL. */
function filledJson(value: unknown, dupCount: number): string {
  let expr = `replace(replace(${lit(JSON.stringify(value))}, '{CASE}', v_case), '{URL}', v_url)`;
  for (let i = 0; i < dupCount; i++) expr = `replace(${expr}, '{DUP${i}}', coalesce(v_dups[${i + 1}], ''))`;
  return `(${expr})::jsonb`;
}
function filledText(value: string, dupCount: number): string {
  return `(${filledJson(value, dupCount)} #>> '{}')`;
}

function block(r: DemoRecords): string {
  const caseSeed = DEMO_CASE_SEEDS.find((c) => c.description === r.description)!;
  const t = (daysAgo: number) => at(caseSeed.daysAgo, daysAgo);
  const opt = (daysAgo: number | undefined) => (daysAgo === undefined ? "null" : t(daysAgo));
  const dups = r.duplicateDescriptions.length;
  const lines = [
    `  -- ${caseSeed.type} · ${caseSeed.categoryId} · ${caseSeed.areaId}`,
    `  v_case := null;`,
    `  select case_number, id, created_at into v_case, v_case_id, v_created from public.cases`,
    `  where source_type = 'demonstration' and community_id = ${lit(DEMO_COMMUNITY_ID)}`,
    `    and description = ${lit(r.description)} and deleted_at is null`,
    `  order by created_at limit 1;`,
    `  if v_case is not null and not exists (select 1 from public.pipeline_case_state where case_number = v_case) then`,
    `    v_url := ${lit(SITE + "/cases/")} || v_case;`,
    `    v_dups := array[${
      r.duplicateDescriptions
        .map(
          (d) =>
            `(select case_number from public.cases where source_type = 'demonstration' and description = ${lit(d)} and deleted_at is null order by created_at limit 1)`,
        )
        .join(", ") || ""
    }]::text[];`,
    `    insert into public.pipeline_case_state (case_number, community_id, office_id, priority, routed_at, emergency, referral_queued_at, last_follow_up_at, last_progress_at)`,
    `    values (v_case, ${lit(DEMO_COMMUNITY_ID)}, ${r.state.officeId ? lit(r.state.officeId) : "null"}, ${r.state.priority ? lit(r.state.priority) : "null"}, ${opt(r.state.routedDaysAgo)}, false, ${opt(r.state.referralQueuedDaysAgo)}, ${opt(r.state.lastFollowUpDaysAgo)}, ${t(r.state.lastProgressDaysAgo)});`,
  ];
  for (const p of r.proposals) {
    lines.push(
      `    insert into public.pipeline_proposals (kind, case_number, community_id, status, created_at, reviewed_at, reviewed_by, payload, critique)`,
      `    values (${lit(p.kind)}, v_case, ${lit(DEMO_COMMUNITY_ID)}, ${lit(p.status)}, ${t(p.createdDaysAgo)}, ${opt(p.reviewedDaysAgo)}, ${
        p.reviewedDaysAgo === undefined ? "null" : lit(DEMO_MODERATOR)
      },`,
      `      ${filledJson(p.payload, dups)},`,
      `      ${lit(JSON.stringify(p.critique))}::jsonb);`,
    );
  }
  for (const o of r.outbox) {
    lines.push(
      `    insert into public.pipeline_outbox (case_number, community_id, office_id, kind, to_label, to_address, subject, body_es, created_at, approved_by)`,
      `    values (v_case, ${lit(DEMO_COMMUNITY_ID)}, ${lit(o.officeId)}, ${lit(o.kind)}, ${lit(o.toLabel)}, ${lit(o.toAddress)}, ${filledText(o.subject, dups)},`,
      `      ${filledText(o.bodyEs, dups)}, ${t(o.daysAgo)}, ${lit(DEMO_MODERATOR)});`,
    );
  }
  for (const a of r.audit) {
    lines.push(
      `    insert into public.agent_audit (case_number, community_id, occurred_at, actor_type, actor, action, summary)`,
      `    values (v_case, ${lit(DEMO_COMMUNITY_ID)}, ${t(a.daysAgo)}, ${lit(a.actorType)}, ${lit(a.actor)}, ${lit(a.action)}, ${lit(a.summary)});`,
    );
  }
  for (const e of r.publicEvents) {
    const note = e.notes ? asTimelineNote(e.notes) : null;
    lines.push(
      `    insert into public.case_events (case_id, occurred_at, status, actor_type, kind, note, note_es, notes)`,
      `    values (v_case_id, ${t(e.daysAgo)},`,
      `      coalesce((select status from public.case_events where case_id = v_case_id and coalesce(kind, 'status') = 'status' and occurred_at <= ${t(
        e.daysAgo,
      )} order by occurred_at desc, seq desc limit 1), 'received'),`,
      `      'moderator', ${lit(e.kind)}, ${note ? lit(note.note) : "null"}, ${note ? lit(note.noteEs) : "null"}, ${
        note ? `${lit(JSON.stringify(note.notes))}::jsonb` : "null"
      });`,
    );
  }
  if (r.publicEvents.length) {
    // Same renumbering as 0004: timelines are read in insertion order (seq).
    lines.push(
      `    for v_event in select id from public.case_events where case_id = v_case_id order by occurred_at, seq loop`,
      `      update public.case_events set seq = default where id = v_event;`,
      `    end loop;`,
    );
  }
  lines.push(`    v_added := v_added + 1;`, `  end if;`);
  return lines.join("\n");
}

export function buildDemoPipelineSql(): string {
  return `do $$
declare
  v_case text;
  v_case_id uuid;
  v_created timestamptz;
  v_url text;
  v_dups text[];
  v_event uuid;
  v_added int := 0;
begin
${DEMO_PIPELINE_RECORDS.map(block).join("\n\n")}

  raise notice 'Added example pipeline history to % demonstration cases.', v_added;
end
$$;
`;
}

export const PIPELINE_SCHEMA_SQL = `-- ---------------------------------------------------------------------------------------------
-- New public timeline kinds: a referral prepared with sending paused, a follow-up update.
-- ---------------------------------------------------------------------------------------------
alter table public.case_events drop constraint case_events_kind_check;
alter table public.case_events add constraint case_events_kind_check check (kind is null or kind in (
  'status', 'ai_reviewed', 'referral_prepared', 'awaiting_approval', 'referral_approved', 'referral_declined',
  'referral_queued', 'follow_up_update'
));

-- ---------------------------------------------------------------------------------------------
-- Per-case pipeline state: the office and priority a moderator approved, and when things moved.
-- ---------------------------------------------------------------------------------------------
create table public.pipeline_case_state (
  case_number        text primary key references public.cases (case_number) on delete cascade,
  community_id       text not null,
  office_id          text,
  priority           text,
  routed_at          timestamptz,
  title              text,
  emergency          boolean not null default false,
  referral_queued_at timestamptz,
  last_follow_up_at  timestamptz,
  last_progress_at   timestamptz,

  constraint pipeline_case_state_priority_check check (priority is null or priority in ('low', 'medium', 'high', 'urgent'))
);

-- ---------------------------------------------------------------------------------------------
-- What agents propose. Nothing here takes effect until a moderator approves it.
-- ---------------------------------------------------------------------------------------------
create table public.pipeline_proposals (
  id           uuid primary key default gen_random_uuid(),
  seq          bigint generated always as identity,
  kind         text not null,
  case_number  text references public.cases (case_number) on delete cascade,
  community_id text not null,
  status       text not null default 'pending',
  created_at   timestamptz not null default now(),
  reviewed_at  timestamptz,
  reviewed_by  text,
  payload      jsonb not null,
  critique     jsonb,
  failure_note text,

  constraint pipeline_proposals_kind_check check (kind in ('routing', 'referral', 'follow_up', 'weekly_summary')),
  constraint pipeline_proposals_status_check check (status in ('pending', 'approved', 'rejected'))
);

create index pipeline_proposals_case_idx on public.pipeline_proposals (case_number, seq);
create index pipeline_proposals_status_idx on public.pipeline_proposals (status, created_at desc);

-- ---------------------------------------------------------------------------------------------
-- The outbox: what WOULD be sent. The only status the database allows is 'dry_run' — recording
-- a message as sent would need a new migration, on purpose.
-- ---------------------------------------------------------------------------------------------
create table public.pipeline_outbox (
  id           uuid primary key default gen_random_uuid(),
  seq          bigint generated always as identity,
  case_number  text references public.cases (case_number) on delete cascade,
  community_id text not null,
  office_id    text not null,
  kind         text not null,
  to_label     text not null,
  to_address   text not null,
  subject      text not null,
  body_es      text not null,
  translation  jsonb,
  status       text not null default 'dry_run',
  created_at   timestamptz not null default now(),
  approved_by  text not null,

  constraint pipeline_outbox_kind_check check (kind in ('referral', 'follow_up')),
  constraint pipeline_outbox_status_check check (status in ('dry_run'))
);

create index pipeline_outbox_created_idx on public.pipeline_outbox (created_at desc);

-- ---------------------------------------------------------------------------------------------
-- The audit log: every agent step and moderator decision, private to moderators.
-- ---------------------------------------------------------------------------------------------
create table public.agent_audit (
  id           uuid primary key default gen_random_uuid(),
  seq          bigint generated always as identity,
  case_number  text references public.cases (case_number) on delete cascade,
  community_id text not null,
  occurred_at  timestamptz not null default now(),
  actor_type   text not null,
  actor        text not null,
  action       text not null,
  summary      text not null,

  constraint agent_audit_actor_type_check check (actor_type in ('agent', 'moderator', 'system'))
);

create index agent_audit_case_idx on public.agent_audit (case_number, occurred_at desc);

-- Same lock-down as every other table: Row Level Security on, no policies.
alter table public.pipeline_case_state enable row level security;
alter table public.pipeline_proposals enable row level security;
alter table public.pipeline_outbox enable row level security;
alter table public.agent_audit enable row level security;
`;

/** db/migrations/0007_agentic_pipeline.sql. */
export function buildPipelineMigrationSql(): string {
  return `-- CommonGround: the agentic pipeline (routing, referral, dry-run outbox, follow-up, audit log).
--
-- GENERATED by src/lib/pipeline/store/demo-pipeline-sql.ts — don't edit by hand. Regenerate with:
-- npx vitest run src/lib/store/__tests__/db-sql.test.ts -u
--
-- Adds four private tables and two public timeline kinds, then (data only) gives the
-- demonstration cases their example pipeline history. Never touches a resident's case.
-- To undo: db/rollback/0007_agentic_pipeline_down.sql.

${PIPELINE_SCHEMA_SQL}
-- ---------------------------------------------------------------------------------------------
-- Example pipeline history for the demonstration cases (skipped on a fresh database: db/seed.sql
-- adds it there).
-- ---------------------------------------------------------------------------------------------
${buildDemoPipelineSql()}`;
}
