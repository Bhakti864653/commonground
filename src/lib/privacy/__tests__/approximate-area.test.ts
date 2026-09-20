import { describe, expect, it } from "vitest";
import { buildApproximateArea, formatApproximateAreaLabel } from "@/lib/privacy/approximate-area";
import { SANTIAGO_VERAGUAS } from "@/data/communities";

describe("buildApproximateArea", () => {
  it("carries the chosen area's id, kind, and bilingual label", () => {
    const area = SANTIAGO_VERAGUAS.areas[0]; // centro
    expect(buildApproximateArea(area, "en")).toEqual({
      kind: "neighborhood",
      areaId: "centro",
      label: "Central area",
      labelEs: "Área central",
    });
  });

  it("never invents an exact address — a null area becomes prefer_not_to_say with no areaId/coordinates", () => {
    const result = buildApproximateArea(null, "en");
    expect(result.kind).toBe("prefer_not_to_say");
    expect(result.areaId).toBeUndefined();
    expect(result.approxLat).toBeUndefined();
    expect(result.approxLng).toBeUndefined();
  });
});

describe("formatApproximateAreaLabel", () => {
  it("prefers the Spanish label only when one exists and language is es", () => {
    const area = buildApproximateArea(SANTIAGO_VERAGUAS.areas[0], "en");
    expect(formatApproximateAreaLabel(area, "es")).toBe("Área central");
    expect(formatApproximateAreaLabel(area, "en")).toBe("Central area");
  });

  it("falls back to the default label if no Spanish label was set", () => {
    const area = buildApproximateArea(null, "en");
    expect(formatApproximateAreaLabel({ ...area, labelEs: undefined }, "es")).toBe(
      "Prefer not to say",
    );
  });
});
