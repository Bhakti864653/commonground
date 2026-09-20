import { describe, expect, it } from "vitest";
import { detectTrends } from "@/lib/insights/trends";
import type { PublicCase } from "@/lib/schema/report";

function makeCase(publicCaseNumber: string, createdAt: string): PublicCase {
  return {
    id: publicCaseNumber,
    type: "report",
    publicCaseNumber,
    communityId: "santiago-veraguas",
    categoryId: "flooding-drainage",
    description: "flooding",
    approximateArea: { kind: "neighborhood", areaId: "norte", label: "North" },
    createdAt,
    status: "received",
    statusHistory: [],
    sourceType: "community",
    verificationState: "community_report",
    consent: { consentVersion: "v1", consentedAt: createdAt, language: "en" },
  } as PublicCase;
}

const NOW = () => new Date("2026-09-20T00:00:00.000Z");

describe("detectTrends", () => {
  it("surfaces a bucket that meets the minimum count within the window", () => {
    const cases = [
      makeCase("SV-2026-0001", "2026-09-01T00:00:00.000Z"),
      makeCase("SV-2026-0002", "2026-09-05T00:00:00.000Z"),
      makeCase("SV-2026-0003", "2026-09-10T00:00:00.000Z"),
    ];
    const trends = detectTrends(cases, NOW);
    expect(trends).toHaveLength(1);
    expect(trends[0].count).toBe(3);
    expect(trends[0].categoryId).toBe("flooding-drainage");
    expect(trends[0].areaId).toBe("norte");
  });

  it("does not surface a bucket below the minimum count", () => {
    const cases = [
      makeCase("SV-2026-0001", "2026-09-01T00:00:00.000Z"),
      makeCase("SV-2026-0002", "2026-09-05T00:00:00.000Z"),
    ];
    expect(detectTrends(cases, NOW)).toHaveLength(0);
  });

  it("excludes cases outside the time window even if the bucket would otherwise qualify", () => {
    const cases = [
      makeCase("SV-2026-0001", "2026-01-01T00:00:00.000Z"),
      makeCase("SV-2026-0002", "2026-01-02T00:00:00.000Z"),
      makeCase("SV-2026-0003", "2026-01-03T00:00:00.000Z"),
    ];
    expect(detectTrends(cases, NOW)).toHaveLength(0);
  });

  it("sorts multiple trends by count, descending", () => {
    const cases = [
      ...["0001", "0002", "0003"].map((n) => makeCase(`SV-2026-${n}`, "2026-09-10T00:00:00.000Z")),
      ...["0004", "0005", "0006", "0007"].map((n) => {
        const c = makeCase(`SV-2026-${n}`, "2026-09-10T00:00:00.000Z");
        return { ...c, approximateArea: { kind: "neighborhood" as const, areaId: "sur", label: "South" } };
      }),
    ];
    const trends = detectTrends(cases, NOW);
    expect(trends).toHaveLength(2);
    expect(trends[0].areaId).toBe("sur");
    expect(trends[0].count).toBe(4);
  });
});
