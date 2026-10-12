// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import type Groq from "groq-sdk";

let client: Groq | null = null;
vi.mock("@/lib/guide/groq-client", () => ({ GUIDE_MODEL: "test-model", getGroqClient: () => client }));

import { __resetCaseStoreForTests, createCase, getCaseByCaseNumber } from "@/lib/store/case-store";
import { buildApproximateArea } from "@/lib/privacy/approximate-area";
import { buildConsentRecord } from "@/lib/privacy/consent";
import { SANTIAGO_VERAGUAS } from "@/data/communities";
import { publicCaseUrl } from "@/lib/site-url";
import { getPipelineRepository, __resetPipelineStoreForTests } from "../store";
import {
  approveFollowUp,
  approveReferral,
  approveRouting,
  approveWeeklySummary,
  getCasePipeline,
  getPublishedSummary,
  mergeDuplicate,
  rejectProposal,
  runFollowUp,
  runIntake,
} from "../pipeline";
import { ProposalSchema } from "../types";
import { DEFAULT_HANDLERS, fakeGroq } from "./fake-groq";

const T0 = new Date("2026-10-01T12:00:00Z");
const days = (n: number) => new Date(T0.getTime() + n * 86_400_000);

async function newCase(description = "La alcantarilla de la calle está tapada y se inunda cada vez que llueve.", categoryId = "flooding-drainage") {
  const c = await createCase(
    {
      type: "report",
      communityId: SANTIAGO_VERAGUAS.id,
      categoryId,
      description,
      approximateArea: buildApproximateArea(SANTIAGO_VERAGUAS.areas[1]),
      consent: buildConsentRecord(SANTIAGO_VERAGUAS.privacy.consentVersion, "es", () => T0.toISOString()),
    },
    () => T0,
  );
  return c.publicCaseNumber;
}

const pending = async (caseNumber: string, kind: string) =>
  (await getPipelineRepository().listProposals({ caseNumber, status: "pending" })).find((p) => p.kind === kind);

beforeEach(() => {
  __resetCaseStoreForTests();
  __resetPipelineStoreForTests();
  client = fakeGroq(DEFAULT_HANDLERS).client;
});

describe("the four-step pipeline, end to end (AI mocked)", () => {
  it("routes, drafts, queues in the dry-run outbox, and follows up — only on moderator approval", async () => {
    const n = await newCase();
    await runIntake(n, { title: "Alcantarilla tapada" }, T0);

    // 2. Routing: a pending proposal with the Critic's review, nothing public yet.
    const routing = await pending(n, "routing");
    expect(routing?.kind === "routing" && routing.payload).toMatchObject({ officeId: "drainage", priority: "medium", needsModeratorDecision: false, source: "ai" });
    expect(routing?.critique).toMatchObject({ verdict: "ok", source: "ai" });
    expect((await getCaseByCaseNumber(n))!.statusHistory).toHaveLength(1);

    // Moderator changes the priority and approves → the Referral Agent drafts.
    const approved = await approveRouting(routing!.id, "mod@example.com", { priority: "high", moderatorLanguage: "en" }, days(1));
    expect(approved.ok).toBe(true);
    const pipeline = await getCasePipeline(n);
    expect(pipeline.state).toMatchObject({ officeId: "drainage", priority: "high", title: "Alcantarilla tapada" });
    expect(pipeline.stage).toBe("reviewed");
    const referral = await pending(n, "referral");
    expect(referral?.kind).toBe("referral");
    if (referral?.kind !== "referral") throw new Error("no referral");
    expect(referral.payload.messageEs).toContain(n);
    expect(referral.payload.messageEs).toContain(publicCaseUrl(n));
    expect(referral.payload.messageEs).toContain("Residentes que lo reportaron: 1");
    expect(referral.payload.translation?.language).toBe("en");

    // 3. Approve → dry-run outbox + the fixed public line, no office named.
    expect((await approveReferral(referral.id, "mod@example.com", {}, days(2))).ok).toBe(true);
    const outbox = await getPipelineRepository().listOutbox({ caseNumber: n });
    expect(outbox).toHaveLength(1);
    expect(outbox[0]).toMatchObject({ status: "dry_run", officeId: "drainage", toAddress: "drenaje@example.invalid" });
    const events = (await getCaseByCaseNumber(n))!.statusHistory;
    expect(events.at(-1)).toMatchObject({ kind: "referral_queued", actorType: "moderator" });
    expect(events.at(-1)?.contactId).toBeUndefined();
    expect((await getCasePipeline(n)).stage).toBe("referral_prepared");

    // 4. Follow-up: high = 4 days. Day 5 isn't overdue (3 days since queued); day 7 is.
    expect((await runFollowUp("manual", days(5))).flagged).toEqual([]);
    const report = await runFollowUp("cron", days(7));
    expect(report.flagged).toEqual([n]);
    const followUp = await pending(n, "follow_up");
    if (followUp?.kind !== "follow_up") throw new Error("no follow-up");
    expect(followUp.payload).toMatchObject({ daysWithoutProgress: 5, thresholdDays: 4, escalateTo: "urgent" });
    // Running again doesn't pile up a second suggestion for the same case.
    expect((await runFollowUp("manual", days(7))).flagged).toEqual([]);

    expect((await approveFollowUp(followUp.id, "mod@example.com", { reminder: true, publicUpdate: true, escalate: true }, days(8))).ok).toBe(true);
    const after = await getCasePipeline(n);
    expect(after.stage).toBe("follow_up");
    expect(after.state?.priority).toBe("urgent");
    expect(after.outbox.map((o) => o.kind).sort()).toEqual(["follow_up", "referral"]);
    expect((await getCaseByCaseNumber(n))!.statusHistory.at(-1)).toMatchObject({ kind: "follow_up_update", note: expect.stringContaining("still open") });

    // Every step is in the audit log.
    const actions = after.audit.map((a) => a.action);
    for (const a of ["drafted", "routing_proposed", "critique", "routing_set", "referral_drafted", "referral_approved", "outbox_queued", "follow_up_flagged", "follow_up_approved"]) {
      expect(actions).toContain(a);
    }
  });

  it("every stored proposal matches its strict schema", async () => {
    const n = await newCase();
    await runIntake(n, {}, T0);
    await approveRouting((await pending(n, "routing"))!.id, "mod", {}, days(1));
    await approveReferral((await pending(n, "referral"))!.id, "mod", {}, days(1));
    await runFollowUp("manual", days(30));
    for (const p of await getPipelineRepository().listProposals()) expect(() => ProposalSchema.parse(p)).not.toThrow();
  });

  it("refuses a moderator's edited referral that adds personal data or drops the case number", async () => {
    const n = await newCase();
    await runIntake(n, {}, T0);
    await approveRouting((await pending(n, "routing"))!.id, "mod", {}, days(1));
    const referral = (await pending(n, "referral"))!;
    if (referral.kind !== "referral") throw new Error();
    expect(await approveReferral(referral.id, "mod", { messageEs: referral.payload.messageEs + "\nLlamar al 6123-4567" })).toMatchObject({ ok: false, reason: expect.stringMatching(/personal/) });
    expect(await approveReferral(referral.id, "mod", { messageEs: "Hola" })).toMatchObject({ ok: false });
    expect(await getPipelineRepository().listOutbox()).toEqual([]);
  });

  it("asks the moderator when two offices fit, and flags likely duplicates to merge", async () => {
    const first = await newCase("Hay un poste de luz dañado frente a la escuela del centro, no enciende.", "road-infrastructure");
    const second = await newCase("Hay un poste de luz dañado frente a la escuela del centro, sigue sin encender.", "road-infrastructure");
    client = fakeGroq({
      ...DEFAULT_HANDLERS,
      proposeRouting: () => ({ officeId: "lighting", reason: "Streetlight.", priority: "high", priorityReason: "School.", confidence: 0.55, alternativeOfficeIds: ["public-works"], possibleDuplicates: [{ caseNumber: first, score: 0.9 }, { caseNumber: "SV-2099-9999", score: 1 }] }),
    }).client;
    await runIntake(second, {}, T0);
    const routing = await pending(second, "routing");
    if (routing?.kind !== "routing") throw new Error();
    expect(routing.payload.needsModeratorDecision).toBe(true);
    expect(routing.payload.alternativeOfficeIds).toEqual(["public-works"]);
    // The invented case number is dropped; the real one keeps its measured score.
    expect(routing.payload.possibleDuplicates.map((d) => d.caseNumber)).toEqual([first]);
    expect(routing.critique?.verdict).toBe("concerns");

    expect((await mergeDuplicate(second, first, "mod")).ok).toBe(true);
    expect((await getCaseByCaseNumber(second))!.isDuplicateOf).toBe(first);
    expect(await pending(second, "routing")).toBeUndefined();
  });

  it("keeps an emergency urgent even if the AI says otherwise", async () => {
    const n = await newCase("Hay un cable eléctrico caído en la calle y hay personas heridas.", "road-infrastructure");
    client = fakeGroq({ ...DEFAULT_HANDLERS, proposeRouting: () => ({ officeId: "lighting", reason: "Wire.", priority: "low", priorityReason: "x", confidence: 0.9 }) }).client;
    await runIntake(n, {}, T0);
    const routing = await pending(n, "routing");
    expect(routing?.kind === "routing" && routing.payload.priority).toBe("urgent");
    expect((await getCasePipeline(n)).state?.emergency).toBe(true);
  });

  it("drafts and publishes the weekly summary only after a moderator approves it", async () => {
    await newCase();
    await runFollowUp("manual", days(1));
    expect(await getPublishedSummary(SANTIAGO_VERAGUAS.id)).toBeNull();
    const summary = (await getPipelineRepository().listProposals({ kind: "weekly_summary", status: "pending" }))[0];
    expect(summary?.kind === "weekly_summary" && summary.payload).toMatchObject({ newCases: 1, openCases: 1, highlight: { en: "Two new reports this week." } });
    // Once per week.
    expect((await runFollowUp("manual", days(1))).summaries).toEqual([]);
    expect((await approveWeeklySummary(summary!.id, "mod")).ok).toBe(true);
    expect(await getPublishedSummary(SANTIAGO_VERAGUAS.id)).toMatchObject({ newCases: 1 });
  });

  it("routes old cases that never had a routing suggestion, privately", async () => {
    const n = await newCase();
    const report = await runFollowUp("cron", days(1));
    expect(report.routedCatchUp).toEqual([n]);
    expect(await pending(n, "routing")).toBeDefined();
    expect((await getCaseByCaseNumber(n))!.statusHistory).toHaveLength(1);
  });

  it("a dismissed suggestion changes nothing", async () => {
    const n = await newCase();
    await runIntake(n, {}, T0);
    expect((await rejectProposal((await pending(n, "routing"))!.id, "mod")).ok).toBe(true);
    expect((await getCasePipeline(n)).state?.officeId).toBeUndefined();
  });
});

describe("when the AI fails", () => {
  it("retries invalid output once, then falls back to rules and tells the moderator", async () => {
    const n = await newCase();
    const fake = fakeGroq({ ...DEFAULT_HANDLERS, proposeRouting: () => ({ officeId: "mayor-office", reason: "x", priority: "low", priorityReason: "x", confidence: 1 }) });
    client = fake.client;
    await runIntake(n, {}, T0);
    const routing = await pending(n, "routing");
    expect(routing?.kind === "routing" && routing.payload).toMatchObject({ officeId: "drainage", source: "rules" });
    expect(routing?.failureNote).toMatch(/didn't match the required format, twice/);
    expect(fake.create.mock.calls.filter(([r]) => (r as { tools: Array<{ function: { name: string } }> }).tools.at(-1)?.function.name === "proposeRouting")).toHaveLength(2);
  });

  it("handles a rate limit with a clear message, never a crash", async () => {
    const n = await newCase();
    const { default: GroqSdk } = await import("groq-sdk");
    const limited = new GroqSdk.RateLimitError(429, { error: { message: "rate" } }, "rate", new Headers());
    client = fakeGroq({ proposeRouting: () => limited, recordCritique: () => limited }).client;
    await expect(runIntake(n, {}, T0)).resolves.toBeUndefined();
    const routing = await pending(n, "routing");
    expect(routing?.failureNote).toMatch(/rate limit/);
    expect(routing?.critique?.source).toBe("rules");
  });

  it("works with no AI configured at all", async () => {
    client = null;
    const n = await newCase();
    await runIntake(n, {}, T0);
    await approveRouting((await pending(n, "routing"))!.id, "mod", {}, days(1));
    const referral = await pending(n, "referral");
    expect(referral?.kind === "referral" && referral.payload.source).toBe("rules");
    expect((await approveReferral(referral!.id, "mod", {}, days(1))).ok).toBe(true);
    const report = await runFollowUp("manual", days(30));
    expect(report.flagged).toEqual([n]);
    expect(report.notes.join(" ")).toMatch(/isn't configured/);
  });
});
