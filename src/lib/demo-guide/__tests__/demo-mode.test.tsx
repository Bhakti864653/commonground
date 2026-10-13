// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type Groq from "groq-sdk";

vi.mock("next/navigation", () => ({ usePathname: () => "/admin/pipeline", useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
let client: Groq | null = null;
vi.mock("@/lib/guide/groq-client", () => ({ GUIDE_MODEL: "test-model", getGroqClient: () => client }));
vi.mock("@/lib/admin/auth", () => ({ isAdminAuthenticated: async () => true }));
let cookieValue: string | undefined;
vi.mock("next/headers", () => ({ cookies: async () => ({ get: (name: string) => (name === "cg_demo_guide" && cookieValue ? { value: cookieValue } : undefined) }) }));
vi.mock("@/lib/pipeline/actions", async () => {
  const { getPipelineDashboard } = await import("@/lib/pipeline/pipeline");
  const stub = async () => ({ ok: true });
  return {
    getPipelineDashboardForAdmin: () => getPipelineDashboard(),
    approveWeeklySummaryAction: stub,
    rejectProposalAction: stub,
    resetDemoAction: stub,
    runDemoFollowUpNowAction: stub,
    runFollowUpNowAction: stub,
  };
});
vi.mock("@/lib/store/admin-actions", async () => {
  const { listAllCasesForAdmin } = await import("@/lib/store/case-store");
  return { listCasesForAdmin: () => listAllCasesForAdmin(), getAdminDuplicateClusters: async () => [] };
});

import PipelineDashboardPage from "@/app/admin/pipeline/page";
import AdminPage from "@/app/admin/page";
import { setGuideState } from "../store";
import { createCase } from "@/lib/store/case-store";
import { buildApproximateArea } from "@/lib/privacy/approximate-area";
import { buildConsentRecord } from "@/lib/privacy/consent";
import { SANTIAGO_VERAGUAS } from "@/data/communities";
import { getPipelineRepository } from "@/lib/pipeline/store";
import { resetDemo } from "@/lib/pipeline/demo-reset";
import { ALL_LANGS, DEFAULT_HANDLERS, fakeGroq } from "@/lib/pipeline/__tests__/fake-groq";

function freshStores() {
  const g = globalThis as Record<string, unknown>;
  delete g.__commonGroundCaseStore__;
  delete g.__commonGroundPipelineStore__;
  delete g.__commonGroundOfficeStore__;
}

/** A resident's real report, routed long ago, so it is overdue and on Home. */
async function residentCase() {
  const longAgo = () => new Date(Date.now() - 30 * 86_400_000);
  const c = await createCase(
    {
      type: "report",
      communityId: SANTIAGO_VERAGUAS.id,
      categoryId: "road-infrastructure",
      description: "Hueco enorme en la carretera.",
      approximateArea: buildApproximateArea(SANTIAGO_VERAGUAS.areas[0]),
      consent: buildConsentRecord(SANTIAGO_VERAGUAS.privacy.consentVersion, "es"),
    },
    longAgo,
  );
  await getPipelineRepository().upsertState(c.publicCaseNumber, c.communityId, { officeId: "public-works", priority: "high", lastProgressAt: longAgo().toISOString() });
  return c.publicCaseNumber;
}

beforeEach(async () => {
  freshStores();
  cookieValue = undefined;
  client = fakeGroq({ ...DEFAULT_HANDLERS, recordTranslation: () => ALL_LANGS("x") }).client;
  await resetDemo("mod");
});

describe("while the demo guide is on, moderator screens show example cases only", () => {
  it("starting the guide sets the cookie, and exiting clears it", () => {
    setGuideState({ active: true, step: 1 });
    expect(document.cookie).toContain("cg_demo_guide=1");
    setGuideState({ active: false, step: 4 });
    expect(document.cookie).not.toContain("cg_demo_guide=1");
  });

  it("Home shows a resident's report normally, and hides it (saying so) during the demo", async () => {
    const real = await residentCase();
    const normal = render(await PipelineDashboardPage());
    expect(document.body.textContent).toContain(real);
    expect(screen.queryByRole("note")).toBeNull();
    normal.unmount();

    cookieValue = "1";
    render(await PipelineDashboardPage());
    expect(document.body.textContent).not.toContain(real);
    expect(screen.getByRole("note")).toHaveTextContent("Demo guide is on: 1 resident report is hidden");
    expect(document.body.textContent).toContain("SV-2026-0007");
  });

  it("All cases hides it too, and the AI briefing, which could mention any case", async () => {
    const real = await residentCase();
    const normal = render(await AdminPage());
    expect(document.body.textContent).toContain(real);
    expect(screen.getAllByRole("button", { name: "Generate briefing" }).length).toBeGreaterThan(0);
    normal.unmount();

    cookieValue = "1";
    render(await AdminPage());
    expect(document.body.textContent).not.toContain(real);
    expect(document.body.textContent).toContain("SV-2026-0001");
    expect(screen.queryByRole("button", { name: /briefing/i })).toBeNull();
    expect(screen.getByRole("note")).toHaveTextContent("1 resident report is hidden");
  });
});
