import { describe, expect, it } from "vitest";
import { MAX_PLACE_PART_LENGTH, addPlace, formatPlaceLabel, normalizeParts, parseStoredPlaces } from "@/lib/places/places";

const montreal = { country: "Canada", region: "Québec", city: "Montréal", neighborhood: "Plateau-Mont-Royal" };

describe("formatPlaceLabel", () => {
  it("reads most specific first and skips missing parts", () => {
    expect(formatPlaceLabel(montreal)).toBe("Plateau-Mont-Royal, Montréal, Québec, Canada");
    expect(formatPlaceLabel({ country: "Canada", city: "Calgary" })).toBe("Calgary, Canada");
  });
});

describe("normalizeParts", () => {
  it("requires a country and a city — a country alone is too general", () => {
    expect(normalizeParts({ country: "Canada" })).toEqual({ ok: false, reason: "missing_city" });
    expect(normalizeParts({ city: "Toronto" })).toEqual({ ok: false, reason: "missing_country" });
    expect(normalizeParts(null)).toEqual({ ok: false, reason: "missing_country" });
  });

  it("trims, collapses whitespace, and drops empty optional parts", () => {
    expect(normalizeParts({ country: "  Canada ", region: " ", city: "Saint  John", neighborhood: "" })).toEqual({
      ok: true,
      parts: { country: "Canada", region: undefined, city: "Saint John", neighborhood: undefined },
    });
  });

  it("rejects overly long parts and ignores non-string values", () => {
    expect(normalizeParts({ country: "Canada", city: "x".repeat(MAX_PLACE_PART_LENGTH + 1) })).toEqual({ ok: false, reason: "too_long" });
    expect(normalizeParts({ country: 7, city: "Ottawa" })).toEqual({ ok: false, reason: "missing_country" });
  });
});

describe("parseStoredPlaces", () => {
  it("returns an empty list for nothing stored or malformed JSON", () => {
    expect(parseStoredPlaces(null)).toEqual([]);
    expect(parseStoredPlaces("not json")).toEqual([]);
    expect(parseStoredPlaces('{"a":1}')).toEqual([]);
  });

  it("reads places with parts, keeps older name-only places, and drops the malformed", () => {
    const raw = JSON.stringify([
      { parts: montreal },
      "La Villa",
      { parts: { country: "Canada" } },
      42,
      "",
      "x".repeat(MAX_PLACE_PART_LENGTH + 1),
      { parts: { ...montreal, city: "MONTRÉAL", neighborhood: "plateau-mont-royal", region: "québec", country: "canada" } },
    ]);
    expect(parseStoredPlaces(raw)).toEqual([
      { label: "Plateau-Mont-Royal, Montréal, Québec, Canada", parts: montreal },
      { label: "La Villa" },
    ]);
  });
});

describe("addPlace", () => {
  it("adds a place built from its parts", () => {
    const result = addPlace([], montreal, []);
    expect(result).toEqual({
      ok: true,
      places: [{ label: "Plateau-Mont-Royal, Montréal, Québec, Canada", parts: montreal }],
      place: { label: "Plateau-Mont-Royal, Montréal, Québec, Canada", parts: montreal },
    });
  });

  it("rejects vague places", () => {
    expect(addPlace([], { country: "Canada" }, [])).toEqual({ ok: false, reason: "missing_city" });
  });

  it("rejects duplicates case-insensitively, including configured communities and built-ins", () => {
    const first = addPlace([], montreal, []);
    if (!first.ok) throw new Error("setup");
    expect(addPlace(first.places, montreal, [])).toEqual({ ok: false, reason: "duplicate" });
    expect(addPlace(first.places, { ...montreal, city: "MONTRÉAL" }, [])).toEqual({ ok: false, reason: "duplicate" });
    expect(addPlace([], { country: "Panama", city: "Panama City" }, ["panama city, panama"])).toEqual({ ok: false, reason: "duplicate" });
  });

  it("stops at a sensible maximum", () => {
    const full = Array.from({ length: 20 }, (_, i) => ({ label: `Place ${i}` }));
    expect(addPlace(full, { country: "Canada", city: "Halifax" }, [])).toEqual({ ok: false, reason: "full" });
  });
});
