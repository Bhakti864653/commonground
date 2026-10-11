import { describe, expect, it } from "vitest";
import { CommunityConfigSchema, type CommunityConfig } from "@/lib/schema/community";
import { SANTIAGO_VERAGUAS as SANTIAGO_LIVE, RIVERBEND_DEMO } from "@/data/communities";
import { SANTIAGO_REFERRAL_ROUTING } from "@/data/communities/santiago-veraguas";
import { routeReferral, timelineOfficeNames } from "@/lib/guide/referral/route";

// Referrals are paused in Santiago's live config; these tests check the kept, verified routing.
const SANTIAGO_VERAGUAS: CommunityConfig = { ...SANTIAGO_LIVE, referralRouting: SANTIAGO_REFERRAL_ROUTING };

describe("Santiago de Veraguas referral routing", () => {
  it("is paused in the live config, so nothing is prepared for any office", () => {
    expect(SANTIAGO_LIVE.referralRouting ?? []).toEqual([]);
    expect(routeReferral(SANTIAGO_LIVE, "other")).toBeNull();
  });

  it("keeps a routing table that is still valid if it is ever turned back on", () => {
    expect(() => CommunityConfigSchema.parse(SANTIAGO_VERAGUAS)).not.toThrow();
  });

  it("routes every category, and only to a verified non-emergency contact", () => {
    for (const category of SANTIAGO_VERAGUAS.categories) {
      const contact = routeReferral(SANTIAGO_VERAGUAS, category.id);
      expect(contact, category.id).not.toBeNull();
      expect(contact!.verified).toBe(true);
      expect(contact!.isEmergencyService).toBe(false);
    }
  });

  it("sends categories without a clearer verified office to the Alcaldía", () => {
    expect(routeReferral(SANTIAGO_VERAGUAS, "other")?.id).toBe("alcaldia-santiago-oficina");
  });

  it("returns no office for an unknown category or a community without routing", () => {
    expect(routeReferral(SANTIAGO_VERAGUAS, "nope")).toBeNull();
    expect(routeReferral(RIVERBEND_DEMO, RIVERBEND_DEMO.categories[0].id)).toBeNull();
  });
});

describe("routing safety at use time (contacts can change at runtime)", () => {
  const withContacts = (edit: (c: CommunityConfig["officialContacts"][number]) => object): CommunityConfig => ({
    ...SANTIAGO_VERAGUAS,
    officialContacts: SANTIAGO_VERAGUAS.officialContacts.map((c) =>
      c.id === "alcaldia-santiago-oficina" ? { ...c, ...edit(c) } : c,
    ),
  });

  it("refuses a contact that was removed, unverified, or turned into an emergency line", () => {
    const removed = { ...SANTIAGO_VERAGUAS, officialContacts: SANTIAGO_VERAGUAS.officialContacts.filter((c) => c.id !== "alcaldia-santiago-oficina") };
    expect(routeReferral(removed, "other")).toBeNull();
    expect(routeReferral(withContacts(() => ({ verified: false })), "other")).toBeNull();
    expect(routeReferral(withContacts(() => ({ isEmergencyService: true })), "other")).toBeNull();
  });
});

describe("referralRouting schema", () => {
  const parse = (referralRouting: unknown) => CommunityConfigSchema.safeParse({ ...SANTIAGO_VERAGUAS, referralRouting });
  const note = "checked";

  it("rejects routes to unknown categories or contacts, duplicates, and emergency lines", () => {
    expect(parse([{ categoryId: "nope", contactId: "alcaldia-santiago-oficina", verificationNote: note }]).success).toBe(false);
    expect(parse([{ categoryId: "other", contactId: "nope", verificationNote: note }]).success).toBe(false);
    expect(parse([{ categoryId: "other", contactId: "emergencias-911", verificationNote: note }]).success).toBe(false);
    const route = { categoryId: "other", contactId: "alcaldia-santiago-oficina", verificationNote: note };
    expect(parse([route, route]).success).toBe(false);
  });

  it("requires a verification note on every route", () => {
    expect(parse([{ categoryId: "other", contactId: "alcaldia-santiago-oficina", verificationNote: "" }]).success).toBe(false);
  });
});

describe("timelineOfficeNames", () => {
  it("uses the routing's short public name for a routed office, in every language", () => {
    const alcaldia = timelineOfficeNames(SANTIAGO_VERAGUAS).find((o) => o.id === "alcaldia-santiago-oficina")!;
    expect(alcaldia.nameEs).toBe("la Alcaldía de Santiago");
    expect(alcaldia.name).not.toContain("office line");
    expect(Object.keys(alcaldia.labels ?? {}).sort()).toEqual(["fr", "hi", "it", "pt", "zh"]);
  });

  it("keeps the contact's own name for offices with no route", () => {
    const named = timelineOfficeNames(SANTIAGO_VERAGUAS).find((o) => o.id === "emergencias-911")!;
    const contact = SANTIAGO_VERAGUAS.officialContacts.find((c) => c.id === "emergencias-911")!;
    expect(named.nameEs).toBe(contact.nameEs);
  });
});
