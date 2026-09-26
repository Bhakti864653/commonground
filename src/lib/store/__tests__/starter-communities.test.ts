import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/admin/auth", () => ({ requireAdmin: vi.fn() }));

import {
  MAX_STARTER_COMMUNITIES,
  __resetCommunityStoreForTests,
  adoptStarterCommunity,
  getCommunity,
  listCommunities,
  startCommunityForPlace,
} from "@/lib/store/community-store";
import { createCase, __resetCaseStoreForTests, listCasesForCommunity } from "@/lib/store/case-store";
import { startCommunityForPlaceAction } from "@/lib/store/actions";
import { CommunityConfigSchema } from "@/lib/schema/community";
import { buildApproximateArea } from "@/lib/privacy/approximate-area";
import { buildConsentRecord } from "@/lib/privacy/consent";
import { LANGUAGE_CODES } from "@/lib/i18n/languages";
import { labelOf } from "@/lib/i18n/labels";

const kensington = { country: "Canada", region: "Ontario", city: "Toronto", neighborhood: "Kensington Market" };

describe("starter communities", () => {
  beforeEach(() => {
    __resetCommunityStoreForTests();
    __resetCaseStoreForTests();
  });

  it("starts a schema-valid community for a new place, clearly marked as a starter", () => {
    const result = startCommunityForPlace(kensington);
    expect(result.ok && result.created).toBe(true);
    if (!result.ok) return;
    const c = result.community;
    expect(CommunityConfigSchema.safeParse(c).success).toBe(true);
    expect(c.status).toBe("starter");
    expect(c.displayName).toBe("Kensington Market, Toronto, Ontario, Canada");
    expect(c.country).toBe("Canada");
    // No coordinates and no contacts are ever invented for a visitor-added place.
    expect(c.map).toBeUndefined();
    expect(c.areas.every((a) => a.mapDirection === undefined)).toBe(true);
    expect(c.officialContacts).toEqual([]);
    expect(c.trustedSources).toEqual([]);
    expect(c.categories.map((cat) => cat.id)).toContain("other");
  });

  it("names every area and category in all seven languages", () => {
    const result = startCommunityForPlace(kensington);
    if (!result.ok) throw new Error("setup");
    for (const item of [...result.community.areas, ...result.community.categories]) {
      for (const lang of LANGUAGE_CODES) expect(labelOf(item, lang), `${item.id}/${lang}`).toBeTruthy();
    }
  });

  it("reuses the same community for the same place instead of duplicating it", () => {
    const first = startCommunityForPlace(kensington);
    const again = startCommunityForPlace({ ...kensington, city: "  toronto ", neighborhood: "KENSINGTON MARKET" });
    expect(first.ok && again.ok).toBe(true);
    if (!first.ok || !again.ok) return;
    expect(again.created).toBe(false);
    expect(again.community.id).toBe(first.community.id);
    expect(listCommunities().filter((c) => c.status === "starter")).toHaveLength(1);
  });

  it("refuses vague places and stops at the cap", () => {
    expect(startCommunityForPlace({ country: "Canada" })).toEqual({ ok: false, error: "invalid" });
    for (let i = 0; i < MAX_STARTER_COMMUNITIES; i++) startCommunityForPlace({ country: "Canada", city: `Town ${i}` });
    expect(startCommunityForPlace({ country: "Canada", city: "One more" })).toEqual({ ok: false, error: "full" });
  });

  it("accepts real reports, placed only by broad area", () => {
    const result = startCommunityForPlace(kensington);
    if (!result.ok) throw new Error("setup");
    const c = result.community;
    const created = createCase({
      type: "report",
      communityId: c.id,
      categoryId: c.categories[0].id,
      description: "Blocked storm drain after rain",
      approximateArea: buildApproximateArea(c.areas[1]),
      consent: buildConsentRecord(c.privacy.consentVersion, "en"),
    });
    expect(created.sourceType).toBe("community");
    expect(listCasesForCommunity(c.id)).toHaveLength(1);
  });

  it("becomes a normal pilot only when a moderator marks it reviewed", () => {
    const result = startCommunityForPlace(kensington);
    if (!result.ok) throw new Error("setup");
    expect(adoptStarterCommunity("santiago-veraguas")).toBe(false); // not a starter
    expect(adoptStarterCommunity(result.community.id)).toBe(true);
    expect(getCommunity(result.community.id)?.status).toBe("pilot");
    expect(adoptStarterCommunity(result.community.id)).toBe(false);
  });

  it("the public action strips moderator emails and validates input", async () => {
    const ok = await startCommunityForPlaceAction(kensington);
    expect(ok.ok && ok.community.moderation.moderatorEmails).toEqual([]);
    expect(await startCommunityForPlaceAction("Canada")).toEqual({ ok: false, error: "invalid" });
  });
});
