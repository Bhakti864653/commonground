import { describe, expect, it } from "vitest";
import { areaPosition, caseOffset } from "@/lib/pulse/layout";

describe("areaPosition", () => {
  it("spaces areas evenly around a circle of the given radius", () => {
    const [x0, , z0] = areaPosition(0, 4, 10);
    expect(x0).toBeCloseTo(10);
    expect(z0).toBeCloseTo(0);
  });

  it("returns the origin when there are no areas, rather than dividing by zero", () => {
    expect(areaPosition(0, 0)).toEqual([0, 0, 0]);
  });
});

describe("caseOffset", () => {
  it("is deterministic — the same case id always gets the same offset", () => {
    expect(caseOffset("SV-2026-0001")).toEqual(caseOffset("SV-2026-0001"));
  });

  it("gives different cases different offsets", () => {
    expect(caseOffset("SV-2026-0001")).not.toEqual(caseOffset("SV-2026-0002"));
  });

  it("stays within the requested spread", () => {
    const [x, z] = caseOffset("SV-2026-0001", 2);
    expect(Math.abs(x)).toBeLessThanOrEqual(2);
    expect(Math.abs(z)).toBeLessThanOrEqual(2);
  });
});
