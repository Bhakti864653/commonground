import { describe, expect, it } from "vitest";
import { MAX_PLACE_NAME_LENGTH, addPlace, parseStoredPlaces } from "@/lib/places/places";

describe("parseStoredPlaces", () => {
  it("returns an empty list for nothing stored or malformed JSON", () => {
    expect(parseStoredPlaces(null)).toEqual([]);
    expect(parseStoredPlaces("not json")).toEqual([]);
    expect(parseStoredPlaces('{"a":1}')).toEqual([]);
  });

  it("keeps only non-empty strings within the length limit, deduplicated", () => {
    const raw = JSON.stringify(["La Villa", 42, "", "  ", "la villa", "x".repeat(MAX_PLACE_NAME_LENGTH + 1), "Boquete"]);
    expect(parseStoredPlaces(raw)).toEqual(["La Villa", "Boquete"]);
  });
});

describe("addPlace", () => {
  it("adds a trimmed, whitespace-collapsed name", () => {
    expect(addPlace([], "  Las   Tablas ", [])).toEqual({ ok: true, places: ["Las Tablas"], name: "Las Tablas" });
  });

  it("rejects blank and overly long names", () => {
    expect(addPlace([], "   ", [])).toEqual({ ok: false, reason: "empty" });
    expect(addPlace([], "x".repeat(MAX_PLACE_NAME_LENGTH + 1), [])).toEqual({ ok: false, reason: "too_long" });
  });

  it("rejects duplicates case-insensitively, including configured communities and built-ins", () => {
    expect(addPlace(["Boquete"], "boquete", [])).toEqual({ ok: false, reason: "duplicate" });
    expect(addPlace([], "panama city", ["Panama City", "Ciudad de Panamá"])).toEqual({ ok: false, reason: "duplicate" });
  });

  it("stops at a sensible maximum", () => {
    const full = Array.from({ length: 20 }, (_, i) => `Place ${i}`);
    expect(addPlace(full, "One more", [])).toEqual({ ok: false, reason: "full" });
  });
});
