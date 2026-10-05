// @vitest-environment node
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { buildDemoSeedSql } from "@/lib/store/demo-seed-sql";
import { DEMO_CASE_SEEDS } from "@/lib/store/demo-seed";
import {
  ModerationActionSchema,
  ReportStatusSchema,
  ReportStatusEventSchema,
  TimelineEventKindSchema,
  VerificationStateSchema,
  AgentSuggestionSchema,
} from "@/lib/schema/report";

const ROOT = join(__dirname, "../../../..");
const MIGRATION = readFileSync(join(ROOT, "db/migrations/0001_init.sql"), "utf8");
const SEED_PATH = join(ROOT, "db/seed.sql");

/** The quoted values inside a named CHECK constraint, e.g. cases_status_check → ["received", ...]. */
function checkValues(constraint: string): string[] {
  const start = MIGRATION.indexOf(`constraint ${constraint} check`);
  if (start === -1) throw new Error(`No constraint ${constraint}`);
  const body = MIGRATION.slice(start, MIGRATION.indexOf("))", start));
  return [...body.matchAll(/'([^']+)'/g)].map((m) => m[1]).sort();
}

const sorted = (values: readonly string[]) => [...values].sort();

describe("migration CHECK constraints match the app's Zod enums", () => {
  it.each([
    ["cases_status_check", ReportStatusSchema.options],
    ["case_events_status_check", ReportStatusSchema.options],
    ["cases_verification_state_check", VerificationStateSchema.options],
    ["case_events_actor_type_check", ReportStatusEventSchema.shape.actorType.options],
    ["case_events_kind_check", TimelineEventKindSchema.options],
    ["agent_suggestions_kind_check", AgentSuggestionSchema.shape.kind.options],
    ["moderation_actions_action_check", ModerationActionSchema.shape.action.options],
  ])("%s", (constraint, options) => {
    expect(checkValues(constraint)).toEqual(sorted(options));
  });
});

describe("db/seed.sql", () => {
  it("is exactly what the generator produces from DEMO_CASE_SEEDS", async () => {
    await expect(buildDemoSeedSql()).toMatchFileSnapshot(SEED_PATH);
  });
});

describe("migration + seed on a real Postgres (PGlite)", () => {
  let db: PGlite;
  const year = new Date().getUTCFullYear();
  const num = (n: number) => `SV-${year}-${String(n).padStart(4, "0")}`;

  const createCase = (createdAt = "now()") =>
    db.query<{ case_number: string }>(
      `select case_number from public.create_case(
        'santiago-veraguas', 'SV', 'report', 'other', 'Prueba', '{"kind":"prefer_not_to_say","label":"-"}'::jsonb,
        ${createdAt}, 'community_report', 'community', null, '{"consentVersion":"v1"}'::jsonb, 'token')`,
    );

  beforeAll(async () => {
    db = new PGlite();
    // Roles hosted APIs hand to browsers (the migration revokes them only if they exist), plus an
    // ordinary role standing in for "anyone else" (PUBLIC).
    await db.exec(`create role anon; create role authenticated; create role visitor;`);
    await db.exec(MIGRATION);
    await db.exec(readFileSync(SEED_PATH, "utf8"));
  }, 60_000);

  it("seeds every demonstration case, numbered in list order, with its final status", async () => {
    const { rows } = await db.query<{ case_number: string; status: string; source_type: string; description: string }>(
      "select case_number, status, source_type, description from public.cases order by case_number",
    );
    expect(rows).toHaveLength(DEMO_CASE_SEEDS.length);
    rows.forEach((row, i) => {
      const seed = DEMO_CASE_SEEDS[i];
      expect(row.case_number).toBe(num(i + 1));
      expect(row.description).toBe(seed.description);
      expect(row.status).toBe(seed.secondStatus ?? seed.status);
      expect(row.source_type).toBe("demonstration");
    });
  });

  it("records the same timeline and moderation history as the in-memory seeding", async () => {
    const changed = DEMO_CASE_SEEDS.filter((s) => s.secondStatus || s.status !== "received").length;
    const events = await db.query<{ n: number }>("select count(*)::int as n from public.case_events");
    const actions = await db.query<{ n: number }>("select count(*)::int as n from public.moderation_actions");
    expect(events.rows[0].n).toBe(DEMO_CASE_SEEDS.length + changed);
    expect(actions.rows[0].n).toBe(changed);
  });

  it("does nothing when run a second time", async () => {
    await db.exec(readFileSync(SEED_PATH, "utf8"));
    const { rows } = await db.query<{ n: number }>("select count(*)::int as n from public.cases");
    expect(rows[0].n).toBe(DEMO_CASE_SEEDS.length);
  });

  it("continues numbering after the seed, never reusing a number", async () => {
    const a = await createCase();
    const b = await createCase();
    expect(a.rows[0].case_number).toBe(num(DEMO_CASE_SEEDS.length + 1));
    expect(b.rows[0].case_number).toBe(num(DEMO_CASE_SEEDS.length + 2));
  });

  it("gives every case its first 'received' timeline entry in the same transaction", async () => {
    const { rows } = await db.query<{ n: number }>(
      `select count(*)::int as n from public.cases c
       where not exists (select 1 from public.case_events e where e.case_id = c.id and e.status = 'received' and e.actor_type = 'system')`,
    );
    expect(rows[0].n).toBe(0);
  });

  it("starts a new year at 0001", async () => {
    const { rows } = await createCase("'2031-03-01T12:00:00Z'");
    expect(rows[0].case_number).toBe("SV-2031-0001");
  });

  it("never truncates numbers past 9999", async () => {
    await db.exec(`update public.case_number_counters set last_value = 9999 where year = 2031`);
    const { rows } = await createCase("'2031-06-01T12:00:00Z'");
    expect(rows[0].case_number).toBe("SV-2031-10000");
  });

  it("rejects a duplicate case number outright", async () => {
    await expect(
      db.exec(`insert into public.cases (case_number, community_id, type, category_id, description, approximate_area,
        verification_state, source_type, consent, management_token)
        values ('${num(1)}', 'santiago-veraguas', 'report', 'other', 'x', '{}'::jsonb, 'community_report', 'community', '{}'::jsonb, 't')`),
    ).rejects.toThrow(/duplicate key/);
  });

  it("rejects values the app doesn't allow", async () => {
    await expect(db.exec(`update public.cases set status = 'resolved'`)).rejects.toThrow(/cases_status_check/);
  });

  it("turns Row Level Security on for every table", async () => {
    const { rows } = await db.query<{ relname: string; relrowsecurity: boolean }>(
      `select relname, relrowsecurity from pg_class
       where relnamespace = 'public'::regnamespace and relkind = 'r'`,
    );
    expect(rows.length).toBe(7);
    expect(rows.filter((r) => !r.relrowsecurity).map((r) => r.relname)).toEqual([]);
  });

  it("gives other roles no access at all, and only the owner (the app's server) can create cases", async () => {
    const { rows } = await db.query<{ tbl: string; anon: boolean; authed: boolean; visitor: boolean }>(
      `select c.relname as tbl,
              has_table_privilege('anon', c.oid, 'select,insert,update,delete') as anon,
              has_table_privilege('authenticated', c.oid, 'select,insert,update,delete') as authed,
              has_table_privilege('visitor', c.oid, 'select,insert,update,delete') as visitor
       from pg_class c where c.relnamespace = 'public'::regnamespace and c.relkind = 'r'`,
    );
    expect(rows.filter((r) => r.anon || r.authed || r.visitor)).toEqual([]);

    const fn = "public.create_case(text, text, text, text, text, jsonb, timestamptz, text, text, jsonb, jsonb, text)";
    const exec = await db.query<{ anon: boolean; authed: boolean; visitor: boolean; owner: boolean }>(
      `select has_function_privilege('anon', '${fn}', 'execute') as anon,
              has_function_privilege('authenticated', '${fn}', 'execute') as authed,
              has_function_privilege('visitor', '${fn}', 'execute') as visitor,
              has_function_privilege(current_user, '${fn}', 'execute') as owner`,
    );
    expect(exec.rows[0]).toEqual({ anon: false, authed: false, visitor: false, owner: true });
  });

  it("applies cleanly on a server without any hosted-API roles (like Neon)", async () => {
    const bare = new PGlite();
    await bare.exec(MIGRATION);
    await bare.exec(readFileSync(SEED_PATH, "utf8"));
    const { rows } = await bare.query<{ n: number }>("select count(*)::int as n from public.cases");
    expect(rows[0].n).toBe(DEMO_CASE_SEEDS.length);
    await bare.close();
  }, 60_000);
});
