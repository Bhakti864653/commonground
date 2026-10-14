import { beforeEach, describe, expect, it, vi } from "vitest";
import type Groq from "groq-sdk";

// submitCase runs the pipeline after its response (next/server `after`); here we run it ourselves.
const afterTasks: Array<() => Promise<void>> = [];
vi.mock("next/server", async (importOriginal) => ({ ...(await importOriginal<object>()), after: (fn: () => Promise<void>) => afterTasks.push(fn) }));
let moderator: { email: string; name: string; role: "moderator"; via: "google" } | null = null;
vi.mock("@/lib/admin/auth", () => ({ getCurrentModerator: async () => moderator, isAdminAuthenticated: async () => !!moderator }));
let demoCookie = false;
vi.mock("next/headers", () => ({ cookies: async () => ({ get: (name: string) => (name === "cg_demo_guide_v2" && demoCookie ? { value: "1" } : undefined) }) }));
let client: Groq | null = null;
vi.mock("@/lib/guide/groq-client", () => ({ GUIDE_MODEL: "test-model", getGroqClient: () => client }));

import { submitCase } from "../actions";
import { getCaseByCaseNumber, listAllCasesForAdmin } from "../case-store";
import { toPublicCase, VERIFICATION_LABELS } from "@/lib/schema/report";
import { buildApproximateArea } from "@/lib/privacy/approximate-area";
import { buildConsentRecord } from "@/lib/privacy/consent";
import { SANTIAGO_VERAGUAS } from "@/data/communities";
import { getPipelineRepository } from "@/lib/pipeline/store";
import { getOfficeRepository } from "@/lib/office/store";
import { approveReferral, approveRouting } from "@/lib/pipeline/pipeline";
import { resetDemo } from "@/lib/pipeline/demo-reset";
import { changeOfficeStatus, confirmOfficeResolution, listInbox } from "@/lib/office/service";
import { DEMO_CASE_CREATED_ACTION } from "@/lib/pipeline/demo-cases";
import { ALL_LANGS, DEFAULT_HANDLERS, fakeGroq } from "@/lib/pipeline/__tests__/fake-groq";

const report = (description: string) => ({
  type: "report" as const,
  communityId: SANTIAGO_VERAGUAS.id,
  categoryId: "garbage-sanitation",
  description,
  approximateArea: buildApproximateArea(SANTIAGO_VERAGUAS.areas[0]),
  consent: buildConsentRecord(SANTIAGO_VERAGUAS.privacy.consentVersion, "es"),
});

async function runAfterTasks() {
  while (afterTasks.length) await afterTasks.shift()!();
}

const marked = async (caseNumber: string) => (await getPipelineRepository().listAudit({ caseNumber })).some((a) => a.action === DEMO_CASE_CREATED_ACTION);

beforeEach(() => {
  const g = globalThis as Record<string, unknown>;
  delete g.__commonGroundCaseStore__;
  delete g.__commonGroundPipelineStore__;
  delete g.__commonGroundOfficeStore__;
  afterTasks.length = 0;
  moderator = null;
  demoCookie = false;
  client = fakeGroq({ ...DEFAULT_HANDLERS, recordTranslation: () => ALL_LANGS("x") }).client;
});

describe("who creates a test (example) report", () => {
  it("a resident never does, even with the demo cookie set", async () => {
    demoCookie = true;
    const { publicCaseNumber } = await submitCase(report("Hay basura en la calle central."));
    const c = (await getCaseByCaseNumber(publicCaseNumber))!;
    expect(c.sourceType).toBe("community");
    expect(c.verificationState).toBe("community_report");
    expect(await marked(publicCaseNumber)).toBe(false);
  });

  it("a signed-in moderator creates a test report: an example case, labelled “Ejemplo” — no guide or cookie needed", async () => {
    moderator = { email: "mod@example.com", name: "Mod", role: "moderator", via: "google" };
    const { publicCaseNumber } = await submitCase(report("Hay basura en la calle central."));
    const c = (await getCaseByCaseNumber(publicCaseNumber))!;
    expect(c.sourceType).toBe("demonstration");
    expect(VERIFICATION_LABELS[toPublicCase(c).verificationState].es).toBe("Ejemplo – no es un reporte real");
    expect(await marked(publicCaseNumber)).toBe(true);
    // The privacy filter still runs on a demo report.
    const { publicCaseNumber: withPhone } = await submitCase(report("Basura en la calle, mi teléfono es 6123-4567."));
    expect((await getCaseByCaseNumber(withPhone))!.description).not.toContain("6123");
  });
});

describe("one demo report goes through the whole loop, and Reset demo deletes it", () => {
  it("resident page → agents → outbox → demo office → closed, without touching a real report", async () => {
    // A real resident's report arrives during the demo.
    const real = (await submitCase(report("Basura acumulada frente al mercado."))).publicCaseNumber;
    await runAfterTasks();
    const realBefore = JSON.stringify(await getCaseByCaseNumber(real));

    // 1. The signed-in moderator submits a report from the public page.
    moderator = { email: "mod@example.com", name: "Mod", role: "moderator", via: "google" };
    const demo = (await submitCase(report("Hay basura en la calle central desde hace una semana."))).publicCaseNumber;
    await runAfterTasks();

    // 2. The Routing Agent's suggestion is waiting; the moderator approves it.
    const pending = async (kind: string) => (await getPipelineRepository().listProposals({ caseNumber: demo, status: "pending" })).find((p) => p.kind === kind);
    const routing = await pending("routing");
    expect(routing).toBeDefined();
    expect((await approveRouting(routing!.id, "mod", { officeId: "sanitation" })).ok).toBe(true);

    // 3. The Referral Agent's letter → approved → the outbox (never sent).
    const referral = await pending("referral");
    expect((await approveReferral(referral!.id, "mod")).ok).toBe(true);
    expect((await getPipelineRepository().listOutbox({ caseNumber: demo }))[0]?.status).toBe("dry_run");

    // 4. The SAME report is in the demo office's inbox; the office acts on it.
    const actor = { officeId: "sanitation", actor: "mod", demo: true };
    const card = (await listInbox(actor)).find((r) => r.caseNumber === demo);
    expect(card?.status).toBe("new");
    for (const status of ["received", "in_progress", "resolved"] as const) expect((await changeOfficeStatus(actor, card!.id, status)).ok).toBe(true);
    // A real report never shows up in the simulated office.
    expect((await listInbox(actor)).map((r) => r.caseNumber)).not.toContain(real);

    // 5. The moderator confirms; the resident's page shows it closed, labelled as an example.
    expect((await confirmOfficeResolution((await pending("office_resolution"))!.id, "mod")).ok).toBe(true);
    const publicCase = toPublicCase((await getCaseByCaseNumber(demo))!);
    expect(publicCase.status).toBe("closed");
    expect(publicCase.verificationState).toBe("demonstration_data");

    // Reset demo deletes the demo report and everything attached; the real report is untouched.
    const { removed } = await resetDemo("mod");
    expect(removed).toEqual([demo]);
    expect(await getCaseByCaseNumber(demo)).toBeUndefined();
    expect(await getPipelineRepository().listProposals({ caseNumber: demo })).toEqual([]);
    expect(await getOfficeRepository().listForCase(demo)).toEqual([]);
    expect((await listAllCasesForAdmin()).map((c) => c.publicCaseNumber)).toContain(real);
    expect(JSON.stringify(await getCaseByCaseNumber(real))).toBe(realBefore);
  });
});
