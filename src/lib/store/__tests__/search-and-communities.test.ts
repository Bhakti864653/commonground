import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/admin/auth", () => ({ requireAdmin: vi.fn() }));

import { requireAdmin } from "@/lib/admin/auth";
import { listCommunitiesForResidents, searchCases } from "@/lib/store/actions";
import { adminCreateCommunity, adminListCommunities } from "@/lib/store/admin-community-actions";
import { __resetCommunityStoreForTests } from "@/lib/store/community-store";
import { __resetCaseStoreForTests, createCase } from "@/lib/store/case-store";
import { buildConsentRecord } from "@/lib/privacy/consent";

const ALL = { query: "", type: "all", status: "all", categoryId: "all", areaId: "all" };

function seed(categoryId: string, areaId: string, description: string, daysAgo: number) {
  return createCase(
    {
      type: "report",
      communityId: "santiago-veraguas",
      categoryId,
      description,
      approximateArea: { kind: "neighborhood", areaId, label: areaId, labelEs: areaId },
      consent: buildConsentRecord("2026-09-19.v1", "es"),
    },
    () => new Date(Date.UTC(2026, 8, 20 - daysAgo)),
  );
}

describe("searchCases (server-side search)", () => {
  beforeEach(() => {
    __resetCaseStoreForTests();
    seed("flooding-drainage", "norte", "Drenaje tapado en la calle principal", 5);
    seed("garbage-sanitation", "sur", "Basura sin recoger", 3);
    seed("flooding-drainage", "norte", "Se inunda cada vez que llueve", 1);
  });

  it("returns every case newest-first, each with its position in that list", async () => {
    const result = await searchCases("santiago-veraguas", ALL);
    expect(result.total).toBeGreaterThan(0);
    expect(result.items.map((i) => i.index)).toEqual(result.items.map((_, i) => i));
    const dates = result.items.map((i) => i.caseItem.createdAt);
    expect([...dates].sort().reverse()).toEqual(dates);
  });

  it("keeps each result's original position when filtered, so it matches its map pin", async () => {
    const all = await searchCases("santiago-veraguas", ALL);
    const filtered = await searchCases("santiago-veraguas", { ...ALL, areaId: "norte" });
    expect(filtered.items.length).toBeGreaterThan(0);
    for (const { caseItem, index } of filtered.items) {
      expect(all.items[index].caseItem.id).toBe(caseItem.id);
      expect(caseItem.approximateArea.areaId).toBe("norte");
    }
  });

  it("searches without accents and across languages", async () => {
    const result = await searchCases("santiago-veraguas", { ...ALL, query: "inundacion" });
    expect(result.items.length).toBeGreaterThan(0);
    expect(result.items.every((i) => i.caseItem.categoryId === "flooding-drainage")).toBe(true);
  });

  it("never returns private fields", async () => {
    const result = await searchCases("santiago-veraguas", ALL);
    for (const { caseItem } of result.items) {
      expect(caseItem).not.toHaveProperty("managementToken");
      expect(caseItem).not.toHaveProperty("adminNotes");
      expect(caseItem).not.toHaveProperty("moderationActions");
    }
  });

  it.each([
    ["an unknown community", "nowhere", ALL],
    ["a non-object filter", "santiago-veraguas", "all"],
    ["an invalid status", "santiago-veraguas", { ...ALL, status: "deleted" }],
    ["an overly long query", "santiago-veraguas", { ...ALL, query: "x".repeat(201) }],
    ["a missing field", "santiago-veraguas", { query: "" }],
  ])("returns an empty result for %s instead of throwing", async (_label, communityId, filters) => {
    await expect(searchCases(communityId, filters)).resolves.toEqual({ total: 0, items: [] });
  });
});

describe("communities for residents", () => {
  beforeEach(() => {
    __resetCommunityStoreForTests();
    vi.mocked(requireAdmin).mockResolvedValue(undefined);
  });

  it("includes created communities and strips moderator emails", async () => {
    await adminCreateCommunity({
      displayName: "Ciudad de Panamá",
      country: "Panamá",
      areas: [{ labelEs: "Área norte", label: "Northern area" }],
      categoryIds: ["flooding-drainage"],
    });
    const communities = await listCommunitiesForResidents();
    expect(communities.map((c) => c.id)).toContain("ciudad-de-panama");
    expect(communities.every((c) => c.moderation.moderatorEmails.length === 0)).toBe(true);
  });

  it("lets a resident submit a case to a created community, with its own case-number prefix", async () => {
    __resetCaseStoreForTests();
    const result = await adminCreateCommunity({
      displayName: "Ciudad de Panamá",
      country: "Panamá",
      areas: [{ labelEs: "Área norte", label: "Northern area" }],
      categoryIds: ["flooding-drainage"],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const created = createCase({
      type: "report",
      communityId: result.community.id,
      categoryId: "flooding-drainage",
      description: "Drenaje tapado",
      approximateArea: { kind: "neighborhood", areaId: "area-norte", label: "Northern area", labelEs: "Área norte" },
      consent: buildConsentRecord(result.community.privacy.consentVersion, "es"),
    });
    expect(created.publicCaseNumber).toMatch(/^CDP-\d{4}-0001$/);
    expect(created.sourceType).toBe("community");
  });
});

describe("admin community actions require a moderator", () => {
  beforeEach(() => {
    __resetCommunityStoreForTests();
    vi.mocked(requireAdmin).mockRejectedValue(new Error("Admin authentication required"));
  });

  it("refuses to create or list communities without an admin session", async () => {
    await expect(
      adminCreateCommunity({ displayName: "X place", country: "Panamá", areas: [{ labelEs: "A", label: "A" }], categoryIds: ["other"] }),
    ).rejects.toThrow();
    await expect(adminListCommunities()).rejects.toThrow();
    expect((await listCommunitiesForResidents()).map((c) => c.id)).toEqual(["santiago-veraguas", "riverbend-demo"]);
  });
});
