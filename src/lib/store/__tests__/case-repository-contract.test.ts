// @vitest-environment node
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { memoryCaseRepository, __resetMemoryCaseStore } from "@/lib/store/memory-case-store";
import { createSqlCaseRepository } from "@/lib/store/sql-case-store";
import { fromPglite } from "@/lib/db/sql-client";
import type { CaseRepository } from "@/lib/store/case-repository";
import type { NewCaseInput } from "@/lib/store/new-case";
import { toPublicCase, type ReferralDraft } from "@/lib/schema/report";
import { buildApproximateArea } from "@/lib/privacy/approximate-area";
import { buildConsentRecord } from "@/lib/privacy/consent";
import { SANTIAGO_VERAGUAS, RIVERBEND_DEMO } from "@/data/communities";

/**
 * One set of behaviours, two stores. Every test here runs against the in-memory store and the
 * Postgres store (on PGlite, a real Postgres inside the test process), so the database version
 * can never quietly behave differently from what the rest of the app's tests rely on.
 */

const MIGRATION = readFileSync(join(__dirname, "../../../../db/migrations/0001_init.sql"), "utf8");

type Harness = { name: string; repo: () => CaseRepository; reset: () => Promise<void>; setup?: () => Promise<void>; teardown?: () => Promise<void> };

let pg: PGlite;
const harnesses: Harness[] = [
  { name: "in-memory", repo: () => memoryCaseRepository, reset: async () => __resetMemoryCaseStore() },
  {
    name: "Postgres (PGlite)",
    repo: () => createSqlCaseRepository(fromPglite(pg)),
    setup: async () => {
      pg = new PGlite();
      await pg.exec(MIGRATION);
    },
    reset: async () => {
      await pg.exec("truncate public.cases, public.case_number_counters cascade");
    },
    teardown: async () => {
      await pg.close();
    },
  },
];

const T0 = new Date("2026-10-01T12:00:00.000Z");
const at = (minutes: number) => () => new Date(T0.getTime() + minutes * 60_000);

function input(overrides: Partial<NewCaseInput> = {}): NewCaseInput {
  return {
    type: "report",
    communityId: SANTIAGO_VERAGUAS.id,
    categoryId: "flooding-drainage",
    description: "La alcantarilla está tapada.",
    approximateArea: buildApproximateArea(SANTIAGO_VERAGUAS.areas[0]),
    consent: buildConsentRecord(SANTIAGO_VERAGUAS.privacy.consentVersion, "es", () => T0.toISOString()),
    ...overrides,
  };
}

const draft: ReferralDraft = {
  contactId: "alcaldia-santiago-oficina",
  urgency: "medium",
  urgencyReason: "Two weeks of flooding.",
  message: "Estimados señores: caso pendiente.",
  categoryAssessment: "confirmed",
};

describe.each(harnesses)("CaseRepository contract: $name", (h) => {
  let repo: CaseRepository;

  beforeAll(async () => {
    await h.setup?.();
    repo = h.repo();
  }, 60_000);
  afterAll(async () => {
    await h.teardown?.();
  });
  beforeEach(async () => {
    await h.reset();
  });

  describe("creating and reading", () => {
    it("numbers cases per community per year, starting at 0001", async () => {
      const a = await repo.createCase(input(), at(0));
      const b = await repo.createCase(input(), at(1));
      const r = await repo.createCase(
        input({ communityId: RIVERBEND_DEMO.id, categoryId: RIVERBEND_DEMO.categories[0].id }),
        at(2),
      );
      const nextYear = await repo.createCase(input(), () => new Date("2027-01-02T00:00:00Z"));
      expect([a.publicCaseNumber, b.publicCaseNumber, r.publicCaseNumber, nextYear.publicCaseNumber]).toEqual([
        "SV-2026-0001",
        "SV-2026-0002",
        "RD-2026-0001",
        "SV-2027-0001",
      ]);
    });

    it("stores every field and the first 'received' entry, and reads back the same case", async () => {
      const created = await repo.createCase(
        input({ image: { fileName: "a.jpg", mimeType: "image/jpeg", sizeBytes: 1000, uploadedAt: T0.toISOString() } }),
        at(0),
      );
      expect(created).toMatchObject({
        status: "received",
        sourceType: "community",
        verificationState: "community_report",
        createdAt: T0.toISOString(),
        description: "La alcantarilla está tapada.",
        approximateArea: buildApproximateArea(SANTIAGO_VERAGUAS.areas[0]),
        image: { fileName: "a.jpg", sizeBytes: 1000 },
      });
      expect(created.managementToken).toEqual(expect.any(String));
      expect(created.statusHistory).toEqual([
        { id: expect.any(String), status: "received", occurredAt: T0.toISOString(), actorType: "system" },
      ]);
      expect(await repo.getCaseByCaseNumber(created.publicCaseNumber)).toEqual(created);
    });

    it("marks cases in the fictional demo community as demonstration data", async () => {
      const c = await repo.createCase(input({ communityId: RIVERBEND_DEMO.id, categoryId: RIVERBEND_DEMO.categories[0].id }));
      expect(c).toMatchObject({ sourceType: "demonstration", verificationState: "demonstration_data" });
    });

    it("rejects invalid submissions and stores nothing", async () => {
      await expect(repo.createCase(input({ categoryId: "nope" }))).rejects.toThrow(/Unknown category/);
      await expect(repo.createCase(input({ communityId: "nowhere" }))).rejects.toThrow(/Unknown community/);
      await expect(repo.createCase(input({ description: "x".repeat(2001) }))).rejects.toThrow(/at most/);
      expect(await repo.listCasesForCommunity(SANTIAGO_VERAGUAS.id)).toEqual([]);
    });

    it("returns undefined for an unknown case", async () => {
      expect(await repo.getCaseByCaseNumber("SV-1999-0001")).toBeUndefined();
    });

    it("lists newest first, and leaves out deleted and removed cases (admin still sees removed ones)", async () => {
      const older = await repo.createCase(input(), at(0));
      const removed = await repo.createCase(input(), at(1));
      const deleted = await repo.createCase(input(), at(2));
      const newest = await repo.createCase(input(), at(3));
      await repo.removeCaseContent(removed.publicCaseNumber, "spam_or_advertising", "admin");
      await repo.deleteCase(deleted.publicCaseNumber, deleted.managementToken);
      const listed = (await repo.listCasesForCommunity(SANTIAGO_VERAGUAS.id)).map((c) => c.publicCaseNumber);
      expect(listed).toEqual([newest.publicCaseNumber, older.publicCaseNumber]);
      const admin = (await repo.listAllCasesForAdmin()).map((c) => c.publicCaseNumber);
      expect(admin).toEqual([newest.publicCaseNumber, removed.publicCaseNumber, older.publicCaseNumber]);
    });

    it("lists open cases without duplicates or the excluded case", async () => {
      const a = await repo.createCase(input(), at(0));
      const b = await repo.createCase(input(), at(1));
      const c = await repo.createCase(input(), at(2));
      await repo.markDuplicate(b.publicCaseNumber, a.publicCaseNumber, "admin");
      const open = await repo.listOpenCasesForCommunity(SANTIAGO_VERAGUAS.id, c.publicCaseNumber);
      expect(open.map((x) => x.publicCaseNumber)).toEqual([a.publicCaseNumber]);
    });

    it("returns copies: changing a returned case changes nothing stored", async () => {
      const c = await repo.createCase(input());
      c.status = "closed";
      c.statusHistory.push({ id: "x", status: "closed", occurredAt: T0.toISOString(), actorType: "system" });
      const read = (await repo.getCaseByCaseNumber(c.publicCaseNumber))!;
      expect(read.status).toBe("received");
      expect(read.statusHistory).toHaveLength(1);
    });
  });

  describe("resident actions", () => {
    it("deletes only with the right token, and a deleted case is gone everywhere", async () => {
      const c = await repo.createCase(input());
      expect(await repo.deleteCase(c.publicCaseNumber, "wrong")).toBe(false);
      expect(await repo.deleteCase(c.publicCaseNumber, c.managementToken)).toBe(true);
      expect(await repo.deleteCase(c.publicCaseNumber, c.managementToken)).toBe(false);
      expect(await repo.getCaseByCaseNumber(c.publicCaseNumber)).toBeUndefined();
      expect(await repo.changeCaseStatus(c.publicCaseNumber, "closed", "admin")).toBe(false);
    });

    it("records inaccuracy flags (trimmed), not on removed content, and marks them reviewed", async () => {
      const c = await repo.createCase(input());
      expect(await repo.flagInaccuracy(c.publicCaseNumber, "  wrong area  ", at(5))).toBe(true);
      expect(await repo.flagInaccuracy(c.publicCaseNumber, "   ", at(6))).toBe(true);
      const flags = (await repo.getCaseByCaseNumber(c.publicCaseNumber))!.inaccuracyFlags;
      expect(flags).toEqual([
        { id: expect.any(String), note: "wrong area", occurredAt: at(5)().toISOString() },
        { id: expect.any(String), occurredAt: at(6)().toISOString() },
      ]);
      expect(await repo.markInaccuracyFlagReviewed(c.publicCaseNumber, flags[0].id, at(7))).toBe(true);
      expect(await repo.markInaccuracyFlagReviewed(c.publicCaseNumber, "not-a-flag")).toBe(false);
      expect((await repo.getCaseByCaseNumber(c.publicCaseNumber))!.inaccuracyFlags[0].reviewedAt).toBe(at(7)().toISOString());

      await repo.removeCaseContent(c.publicCaseNumber, "off_topic", "admin");
      expect(await repo.flagInaccuracy(c.publicCaseNumber, "x")).toBe(false);
    });
  });

  describe("moderator actions", () => {
    it("changes status with a public entry and an audit record", async () => {
      const c = await repo.createCase(input(), at(0));
      expect(await repo.changeCaseStatus(c.publicCaseNumber, "in_progress", "admin", "Working on it", at(10))).toBe(true);
      expect(await repo.changeCaseStatus(c.publicCaseNumber, "closed", "admin", undefined, at(11))).toBe(true);
      const read = (await repo.getCaseByCaseNumber(c.publicCaseNumber))!;
      expect(read.status).toBe("closed");
      expect(read.statusHistory.slice(1)).toEqual([
        { id: expect.any(String), status: "in_progress", occurredAt: at(10)().toISOString(), actorType: "moderator", note: "Working on it" },
        { id: expect.any(String), status: "closed", occurredAt: at(11)().toISOString(), actorType: "moderator" },
      ]);
      expect(read.moderationActions.map((a) => [a.action, a.actorId, a.detail])).toEqual([
        ["status_change", "admin", "Working on it"],
        ["status_change", "admin", "closed"],
      ]);
    });

    it("requires a source for official verification, and clears it when unverified", async () => {
      const c = await repo.createCase(input());
      const source = { title: "Alcaldía", url: "https://alcaldiadesantiago.gob.pa/", checkedAt: T0.toISOString(), moderatorActorId: "admin" };
      expect(await repo.setVerificationState(c.publicCaseNumber, "officially_verified", "admin")).toBe(false);
      expect(await repo.setVerificationState(c.publicCaseNumber, "officially_verified", "admin", source)).toBe(true);
      expect((await repo.getCaseByCaseNumber(c.publicCaseNumber))!.verifiedSource).toEqual(source);
      expect(await repo.setVerificationState(c.publicCaseNumber, "needs_verification", "admin", source)).toBe(true);
      const read = (await repo.getCaseByCaseNumber(c.publicCaseNumber))!;
      expect(read.verifiedSource).toBeUndefined();
      expect(read.moderationActions.map((a) => a.action)).toEqual(["mark_verified", "mark_unverified"]);
    });

    it("marks duplicates only of another existing case", async () => {
      const a = await repo.createCase(input());
      const b = await repo.createCase(input());
      expect(await repo.markDuplicate(b.publicCaseNumber, b.publicCaseNumber, "admin")).toBe(false);
      expect(await repo.markDuplicate(b.publicCaseNumber, "SV-1999-0001", "admin")).toBe(false);
      expect(await repo.markDuplicate(b.publicCaseNumber, a.publicCaseNumber, "admin")).toBe(true);
      expect((await repo.getCaseByCaseNumber(b.publicCaseNumber))!.isDuplicateOf).toBe(a.publicCaseNumber);
    });

    it("adds private notes (not blank ones)", async () => {
      const c = await repo.createCase(input());
      expect(await repo.addAdminNote(c.publicCaseNumber, "   ", "admin")).toBe(false);
      expect(await repo.addAdminNote(c.publicCaseNumber, "  Call back  ", "admin", at(3))).toBe(true);
      const read = (await repo.getCaseByCaseNumber(c.publicCaseNumber))!;
      expect(read.adminNotes).toEqual([{ id: expect.any(String), authorId: "admin", createdAt: at(3)().toISOString(), note: "Call back" }]);
      expect(read.moderationActions.map((a) => a.action)).toEqual(["add_note"]);
    });

    it("removes and restores content, once each", async () => {
      const c = await repo.createCase(input());
      expect(await repo.restoreCaseContent(c.publicCaseNumber, "admin")).toBe(false);
      expect(await repo.removeCaseContent(c.publicCaseNumber, "personal_information", "admin", " had a phone ", at(4))).toBe(true);
      expect(await repo.removeCaseContent(c.publicCaseNumber, "spam_or_advertising", "admin")).toBe(false);
      const removed = (await repo.getCaseByCaseNumber(c.publicCaseNumber))!;
      expect(removed.removal).toEqual({ reason: "personal_information", removedAt: at(4)().toISOString() });
      expect(removed.moderationActions[0].detail).toBe("personal_information: had a phone");
      expect(await repo.restoreCaseContent(c.publicCaseNumber, "admin")).toBe(true);
      expect((await repo.getCaseByCaseNumber(c.publicCaseNumber))!.removal).toBeUndefined();
    });
  });

  describe("AI suggestions and referrals", () => {
    it("replaces pending suggestions of the same kind, and reviews each once", async () => {
      const c = await repo.createCase(input());
      await repo.addAgentSuggestions(c.publicCaseNumber, [{ kind: "status", suggestedValue: "under_review", reasoning: "r1" }]);
      await repo.addAgentSuggestions(c.publicCaseNumber, [
        { kind: "status", suggestedValue: "in_progress", reasoning: "r2" },
        { kind: "verification", suggestedValue: "needs_verification", reasoning: "r3" },
      ]);
      const suggestions = (await repo.getCaseByCaseNumber(c.publicCaseNumber))!.agentSuggestions;
      expect(suggestions.map((s) => [s.kind, s.suggestedValue, s.status])).toEqual([
        ["status", "in_progress", "pending"],
        ["verification", "needs_verification", "pending"],
      ]);
      expect(await repo.setAgentSuggestionStatus(c.publicCaseNumber, suggestions[0].id, "approved", at(9))).toBe(true);
      expect(await repo.setAgentSuggestionStatus(c.publicCaseNumber, suggestions[0].id, "rejected")).toBe(false);
      expect(await repo.setAgentSuggestionStatus(c.publicCaseNumber, "not-an-id", "rejected")).toBe(false);
      const after = (await repo.getCaseByCaseNumber(c.publicCaseNumber))!.agentSuggestions[0];
      expect(after).toMatchObject({ status: "approved", reviewedAt: at(9)().toISOString() });
    });

    it("adds public timeline steps that keep the case's current status", async () => {
      const c = await repo.createCase(input());
      await repo.changeCaseStatus(c.publicCaseNumber, "under_review", "admin");
      expect(
        await repo.addTimelineEvent(c.publicCaseNumber, { kind: "referral_prepared", actorType: "agent", contactId: draft.contactId }, at(20)),
      ).toBe(true);
      expect(await repo.addTimelineEvent("SV-1999-0001", { kind: "ai_reviewed", actorType: "agent" })).toBe(false);
      expect((await repo.getCaseByCaseNumber(c.publicCaseNumber))!.statusHistory.at(-1)).toEqual({
        id: expect.any(String),
        status: "under_review",
        occurredAt: at(20)().toISOString(),
        actorType: "agent",
        kind: "referral_prepared",
        contactId: draft.contactId,
      });
    });

    it("stores a referral draft, replacing an older pending one, and rejects invalid drafts", async () => {
      const c = await repo.createCase(input());
      await repo.addReferralSuggestion(c.publicCaseNumber, draft, "first");
      const second = await repo.addReferralSuggestion(c.publicCaseNumber, { ...draft, urgency: "high" }, "second", at(30));
      expect(second).toEqual({
        id: expect.any(String),
        kind: "referral",
        suggestedValue: draft.contactId,
        reasoning: "second",
        createdAt: at(30)().toISOString(),
        status: "pending",
        referral: { ...draft, urgency: "high" },
      });
      expect((await repo.getCaseByCaseNumber(c.publicCaseNumber))!.agentSuggestions).toEqual([second]);
      expect(await repo.addReferralSuggestion(c.publicCaseNumber, { ...draft, message: "" }, "x")).toBeNull();
      expect(await repo.addReferralSuggestion("SV-1999-0001", draft, "x")).toBeNull();
    });

    it("approves a referral: final message kept, case referred, one public entry, one audit record", async () => {
      const c = await repo.createCase(input());
      const s = (await repo.addReferralSuggestion(c.publicCaseNumber, draft, "why"))!;
      expect(await repo.approveReferral(c.publicCaseNumber, s.id, "Mensaje final.", "admin", at(40))).toBe(true);
      expect(await repo.approveReferral(c.publicCaseNumber, s.id, "Otra vez.", "admin")).toBe(false);
      const read = (await repo.getCaseByCaseNumber(c.publicCaseNumber))!;
      expect(read.status).toBe("referred");
      expect(read.agentSuggestions[0]).toMatchObject({ status: "approved", reviewedAt: at(40)().toISOString(), referral: { message: "Mensaje final." } });
      expect(read.statusHistory.at(-1)).toEqual({
        id: expect.any(String),
        status: "referred",
        occurredAt: at(40)().toISOString(),
        actorType: "moderator",
        kind: "referral_approved",
        contactId: draft.contactId,
      });
      expect(read.moderationActions.map((a) => [a.action, a.detail])).toEqual([["approve_referral", draft.contactId]]);
    });

    it("rejects a referral: status unchanged, reason-free public entry, audit record", async () => {
      const c = await repo.createCase(input());
      const s = (await repo.addReferralSuggestion(c.publicCaseNumber, draft, "why"))!;
      expect(await repo.rejectReferral(c.publicCaseNumber, s.id, "admin", at(50))).toBe(true);
      const read = (await repo.getCaseByCaseNumber(c.publicCaseNumber))!;
      expect(read.status).toBe("received");
      expect(read.statusHistory.at(-1)).toMatchObject({ status: "received", kind: "referral_declined", actorType: "moderator" });
      expect(read.moderationActions.map((a) => a.action)).toEqual(["reject_referral"]);
    });

    it("won't decide a referral on removed content, or a suggestion that isn't a pending referral", async () => {
      const c = await repo.createCase(input());
      const s = (await repo.addReferralSuggestion(c.publicCaseNumber, draft, "why"))!;
      await repo.addAgentSuggestions(c.publicCaseNumber, [{ kind: "status", suggestedValue: "closed", reasoning: "r" }]);
      const statusSuggestion = (await repo.getCaseByCaseNumber(c.publicCaseNumber))!.agentSuggestions.find((x) => x.kind === "status")!;
      expect(await repo.approveReferral(c.publicCaseNumber, statusSuggestion.id, "m", "admin")).toBe(false);
      expect(await repo.approveReferral(c.publicCaseNumber, "not-an-id", "m", "admin")).toBe(false);
      await repo.removeCaseContent(c.publicCaseNumber, "off_topic", "admin");
      expect(await repo.approveReferral(c.publicCaseNumber, s.id, "m", "admin")).toBe(false);
      expect(await repo.rejectReferral(c.publicCaseNumber, s.id, "admin")).toBe(false);
    });

    it("never exposes private records through the public view", async () => {
      const c = await repo.createCase(input());
      await repo.addReferralSuggestion(c.publicCaseNumber, draft, "private reasoning");
      await repo.addAdminNote(c.publicCaseNumber, "private note", "admin");
      await repo.flagInaccuracy(c.publicCaseNumber, "private flag");
      const publicJson = JSON.stringify(toPublicCase((await repo.getCaseByCaseNumber(c.publicCaseNumber))!));
      for (const secret of ["private reasoning", "private note", "private flag", draft.message, c.managementToken]) {
        expect(publicJson).not.toContain(secret);
      }
    });
  });
});
