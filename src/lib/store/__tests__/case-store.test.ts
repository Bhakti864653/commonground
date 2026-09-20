import { beforeEach, describe, expect, it } from "vitest";
import {
  addAdminNote,
  changeCaseStatus,
  createCase,
  deleteCase,
  flagInaccuracy,
  getCaseByCaseNumber,
  listAllCasesForAdmin,
  listCasesForCommunity,
  markDuplicate,
  markInaccuracyFlagReviewed,
  setVerificationState,
  __resetCaseStoreForTests,
  type NewCaseInput,
} from "@/lib/store/case-store";
import { buildApproximateArea } from "@/lib/privacy/approximate-area";
import { buildConsentRecord } from "@/lib/privacy/consent";
import { SANTIAGO_VERAGUAS, RIVERBEND_DEMO } from "@/data/communities";

function baseInput(overrides: Partial<NewCaseInput> = {}): NewCaseInput {
  return {
    type: "report",
    communityId: SANTIAGO_VERAGUAS.id,
    categoryId: SANTIAGO_VERAGUAS.categories[0].id,
    description: "Storm drain has been blocked for two weeks near the plaza.",
    approximateArea: buildApproximateArea(SANTIAGO_VERAGUAS.areas[0], "en"),
    consent: buildConsentRecord(SANTIAGO_VERAGUAS.privacy.consentVersion, "en", () =>
      "2026-09-20T00:00:00.000Z",
    ),
    ...overrides,
  };
}

describe("createCase", () => {
  beforeEach(() => {
    __resetCaseStoreForTests();
  });

  it("assigns a case number scoped per community per year, incrementing per submission", () => {
    const fixedNow = () => new Date("2026-09-20T00:00:00.000Z");
    const first = createCase(baseInput(), fixedNow);
    const second = createCase(baseInput(), fixedNow);
    expect(first.publicCaseNumber).toBe("SV-2026-0001");
    expect(second.publicCaseNumber).toBe("SV-2026-0002");
  });

  it("keeps each community's sequence independent", () => {
    const fixedNow = () => new Date("2026-09-20T00:00:00.000Z");
    const santiago = createCase(baseInput(), fixedNow);
    const riverbend = createCase(
      baseInput({
        communityId: RIVERBEND_DEMO.id,
        categoryId: RIVERBEND_DEMO.categories[0].id,
        approximateArea: buildApproximateArea(RIVERBEND_DEMO.areas[0], "en"),
        consent: buildConsentRecord(RIVERBEND_DEMO.privacy.consentVersion, "en", () =>
          "2026-09-20T00:00:00.000Z",
        ),
      }),
      fixedNow,
    );
    expect(santiago.publicCaseNumber).toBe("SV-2026-0001");
    expect(riverbend.publicCaseNumber).toBe("RD-2026-0001");
  });

  it("marks a demo community's case as demonstration data, and a real community's as a community report", () => {
    const fixedNow = () => new Date("2026-09-20T00:00:00.000Z");
    const santiago = createCase(baseInput(), fixedNow);
    const riverbend = createCase(
      baseInput({
        communityId: RIVERBEND_DEMO.id,
        categoryId: RIVERBEND_DEMO.categories[0].id,
        approximateArea: buildApproximateArea(RIVERBEND_DEMO.areas[0], "en"),
      }),
      fixedNow,
    );
    expect(santiago.sourceType).toBe("community");
    expect(santiago.verificationState).toBe("community_report");
    expect(riverbend.sourceType).toBe("demonstration");
    expect(riverbend.verificationState).toBe("demonstration_data");
  });

  it("starts every case with a single 'received' status event", () => {
    const created = createCase(baseInput());
    expect(created.status).toBe("received");
    expect(created.statusHistory).toHaveLength(1);
    expect(created.statusHistory[0].status).toBe("received");
    expect(created.statusHistory[0].actorType).toBe("system");
  });

  it("rejects invalid image metadata server-side, even bypassing the wizard's own client-side check", () => {
    expect(() =>
      createCase(
        baseInput({
          image: {
            fileName: "x.exe",
            mimeType: "application/x-msdownload",
            sizeBytes: 100,
            uploadedAt: "2026-09-20T00:00:00.000Z",
          },
        }),
      ),
    ).toThrow();
  });

  it("rejects an unknown community rather than silently creating an orphaned case", () => {
    expect(() => createCase(baseInput({ communityId: "not-a-real-community" }))).toThrow();
  });

  it("gives every case its own random management token", () => {
    const a = createCase(baseInput());
    const b = createCase(baseInput());
    expect(a.managementToken).toBeTruthy();
    expect(a.managementToken).not.toBe(b.managementToken);
  });
});

describe("getCaseByCaseNumber / listCasesForCommunity", () => {
  beforeEach(() => {
    __resetCaseStoreForTests();
  });

  it("looks a case back up by its public case number", () => {
    const created = createCase(baseInput());
    expect(getCaseByCaseNumber(created.publicCaseNumber)?.id).toBe(created.id);
  });

  it("returns undefined for a case number that doesn't exist", () => {
    expect(getCaseByCaseNumber("SV-2026-9999")).toBeUndefined();
  });

  it("lists only the given community's cases", () => {
    createCase(baseInput());
    createCase(
      baseInput({
        communityId: RIVERBEND_DEMO.id,
        categoryId: RIVERBEND_DEMO.categories[0].id,
        approximateArea: buildApproximateArea(RIVERBEND_DEMO.areas[0], "en"),
      }),
    );
    expect(listCasesForCommunity(SANTIAGO_VERAGUAS.id)).toHaveLength(1);
    expect(listCasesForCommunity(RIVERBEND_DEMO.id)).toHaveLength(1);
  });

  it("lists newest first", () => {
    createCase(baseInput(), () => new Date("2026-09-20T00:00:00.000Z"));
    const second = createCase(baseInput(), () => new Date("2026-09-20T01:00:00.000Z"));
    const list = listCasesForCommunity(SANTIAGO_VERAGUAS.id);
    expect(list[0].id).toBe(second.id);
  });
});

describe("deleteCase", () => {
  beforeEach(() => {
    __resetCaseStoreForTests();
  });

  it("deletes when the token matches, and the case then behaves as not-found", () => {
    const created = createCase(baseInput());
    expect(deleteCase(created.publicCaseNumber, created.managementToken)).toBe(true);
    expect(getCaseByCaseNumber(created.publicCaseNumber)).toBeUndefined();
  });

  it("refuses to delete with the wrong token, and the case remains", () => {
    const created = createCase(baseInput());
    expect(deleteCase(created.publicCaseNumber, "wrong-token")).toBe(false);
    expect(getCaseByCaseNumber(created.publicCaseNumber)).toBeDefined();
  });

  it("returns false for a case number that doesn't exist", () => {
    expect(deleteCase("SV-2026-9999", "anything")).toBe(false);
  });

  it("excludes a deleted case from its community's list", () => {
    const created = createCase(baseInput());
    deleteCase(created.publicCaseNumber, created.managementToken);
    expect(listCasesForCommunity(SANTIAGO_VERAGUAS.id)).toHaveLength(0);
  });
});

describe("flagInaccuracy", () => {
  beforeEach(() => {
    __resetCaseStoreForTests();
  });

  it("requires no token, and records an optional note", () => {
    const created = createCase(baseInput());
    expect(flagInaccuracy(created.publicCaseNumber, "The area listed looks wrong")).toBe(true);
    const found = getCaseByCaseNumber(created.publicCaseNumber);
    expect(found?.inaccuracyFlags).toHaveLength(1);
    expect(found?.inaccuracyFlags[0].note).toBe("The area listed looks wrong");
  });

  it("allows an empty note", () => {
    const created = createCase(baseInput());
    expect(flagInaccuracy(created.publicCaseNumber, undefined)).toBe(true);
    expect(getCaseByCaseNumber(created.publicCaseNumber)?.inaccuracyFlags[0].note).toBeUndefined();
  });

  it("returns false for a case number that doesn't exist", () => {
    expect(flagInaccuracy("SV-2026-9999", undefined)).toBe(false);
  });
});

describe("changeCaseStatus", () => {
  beforeEach(() => {
    __resetCaseStoreForTests();
  });

  it("updates status, appends a moderator status event, and a moderation action", () => {
    const created = createCase(baseInput());
    expect(changeCaseStatus(created.publicCaseNumber, "under_review", "admin", "Looking into it")).toBe(
      true,
    );
    const found = getCaseByCaseNumber(created.publicCaseNumber)!;
    expect(found.status).toBe("under_review");
    expect(found.statusHistory).toHaveLength(2);
    expect(found.statusHistory[1]).toMatchObject({
      status: "under_review",
      actorType: "moderator",
      note: "Looking into it",
    });
    expect(found.moderationActions).toHaveLength(1);
    expect(found.moderationActions[0].action).toBe("status_change");
  });

  it("history is append-only across multiple changes — earlier entries are never rewritten", () => {
    const created = createCase(baseInput());
    changeCaseStatus(created.publicCaseNumber, "under_review", "admin");
    changeCaseStatus(created.publicCaseNumber, "in_discussion", "admin");
    changeCaseStatus(created.publicCaseNumber, "closed", "admin");
    const found = getCaseByCaseNumber(created.publicCaseNumber)!;
    expect(found.statusHistory.map((e) => e.status)).toEqual([
      "received",
      "under_review",
      "in_discussion",
      "closed",
    ]);
    expect(found.statusHistory[0].actorType).toBe("system");
    expect(found.moderationActions).toHaveLength(3);
  });

  it("returns false for a case number that doesn't exist", () => {
    expect(changeCaseStatus("SV-2026-9999", "closed", "admin")).toBe(false);
  });
});

describe("setVerificationState", () => {
  beforeEach(() => {
    __resetCaseStoreForTests();
  });

  it("updates verification and records mark_verified", () => {
    const created = createCase(baseInput());
    expect(setVerificationState(created.publicCaseNumber, "officially_verified", "admin")).toBe(true);
    const found = getCaseByCaseNumber(created.publicCaseNumber)!;
    expect(found.verificationState).toBe("officially_verified");
    expect(found.moderationActions[0].action).toBe("mark_verified");
  });

  it("records mark_unverified for a non-verified state", () => {
    const created = createCase(baseInput());
    setVerificationState(created.publicCaseNumber, "needs_verification", "admin");
    const found = getCaseByCaseNumber(created.publicCaseNumber)!;
    expect(found.moderationActions[0].action).toBe("mark_unverified");
  });
});

describe("markDuplicate", () => {
  beforeEach(() => {
    __resetCaseStoreForTests();
  });

  it("sets isDuplicateOf when both cases exist and differ", () => {
    const original = createCase(baseInput());
    const duplicate = createCase(baseInput());
    expect(markDuplicate(duplicate.publicCaseNumber, original.publicCaseNumber, "admin")).toBe(true);
    expect(getCaseByCaseNumber(duplicate.publicCaseNumber)?.isDuplicateOf).toBe(
      original.publicCaseNumber,
    );
  });

  it("refuses to mark a case as a duplicate of itself", () => {
    const created = createCase(baseInput());
    expect(markDuplicate(created.publicCaseNumber, created.publicCaseNumber, "admin")).toBe(false);
  });

  it("refuses when the original case doesn't exist", () => {
    const created = createCase(baseInput());
    expect(markDuplicate(created.publicCaseNumber, "SV-2026-9999", "admin")).toBe(false);
  });
});

describe("addAdminNote", () => {
  beforeEach(() => {
    __resetCaseStoreForTests();
  });

  it("adds a private note distinct from public fields", () => {
    const created = createCase(baseInput());
    expect(addAdminNote(created.publicCaseNumber, "Checked on site, confirmed", "admin")).toBe(true);
    const found = getCaseByCaseNumber(created.publicCaseNumber)!;
    expect(found.adminNotes).toHaveLength(1);
    expect(found.adminNotes[0].note).toBe("Checked on site, confirmed");
  });

  it("refuses an empty note", () => {
    const created = createCase(baseInput());
    expect(addAdminNote(created.publicCaseNumber, "   ", "admin")).toBe(false);
  });
});

describe("markInaccuracyFlagReviewed", () => {
  beforeEach(() => {
    __resetCaseStoreForTests();
  });

  it("marks a flag reviewed without affecting others", () => {
    const created = createCase(baseInput());
    flagInaccuracy(created.publicCaseNumber, "first");
    flagInaccuracy(created.publicCaseNumber, "second");
    const [first, second] = getCaseByCaseNumber(created.publicCaseNumber)!.inaccuracyFlags;
    expect(markInaccuracyFlagReviewed(created.publicCaseNumber, first.id)).toBe(true);
    const found = getCaseByCaseNumber(created.publicCaseNumber)!;
    expect(found.inaccuracyFlags.find((f) => f.id === first.id)?.reviewedAt).toBeTruthy();
    expect(found.inaccuracyFlags.find((f) => f.id === second.id)?.reviewedAt).toBeUndefined();
  });
});

describe("listAllCasesForAdmin", () => {
  beforeEach(() => {
    __resetCaseStoreForTests();
  });

  it("lists cases across every community, excluding deleted ones", () => {
    const santiago = createCase(baseInput());
    const riverbend = createCase(
      baseInput({
        communityId: RIVERBEND_DEMO.id,
        categoryId: RIVERBEND_DEMO.categories[0].id,
        approximateArea: buildApproximateArea(RIVERBEND_DEMO.areas[0], "en"),
      }),
    );
    deleteCase(santiago.publicCaseNumber, santiago.managementToken);
    const all = listAllCasesForAdmin();
    expect(all.map((c) => c.id)).toEqual([riverbend.id]);
  });
});
