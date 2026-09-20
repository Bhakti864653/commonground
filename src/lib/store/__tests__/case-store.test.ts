import { beforeEach, describe, expect, it } from "vitest";
import {
  createCase,
  deleteCase,
  flagInaccuracy,
  getCaseByCaseNumber,
  listCasesForCommunity,
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
