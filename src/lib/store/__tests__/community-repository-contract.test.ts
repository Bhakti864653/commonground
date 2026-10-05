// @vitest-environment node
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { memoryCommunityRepository } from "@/lib/store/memory-community-repository";
import { __resetCommunityStoreForTests } from "@/lib/store/memory-community-store";
import { __resetCommunityRequestsForTests } from "@/lib/store/memory-community-request-store";
import { createSqlCommunityRepository } from "@/lib/store/sql-community-store";
import { MAX_STARTER_COMMUNITIES } from "@/lib/store/community-logic";
import { fromPglite } from "@/lib/db/sql-client";
import { createCase as createMemoryCase, __resetMemoryCaseStore } from "@/lib/store/memory-case-store";
import type { NewCaseInput } from "@/lib/store/new-case";
import type { CommunityRepository } from "@/lib/store/community-repository";
import { casePrefix } from "@/lib/case-number/format-case-number";
import { CommunityConfigSchema } from "@/lib/schema/community";
import { COMMUNITIES, SANTIAGO_VERAGUAS } from "@/data/communities";

/**
 * One set of community behaviours, two stores: in memory, and Postgres (on PGlite, a real
 * Postgres inside the test process). Every test runs against both.
 */

const MIGRATIONS_DIR = join(__dirname, "../../../../db/migrations");
const MIGRATIONS = readdirSync(MIGRATIONS_DIR)
  .filter((f) => f.endsWith(".sql"))
  .sort()
  .map((f) => readFileSync(join(MIGRATIONS_DIR, f), "utf8"));

type Harness = {
  name: string;
  repo: () => CommunityRepository;
  reset: () => Promise<void>;
  /** Files a case in a community, in the case store that pairs with this community store. */
  addCase: (communityId: string, categoryId: string) => Promise<void>;
  setup?: () => Promise<void>;
  teardown?: () => Promise<void>;
};

let pg: PGlite;
const harnesses: Harness[] = [
  {
    name: "in-memory",
    repo: () => memoryCommunityRepository,
    reset: async () => {
      __resetCommunityStoreForTests();
      __resetCommunityRequestsForTests();
      __resetMemoryCaseStore();
    },
    addCase: async (communityId, categoryId) => {
      createMemoryCase(caseInput(communityId, categoryId));
    },
  },
  {
    name: "Postgres (PGlite)",
    repo: () => createSqlCommunityRepository(fromPglite(pg)),
    setup: async () => {
      pg = new PGlite();
      for (const sql of MIGRATIONS) await pg.exec(sql);
    },
    reset: async () => {
      await pg.exec(
        "truncate public.communities, public.community_info_overrides, public.community_info_log, public.community_requests, public.cases, public.case_number_counters cascade",
      );
    },
    addCase: async (communityId) => {
      await pg.query(
        `select public.create_case($1, 'XX', 'report', 'other', 'Prueba', '{"kind":"prefer_not_to_say","label":"-"}'::jsonb,
           now(), 'community_report', 'community', null, '{"consentVersion":"v1"}'::jsonb, 'token')`,
        [communityId],
      );
    },
    teardown: async () => {
      await pg.close();
    },
  },
];

const newCommunity = {
  displayName: "Ciudad de Panamá",
  country: "Panamá",
  region: "Panamá",
  areas: [
    { labelEs: "Área norte", label: "Northern area" },
    { labelEs: "Área norte", label: "Northern area (2)" },
  ],
  categoryIds: ["flooding-drainage", "street-lighting"],
};

function caseInput(communityId: string, categoryId: string): NewCaseInput {
  return {
    type: "report",
    communityId,
    categoryId,
    description: "Prueba",
    approximateArea: { kind: "prefer_not_to_say", label: "-" },
    consent: { consentVersion: "v1", consentedAt: "2026-10-01T00:00:00Z", language: "es" },
  };
}

const kensington = { country: "Canada", region: "Ontario", city: "Toronto", neighborhood: "Kensington Market" };

const source = {
  name: "Ministerio de Obras Públicas",
  url: "https://www.mop.gob.pa/",
  trustLevel: "official_verified",
  lastVerifiedAt: "2026-09-20",
};
const contact = {
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

describe.each(harnesses)("CommunityRepository contract: $name", (h) => {
  let repo: CommunityRepository;

  beforeAll(async () => {
    await h.setup?.();
    repo = h.repo();
  }, 60_000);
  afterAll(async () => {
    await h.teardown?.();
  });
  beforeEach(async () => {
    await h.reset();
  });

  describe("communities", () => {
    it("starts with only the built-in communities, in order", async () => {
      expect((await repo.listCommunities()).map((c) => c.id)).toEqual(COMMUNITIES.map((c) => c.id));
      expect(await repo.getCommunity(SANTIAGO_VERAGUAS.id)).toEqual(SANTIAGO_VERAGUAS);
      expect(await repo.getCommunity("nowhere")).toBeUndefined();
    });

    it("creates a schema-valid community the app can then find, after the built-ins", async () => {
      const result = await repo.createCommunity(newCommunity);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      const c = result.community;
      expect(CommunityConfigSchema.safeParse(c).success).toBe(true);
      expect(c).toMatchObject({ displayName: "Ciudad de Panamá", status: "pilot", trustedSources: [], officialContacts: [] });
      expect(c.categories.map((x) => x.id)).toContain("other");
      expect(new Set(c.areas.map((a) => a.id)).size).toBe(2);
      expect(await repo.getCommunity(c.id)).toEqual(c);
      expect((await repo.listCommunities()).map((x) => x.id)).toEqual([...COMMUNITIES.map((x) => x.id), c.id]);
    });

    it("rejects invalid input and names that exist, ignoring case and accents (built-ins included)", async () => {
      expect(await repo.createCommunity({ ...newCommunity, areas: [] })).toEqual({ ok: false, error: "invalid" });
      await repo.createCommunity(newCommunity);
      expect(await repo.createCommunity({ ...newCommunity, displayName: "ciudad de panama" })).toEqual({
        ok: false,
        error: "duplicate_name",
      });
      expect(await repo.createCommunity({ ...newCommunity, displayName: "SANTIAGO DE VERAGUAS" })).toEqual({
        ok: false,
        error: "duplicate_name",
      });
    });

    it("never gives two communities the same case-number prefix", async () => {
      // "Santa Valeria" would be "SV", like Santiago de Veraguas.
      const a = await repo.createCommunity({ ...newCommunity, displayName: "Santa Valeria" });
      const b = await repo.createCommunity({ ...newCommunity, displayName: "San Vicente" });
      const prefixes = (await repo.listCommunities()).map((c) => casePrefix(c.id));
      expect(a.ok && b.ok).toBe(true);
      expect(new Set(prefixes).size).toBe(prefixes.length);
    });

    it("starts a community for a new place once, then reuses it", async () => {
      const first = await repo.startCommunityForPlace(kensington);
      expect(first).toMatchObject({ ok: true, created: true, community: { status: "starter" } });
      const again = await repo.startCommunityForPlace({ ...kensington, neighborhood: "  KENSINGTON market " });
      expect(again).toMatchObject({ ok: true, created: false });
      if (first.ok && again.ok) expect(again.community.id).toBe(first.community.id);
      expect(await repo.startCommunityForPlace({ country: "Canada" })).toEqual({ ok: false, error: "invalid" });
    });

    it("reuses an existing community for a place with the same name", async () => {
      const created = await repo.createCommunity({ ...newCommunity, displayName: "Toronto, Ontario, Canada" });
      const started = await repo.startCommunityForPlace({ country: "Canada", region: "Ontario", city: "Toronto" });
      expect(started).toMatchObject({ ok: true, created: false });
      if (created.ok && started.ok) expect(started.community.id).toBe(created.community.id);
    });

    it("adopts a starter community once, and nothing else", async () => {
      const started = await repo.startCommunityForPlace(kensington);
      if (!started.ok) throw new Error("expected a starter");
      expect(await repo.adoptStarterCommunity(started.community.id)).toBe(true);
      expect((await repo.getCommunity(started.community.id))?.status).toBe("pilot");
      expect(await repo.adoptStarterCommunity(started.community.id)).toBe(false);
      expect(await repo.adoptStarterCommunity(SANTIAGO_VERAGUAS.id)).toBe(false);
    });

    it("returns copies: changing a returned community changes nothing stored", async () => {
      const c = (await repo.getCommunity(SANTIAGO_VERAGUAS.id))!;
      c.displayName = "changed";
      c.officialContacts.length = 0;
      expect(await repo.getCommunity(SANTIAGO_VERAGUAS.id)).toEqual(SANTIAGO_VERAGUAS);
    });
  });

  describe("sources and contacts", () => {
    it("adds a source and a contact to a built-in community, and logs both", async () => {
      expect(await repo.addTrustedSource(SANTIAGO_VERAGUAS.id, source, "admin", new Date("2026-10-01T00:00:00Z"))).toEqual({ ok: true });
      expect(await repo.addOfficialContact(SANTIAGO_VERAGUAS.id, contact, "admin", new Date("2026-10-02T00:00:00Z"))).toEqual({ ok: true });
      const c = (await repo.getCommunity(SANTIAGO_VERAGUAS.id))!;
      expect(c.trustedSources.at(-1)).toMatchObject({ name: source.name, verified: true, lastVerifiedAt: "2026-09-20" });
      expect(c.officialContacts.at(-1)).toMatchObject({ name: contact.name, phone: contact.phone, verified: true });
      expect((await repo.listCommunityInfoLog()).map((e) => [e.action, e.detail, e.occurredAt])).toEqual([
        ["add_contact", contact.name, "2026-10-02T00:00:00.000Z"],
        ["add_source", source.name, "2026-10-01T00:00:00.000Z"],
      ]);
      // The built-in config itself is never changed.
      expect(SANTIAGO_VERAGUAS.trustedSources.some((s) => s.name === source.name)).toBe(false);
    });

    it("rejects invalid entries and unknown communities, logging nothing", async () => {
      expect(await repo.addTrustedSource(SANTIAGO_VERAGUAS.id, { ...source, url: "javascript:alert(1)" }, "admin")).toEqual({ ok: false, error: "invalid" });
      expect(await repo.addOfficialContact(SANTIAGO_VERAGUAS.id, { ...contact, sourceUrl: "" }, "admin")).toEqual({ ok: false, error: "invalid" });
      expect(await repo.addTrustedSource("nowhere", source, "admin")).toEqual({ ok: false, error: "unknown_community" });
      expect(await repo.listCommunityInfoLog()).toEqual([]);
    });

    it("removes built-in and added entries, and reports a missing one", async () => {
      const builtIn = SANTIAGO_VERAGUAS.trustedSources[0];
      expect(await repo.removeCommunityInfoEntry(SANTIAGO_VERAGUAS.id, "source", builtIn.id, "admin")).toEqual({ ok: true });
      await repo.addOfficialContact(SANTIAGO_VERAGUAS.id, contact, "admin");
      const added = (await repo.getCommunity(SANTIAGO_VERAGUAS.id))!.officialContacts.at(-1)!;
      expect(await repo.removeCommunityInfoEntry(SANTIAGO_VERAGUAS.id, "contact", added.id, "admin")).toEqual({ ok: true });
      const c = (await repo.getCommunity(SANTIAGO_VERAGUAS.id))!;
      expect(c.trustedSources.some((s) => s.id === builtIn.id)).toBe(false);
      expect(c.officialContacts.some((x) => x.id === added.id)).toBe(false);
      expect(await repo.removeCommunityInfoEntry(SANTIAGO_VERAGUAS.id, "source", builtIn.id, "admin")).toEqual({ ok: false, error: "not_found" });
    });

    it("re-verifies an entry today, and refuses a contact with nothing to check against", async () => {
      const entry = SANTIAGO_VERAGUAS.trustedSources[0];
      const today = new Date("2026-10-05T15:00:00Z");
      expect(await repo.reverifyCommunityInfoEntry(SANTIAGO_VERAGUAS.id, "source", entry.id, "admin", today)).toEqual({ ok: true });
      expect((await repo.getCommunity(SANTIAGO_VERAGUAS.id))!.trustedSources[0]).toMatchObject({ verified: true, lastVerifiedAt: "2026-10-05" });

      await repo.addOfficialContact(SANTIAGO_VERAGUAS.id, { ...contact, verified: false, sourceUrl: "", lastVerifiedAt: "" }, "admin");
      const unsourced = (await repo.getCommunity(SANTIAGO_VERAGUAS.id))!.officialContacts.at(-1)!;
      expect(await repo.reverifyCommunityInfoEntry(SANTIAGO_VERAGUAS.id, "contact", unsourced.id, "admin")).toEqual({ ok: false, error: "invalid" });
      expect(await repo.reverifyCommunityInfoEntry(SANTIAGO_VERAGUAS.id, "source", "nope", "admin")).toEqual({ ok: false, error: "not_found" });
    });

    it("works the same on a community created at runtime", async () => {
      const created = await repo.createCommunity(newCommunity);
      if (!created.ok) throw new Error("expected a community");
      expect(await repo.addTrustedSource(created.community.id, source, "admin")).toEqual({ ok: true });
      expect((await repo.getCommunity(created.community.id))!.trustedSources).toHaveLength(1);
      expect((await repo.listCommunities()).find((c) => c.id === created.community.id)!.trustedSources).toHaveLength(1);
    });
  });

  describe("deleting a community", () => {
    it("deletes a community created at runtime with no cases, frees its name, and logs it", async () => {
      const created = await repo.createCommunity(newCommunity);
      if (!created.ok) throw new Error("expected a community");
      const id = created.community.id;
      await repo.addTrustedSource(id, source, "admin");
      expect(await repo.deleteCommunity(id, "admin", new Date("2026-10-05T00:00:00Z"))).toEqual({ ok: true });
      expect(await repo.getCommunity(id)).toBeUndefined();
      expect((await repo.listCommunities()).map((c) => c.id)).toEqual(COMMUNITIES.map((c) => c.id));
      expect((await repo.listCommunityInfoLog())[0]).toMatchObject({
        communityId: id,
        action: "delete_community",
        detail: "Ciudad de Panamá",
        occurredAt: "2026-10-05T00:00:00.000Z",
      });
      // The name can be used again, and its old source/contact changes don't come back.
      const again = await repo.createCommunity(newCommunity);
      expect(again.ok).toBe(true);
      if (again.ok) expect(again.community.trustedSources).toEqual([]);
    });

    it("deletes a visitor-started community too", async () => {
      const started = await repo.startCommunityForPlace(kensington);
      if (!started.ok) throw new Error("expected a starter");
      expect(await repo.deleteCommunity(started.community.id, "admin")).toEqual({ ok: true });
      expect(await repo.getCommunity(started.community.id)).toBeUndefined();
    });

    it("refuses built-in communities, unknown ones, and any community with a case", async () => {
      expect(await repo.deleteCommunity(SANTIAGO_VERAGUAS.id, "admin")).toEqual({ ok: false, error: "built_in" });
      expect(await repo.deleteCommunity("nowhere", "admin")).toEqual({ ok: false, error: "not_found" });
      const created = await repo.createCommunity(newCommunity);
      if (!created.ok) throw new Error("expected a community");
      await h.addCase(created.community.id, "other");
      expect(await repo.deleteCommunity(created.community.id, "admin")).toEqual({ ok: false, error: "has_cases" });
      expect(await repo.getCommunity(created.community.id)).toBeDefined();
      expect((await repo.listCommunityInfoLog()).some((e) => e.action === "delete_community")).toBe(false);
    });
  });

  describe("place requests", () => {
    it("groups requests for the same place, most-requested first, with recent notes", async () => {
      await repo.recordCommunityRequest({ placeName: "Montréal", language: "fr", note: "Oui" }, new Date("2026-10-01T00:00:00Z"));
      await repo.recordCommunityRequest({ placeName: "montreal", language: "en" }, new Date("2026-10-02T00:00:00Z"));
      await repo.recordCommunityRequest({ placeName: "Lima", language: "es" }, new Date("2026-10-03T00:00:00Z"));
      expect(await repo.listCommunityRequestSummaries()).toEqual([
        { placeName: "montreal", count: 2, latestAt: "2026-10-02T00:00:00.000Z", notes: ["Oui"] },
        { placeName: "Lima", count: 1, latestAt: "2026-10-03T00:00:00.000Z", notes: [] },
      ]);
    });

    it("keeps the place parts, and rejects invalid or vague input", async () => {
      expect(await repo.recordCommunityRequest({ placeName: "x", parts: kensington, language: "en" })).toBe(true);
      expect((await repo.listCommunityRequestSummaries())[0]).toMatchObject({ placeName: "Kensington Market, Toronto, Ontario, Canada", parts: kensington });
      expect(await repo.recordCommunityRequest({ placeName: "", language: "en" })).toBe(false);
      expect(await repo.recordCommunityRequest({ placeName: "Lima", language: "xx" })).toBe(false);
      expect(await repo.recordCommunityRequest({ placeName: "x", parts: { country: "Peru" }, language: "es" })).toBe(false);
    });
  });
});

describe("Postgres-only guarantees", () => {
  let db: PGlite;
  let repo: CommunityRepository;
  beforeAll(async () => {
    db = new PGlite();
    for (const sql of MIGRATIONS) await db.exec(sql);
    repo = createSqlCommunityRepository(fromPglite(db));
  }, 60_000);
  afterAll(async () => {
    await db.close();
  });

  it("refuses a second community with the same name even if the app's check is skipped", async () => {
    const created = await repo.createCommunity(newCommunity);
    if (!created.ok) throw new Error("expected a community");
    await expect(
      db.query("insert into public.communities (id, name_key, case_prefix, status, config) values ('x', $1, 'X1', 'pilot', '{}'::jsonb)", [
        "ciudad de panama",
      ]),
    ).rejects.toThrow(/duplicate key/);
  });

  it("caps starter communities", async () => {
    // One real starter, then valid copies of it up to the cap.
    await repo.startCommunityForPlace(kensington);
    await db.exec(`insert into public.communities (id, name_key, case_prefix, status, config)
      select 'starter-' || n, 'starter ' || n, 'ST' || n, 'starter',
             jsonb_set(jsonb_set(c.config, '{id}', to_jsonb('starter-' || n)), '{displayName}', to_jsonb('Starter ' || n))
      from public.communities c, generate_series(1, ${MAX_STARTER_COMMUNITIES - 1}) n
      where c.status = 'starter'`);
    expect(await repo.startCommunityForPlace({ country: "Peru", city: "Lima" })).toEqual({ ok: false, error: "full" });
    await db.exec("delete from public.communities where status = 'starter'");
  });
});
