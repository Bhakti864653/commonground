import { beforeEach, describe, expect, it } from "vitest";
import {
  createCase,
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
});
