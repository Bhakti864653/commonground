import { beforeEach, describe, expect, it } from "vitest";
import {
  __resetCommunityStoreForTests,
  addOfficialContact,
  addTrustedSource,
  getCommunity,
  listCommunityInfoLog,
  removeCommunityInfoEntry,
  reverifyCommunityInfoEntry,
} from "@/lib/store/community-store";
import { sourceFreshness } from "@/lib/sources/freshness";
import { CommunityConfigSchema } from "@/lib/schema/community";
import { SANTIAGO_VERAGUAS, RIVERBEND_DEMO } from "@/data/communities";

const validSource = {
  name: "Ministerio de Obras Públicas",
  url: "https://www.mop.gob.pa/",
  trustLevel: "official_verified",
  lastVerifiedAt: "2026-09-20",
};

const validContact = {
  name: "Public works office",
  nameEs: "Oficina de obras públicas",
  phone: "+507 999-0000",
  channel: "phone",
  url: "",
  isEmergencyService: false,
  verified: true,
  sourceUrl: "https://www.mop.gob.pa/",
  lastVerifiedAt: "2026-09-20",
};

describe("built-in pilot contacts and sources", () => {
  it("are schema-valid, verified, and each backed by a checkable https source and date", () => {
    expect(CommunityConfigSchema.safeParse(SANTIAGO_VERAGUAS).success).toBe(true);
    expect(SANTIAGO_VERAGUAS.officialContacts.length).toBeGreaterThan(0);
    for (const c of SANTIAGO_VERAGUAS.officialContacts) {
      expect(c.verified, c.id).toBe(true);
      expect(c.sourceUrl?.startsWith("https://"), c.id).toBe(true);
      expect(c.lastVerifiedAt, c.id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
    for (const s of SANTIAGO_VERAGUAS.trustedSources) {
      expect(s.url.startsWith("https://"), s.id).toBe(true);
      expect(s.verified, s.id).toBe(true);
      expect(s.lastVerifiedAt, s.id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("lists only officially confirmed contacts (no municipal WhatsApp), and no 3D view", () => {
    expect(SANTIAGO_VERAGUAS.officialContacts.map((c) => c.phone)).toEqual(["911", "103", "+507 6998-4809", "935-2444"]);
    expect(JSON.stringify(SANTIAGO_VERAGUAS)).not.toContain("6935-2726");
    expect(SANTIAGO_VERAGUAS.enabledFeatures.threeDView).toBe(false);
  });

  it("the fictional demo has no real contacts", () => {
    expect(RIVERBEND_DEMO.officialContacts).toEqual([]);
    expect(RIVERBEND_DEMO.enabledFeatures.threeDView).toBe(false);
  });
});

describe("moderator-managed sources and contacts", () => {
  beforeEach(() => __resetCommunityStoreForTests());

  it("adds a source and a contact that the community then shows", () => {
    expect(addTrustedSource(SANTIAGO_VERAGUAS.id, validSource, "admin")).toEqual({ ok: true });
    expect(addOfficialContact(SANTIAGO_VERAGUAS.id, validContact, "admin")).toEqual({ ok: true });
    const community = getCommunity(SANTIAGO_VERAGUAS.id)!;
    expect(community.trustedSources.some((s) => s.name === validSource.name)).toBe(true);
    const added = community.officialContacts.find((c) => c.name === validContact.name);
    expect(added?.url).toBeUndefined(); // a blank optional field is stored as absent
    expect(CommunityConfigSchema.safeParse(community).success).toBe(true);
    expect(listCommunityInfoLog().map((e) => e.action)).toEqual(["add_contact", "add_source"]);
  });

  it("rejects javascript: and other non-http URLs", () => {
    expect(addTrustedSource(SANTIAGO_VERAGUAS.id, { ...validSource, url: "javascript:alert(1)" }, "admin")).toEqual({ ok: false, error: "invalid" });
    expect(addOfficialContact(SANTIAGO_VERAGUAS.id, { ...validContact, sourceUrl: "javascript:alert(1)" }, "admin")).toEqual({ ok: false, error: "invalid" });
    expect(addOfficialContact(SANTIAGO_VERAGUAS.id, { ...validContact, url: "ftp://example.org" }, "admin")).toEqual({ ok: false, error: "invalid" });
  });

  it("never marks a contact verified without a source and a date", () => {
    expect(addOfficialContact(SANTIAGO_VERAGUAS.id, { ...validContact, sourceUrl: "" }, "admin").ok).toBe(false);
    expect(addOfficialContact(SANTIAGO_VERAGUAS.id, { ...validContact, lastVerifiedAt: "" }, "admin").ok).toBe(false);
    // Unverified is allowed without them — it shows as "to be verified".
    expect(addOfficialContact(SANTIAGO_VERAGUAS.id, { ...validContact, verified: false, sourceUrl: "", lastVerifiedAt: "" }, "admin").ok).toBe(true);
  });

  it("requires a way to reach the contact, and rejects bad phones and future dates", () => {
    expect(addOfficialContact(SANTIAGO_VERAGUAS.id, { ...validContact, phone: "", url: "" }, "admin").ok).toBe(false);
    expect(addOfficialContact(SANTIAGO_VERAGUAS.id, { ...validContact, phone: "call me maybe" }, "admin").ok).toBe(false);
    expect(addTrustedSource(SANTIAGO_VERAGUAS.id, { ...validSource, lastVerifiedAt: "2999-01-01" }, "admin").ok).toBe(false);
  });

  it("refuses unknown communities", () => {
    expect(addTrustedSource("nowhere", validSource, "admin")).toEqual({ ok: false, error: "unknown_community" });
  });

  it("removes built-in and added entries, and reports a missing one", () => {
    const builtIn = SANTIAGO_VERAGUAS.trustedSources[0];
    expect(removeCommunityInfoEntry(SANTIAGO_VERAGUAS.id, "source", builtIn.id, "admin")).toEqual({ ok: true });
    expect(getCommunity(SANTIAGO_VERAGUAS.id)!.trustedSources.some((s) => s.id === builtIn.id)).toBe(false);

    addOfficialContact(SANTIAGO_VERAGUAS.id, validContact, "admin");
    const added = getCommunity(SANTIAGO_VERAGUAS.id)!.officialContacts.find((c) => c.name === validContact.name)!;
    expect(removeCommunityInfoEntry(SANTIAGO_VERAGUAS.id, "contact", added.id, "admin")).toEqual({ ok: true });
    expect(getCommunity(SANTIAGO_VERAGUAS.id)!.officialContacts.some((c) => c.id === added.id)).toBe(false);

    expect(removeCommunityInfoEntry(SANTIAGO_VERAGUAS.id, "contact", added.id, "admin")).toEqual({ ok: false, error: "not_found" });
  });

  it("leaves the built-in config object untouched", () => {
    removeCommunityInfoEntry(SANTIAGO_VERAGUAS.id, "source", SANTIAGO_VERAGUAS.trustedSources[0].id, "admin");
    expect(SANTIAGO_VERAGUAS.trustedSources).toHaveLength(5);
  });
});

describe("explicit re-verification", () => {
  beforeEach(() => __resetCommunityStoreForTests());

  it("moves a built-in entry's check date to today, marks it verified, and logs it", () => {
    const later = new Date("2027-06-01T10:00:00Z");
    const id = SANTIAGO_VERAGUAS.trustedSources[0].id;
    // A year later, without a re-check, the entry is due for review...
    expect(sourceFreshness(getCommunity(SANTIAGO_VERAGUAS.id)!.trustedSources[0], later).state).toBe("review_due");
    expect(reverifyCommunityInfoEntry(SANTIAGO_VERAGUAS.id, "source", id, "admin", later)).toEqual({ ok: true });
    const entry = getCommunity(SANTIAGO_VERAGUAS.id)!.trustedSources.find((s) => s.id === id)!;
    expect(entry.lastVerifiedAt).toBe("2027-06-01");
    expect(sourceFreshness(entry, later).state).toBe("current");
    expect(listCommunityInfoLog()[0]).toMatchObject({ action: "reverify_source", communityId: SANTIAGO_VERAGUAS.id });
  });

  it("refuses to verify a contact that has no source to check against", () => {
    addOfficialContact(SANTIAGO_VERAGUAS.id, { ...validContact, verified: false, sourceUrl: "", lastVerifiedAt: "" }, "admin");
    const added = getCommunity(SANTIAGO_VERAGUAS.id)!.officialContacts.find((c) => c.name === validContact.name)!;
    expect(sourceFreshness(added).state).toBe("unverified");
    expect(reverifyCommunityInfoEntry(SANTIAGO_VERAGUAS.id, "contact", added.id, "admin")).toEqual({ ok: false, error: "invalid" });
    const after = getCommunity(SANTIAGO_VERAGUAS.id)!.officialContacts.find((c) => c.id === added.id)!;
    expect(after.verified).toBe(false);
  });

  it("reports unknown entries and communities", () => {
    expect(reverifyCommunityInfoEntry(SANTIAGO_VERAGUAS.id, "source", "nope", "admin")).toEqual({ ok: false, error: "not_found" });
    expect(reverifyCommunityInfoEntry("nowhere", "source", "x", "admin")).toEqual({ ok: false, error: "unknown_community" });
  });

  it("does not change any other entry", () => {
    const [first, second] = SANTIAGO_VERAGUAS.trustedSources;
    reverifyCommunityInfoEntry(SANTIAGO_VERAGUAS.id, "source", first.id, "admin", new Date("2027-06-01T10:00:00Z"));
    expect(getCommunity(SANTIAGO_VERAGUAS.id)!.trustedSources.find((s) => s.id === second.id)!.lastVerifiedAt).toBe(second.lastVerifiedAt);
  });
});

describe("new sources are recorded as checked, with an optional note", () => {
  beforeEach(() => __resetCommunityStoreForTests());

  it("stores verified: true, the date, and the note", () => {
    addTrustedSource(SANTIAGO_VERAGUAS.id, { ...validSource, verificationNote: "Checked the contact page." }, "admin");
    const added = getCommunity(SANTIAGO_VERAGUAS.id)!.trustedSources.find((s) => s.name === validSource.name)!;
    expect(added).toMatchObject({ verified: true, lastVerifiedAt: "2026-09-20", verificationNote: "Checked the contact page." });
  });
});
