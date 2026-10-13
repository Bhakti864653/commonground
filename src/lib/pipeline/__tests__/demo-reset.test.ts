// @vitest-environment node
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { fromPglite } from "@/lib/db/sql-client";
import { memoryCaseRepository, getCaseByCaseNumber as memoryCase, resetDemoCasesInMemory } from "@/lib/store/memory-case-store";
import { createSqlCaseRepository } from "@/lib/store/sql-case-store";
import { getCommunity as getMemoryCommunity } from "@/lib/store/memory-community-store";
import type { CaseRepository } from "@/lib/store/case-repository";
import { buildApproximateArea } from "@/lib/privacy/approximate-area";
import { buildConsentRecord } from "@/lib/privacy/consent";
import { SANTIAGO_VERAGUAS } from "@/data/communities";
import { DEMO_CASE_SEEDS } from "@/lib/store/demo-seed";
import type { Case } from "@/lib/schema/report";
import { memoryPipelineRepository, resetDemoPipelineInMemory } from "../store/memory-pipeline-store";
import { createSqlPipelineRepository } from "../store/sql-pipeline-store";
import { resetDemoCasesSql } from "../store/sql-demo-reset";
import type { PipelineRepository } from "../store/pipeline-repository";
import type { OfficeRepository } from "@/lib/office/store/office-repository";
import { memoryOfficeRepository, resetDemoOfficeInMemory } from "@/lib/office/store/memory-office-store";
import { createSqlOfficeRepository } from "@/lib/office/store/sql-office-store";

/**
 * "Reset demo" must put the eight example cases back to their starting state and must never
 * touch a resident's case — even one that copies an example case's exact description, sits in
 * the same community, and has its own pipeline records. Runs on the in-memory stores and on
 * Postgres (PGlite with every migration and the real seed.sql).
 */

const ROOT = join(__dirname, "../../../..");
const MIGRATIONS = readdirSync(join(ROOT, "db/migrations"))
  .filter((f) => f.endsWith(".sql"))
  .sort()
  .map((f) => readFileSync(join(ROOT, "db/migrations", f), "utf8"))
  .join("\n");
const SEED = readFileSync(join(ROOT, "db/seed.sql"), "utf8");

type Harness = {
  name: string;
  setup: () => Promise<void>;
  teardown?: () => Promise<void>;
  cases: () => CaseRepository;
  pipeline: () => PipelineRepository;
  office: () => OfficeRepository;
  reset: (now: Date) => Promise<string[]>;
};

let pg: PGlite;
const harnesses: Harness[] = [
  {
    name: "in-memory",
    setup: async () => {
      // A fresh, seeded store (the in-memory stores seed themselves when first used).
      const g = globalThis as Record<string, unknown>;
      delete g.__commonGroundCaseStore__;
      delete g.__commonGroundPipelineStore__;
      delete g.__commonGroundOfficeStore__;
      await memoryCaseRepository.listAllCasesForAdmin();
      await memoryPipelineRepository.listStates();
    },
    cases: () => memoryCaseRepository,
    pipeline: () => memoryPipelineRepository,
    office: () => memoryOfficeRepository,
    reset: async (now) => {
      const reset = resetDemoCasesInMemory(now);
      resetDemoPipelineInMemory(reset.map((n) => memoryCase(n)).filter((c): c is Case => !!c));
      resetDemoOfficeInMemory(new Set(reset));
      return reset;
    },
  },
  {
    name: "Postgres (PGlite)",
    setup: async () => {
      pg = new PGlite();
      await pg.exec(`create role anon; create role authenticated; create role visitor;`);
      await pg.exec(MIGRATIONS);
      await pg.exec(SEED);
    },
    teardown: async () => pg.close(),
    cases: () => createSqlCaseRepository(fromPglite(pg), async (id) => getMemoryCommunity(id)),
    pipeline: () => createSqlPipelineRepository(fromPglite(pg)),
    office: () => createSqlOfficeRepository(fromPglite(pg)),
    reset: (now) => resetDemoCasesSql(fromPglite(pg), now),
  },
];

const minutesAfter = (from: string, to: string) => Math.round((Date.parse(to) - Date.parse(from)) / 60_000);

/** Everything about a case and its pipeline records, without ids (which a reset may regenerate). */
async function snapshot(h: Harness, caseNumber: string, relative: boolean) {
  const c = (await h.cases().getCaseByCaseNumber(caseNumber))!;
  const t = (iso?: string) => (iso === undefined ? null : relative ? minutesAfter(c.createdAt, iso) : iso);
  const [state, proposals, outbox, audit, officeReferrals, officeNotes] = await Promise.all([
    h.pipeline().getState(caseNumber),
    h.pipeline().listProposals({ caseNumber }),
    h.pipeline().listOutbox({ caseNumber }),
    h.pipeline().listAudit({ caseNumber }),
    h.office().listForCase(caseNumber),
    h.office().listNotesForCase(caseNumber),
  ]);
  return {
    case: {
      number: c.publicCaseNumber,
      description: c.description,
      status: c.status,
      sourceType: c.sourceType,
      verificationState: c.verificationState,
      isDuplicateOf: c.isDuplicateOf ?? null,
      removal: c.removal ?? null,
      createdAt: relative ? null : c.createdAt,
      events: c.statusHistory.map((e) => [e.kind ?? "status", e.status, e.actorType, t(e.occurredAt), e.note ?? null]),
      actions: c.moderationActions.map((a) => [a.action, a.actorId, t(a.occurredAt), a.detail ?? null]),
      notes: c.adminNotes.map((n) => n.note),
      flags: c.inaccuracyFlags.map((f) => f.note ?? null),
      suggestions: c.agentSuggestions.map((s) => [s.kind, s.status]),
    },
    state: state ? { ...state, routedAt: t(state.routedAt), referralQueuedAt: t(state.referralQueuedAt), lastFollowUpAt: t(state.lastFollowUpAt), lastProgressAt: t(state.lastProgressAt) } : null,
    proposals: proposals.map((p) => [p.kind, p.status, t(p.createdAt), t(p.reviewedAt), JSON.stringify(p.payload), p.critique?.verdict ?? null]).sort(),
    outbox: outbox.map((o) => [o.kind, o.officeId, o.subject, o.bodyEs, t(o.createdAt)]).sort(),
    audit: audit.map((a) => [a.actor, a.action, a.summary, t(a.occurredAt)]).sort(),
    office: officeReferrals.map((r) => [r.officeId, r.status, r.isDemo, r.declineReason ?? null, t(r.statusChangedAt)]).sort(),
    officeNotes: officeNotes.map((n) => [n.kind, n.text, n.officeId]).sort(),
  };
}

describe.each(harnesses)("Reset demo: $name", (h) => {
  const NOW = new Date();
  let demoNumbers: string[];
  let realNumber: string;
  let seededDemo: unknown[];

  beforeAll(async () => {
    await h.setup();
    const all = await h.cases().listAllCasesForAdmin();
    demoNumbers = DEMO_CASE_SEEDS.map((s) => all.find((c) => c.description === s.description && c.sourceType === "demonstration")!.publicCaseNumber);
    seededDemo = await Promise.all(demoNumbers.map((n) => snapshot(h, n, true)));

    // A resident's case that copies an example case's exact text, in the same community.
    const real = await h.cases().createCase({
      type: "report",
      communityId: SANTIAGO_VERAGUAS.id,
      categoryId: DEMO_CASE_SEEDS[0].categoryId,
      description: DEMO_CASE_SEEDS[0].description,
      approximateArea: buildApproximateArea(SANTIAGO_VERAGUAS.areas[0]),
      consent: buildConsentRecord(SANTIAGO_VERAGUAS.privacy.consentVersion, "es"),
    });
    realNumber = real.publicCaseNumber;
    expect(real.sourceType).toBe("community");

    // The resident case goes through the pipeline and moderation.
    await h.cases().changeCaseStatus(realNumber, "under_review", "mod", "Looking into it");
    await h.cases().addTimelineEvent(realNumber, { kind: "referral_queued", actorType: "moderator" });
    await h.cases().addAdminNote(realNumber, "private note", "mod");
    await h.cases().flagInaccuracy(realNumber, "flag");
    await h.pipeline().upsertState(realNumber, SANTIAGO_VERAGUAS.id, { officeId: "lighting", priority: "high", lastProgressAt: NOW.toISOString() });
    const p = await h.pipeline().addProposal({
      kind: "routing",
      caseNumber: realNumber,
      communityId: SANTIAGO_VERAGUAS.id,
      payload: { officeId: "lighting", reason: "r", priority: "high", priorityReason: "p", confidence: 0.9, alternativeOfficeIds: [], needsModeratorDecision: false, possibleDuplicates: [{ caseNumber: demoNumbers[0], score: 1 }], injectionSuspected: false, source: "ai" },
    });
    await h.pipeline().reviewProposal(p.id, "approved", "mod");
    await h.pipeline().addOutboxItem({ caseNumber: realNumber, communityId: SANTIAGO_VERAGUAS.id, officeId: "lighting", kind: "referral", toLabel: "x", toAddress: "x@example.invalid", subject: "s", bodyEs: "b", approvedBy: "mod" });
    await h.pipeline().addAudit({ caseNumber: realNumber, communityId: SANTIAGO_VERAGUAS.id, actorType: "moderator", actor: "mod", action: "routing_approved", summary: "real" });
    // ...and it reached a (real) office, which acted on it.
    const realReferral = await h.office().createReferral({ caseNumber: realNumber, communityId: SANTIAGO_VERAGUAS.id, officeId: "lighting", isDemo: false });
    await h.office().setStatus(realReferral.id, "lighting", "in_progress", undefined);
    await h.office().addNote({ referralId: realReferral.id, caseNumber: realNumber, officeId: "lighting", kind: "private", text: "real office note", author: "staff" });

    // A moderator "uses up" the demo: approvals, status changes, merges, notes, flags.
    await h.cases().changeCaseStatus(demoNumbers[0], "closed", "mod");
    await h.cases().markDuplicate(demoNumbers[1], demoNumbers[0], "mod");
    await h.cases().addTimelineEvent(demoNumbers[2], { kind: "follow_up_update", actorType: "moderator", note: "extra" });
    await h.cases().addAdminNote(demoNumbers[3], "demo note", "mod");
    await h.cases().flagInaccuracy(demoNumbers[4], "demo flag");
    for (const pending of await h.pipeline().listProposals({ status: "pending" })) {
      if (pending.caseNumber && demoNumbers.includes(pending.caseNumber)) await h.pipeline().reviewProposal(pending.id, "approved", "mod");
    }
    await h.pipeline().addOutboxItem({ caseNumber: demoNumbers[5], communityId: SANTIAGO_VERAGUAS.id, officeId: "sanitation", kind: "follow_up", toLabel: "x", toAddress: "x@example.invalid", subject: "s", bodyEs: "b", approvedBy: "mod" });
    await h.pipeline().upsertState(demoNumbers[6], SANTIAGO_VERAGUAS.id, { officeId: "parks", priority: "urgent" });
    // The simulated demo office acted on the example referrals.
    for (const office of ["lighting", "drainage", "sanitation"]) {
      for (const r of await h.office().listForOffice(office, true)) {
        await h.office().setStatus(r.id, office, "not_our_department", "demo reason");
        await h.office().addNote({ referralId: r.id, caseNumber: r.caseNumber, officeId: office, kind: "public", text: "demo note", author: "demo" });
      }
    }
  }, 120_000);
  afterAll(async () => h.teardown?.());

  it("leaves a resident's case — and all its pipeline records — exactly as they were", async () => {
    const before = await snapshot(h, realNumber, false);
    expect(before.case.events.length).toBeGreaterThan(1);
    expect(before.outbox).toHaveLength(1);
    expect(before.office).toHaveLength(1);
    expect(before.officeNotes).toHaveLength(1);

    const reset = await h.reset(new Date(NOW.getTime() + 60_000));

    expect(reset).not.toContain(realNumber);
    expect(await snapshot(h, realNumber, false)).toEqual(before);
  });

  it("puts every example case back to its starting state", async () => {
    const after = await Promise.all(demoNumbers.map((n) => snapshot(h, n, true)));
    expect(after).toEqual(seededDemo);
  });

  it("resets exactly the eight example cases, and can run again", async () => {
    const again = await h.reset(new Date(NOW.getTime() + 120_000));
    expect([...again].sort()).toEqual([...demoNumbers].sort());
    expect(await Promise.all(demoNumbers.map((n) => snapshot(h, n, true)))).toEqual(seededDemo);
  });
});
