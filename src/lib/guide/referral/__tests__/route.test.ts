import { describe, expect, it } from "vitest";
import { CommunityConfigSchema, type CommunityConfig } from "@/lib/schema/community";
import { SANTIAGO_VERAGUAS, RIVERBEND_DEMO } from "@/data/communities";
import { routeReferral } from "@/lib/guide/referral/route";

describe("Santiago de Veraguas referral routing", () => {
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
