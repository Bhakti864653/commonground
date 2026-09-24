import { beforeEach, describe, expect, it } from "vitest";
import {
  __resetCommunityStoreForTests,
  createCommunity,
  getCommunity,
  listCommunities,
  slugify,
} from "@/lib/store/community-store";
import { casePrefix } from "@/lib/case-number/format-case-number";
import { CommunityConfigSchema } from "@/lib/schema/community";

const valid = {
  displayName: "Ciudad de Panamá",
  country: "Panamá",
  region: "Panamá",
  areas: [
    { labelEs: "Área norte", label: "Northern area" },
    { labelEs: "Área sur", label: "Southern area" },
  ],
  categoryIds: ["flooding-drainage", "street-lighting"],
};

describe("community store", () => {
  beforeEach(() => __resetCommunityStoreForTests());

  it("starts with only the built-in communities", () => {
    expect(listCommunities().map((c) => c.id)).toEqual(["santiago-veraguas", "riverbend-demo"]);
  });

  it("creates a valid, schema-conforming pilot community that the rest of the app can find", () => {
    const result = createCommunity(valid);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const { community } = result;
    expect(CommunityConfigSchema.safeParse(community).success).toBe(true);
    expect(community.id).toBe("ciudad-de-panama");
    expect(community.status).toBe("pilot");
    expect(community.areas.map((a) => a.id)).toEqual(["area-norte", "area-sur"]);
    expect(getCommunity(community.id)?.displayName).toBe("Ciudad de Panamá");
    expect(listCommunities()).toHaveLength(3);
  });

  it("always includes an 'other' category", () => {
    const result = createCommunity(valid);
    expect(result.ok && result.community.categories.map((c) => c.id)).toEqual([
      "flooding-drainage",
      "street-lighting",
      "other",
    ]);
  });

  it("never invents official sources or contacts", () => {
    const result = createCommunity(valid);
    expect(result.ok && result.community.trustedSources).toEqual([]);
    expect(result.ok && result.community.officialContacts).toEqual([]);
  });

  it("gives a new community a case-number prefix no other community uses", () => {
    // "Santa Valeria" would naively get "SV" — Santiago de Veraguas's prefix.
    const result = createCommunity({ ...valid, displayName: "Santa Valeria" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const prefixes = listCommunities().map((c) => casePrefix(c.id));
    expect(new Set(prefixes).size).toBe(prefixes.length);
    expect(casePrefix(result.community.id)).not.toBe("SV");
  });

  it("rejects a name that already exists, ignoring case and accents", () => {
    expect(createCommunity(valid).ok).toBe(true);
    expect(createCommunity({ ...valid, displayName: "ciudad de panama" })).toEqual({ ok: false, error: "duplicate_name" });
    expect(createCommunity({ ...valid, displayName: "SANTIAGO DE VERAGUAS" })).toEqual({ ok: false, error: "duplicate_name" });
  });

  it("gives duplicate area names distinct ids", () => {
    const result = createCommunity({ ...valid, areas: [{ labelEs: "Centro", label: "Center" }, { labelEs: "centro", label: "Downtown" }] });
    expect(result.ok && result.community.areas.map((a) => a.id)).toEqual(["centro", "centro-2"]);
  });

  it.each([
    ["no areas", { ...valid, areas: [] }],
    ["too many areas", { ...valid, areas: Array.from({ length: 13 }, (_, i) => ({ labelEs: `A${i}`, label: `A${i}` })) }],
    ["a blank name", { ...valid, displayName: "  " }],
    ["an overly long name", { ...valid, displayName: "x".repeat(61) }],
    ["an unknown category", { ...valid, categoryIds: ["weapons"] }],
    ["no categories", { ...valid, categoryIds: [] }],
    ["not an object", "Ciudad de Panamá"],
  ])("rejects %s without creating anything", (_label, input) => {
    expect(createCommunity(input)).toEqual({ ok: false, error: "invalid" });
    expect(listCommunities()).toHaveLength(2);
  });
});

describe("slugify", () => {
  it("strips accents and punctuation", () => {
    expect(slugify("Ciudad de Panamá")).toBe("ciudad-de-panama");
    expect(slugify("  San José / Norte! ")).toBe("san-jose-norte");
    expect(slugify("¡¿!")).toBe("community");
  });
});
