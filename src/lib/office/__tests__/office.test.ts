// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type Groq from "groq-sdk";

let client: Groq | null = null;
vi.mock("@/lib/guide/groq-client", () => ({ GUIDE_MODEL: "test-model", getGroqClient: () => client }));

import { createCase, getCaseByCaseNumber, listAllCasesForAdmin } from "@/lib/store/case-store";
import { buildApproximateArea } from "@/lib/privacy/approximate-area";
import { buildConsentRecord } from "@/lib/privacy/consent";
import { SANTIAGO_VERAGUAS } from "@/data/communities";
import { DEMO_CASE_SEEDS } from "@/lib/store/demo-seed";
import { getPipelineRepository } from "@/lib/pipeline/store";
import { runFollowUp } from "@/lib/pipeline/pipeline";
import { ALL_LANGS, DEFAULT_HANDLERS, fakeGroq } from "@/lib/pipeline/__tests__/fake-groq";
import { getOfficeRepository } from "../store";
import { addOfficeNote, approveOfficeNote, changeOfficeStatus, confirmOfficeResolution, listInbox, rejectOfficeResolution } from "../service";
import type { OfficeActor } from "../types";

const NOW = new Date();
const later = (days: number) => new Date(NOW.getTime() + days * 86_400_000);
const demoCaseNumber = (i: number) => listAllCasesForAdmin().then((all) => all.find((c) => c.description === DEMO_CASE_SEEDS[i].description)!.publicCaseNumber);

/** Fresh seeded stores: 8 example cases, their pipeline history, and their simulated office inboxes. */
function freshStores() {
  const g = globalThis as Record<string, unknown>;
  delete g.__commonGroundCaseStore__;
  delete g.__commonGroundPipelineStore__;
  delete g.__commonGroundOfficeStore__;
}

async function realCase(description = "Hay un poste de luz que no enciende frente al parque.") {
  const c = await createCase({
    type: "report",
    communityId: SANTIAGO_VERAGUAS.id,
    categoryId: "road-infrastructure",
    description,
    approximateArea: buildApproximateArea(SANTIAGO_VERAGUAS.areas[0]),
    consent: buildConsentRecord(SANTIAGO_VERAGUAS.privacy.consentVersion, "es"),
  });
  await getPipelineRepository().upsertState(c.publicCaseNumber, c.communityId, { officeId: "lighting", priority: "high", routedAt: NOW.toISOString(), lastProgressAt: NOW.toISOString() });
  const referral = await getOfficeRepository().createReferral({ caseNumber: c.publicCaseNumber, communityId: c.communityId, officeId: "lighting", isDemo: false });
  return { caseNumber: c.publicCaseNumber, referral };
}

const realLighting: OfficeActor = { officeId: "lighting", actor: "staff@lighting.example", demo: false };
const realDrainage: OfficeActor = { officeId: "drainage", actor: "staff@drainage.example", demo: false };
const demoLighting: OfficeActor = { officeId: "lighting", actor: "mod@example.com", demo: true };
const demoDrainage: OfficeActor = { officeId: "drainage", actor: "mod@example.com", demo: true };

let fetchSpy: ReturnType<typeof vi.fn>;
beforeEach(() => {
  freshStores();
  client = fakeGroq({ ...DEFAULT_HANDLERS, recordTranslation: () => ALL_LANGS("Cambiamos la bombilla el martes.") }).client;
  fetchSpy = vi.fn(async () => {
    throw new Error("network blocked in this test");
  });
  vi.stubGlobal("fetch", fetchSpy);
});
afterEach(() => vi.unstubAllGlobals());

describe("offices only see their own referrals", () => {
  it("lists only the office's own referrals, never another office's", async () => {
    const { caseNumber } = await realCase();
    const lighting = await listInbox(realLighting);
    expect(lighting.map((r) => r.caseNumber)).toEqual([caseNumber]);
    expect(await listInbox(realDrainage)).toEqual([]);
  });

  it("can't read or change another office's referral, even with its id", async () => {
    const { caseNumber, referral } = await realCase();
    expect(await changeOfficeStatus(realDrainage, referral.id, "received")).toMatchObject({ ok: false });
    expect(await addOfficeNote(realDrainage, referral.id, "private", "hola")).toMatchObject({ ok: false });
    expect(await getOfficeRepository().getForOffice(referral.id, "drainage", false)).toBeUndefined();
    expect((await getCaseByCaseNumber(caseNumber))!.statusHistory.map((e) => e.kind ?? "status")).toEqual(["status"]);
  });

  it("sends offices only public-safe fields — never moderator-only data", async () => {
    await realCase("Poste dañado. Me llamo Ana Pérez, mi teléfono es 6123-4567.");
    const [view] = await listInbox(realLighting);
    expect(Object.keys(view).sort()).toEqual(
      ["caseNumber", "category", "categoryEs", "daysOpen", "declineReason", "description", "id", "notes", "priority", "publicUrl", "receivedAt", "residentCount", "status", "statusChangedAt", "zone"].sort(),
    );
    const json = JSON.stringify(view);
    for (const secret of ["managementToken", "adminNotes", "moderationActions", "agentSuggestions", "inaccuracyFlags", "6123-4567", "Ana Pérez"]) {
      expect(json).not.toContain(secret);
    }
  });

  it("shows urgent referrals first, then the newest", async () => {
    const a = await realCase("Poste A no enciende.");
    const b = await realCase("Poste B no enciende.");
    await getPipelineRepository().upsertState(a.caseNumber, SANTIAGO_VERAGUAS.id, { priority: "urgent" });
    expect((await listInbox(realLighting)).map((r) => r.caseNumber)).toEqual([a.caseNumber, b.caseNumber]);
  });
});

describe("the demo office only ever touches example cases", () => {
  it("sees the example referrals, never a resident's", async () => {
    const { caseNumber } = await realCase();
    const demo = [...(await listInbox(demoLighting)), ...(await listInbox(demoDrainage))];
    expect(demo.length).toBeGreaterThan(0);
    expect(demo.map((r) => r.caseNumber)).not.toContain(caseNumber);
    for (const r of demo) expect((await getCaseByCaseNumber(r.caseNumber))!.sourceType).toBe("demonstration");
  });

  it("can't act on a resident's referral, even one wrongly marked as demo", async () => {
    const { caseNumber } = await realCase();
    const sneaky = await getOfficeRepository().createReferral({ caseNumber, communityId: SANTIAGO_VERAGUAS.id, officeId: "lighting", isDemo: true });
    expect(await listInbox(demoLighting).then((l) => l.map((r) => r.caseNumber))).not.toContain(caseNumber);
    expect(await changeOfficeStatus(demoLighting, sneaky.id, "received")).toMatchObject({ ok: false });
    expect(await addOfficeNote(demoLighting, sneaky.id, "public", "hola")).toMatchObject({ ok: false });
    expect((await getCaseByCaseNumber(caseNumber))!.statusHistory).toHaveLength(1);
  });

  it("a real office can't see or act on example cases", async () => {
    const [demoReferral] = await listInbox(demoLighting);
    expect(await listInbox(realLighting)).toEqual([]);
    expect(await changeOfficeStatus(realLighting, demoReferral.id, "received")).toMatchObject({ ok: false });
  });

  it("sends nothing outside CommonGround", async () => {
    const [r] = await listInbox(demoLighting);
    await changeOfficeStatus(demoLighting, r.id, "received");
    await changeOfficeStatus(demoLighting, r.id, "in_progress");
    await addOfficeNote(demoLighting, r.id, "public", "Cambiamos la bombilla el martes.");
    await changeOfficeStatus(demoLighting, r.id, "resolved");
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe("office statuses", () => {
  it("Received → In progress → Resolved, shown publicly; Resolved needs a moderator to close", async () => {
    const n = await demoCaseNumber(0);
    const [r] = (await listInbox(demoLighting)).filter((x) => x.caseNumber === n);
    expect(r.status).toBe("new");
    expect(await changeOfficeStatus(demoLighting, r.id, "resolved")).toMatchObject({ ok: false });

    await changeOfficeStatus(demoLighting, r.id, "received", undefined, later(1));
    await changeOfficeStatus(demoLighting, r.id, "in_progress", undefined, later(2));
    let c = (await getCaseByCaseNumber(n))!;
    expect(c.status).toBe("in_progress");
    expect(c.statusHistory.slice(-2).map((e) => [e.kind, e.actorType])).toEqual([["office_received", "office"], ["office_in_progress", "office"]]);

    await changeOfficeStatus(demoLighting, r.id, "resolved", undefined, later(3));
    c = (await getCaseByCaseNumber(n))!;
    expect(c.status).toBe("in_progress");
    const resolution = (await getPipelineRepository().listProposals({ caseNumber: n, status: "pending" })).find((p) => p.kind === "office_resolution")!;
    expect(resolution).toBeDefined();

    // "Not yet": back to In progress.
    await rejectOfficeResolution(resolution.id, "mod");
    expect((await listInbox(demoLighting)).find((x) => x.id === r.id)!.status).toBe("in_progress");
    await changeOfficeStatus(demoLighting, r.id, "resolved", undefined, later(4));
    const again = (await getPipelineRepository().listProposals({ caseNumber: n, status: "pending" })).find((p) => p.kind === "office_resolution")!;
    expect((await confirmOfficeResolution(again.id, "mod")).ok).toBe(true);
    expect((await getCaseByCaseNumber(n))!.status).toBe("closed");
    const audit = (await getPipelineRepository().listAudit({ caseNumber: n })).map((a) => a.action);
    expect(audit).toEqual(expect.arrayContaining(["office_received", "office_in_progress", "office_resolved", "office_resolution_confirmed"]));
  });

  it("'Not our department' needs a reason and sends the case back for re-routing, excluding that office", async () => {
    const n = await demoCaseNumber(2);
    const [r] = (await listInbox(demoDrainage)).filter((x) => x.caseNumber === n);
    expect(await changeOfficeStatus(demoDrainage, r.id, "not_our_department", "")).toMatchObject({ ok: false });
    expect((await changeOfficeStatus(demoDrainage, r.id, "not_our_department", "Es una tubería de agua potable, no un drenaje.")).ok).toBe(true);
    expect((await getPipelineRepository().getState(n))?.officeId).toBeUndefined();
    const routing = (await getPipelineRepository().listProposals({ caseNumber: n, status: "pending" })).find((p) => p.kind === "routing");
    expect(routing?.kind === "routing" && routing.payload.officeId).not.toBe("drainage");
    expect((await getCaseByCaseNumber(n))!.statusHistory.at(-1)?.kind).toBe("office_declined");
  });
});

describe("office notes", () => {
  it("a private note is for moderators only — never on the public timeline", async () => {
    const [r] = await listInbox(demoLighting);
    const before = (await getCaseByCaseNumber(r.caseNumber))!.statusHistory.length;
    await addOfficeNote(demoLighting, r.id, "private", "Necesitamos una grúa.");
    expect((await getOfficeRepository().listNotesForCase(r.caseNumber)).map((n) => n.kind)).toEqual(["private"]);
    expect((await getCaseByCaseNumber(r.caseNumber))!.statusHistory).toHaveLength(before);
  });

  it("a public note is redacted, translated into 7 languages, and published only after a moderator approves", async () => {
    const [r] = await listInbox(demoLighting);
    await addOfficeNote(demoLighting, r.id, "public", "Cambiamos la bombilla el martes. Llamar al 6123-4567.");
    const p = (await getPipelineRepository().listProposals({ caseNumber: r.caseNumber, status: "pending" })).find((x) => x.kind === "office_note")!;
    if (p.kind !== "office_note") throw new Error();
    expect(p.payload.original).not.toContain("6123-4567");
    expect(Object.keys(p.payload.translations).sort()).toEqual(["en", "es", "fr", "hi", "it", "pt", "zh"]);
    expect((await getCaseByCaseNumber(r.caseNumber))!.statusHistory.some((e) => e.kind === "office_note")).toBe(false);

    await approveOfficeNote(p.id, "mod");
    const last = (await getCaseByCaseNumber(r.caseNumber))!.statusHistory.at(-1)!;
    expect(last).toMatchObject({ kind: "office_note", actorType: "office", noteEs: "Cambiamos la bombilla el martes.", notes: { zh: "Cambiamos la bombilla el martes." } });
  });

  it("without the AI, the note keeps its original text in every language and the moderator is told", async () => {
    client = null;
    const [r] = await listInbox(demoLighting);
    await addOfficeNote(demoLighting, r.id, "public", "Revisado.");
    const p = (await getPipelineRepository().listProposals({ caseNumber: r.caseNumber, status: "pending" })).find((x) => x.kind === "office_note")!;
    expect(p.failureNote).toMatch(/original text/);
  });
});

describe("the Follow-up Agent and office statuses", () => {
  it("stops flagging a case the office resolved, and flags a 'Received' case that stalls", async () => {
    client = null;
    const a = await realCase("Poste A no enciende.");
    const b = await realCase("Poste B no enciende.");
    await changeOfficeStatus(realLighting, a.referral.id, "received", undefined, NOW);
    await changeOfficeStatus(realLighting, a.referral.id, "in_progress", undefined, NOW);
    await changeOfficeStatus(realLighting, a.referral.id, "resolved", undefined, NOW);
    await changeOfficeStatus(realLighting, b.referral.id, "received", undefined, NOW);
    const report = await runFollowUp("manual", later(5));
    expect(report.flagged).toContain(b.caseNumber);
    expect(report.flagged).not.toContain(a.caseNumber);
  });
});
