import { describe, expect, it } from "vitest";
import { buildApproximateArea, formatApproximateAreaLabel } from "@/lib/privacy/approximate-area";
import { SANTIAGO_VERAGUAS } from "@/data/communities";

describe("buildApproximateArea", () => {
  it("carries the chosen area's id, kind, and bilingual label", () => {
    const area = SANTIAGO_VERAGUAS.areas[0]; // centro
    expect(buildApproximateArea(area)).toEqual({
      kind: "neighborhood",
      areaId: "centro",
      label: "Central area",
      labelEs: "Área central",
      labels: { pt: "Área central", fr: "Zone centrale", zh: "中心区" },
    });
  });

  it("never invents an exact address — a null area becomes prefer_not_to_say with no areaId/coordinates", () => {
    const result = buildApproximateArea(null);
    expect(result.kind).toBe("prefer_not_to_say");
    expect(result.areaId).toBeUndefined();
    expect(result.approxLat).toBeUndefined();
    expect(result.approxLng).toBeUndefined();
  });
});

describe("formatApproximateAreaLabel", () => {
  it("shows the area in Portuguese, French, and Chinese when the community has those names", () => {
    const area = buildApproximateArea(SANTIAGO_VERAGUAS.areas[0]);
    expect(formatApproximateAreaLabel(area, "pt")).toBe("Área central");
    expect(formatApproximateAreaLabel(area, "fr")).toBe("Zone centrale");
    expect(formatApproximateAreaLabel(area, "zh")).toBe("中心区");
  });

  it("falls back to English for a language the area has no name in", () => {
    const area = buildApproximateArea({ id: "x", label: "North side", labelEs: "Lado norte", kind: "neighborhood" });
    expect(formatApproximateAreaLabel(area, "fr")).toBe("North side");
  });

  it("translates 'prefer not to say' too", () => {
    expect(formatApproximateAreaLabel(buildApproximateArea(null), "fr")).toBe("Je préfère ne pas le dire");
  });

  it("prefers the Spanish label only when one exists and language is es", () => {
    const area = buildApproximateArea(SANTIAGO_VERAGUAS.areas[0]);
    expect(formatApproximateAreaLabel(area, "es")).toBe("Área central");
    expect(formatApproximateAreaLabel(area, "en")).toBe("Central area");
  });

  it("falls back to the default label if no Spanish label was set", () => {
    const area = buildApproximateArea(null);
    expect(formatApproximateAreaLabel({ ...area, labelEs: undefined }, "es")).toBe(
      "Prefer not to say",
    );
  });
});
