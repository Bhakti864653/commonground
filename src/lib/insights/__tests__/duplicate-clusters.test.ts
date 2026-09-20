import { describe, expect, it } from "vitest";
import { findDuplicateClusters, jaccardSimilarity } from "@/lib/insights/duplicate-clusters";
import type { PublicCase } from "@/lib/schema/report";

function makeCase(overrides: Partial<PublicCase>): PublicCase {
  return {
    id: overrides.id ?? "id",
    type: "report",
    publicCaseNumber: overrides.publicCaseNumber ?? "SV-2026-0001",
    communityId: "santiago-veraguas",
    categoryId: overrides.categoryId ?? "flooding-drainage",
    description: overrides.description ?? "",
    approximateArea: overrides.approximateArea ?? {
      kind: "neighborhood",
      areaId: "centro",
      label: "Central area",
    },
    createdAt: overrides.createdAt ?? "2026-09-20T00:00:00.000Z",
    status: "received",
    statusHistory: [],
    sourceType: "community",
    verificationState: "community_report",
    consent: { consentVersion: "v1", consentedAt: "2026-09-20T00:00:00.000Z", language: "en" },
    isDuplicateOf: overrides.isDuplicateOf,
    ...overrides,
  } as PublicCase;
}

describe("jaccardSimilarity", () => {
  it("scores identical text as 1", () => {
    expect(jaccardSimilarity("blocked drainage near plaza", "blocked drainage near plaza")).toBe(1);
  });

  it("scores completely unrelated text as 0", () => {
    expect(jaccardSimilarity("blocked drainage near plaza", "streetlight is broken")).toBe(0);
  });

  it("is accent- and case-insensitive", () => {
    expect(jaccardSimilarity("DESAGÜE bloqueado", "desague bloqueado")).toBeGreaterThan(0.9);
  });

  it("finds real overlap between differently-worded descriptions", () => {
    const score = jaccardSimilarity(
      "El desagüe frente a la plaza central lleva bloqueado tres días",
      "Hay agua acumulada frente a la plaza, parece drenaje tapado",
    );
    expect(score).toBeGreaterThan(0);
  });
});

describe("findDuplicateClusters", () => {
  it("clusters two similar cases in the same category+area", () => {
    const cases = [
      makeCase({
        publicCaseNumber: "SV-2026-0001",
        description: "Storm drain blocked near the central plaza for three days",
      }),
      makeCase({
        publicCaseNumber: "SV-2026-0002",
        description: "Water pooling near the central plaza, drain seems blocked",
      }),
    ];
    const clusters = findDuplicateClusters(cases);
    expect(clusters).toHaveLength(1);
    expect(clusters[0].caseNumbers.sort()).toEqual(["SV-2026-0001", "SV-2026-0002"]);
  });

  it("never clusters cases in different categories, even with identical text", () => {
    const cases = [
      makeCase({ publicCaseNumber: "SV-2026-0001", categoryId: "flooding-drainage", description: "same text" }),
      makeCase({ publicCaseNumber: "SV-2026-0002", categoryId: "garbage-sanitation", description: "same text" }),
    ];
    expect(findDuplicateClusters(cases)).toHaveLength(0);
  });

  it("never clusters cases in different areas", () => {
    const cases = [
      makeCase({
        publicCaseNumber: "SV-2026-0001",
        description: "identical description text here",
        approximateArea: { kind: "neighborhood", areaId: "centro", label: "Central" },
      }),
      makeCase({
        publicCaseNumber: "SV-2026-0002",
        description: "identical description text here",
        approximateArea: { kind: "neighborhood", areaId: "norte", label: "North" },
      }),
    ];
    expect(findDuplicateClusters(cases)).toHaveLength(0);
  });

  it("excludes a case already marked as a duplicate of something else", () => {
    const cases = [
      makeCase({
        publicCaseNumber: "SV-2026-0001",
        description: "blocked drainage near the plaza",
      }),
      makeCase({
        publicCaseNumber: "SV-2026-0002",
        description: "blocked drainage near the plaza",
        isDuplicateOf: "SV-2026-0000",
      }),
    ];
    expect(findDuplicateClusters(cases)).toHaveLength(0);
  });

  it("groups three mutually-similar cases into one cluster, not pairs", () => {
    const cases = [
      makeCase({ publicCaseNumber: "SV-2026-0001", description: "flooding water near plaza drainage blocked" }),
      makeCase({ publicCaseNumber: "SV-2026-0002", description: "flooding water near plaza drainage tapped" }),
      makeCase({ publicCaseNumber: "SV-2026-0003", description: "flooding water near plaza drainage stuck" }),
    ];
    const clusters = findDuplicateClusters(cases);
    expect(clusters).toHaveLength(1);
    expect(clusters[0].caseNumbers).toHaveLength(3);
  });
});
