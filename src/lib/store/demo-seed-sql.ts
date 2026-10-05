import { casePrefix } from "@/lib/case-number/format-case-number";
import { SANTIAGO_VERAGUAS } from "@/data/communities";
import {
  DEMO_CASE_SEEDS,
  DEMO_COMMUNITY_ID,
  DEMO_CONSENT_VERSION,
  DEMO_REFERRAL_OFFICE,
  DEMO_REFERRAL_REASONING,
  DEMO_STATUS_CHANGE_NOTE,
  demoAgentSteps,
  demoFinalStatus,
  type DemoCaseSeed,
} from "./demo-seed";

/** A SQL string literal: single quotes doubled, so text can never break out of the quotes. */
const lit = (value: string) => `'${value.replace(/'/g, "''")}'`;
const json = (value: unknown) => `${lit(JSON.stringify(value))}::jsonb`;
const daysAgo = (days: number) => `now() - interval '${Math.max(days, 0)} days'`;

function seedBlock(seed: DemoCaseSeed, index: number): string {
  const areaLabels = SANTIAGO_VERAGUAS.areas.find((a) => a.id === seed.areaId)?.labels;
  const area = {
    kind: "neighborhood",
    areaId: seed.areaId,
    label: seed.areaLabel,
    ...(areaLabels ? { labels: areaLabels } : {}),
    labelEs: seed.areaLabelEs,
  };
  const created = daysAgo(seed.daysAgo);
  const lines = [
    `  -- ${index + 1}. ${seed.type} · ${seed.categoryId} · ${seed.areaId}`,
    `  select c.id into v_id from public.create_case(`,
    `    ${lit(DEMO_COMMUNITY_ID)}, ${lit(casePrefix(DEMO_COMMUNITY_ID))}, ${lit(seed.type)}, ${lit(seed.categoryId)},`,
    `    ${lit(seed.description)},`,
    `    ${json(area)},`,
    `    ${created}, 'demonstration_data', 'demonstration', null,`,
    `    jsonb_build_object('consentVersion', ${lit(DEMO_CONSENT_VERSION)}, 'consentedAt', ${created}, 'language', 'es'),`,
    `    gen_random_uuid()::text`,
    `  ) c;`,
  ];

  // Same follow-up history the in-memory seeding records (memory-case-store.ts).
  const change = seed.secondStatus
    ? { status: seed.secondStatus, at: daysAgo(seed.daysAgo - 4), note: true }
    : seed.status !== "received"
      ? { status: seed.status, at: daysAgo(seed.daysAgo - 2), note: false }
      : null;
  if (change) {
    const { note, noteEs, notes } = DEMO_STATUS_CHANGE_NOTE;
    lines.push(
      `  insert into public.case_events (case_id, occurred_at, status, actor_type, note, note_es, notes)`,
      change.note
        ? `  values (v_id, ${change.at}, ${lit(change.status)}, 'moderator', ${lit(note)}, ${lit(noteEs)}, ${json(notes)});`
        : `  values (v_id, ${change.at}, ${lit(change.status)}, 'moderator', null, null, null);`,
      `  insert into public.moderation_actions (case_id, actor_id, action, occurred_at, detail)`,
      `  values (v_id, 'demo-seed', 'status_change', ${change.at}, ${lit(change.status)});`,
      `  update public.cases set status = ${lit(change.status)} where id = v_id;`,
    );
  }
  lines.push(...agentStepLines(seed));
  return lines.join("\n");
}

/**
 * The agent's timeline entries, referral draft and (if approved) the moderator's approval for one
 * demonstration case whose id is in v_id — the same history the in-memory seeding records.
 */
function agentStepLines(seed: DemoCaseSeed): string[] {
  const steps = demoAgentSteps(seed);
  if (!steps.length) return [];
  const at = (minutes: number) => `v_created + interval '${minutes} minutes'`;
  const lines = [`  select created_at into v_created from public.cases where id = v_id;`];
  for (const step of steps) {
    const contact = step.contactId ? lit(step.contactId) : "null";
    lines.push(
      `  insert into public.case_events (case_id, occurred_at, status, actor_type, kind, contact_id)`,
      `  values (v_id, ${at(step.minutesAfter)}, ${lit(step.status)}, ${lit(step.actorType)}, ${lit(step.kind)}, ${contact});`,
    );
    if (step.kind === "referral_approved") {
      lines.push(
        `  insert into public.moderation_actions (case_id, actor_id, action, occurred_at, detail)`,
        `  values (v_id, 'demo-seed', 'approve_referral', ${at(step.minutesAfter)}, ${contact});`,
      );
    }
  }
  const referral = seed.agent?.referral;
  if (referral) {
    const approved = referral.approvedAfterDays;
    const draft = {
      contactId: DEMO_REFERRAL_OFFICE,
      urgency: referral.urgency,
      message: referral.message,
      categoryAssessment: "confirmed",
    };
    lines.push(
      `  insert into public.agent_suggestions (case_id, kind, suggested_value, reasoning, status, created_at, reviewed_at, referral)`,
      `  values (v_id, 'referral', ${lit(DEMO_REFERRAL_OFFICE)}, ${lit(DEMO_REFERRAL_REASONING)}, ${lit(approved === undefined ? "pending" : "approved")},`,
      `    ${at(4)}, ${approved === undefined ? "null" : at(approved * 24 * 60)}, ${json(draft)});`,
    );
  }
  // Timelines are read in insertion order (seq), and these steps can come after entries already
  // written for later moments (a moderator's status change), so renumber this case's entries in
  // time order. An identity column can only be set back to DEFAULT, which takes the next number.
  lines.push(
    `  for v_event in select id from public.case_events where case_id = v_id order by occurred_at, seq loop`,
    `    update public.case_events set seq = default where id = v_event;`,
    `  end loop;`,
  );
  // Only an approval changes the status; any other status stays whatever moderators left it at.
  if (steps.some((step) => step.kind === "referral_approved")) {
    lines.push(`  update public.cases set status = ${lit(demoFinalStatus(seed))} where id = v_id;`);
  }
  return lines;
}

/**
 * db/migrations/0004_demo_agent_steps.sql: adds the agent's steps to demonstration cases in a
 * database seeded before the agent existed. Finds each case by its fixed demo description, and
 * skips any case that already has agent activity, so it never duplicates anything and never
 * touches a real resident's case. On a fresh database (no demo cases yet) it does nothing;
 * db/seed.sql then adds the same history itself.
 */
export function buildDemoAgentMigrationSql(): string {
  const blocks = DEMO_CASE_SEEDS.filter((seed) => demoAgentSteps(seed).length).map((seed) =>
    [
      `  -- ${seed.type} · ${seed.categoryId} · ${seed.areaId}`,
      `  v_id := null;`,
      `  select id into v_id from public.cases`,
      `  where source_type = 'demonstration' and community_id = ${lit(DEMO_COMMUNITY_ID)}`,
      `    and description = ${lit(seed.description)}`,
      `  order by created_at limit 1;`,
      `  if v_id is not null and not exists (`,
      `    select 1 from public.case_events where case_id = v_id and actor_type = 'agent'`,
      `  ) then`,
      ...agentStepLines(seed).map((line) => `  ${line}`),
      `    v_added := v_added + 1;`,
      `  end if;`,
    ].join("\n"),
  );
  return `-- CommonGround: the AI agent's steps on the demonstration cases (for the "Agente IA" page).
--
-- GENERATED from src/lib/store/demo-seed.ts by src/lib/store/demo-seed-sql.ts — don't edit by
-- hand. Regenerate with: npx vitest run src/lib/store/__tests__/db-sql.test.ts -u
--
-- Data only, no schema change. Touches only demonstration cases (source_type = 'demonstration'),
-- found by their fixed text, and skips any that already show agent activity — so it is safe on a
-- database seeded before the agent existed, on a fresh one, and when run twice.

do $$
declare
  v_id uuid;
  v_created timestamptz;
  v_event uuid;
  v_added int := 0;
begin
${blocks.join("\n\n")}

  raise notice 'Added agent steps to % demonstration cases.', v_added;
end
$$;
`;
}

/**
 * db/seed.sql, generated from DEMO_CASE_SEEDS so the database and the in-memory store can
 * never disagree about the demonstration cases. To regenerate after changing the list:
 * `npx vitest run src/lib/store/__tests__/db-sql.test.ts -u`.
 */
export function buildDemoSeedSql(): string {
  return `-- CommonGround: demonstration cases for the Santiago de Veraguas pilot.
--
-- GENERATED from src/lib/store/demo-seed.ts by src/lib/store/demo-seed-sql.ts — don't edit by
-- hand. Regenerate with: npx vitest run src/lib/store/__tests__/db-sql.test.ts -u
--
-- Applied by "npm run db:seed", after "npm run db:migrate".
-- Safe to run again: if demonstration cases already exist, it does nothing. Dates are relative
-- to when it runs ("9 days ago"), and from then on they age like any real case.
-- Cases are numbered by create_case, the same function real submissions use, so the counter
-- continues correctly after them.

do $$
declare
  v_id uuid;
  v_created timestamptz;
  v_event uuid;
begin
  if exists (select 1 from public.cases where source_type = 'demonstration') then
    raise notice 'Demonstration cases already exist - nothing to do.';
    return;
  end if;

${DEMO_CASE_SEEDS.map(seedBlock).join("\n\n")}

  raise notice 'Added ${DEMO_CASE_SEEDS.length} demonstration cases.';
end
$$;
`;
}
