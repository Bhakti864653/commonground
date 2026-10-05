import { casePrefix } from "@/lib/case-number/format-case-number";
import { SANTIAGO_VERAGUAS } from "@/data/communities";
import {
  DEMO_CASE_SEEDS,
  DEMO_COMMUNITY_ID,
  DEMO_CONSENT_VERSION,
  DEMO_STATUS_CHANGE_NOTE,
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
  return lines.join("\n");
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
