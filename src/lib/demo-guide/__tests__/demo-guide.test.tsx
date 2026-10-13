// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import type Groq from "groq-sdk";

const isAdminAuthenticated = vi.fn();
vi.mock("@/lib/admin/auth", () => ({ isAdminAuthenticated: () => isAdminAuthenticated() }));
let client: Groq | null = null;
vi.mock("@/lib/guide/groq-client", () => ({ GUIDE_MODEL: "test-model", getGroqClient: () => client }));
vi.mock("next/navigation", () => ({ usePathname: () => "/admin/pipeline", useRouter: () => ({ push: vi.fn() }) }));

import { getDemoGuideAction } from "../actions";
import { DEMO_STEPS } from "../steps";
import { DemoGuide } from "@/components/demo-guide/DemoGuide";
import { setGuideState } from "../store";
import { createCase, getCaseByCaseNumber, listAllCasesForAdmin } from "@/lib/store/case-store";
import { buildApproximateArea } from "@/lib/privacy/approximate-area";
import { buildConsentRecord } from "@/lib/privacy/consent";
import { SANTIAGO_VERAGUAS } from "@/data/communities";
import { toPublicCase } from "@/lib/schema/report";
import { getPipelineRepository } from "@/lib/pipeline/store";
import { approveReferral, approveRouting, runFollowUp } from "@/lib/pipeline/pipeline";
import { resetDemo } from "@/lib/pipeline/demo-reset";
import { getOfficeRepository } from "@/lib/office/store";
import { addOfficeNote, approveOfficeNote, changeOfficeStatus, confirmOfficeResolution, listInbox } from "@/lib/office/service";
import { ALL_LANGS, DEFAULT_HANDLERS, fakeGroq } from "@/lib/pipeline/__tests__/fake-groq";

const EXAMPLE_NUMBERS = new Set(Array.from({ length: 8 }, (_, i) => `SV-2026-000${i + 1}`));

function freshStores() {
  const g = globalThis as Record<string, unknown>;
  delete g.__commonGroundCaseStore__;
  delete g.__commonGroundPipelineStore__;
  delete g.__commonGroundOfficeStore__;
}

/** A resident's real case that is routed and overdue, plus one never routed. */
async function realCases() {
  const input = (description: string) => ({
    type: "report" as const,
    communityId: SANTIAGO_VERAGUAS.id,
    categoryId: "road-infrastructure",
    description,
    approximateArea: buildApproximateArea(SANTIAGO_VERAGUAS.areas[0]),
    consent: buildConsentRecord(SANTIAGO_VERAGUAS.privacy.consentVersion, "es"),
  });
  const longAgo = () => new Date(Date.now() - 30 * 86_400_000);
  const routed = await createCase(input("Hueco enorme en la carretera."), longAgo);
  await getPipelineRepository().upsertState(routed.publicCaseNumber, routed.communityId, { officeId: "public-works", priority: "high", lastProgressAt: longAgo().toISOString() });
  const unrouted = await createCase(input("Huecos gigantes."), longAgo);
  return [routed.publicCaseNumber, unrouted.publicCaseNumber];
}

beforeEach(() => {
  freshStores();
  isAdminAuthenticated.mockReset();
  client = fakeGroq({ ...DEFAULT_HANDLERS, recordTranslation: () => ALL_LANGS("Cambiaremos la luminaria esta semana.") }).client;
  window.localStorage.clear();
});
afterEach(() => vi.unstubAllGlobals());

describe("the demo guide is for moderators only", () => {
  it("gives a visitor nothing at all", async () => {
    isAdminAuthenticated.mockResolvedValue(false);
    expect(await getDemoGuideAction()).toBeNull();
  });

  it("gives a signed-in moderator the 13 steps", async () => {
    isAdminAuthenticated.mockResolvedValue(true);
    const steps = await getDemoGuideAction();
    expect(steps?.map((s) => s.n)).toEqual(Array.from({ length: 13 }, (_, i) => i + 1));
    expect(JSON.stringify(steps)).not.toContain("TEST_COUNT");
  });

  it("renders nothing for a visitor, even if the guide was left on in their browser", async () => {
    isAdminAuthenticated.mockResolvedValue(false);
    setGuideState({ active: true, step: 3 });
    const { container } = render(<DemoGuide />);
    await act(async () => {});
    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByRole("complementary", { name: "Demo guide" })).toBeNull();
  });

  it("shows a moderator one step at a time", async () => {
    isAdminAuthenticated.mockResolvedValue(true);
    setGuideState({ active: true, step: 3 });
    render(<DemoGuide />);
    await act(async () => {});
    expect(screen.getByRole("complementary", { name: "Demo guide" })).toHaveTextContent("Step 3 of 13");
    expect(screen.getByRole("button", { name: "Next" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Back" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Exit guide" })).toBeInTheDocument();
  });

  it("stops the highlight animation when reduced motion is on", () => {
    const css = readFileSync(join(__dirname, "../../../app/globals.css"), "utf8");
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\) \{\s*\.demo-highlight \{\s*animation: none;/);
  });
});

describe("the demo guide only ever uses example cases", () => {
  it("names and links only example case numbers, never a resident's", () => {
    const text = JSON.stringify(DEMO_STEPS);
    const numbers = new Set(text.match(/SV-\d{4}-\d{4}/g));
    expect(numbers.size).toBeGreaterThan(0);
    for (const n of numbers) expect(EXAMPLE_NUMBERS, n).toContain(n);
    expect(text).not.toMatch(/SV-2026-001[0-9]/);
    for (const s of DEMO_STEPS) if (s.href) expect(s.href).toMatch(/^\/(guide|admin\/pipeline|admin\/cases\/SV-2026-000[1-8]|demo\/office\?office=lighting|cases\/SV-2026-000[1-8])$/);
  });

  it("the case numbers it names are the example cases it describes", async () => {
    const byNumber = new Map((await listAllCasesForAdmin()).map((c) => [c.publicCaseNumber, c]));
    expect(byNumber.get("SV-2026-0007")?.description).toMatch(/^Propongo instalar más luminarias/);
    expect(byNumber.get("SV-2026-0002")?.description).toMatch(/cerca de la escuela/);
    expect(byNumber.get("SV-2026-0001")?.description).toMatch(/frente a la escuela/);
    for (const n of ["SV-2026-0001", "SV-2026-0002", "SV-2026-0007"]) expect(byNumber.get(n)?.sourceType).toBe("demonstration");
  });

  it("'Run follow-up now (example cases only)' never flags, routes, or summarises a resident's case", async () => {
    const [routed, unrouted] = await realCases();
    const report = await runFollowUp("manual", new Date(), { onlyExamples: true });
    expect(report.flagged).toEqual(["SV-2026-0001"]);
    expect(report.flagged).not.toContain(routed);
    expect(report.routedCatchUp).not.toContain(unrouted);
    expect(report.summaries).toEqual([]);
    expect(await getPipelineRepository().listProposals({ caseNumber: routed })).toEqual([]);
    expect(await getPipelineRepository().listProposals({ caseNumber: unrouted })).toEqual([]);
  });
});

describe("after Start demo (Reset demo), the 13 steps work in order", () => {
  it("runs the whole loop on example cases and leaves a resident's case untouched", async () => {
    const [real] = await realCases();
    const realBefore = JSON.stringify(await getCaseByCaseNumber(real));
    const pending = async (n: string, kind: string) => (await getPipelineRepository().listProposals({ caseNumber: n, status: "pending" })).find((p) => p.kind === kind);

    await resetDemo("mod");
    // Step 4: SV-2026-0007's routing waits, and the agent isn't sure.
    const routing = await pending("SV-2026-0007", "routing");
    expect(routing?.kind === "routing" && routing.payload.needsModeratorDecision).toBe(true);
    expect((await approveRouting(routing!.id, "mod", { officeId: "parks" })).ok).toBe(true);
    // Step 5: the Referral Agent's draft → the outbox.
    const referral = await pending("SV-2026-0007", "referral");
    expect((await approveReferral(referral!.id, "mod")).ok).toBe(true);
    expect((await getPipelineRepository().listOutbox({ caseNumber: "SV-2026-0007" }))[0]?.status).toBe("dry_run");
    // Step 6: SV-2026-0002 suggests merging into SV-2026-0001.
    const dup = await pending("SV-2026-0002", "routing");
    expect(dup?.kind === "routing" && dup.payload.possibleDuplicates.map((d) => d.caseNumber)).toContain("SV-2026-0001");
    // Step 7: the example-only follow-up flags SV-2026-0001.
    expect((await runFollowUp("manual", new Date(), { onlyExamples: true })).flagged).toEqual(["SV-2026-0001"]);
    // Steps 9–10: SV-2026-0001 waits as "New" in the lighting inbox; the office acts.
    const actor = { officeId: "lighting", actor: "mod", demo: true };
    const card = (await listInbox(actor)).find((r) => r.caseNumber === "SV-2026-0001")!;
    expect(card.status).toBe("new");
    expect((await changeOfficeStatus(actor, card.id, "received")).ok).toBe(true);
    expect((await changeOfficeStatus(actor, card.id, "in_progress")).ok).toBe(true);
    expect((await addOfficeNote(actor, card.id, "public", "Cambiaremos la luminaria esta semana.")).ok).toBe(true);
    // Step 11: resolved; the moderator publishes the note and confirms.
    expect((await changeOfficeStatus(actor, card.id, "resolved")).ok).toBe(true);
    expect((await approveOfficeNote((await pending("SV-2026-0001", "office_note"))!.id, "mod")).ok).toBe(true);
    expect((await confirmOfficeResolution((await pending("SV-2026-0001", "office_resolution"))!.id, "mod")).ok).toBe(true);
    // Step 12: the resident sees it.
    const publicCase = toPublicCase((await getCaseByCaseNumber("SV-2026-0001"))!);
    expect(publicCase.status).toBe("closed");
    expect(publicCase.statusHistory.map((e) => e.kind ?? "status")).toEqual(
      expect.arrayContaining(["office_received", "office_in_progress", "office_note", "office_resolved"]),
    );
    // A resident's case was never touched.
    expect(JSON.stringify(await getCaseByCaseNumber(real))).toBe(realBefore);
    expect(await getOfficeRepository().listForCase(real)).toEqual([]);
  });
});
