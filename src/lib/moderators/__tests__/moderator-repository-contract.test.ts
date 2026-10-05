// @vitest-environment node
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { fromPglite } from "@/lib/db/sql-client";
import { memoryModeratorRepository, __resetModeratorsForTests } from "@/lib/moderators/memory-moderator-store";
import { createSqlModeratorRepository } from "@/lib/moderators/sql-moderator-store";
import { hashSessionToken, newSessionToken, sessionExpiry } from "@/lib/moderators/logic";
import type { ModeratorRepository } from "@/lib/moderators/repository";

/** One set of moderator behaviours, two stores: in memory, and Postgres (on PGlite). */

const MIGRATIONS_DIR = join(__dirname, "../../../../db/migrations");
const MIGRATIONS = readdirSync(MIGRATIONS_DIR)
  .filter((f) => f.endsWith(".sql"))
  .sort()
  .map((f) => readFileSync(join(MIGRATIONS_DIR, f), "utf8"));

let pg: PGlite;
const harnesses: { name: string; repo: () => ModeratorRepository; reset: () => Promise<void>; setup?: () => Promise<void>; teardown?: () => Promise<void> }[] = [
  { name: "in-memory", repo: () => memoryModeratorRepository, reset: async () => __resetModeratorsForTests() },
  {
    name: "Postgres (PGlite)",
    repo: () => createSqlModeratorRepository(fromPglite(pg)),
    setup: async () => {
      pg = new PGlite();
      for (const sql of MIGRATIONS) await pg.exec(sql);
    },
    reset: async () => {
      await pg.exec("truncate public.moderators, public.moderator_sessions cascade");
    },
    teardown: async () => {
      await pg.close();
    },
  },
];

const T0 = new Date("2026-10-05T12:00:00Z");
const later = (hours: number) => new Date(T0.getTime() + hours * 3600 * 1000);

describe.each(harnesses)("ModeratorRepository contract: $name", (h) => {
  const repo = () => h.repo();
  beforeAll(async () => h.setup?.(), 60_000);
  afterAll(async () => h.teardown?.());
  beforeEach(async () => h.reset());

  it("makes the owner from OWNER_EMAIL, lowercased, and keeps them the owner", async () => {
    const owner = await repo().ensureOwner("  Owner@Example.com ", "Bhakti", T0);
    expect(owner).toMatchObject({ email: "owner@example.com", name: "Bhakti", role: "owner", addedBy: "OWNER_EMAIL" });
    const again = await repo().ensureOwner("owner@example.com", "Someone else", later(1));
    expect(again).toMatchObject({ role: "owner", name: "Bhakti", addedAt: T0.toISOString() });
    expect(await repo().listModerators()).toHaveLength(1);
  });

  it("promotes an existing moderator whose email becomes OWNER_EMAIL", async () => {
    await repo().addModerator({ email: "ana@example.com", name: "" }, "owner@example.com", T0);
    expect(await repo().ensureOwner("ana@example.com", "Ana", later(1))).toMatchObject({ role: "owner", name: "Ana" });
  });

  it("adds moderators once, by normalized email, and lists the owner first", async () => {
    await repo().ensureOwner("owner@example.com", "Owner", later(2));
    const added = await repo().addModerator({ email: "Ana@Example.com", name: " Ana " }, "owner@example.com", T0);
    expect(added).toEqual({
      ok: true,
      moderator: { email: "ana@example.com", name: "Ana", role: "moderator", addedAt: T0.toISOString(), addedBy: "owner@example.com" },
    });
    expect(await repo().addModerator({ email: "ana@example.com" }, "owner@example.com")).toEqual({ ok: false, error: "exists" });
    expect(await repo().addModerator({ email: "not an email" }, "owner@example.com")).toEqual({ ok: false, error: "invalid" });
    expect(await repo().addModerator({ email: "x@example.com", name: "x".repeat(81) }, "owner@example.com")).toEqual({
      ok: false,
      error: "invalid",
    });
    expect((await repo().listModerators()).map((m) => m.email)).toEqual(["owner@example.com", "ana@example.com"]);
    expect(await repo().getModerator("ANA@example.com")).toMatchObject({ email: "ana@example.com" });
    expect(await repo().getModerator("nobody@example.com")).toBeUndefined();
  });

  it("finds a moderator by a live session, and not by an expired or deleted one", async () => {
    await repo().addModerator({ email: "ana@example.com" }, "owner@example.com", T0);
    const token = newSessionToken();
    await repo().createSession("ana@example.com", hashSessionToken(token), sessionExpiry(T0), T0);
    expect(await repo().getSessionModerator(hashSessionToken(token), later(1))).toMatchObject({ email: "ana@example.com" });
    expect(await repo().getSessionModerator(hashSessionToken("made-up"), later(1))).toBeUndefined();
    expect(await repo().getSessionModerator(hashSessionToken(token), later(24 * 8))).toBeUndefined();
    await repo().deleteSession(hashSessionToken(token));
    expect(await repo().getSessionModerator(hashSessionToken(token), later(1))).toBeUndefined();
  });

  it("removing a moderator ends their sessions at once; the owner can't be removed", async () => {
    await repo().ensureOwner("owner@example.com", "Owner", T0);
    await repo().addModerator({ email: "ana@example.com" }, "owner@example.com", T0);
    const token = hashSessionToken(newSessionToken());
    await repo().createSession("ana@example.com", token, sessionExpiry(T0), T0);
    expect(await repo().removeModerator("Ana@example.com")).toEqual({ ok: true });
    expect(await repo().getSessionModerator(token, later(1))).toBeUndefined();
    expect(await repo().getModerator("ana@example.com")).toBeUndefined();
    expect(await repo().removeModerator("ana@example.com")).toEqual({ ok: false, error: "not_found" });
    expect(await repo().removeModerator("owner@example.com")).toEqual({ ok: false, error: "owner" });
    expect(await repo().getModerator("owner@example.com")).toBeDefined();
  });
});

describe("0005_moderators.sql", () => {
  it("stores only a hash of each session token", () => {
    const token = newSessionToken();
    expect(token.length).toBeGreaterThanOrEqual(43);
    expect(hashSessionToken(token)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashSessionToken(token)).not.toContain(token);
  });
});
