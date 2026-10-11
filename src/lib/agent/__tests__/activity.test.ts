import { beforeEach, describe, expect, expectTypeOf, it, vi } from "vitest";

const isAdminAuthenticated = vi.fn();
vi.mock("@/lib/admin/auth", () => ({ isAdminAuthenticated: () => isAdminAuthenticated() }));

import { buildAgentFeed, countAgentActivity, type AgentFeedItem } from "@/lib/agent/activity";
import { listAgentActivity, listPendingReferrals } from "@/lib/agent/actions";
import {
  __resetMemoryCaseStore,
  addAdminNote,
  addReferralSuggestion,
  addTimelineEvent,
  approveReferral,
  changeCaseStatus,
  createCase,
  getCaseByCaseNumber,
  listCasesForCommunity,
  rejectReferral,
} from "@/lib/store/memory-case-store";
import { buildConsentRecord } from "@/lib/privacy/consent";
import { toPublicCase, type PublicCase } from "@/lib/schema/report";

// The fictional community has no seeded cases, so every entry here is the test's own. Everything
// in it is demonstration data by definition, so every item carries the demo label.
const COMMUNITY = "riverbend-demo";
const OFFICE = "riverbend-public-works";
let minute = 0;
const tick = () => new Date(Date.UTC(2026, 9, 1, 12, minute++));

function newCase(description = "Drenaje tapado frente al parque") {
  return createCase(
    {
      type: "report",
      communityId: COMMUNITY,
      categoryId: "streetlights",
      description,
      approximateArea: { kind: "neighborhood", areaId: "north", label: "North", labelEs: "Norte" },
      consent: buildConsentRecord("2026-09-19.v1", "es"),
    },
    tick,
  ).publicCaseNumber;
}

const SECRET = "SECRET-LETTER-TEXT urgency because of a sick child";

function prepare(caseNumber: string) {
  addTimelineEvent(caseNumber, { kind: "ai_reviewed", actorType: "agent" }, tick);
  const suggestion = addReferralSuggestion(
    caseNumber,
    { contactId: OFFICE, urgency: "high", urgencyReason: SECRET, message: SECRET, categoryAssessment: "confirmed" },
    `private reasoning: ${SECRET}`,
    tick,
  );
  addTimelineEvent(caseNumber, { kind: "referral_prepared", actorType: "agent", contactId: OFFICE }, tick);
  addTimelineEvent(caseNumber, { kind: "awaiting_approval", actorType: "agent", contactId: OFFICE }, tick);
  return suggestion!.id;
}

const publicCasesFor = (communityId: string): PublicCase[] => listCasesForCommunity(communityId).map(toPublicCase);
const publicCases = (...numbers: string[]): PublicCase[] => numbers.map((n) => toPublicCase(getCaseByCaseNumber(n)!));

describe("agent feed", () => {
  beforeEach(() => {
    __resetMemoryCaseStore();
    minute = 0;
  });

  it("holds no field that could carry private text", () => {
    expectTypeOf<keyof AgentFeedItem>().toEqualTypeOf<"id" | "caseNumber" | "kind" | "contactId" | "occurredAt" | "isDemo">();
  });

  it("shows only agent steps and moderator referral decisions, newest first", () => {
    const a = newCase();
    const b = newCase("Basura acumulada");
    const idA = prepare(a);
    changeCaseStatus(a, "under_review", "mod-1", "A moderator looked at it", tick);
    approveReferral(a, idA, SECRET, "mod-1", tick);
    const idB = prepare(b);
    rejectReferral(b, idB, "mod-1", tick);
    addAdminNote(b, "private admin note", "mod-1", tick);

    const feed = buildAgentFeed(publicCases(a, b));
    expect(feed.map((i) => `${i.caseNumber} ${i.kind}`)).toEqual([
      `${b} referral_declined`,
      `${b} awaiting_approval`,
      `${b} referral_prepared`,
      `${b} ai_reviewed`,
      `${a} referral_approved`,
      `${a} awaiting_approval`,
      `${a} referral_prepared`,
      `${a} ai_reviewed`,
    ]);
    // "received" and the moderator's status change are not agent activity.
    expect(feed.some((i) => (i.kind as string) === "status")).toBe(false);
    const serialized = JSON.stringify(feed);
    expect(serialized).not.toContain("SECRET");
    expect(serialized).not.toContain("private");
    expect(serialized).not.toContain("A moderator looked at it");
    expect(feed.every((i) => i.isDemo)).toBe(true);
  });

  it("labels a real resident's case as not demonstration data", () => {
    const real = createCase(
      {
        type: "report",
        communityId: "santiago-veraguas",
        categoryId: "flooding-drainage",
        description: "Se inunda la calle cuando llueve",
        approximateArea: { kind: "neighborhood", areaId: "norte", label: "North", labelEs: "Norte" },
        consent: buildConsentRecord("2026-09-19.v1", "es"),
      },
      tick,
    ).publicCaseNumber;
    addTimelineEvent(real, { kind: "ai_reviewed", actorType: "agent" }, tick);
    expect(buildAgentFeed(publicCases(real)).map((i) => i.isDemo)).toEqual([false]);
  });

  it("keeps timeline order for steps recorded at the same moment", () => {
    const a = newCase();
    const same = () => new Date(Date.UTC(2026, 9, 2));
    addTimelineEvent(a, { kind: "referral_prepared", actorType: "agent", contactId: OFFICE }, same);
    addTimelineEvent(a, { kind: "awaiting_approval", actorType: "agent", contactId: OFFICE }, same);
    expect(buildAgentFeed(publicCases(a)).map((i) => i.kind)).toEqual(["awaiting_approval", "referral_prepared"]);
  });

  it("counts reviewed reports, prepared referrals and approved referrals", () => {
    const a = newCase();
    const b = newCase("Basura acumulada");
    const c = newCase("Hueco en la calle");
    approveReferral(a, prepare(a), "Mensaje final", "mod-1", tick);
    rejectReferral(b, prepare(b), "mod-1", tick);
    // Reviewed twice still counts as one reviewed report.
    addTimelineEvent(b, { kind: "ai_reviewed", actorType: "agent" }, tick);
    expect(countAgentActivity(publicCases(a, b, c))).toEqual({ reviewed: 2, prepared: 2, approved: 1 });
  });

  it("ignores a status change even if it claims to be from the agent", () => {
    const a = newCase();
    const pc = publicCases(a)[0];
    pc.statusHistory.push({ id: "x", status: "closed", occurredAt: "2026-10-03T00:00:00Z", actorType: "agent" });
    expect(buildAgentFeed([pc])).toEqual([]);
  });

  it("leaves removed cases out", () => {
    const a = newCase();
    prepare(a);
    const pc = { ...publicCases(a)[0], removal: { reason: "personal_information", removedAt: "2026-10-03T00:00:00Z" } } as PublicCase;
    expect(buildAgentFeed([pc])).toEqual([]);
    expect(countAgentActivity([pc])).toEqual({ reviewed: 0, prepared: 0, approved: 0 });
  });
});

describe("listAgentActivity", () => {
  beforeEach(() => {
    __resetMemoryCaseStore();
    minute = 0;
  });

  it("pages the feed 20 at a time and reports the total", async () => {
    for (let i = 0; i < 6; i++) prepare(newCase(`Caso ${i}`));
    const first = await listAgentActivity(COMMUNITY);
    expect(first.total).toBe(18);
    expect(first.items).toHaveLength(18);
    expect(first.counts).toEqual({ reviewed: 6, prepared: 6, approved: 0 });
    for (let i = 0; i < 4; i++) prepare(newCase(`Más ${i}`));
    const page1 = await listAgentActivity(COMMUNITY, 0);
    const page2 = await listAgentActivity(COMMUNITY, 20);
    expect(page1.items).toHaveLength(20);
    expect(page2.items).toHaveLength(10);
    expect(new Set([...page1.items, ...page2.items].map((i) => i.id)).size).toBe(30);
  });

  it("is empty for an unknown community and ignores a bad offset", async () => {
    expect((await listAgentActivity("nowhere")).items).toEqual([]);
    prepare(newCase());
    expect((await listAgentActivity(COMMUNITY, "abc")).items).toHaveLength(3);
    expect((await listAgentActivity(COMMUNITY, -5)).items).toHaveLength(3);
  });
});

describe("demonstration cases", () => {
  beforeEach(() => {
    // A store that doesn't exist yet seeds the demonstration cases on first use, as on a fresh server.
    delete (globalThis as { __commonGroundCaseStore__?: unknown }).__commonGroundCaseStore__;
    isAdminAuthenticated.mockReset();
  });

  it("come with agent activity, every item labeled as a demonstration", async () => {
    const page = await listAgentActivity("santiago-veraguas");
    expect(page.counts).toEqual({ reviewed: 7, prepared: 0, approved: 0 });
    expect(page.items.length).toBeGreaterThan(0);
    expect(page.items.every((i) => i.isDemo)).toBe(true);
  });

  it("show no referral to the Alcaldía or any office (referrals are paused in the demo)", async () => {
    isAdminAuthenticated.mockResolvedValue(true);
    expect(await listPendingReferrals("santiago-veraguas")).toEqual([]);
    const feed = buildAgentFeed(publicCasesFor("santiago-veraguas"));
    expect(feed.some((i) => i.kind === "referral_prepared" || i.kind === "referral_approved")).toBe(false);
    expect(publicCasesFor("santiago-veraguas").some((c) => c.status === "referred")).toBe(false);
  });

  it("keep each timeline in time order", () => {
    for (const c of publicCasesFor("santiago-veraguas")) {
      const times = c.statusHistory.map((e) => e.occurredAt);
      expect(times).toEqual([...times].sort());
    }
  });
});

describe("listPendingReferrals (moderators only)", () => {
  beforeEach(() => {
    __resetMemoryCaseStore();
    minute = 0;
    isAdminAuthenticated.mockReset();
  });

  it("returns nothing at all to a visitor without the admin cookie", async () => {
    prepare(newCase());
    isAdminAuthenticated.mockResolvedValue(false);
    expect(await listPendingReferrals(COMMUNITY)).toBeNull();
  });

  it("lists only referrals still waiting, without the draft", async () => {
    const waiting = newCase();
    const approved = newCase("Basura");
    prepare(waiting);
    approveReferral(approved, prepare(approved), "Mensaje", "mod-1", tick);
    isAdminAuthenticated.mockResolvedValue(true);
    const pending = await listPendingReferrals(COMMUNITY);
    expect(pending).toEqual([{ caseNumber: waiting, contactId: OFFICE, preparedAt: expect.any(String), isDemo: true }]);
    expect(JSON.stringify(pending)).not.toContain("SECRET");
  });
});
