import { describe, expect, it } from "vitest";
import { filterCases, type CaseFilters } from "@/lib/explore/filter-cases";
import { SANTIAGO_VERAGUAS } from "@/data/communities";
import type { PublicCase } from "@/lib/schema/report";

const ALL: CaseFilters = { query: "", type: "all", status: "all", categoryId: "all", areaId: "all" };

function makeCase(overrides: Partial<PublicCase> & Pick<PublicCase, "id">): PublicCase {
  return {
    publicCaseNumber: `SV-2026-${overrides.id.padStart(4, "0")}`,
    communityId: SANTIAGO_VERAGUAS.id,
    categoryId: "flooding-drainage",
    description: "Drenaje tapado",
    approximateArea: { kind: "neighborhood", areaId: "norte", label: "Northern area", labelEs: "Área norte" },
    createdAt: "2026-09-01T00:00:00.000Z",
    status: "received",
    statusHistory: [],
    sourceType: "community",
    verificationState: "community_report",
    consent: { consentVersion: "1", consentedAt: "2026-09-01T00:00:00.000Z", language: "es" },
    type: "report",
    ...overrides,
  } as PublicCase;
}

const cases = [
  makeCase({ id: "1" }),
  makeCase({ id: "2", type: "proposal", categoryId: "other", description: "Luminarias solares en el parque", approximateArea: { kind: "neighborhood", areaId: "este", label: "Eastern area", labelEs: "Área este" }, status: "under_review" }),
  makeCase({ id: "3", categoryId: "garbage-sanitation", description: "Basura sin recoger", approximateArea: { kind: "prefer_not_to_say", label: "Prefer not to say" }, status: "closed" }),
];

const ids = (list: PublicCase[]) => list.map((c) => c.id);

describe("filterCases", () => {
  it("returns everything with no filters", () => {
    expect(ids(filterCases(cases, ALL, SANTIAGO_VERAGUAS))).toEqual(["1", "2", "3"]);
  });

  it("filters by type, status, category, and area", () => {
    expect(ids(filterCases(cases, { ...ALL, type: "proposal" }, SANTIAGO_VERAGUAS))).toEqual(["2"]);
    expect(ids(filterCases(cases, { ...ALL, status: "closed" }, SANTIAGO_VERAGUAS))).toEqual(["3"]);
    expect(ids(filterCases(cases, { ...ALL, categoryId: "flooding-drainage" }, SANTIAGO_VERAGUAS))).toEqual(["1"]);
    expect(ids(filterCases(cases, { ...ALL, areaId: "este" }, SANTIAGO_VERAGUAS))).toEqual(["2"]);
  });

  it("finds cases with no area given", () => {
    expect(ids(filterCases(cases, { ...ALL, areaId: "none" }, SANTIAGO_VERAGUAS))).toEqual(["3"]);
  });

  it("searches case number, description, and category/area names in both languages, ignoring accents", () => {
    expect(ids(filterCases(cases, { ...ALL, query: "SV-2026-0002" }, SANTIAGO_VERAGUAS))).toEqual(["2"]);
    expect(ids(filterCases(cases, { ...ALL, query: "luminarias" }, SANTIAGO_VERAGUAS))).toEqual(["2"]);
    expect(ids(filterCases(cases, { ...ALL, query: "inundacion" }, SANTIAGO_VERAGUAS))).toEqual(["1"]);
    expect(ids(filterCases(cases, { ...ALL, query: "northern" }, SANTIAGO_VERAGUAS))).toEqual(["1"]);
    expect(ids(filterCases(cases, { ...ALL, query: "area este" }, SANTIAGO_VERAGUAS))).toEqual(["2"]);
  });

  it("combines search terms and filters", () => {
    expect(ids(filterCases(cases, { ...ALL, query: "basura", status: "received" }, SANTIAGO_VERAGUAS))).toEqual([]);
  });
});
