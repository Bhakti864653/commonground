import { beforeEach, describe, expect, it } from "vitest";
import {
  changeCaseStatus,
  createCase,
  getCaseByCaseNumber,
  getCaseRepository,
  listCasesForCommunity,
  __resetCaseStoreForTests,
} from "@/lib/store/case-store";
import { memoryCaseRepository } from "@/lib/store/memory-case-store";
import { buildApproximateArea } from "@/lib/privacy/approximate-area";
import { buildConsentRecord } from "@/lib/privacy/consent";
import { SANTIAGO_VERAGUAS } from "@/data/communities";

const input = () => ({
  type: "report" as const,
  communityId: SANTIAGO_VERAGUAS.id,
  categoryId: "flooding-drainage",
  description: "Drain blocked.",
  approximateArea: buildApproximateArea(SANTIAGO_VERAGUAS.areas[0]),
  consent: buildConsentRecord(SANTIAGO_VERAGUAS.privacy.consentVersion, "es"),
});

describe("case-store (async API over the configured repository)", () => {
  beforeEach(() => {
    __resetCaseStoreForTests();
  });

  it("uses the in-memory repository when no database is configured", () => {
    expect(getCaseRepository()).toBe(memoryCaseRepository);
  });

  it("writes and reads through the same async API", async () => {
    const created = await createCase(input());
    expect(await changeCaseStatus(created.publicCaseNumber, "under_review", "admin")).toBe(true);
    expect((await getCaseByCaseNumber(created.publicCaseNumber))?.status).toBe("under_review");
    expect(await listCasesForCommunity(SANTIAGO_VERAGUAS.id)).toHaveLength(1);
  });

  it("returns copies: changing a returned case doesn't change the stored one, as with a database", async () => {
    const created = await createCase(input());
    created.status = "closed";
    const read = (await getCaseByCaseNumber(created.publicCaseNumber))!;
    expect(read.status).toBe("received");
    read.statusHistory.push({ id: "x", status: "closed", occurredAt: "2026-01-01T00:00:00Z", actorType: "system" });
    expect((await getCaseByCaseNumber(created.publicCaseNumber))!.statusHistory).toHaveLength(1);
    (await listCasesForCommunity(SANTIAGO_VERAGUAS.id))[0].description = "changed";
    expect((await getCaseByCaseNumber(created.publicCaseNumber))!.description).toBe("Drain blocked.");
  });

  it("returns undefined, not a copy of nothing, for an unknown case", async () => {
    expect(await getCaseByCaseNumber("SV-1999-0001")).toBeUndefined();
  });
});
