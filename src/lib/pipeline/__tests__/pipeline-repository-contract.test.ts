// @vitest-environment node
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { fromPglite } from "@/lib/db/sql-client";
import { memoryCaseRepository, __resetMemoryCaseStore } from "@/lib/store/memory-case-store";
import { createSqlCaseRepository } from "@/lib/store/sql-case-store";
import { getCommunity as getMemoryCommunity } from "@/lib/store/memory-community-store";
import type { CaseRepository } from "@/lib/store/case-repository";
import { buildApproximateArea } from "@/lib/privacy/approximate-area";
import { buildConsentRecord } from "@/lib/privacy/consent";
import { SANTIAGO_VERAGUAS } from "@/data/communities";
import { memoryPipelineRepository, __resetMemoryPipelineStore } from "../store/memory-pipeline-store";
import { createSqlPipelineRepository } from "../store/sql-pipeline-store";
import { PIPELINE_SCHEMA_SQL } from "../store/demo-pipeline-sql";
import type { PipelineRepository } from "../store/pipeline-repository";
import type { NewProposal } from "../types";

/** Same behaviours, two stores: in memory and Postgres (PGlite). */
const MIGRATION_0001 = readFileSync(join(__dirname, "../../../../db/migrations/0001_init.sql"), "utf8");

type Harness = {
  name: string;
  cases: () => CaseRepository;
  pipeline: () => PipelineRepository;
  reset: () => Promise<void>;
  setup?: () => Promise<void>;
  teardown?: () => Promise<void>;
};

let pg: PGlite;
const harnesses: Harness[] = [
  {
    name: "in-memory",
    cases: () => memoryCaseRepository,
    pipeline: () => memoryPipelineRepository,
    reset: async () => {
      __resetMemoryCaseStore();
      __resetMemoryPipelineStore();
    },
  },
  {
    name: "Postgres (PGlite)",
    cases: () => createSqlCaseRepository(fromPglite(pg), async (id) => getMemoryCommunity(id)),
    pipeline: () => createSqlPipelineRepository(fromPglite(pg)),
    setup: async () => {
      pg = new PGlite();
      await pg.exec(MIGRATION_0001);
      await pg.exec(PIPELINE_SCHEMA_SQL);
    },
    reset: async () => {
      await pg.exec("truncate public.cases, public.case_number_counters, public.pipeline_proposals, public.pipeline_outbox, public.agent_audit cascade");
    },
    teardown: async () => pg.close(),
  },
];

const T0 = new Date("2026-10-01T12:00:00.000Z");
const later = (minutes: number) => new Date(T0.getTime() + minutes * 60_000);

const routing = (caseNumber: string, officeId = "drainage"): NewProposal => ({
  kind: "routing",
  caseNumber,
  communityId: SANTIAGO_VERAGUAS.id,
  payload: {
    officeId,
    reason: "Blocked drain.",
    priority: "medium",
    priorityReason: "Recurring.",
    confidence: 0.8,
    alternativeOfficeIds: [],
    needsModeratorDecision: false,
    possibleDuplicates: [],
    injectionSuspected: false,
    source: "ai",
  },
  critique: { verdict: "ok", issues: [], source: "ai" },
});

describe.each(harnesses)("PipelineRepository: $name", (h) => {
  let caseNumber: string;
  beforeAll(async () => h.setup?.(), 60_000);
  afterAll(async () => h.teardown?.());
  beforeEach(async () => {
    await h.reset();
    const created = await h.cases().createCase({
      type: "report",
      communityId: SANTIAGO_VERAGUAS.id,
      categoryId: "flooding-drainage",
      description: "La alcantarilla está tapada.",
      approximateArea: buildApproximateArea(SANTIAGO_VERAGUAS.areas[0]),
      consent: buildConsentRecord(SANTIAGO_VERAGUAS.privacy.consentVersion, "es", () => T0.toISOString()),
    });
    caseNumber = created.publicCaseNumber;
  });

  it("creates and merges per-case state", async () => {
    expect(await h.pipeline().getState(caseNumber)).toBeUndefined();
    await h.pipeline().upsertState(caseNumber, SANTIAGO_VERAGUAS.id, { title: "Drain", emergency: false });
    const s = await h.pipeline().upsertState(caseNumber, "ignored-on-update", { officeId: "drainage", priority: "high", routedAt: T0.toISOString() });
    expect(s).toMatchObject({ caseNumber, communityId: SANTIAGO_VERAGUAS.id, title: "Drain", officeId: "drainage", priority: "high", routedAt: T0.toISOString() });
    expect(await h.pipeline().listStates()).toHaveLength(1);
  });

  it("adds proposals as pending, replacing an older pending one of the same kind", async () => {
    const first = await h.pipeline().addProposal(routing(caseNumber, "drainage"), T0);
    const second = await h.pipeline().addProposal(routing(caseNumber, "other"), later(1));
    expect(first.status).toBe("pending");
    const all = await h.pipeline().listProposals({ caseNumber });
    expect(all.map((p) => p.id)).toEqual([second.id]);
    expect(await h.pipeline().getProposal(first.id)).toBeUndefined();
  });

  it("reviews a pending proposal once, saving the moderator's edits", async () => {
    const p = await h.pipeline().addProposal(routing(caseNumber), T0);
    const edited = { ...p.payload, officeId: "public-works" } as typeof p.payload;
    const reviewed = await h.pipeline().reviewProposal(p.id, "approved", "mod@example.com", edited, later(5));
    expect(reviewed).toMatchObject({ status: "approved", reviewedBy: "mod@example.com", reviewedAt: later(5).toISOString(), payload: { officeId: "public-works" } });
    expect(await h.pipeline().reviewProposal(p.id, "rejected", "someone")).toBeNull();
    expect(await h.pipeline().reviewProposal("not-a-uuid", "approved", "x")).toBeNull();
    expect(await h.pipeline().listProposals({ status: "pending" })).toEqual([]);
  });

  it("stores outbox items only as dry runs", async () => {
    const item = await h.pipeline().addOutboxItem(
      {
        caseNumber,
        communityId: SANTIAGO_VERAGUAS.id,
        officeId: "drainage",
        kind: "referral",
        toLabel: "Drenaje (oficina de ejemplo)",
        toAddress: "drenaje@example.invalid",
        subject: `Caso ${caseNumber}`,
        bodyEs: "Mensaje",
        approvedBy: "mod",
      },
      T0,
    );
    expect(item.status).toBe("dry_run");
    expect(await h.pipeline().listOutbox({ caseNumber })).toHaveLength(1);
  });

  it("keeps an audit log, newest first", async () => {
    await h.pipeline().addAudit({ caseNumber, communityId: SANTIAGO_VERAGUAS.id, actorType: "agent", actor: "Routing Agent", action: "routing_proposed", summary: "a" }, T0);
    await h.pipeline().addAudit({ caseNumber, communityId: SANTIAGO_VERAGUAS.id, actorType: "moderator", actor: "mod", action: "routing_approved", summary: "b" }, later(1));
    const log = await h.pipeline().listAudit({ caseNumber });
    expect(log.map((a) => a.summary)).toEqual(["b", "a"]);
    expect(await h.pipeline().listAudit({ limit: 1 })).toHaveLength(1);
  });
});

describe("the database refuses an outbox item that isn't a dry run", () => {
  it("rejects status 'sent' at the constraint level", async () => {
    const db = new PGlite();
    await db.exec(MIGRATION_0001);
    await db.exec(PIPELINE_SCHEMA_SQL);
    await expect(
      db.exec(
        `insert into public.pipeline_outbox (community_id, office_id, kind, to_label, to_address, subject, body_es, status, approved_by)
         values ('x', 'drainage', 'referral', 'x', 'x@example.invalid', 's', 'b', 'sent', 'mod')`,
      ),
    ).rejects.toThrow(/pipeline_outbox_status_check/);
    await db.close();
  }, 60_000);
});
