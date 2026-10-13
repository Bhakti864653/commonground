// @vitest-environment jsdom
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import type Groq from "groq-sdk";

let pathname = "/admin/pipeline";
vi.mock("next/navigation", () => ({ usePathname: () => pathname, useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
let client: Groq | null = null;
vi.mock("@/lib/guide/groq-client", () => ({ GUIDE_MODEL: "test-model", getGroqClient: () => client }));
const getCurrentModerator = vi.fn();
const isAdminAuthenticated = vi.fn();
vi.mock("@/lib/admin/auth", () => ({ getCurrentModerator: () => getCurrentModerator(), isAdminAuthenticated: () => isAdminAuthenticated() }));
// The buttons' server actions: the tests only check which one a click calls.
const approveRoutingAction = vi.fn<(...args: unknown[]) => Promise<{ ok: true }>>(async () => ({ ok: true }));
const approveReferralAction = vi.fn<(...args: unknown[]) => Promise<{ ok: true }>>(async () => ({ ok: true }));
const rejectProposalAction = vi.fn<(...args: unknown[]) => Promise<{ ok: true }>>(async () => ({ ok: true }));
vi.mock("@/lib/pipeline/actions", () => ({
  approveRoutingAction: (...a: unknown[]) => approveRoutingAction(...a),
  approveReferralAction: (...a: unknown[]) => approveReferralAction(...a),
  rejectProposalAction: (...a: unknown[]) => rejectProposalAction(...a),
  approveFollowUpAction: vi.fn(),
  draftReferralAction: vi.fn(),
  mergeDuplicateAction: vi.fn(),
  rerunRoutingAction: vi.fn(),
  setRoutingAction: vi.fn(),
  approveOfficeNoteAction: vi.fn(),
  confirmOfficeResolutionAction: vi.fn(),
  rejectOfficeResolutionAction: vi.fn(),
}));

vi.mock("@/lib/store/admin-actions", () => ({
  adminAddNote: vi.fn(),
  adminChangeStatus: vi.fn(),
  adminMarkDuplicate: vi.fn(),
  adminRemoveContent: vi.fn(),
  adminRestoreContent: vi.fn(),
  adminReviewInaccuracyFlag: vi.fn(),
  adminSetVerification: vi.fn(),
}));
vi.mock("@/lib/guide/admin-actions", () => ({ runCaseAnalysis: vi.fn(), reviewAgentSuggestion: vi.fn() }));

import { PipelinePanel, PipelineTools } from "../pipeline/PipelinePanel";
import { ModerationPanel } from "../ModerationPanel";
import { getCaseByCaseNumber } from "@/lib/store/case-store";
import { PipelineBar } from "../pipeline/PipelineBar";
import { AdminNav, BackToPipeline } from "../AdminNav";
import AdminSettingsPage from "@/app/admin/settings/page";
import { REFERRAL_OFFICES } from "@/data/referral-offices";
import { resetDemo } from "@/lib/pipeline/demo-reset";
import { getCasePipeline, getPipelineDashboard, runFollowUp } from "@/lib/pipeline/pipeline";
import { DEMO_STEPS } from "@/lib/demo-guide/steps";
import { ALL_LANGS, DEFAULT_HANDLERS, fakeGroq } from "@/lib/pipeline/__tests__/fake-groq";

const offices = REFERRAL_OFFICES.map((o) => ({ id: o.id, name: o.name }));

function freshStores() {
  const g = globalThis as Record<string, unknown>;
  delete g.__commonGroundCaseStore__;
  delete g.__commonGroundPipelineStore__;
  delete g.__commonGroundOfficeStore__;
}

async function panelFor(caseNumber: string) {
  const p = await getCasePipeline(caseNumber);
  return render(
    <PipelinePanel
      caseNumber={caseNumber}
      stage={p.stage}
      state={p.state}
      proposals={p.proposals}
      outbox={p.outbox}
      audit={p.audit}
      offices={offices}
      officeReferrals={p.officeReferrals}
      officeNotes={p.officeNotes}
    />,
  );
}

beforeEach(async () => {
  freshStores();
  vi.clearAllMocks();
  client = fakeGroq({ ...DEFAULT_HANDLERS, recordTranslation: () => ALL_LANGS("Cambiaremos la luminaria esta semana.") }).client;
  await resetDemo("mod");
});

describe("the case page: step bar and one next action", () => {
  it("SV-2026-0007 is at Drafted, and the next action is to review the routing suggestion", async () => {
    await panelFor("SV-2026-0007");
    const bar = screen.getByRole("list", { name: "Case progress" });
    expect(within(bar).getAllByRole("listitem").map((li) => li.textContent?.replace("→", ""))).toEqual([
      "Current step: 1. Drafted",
      "Not yet: 2. Routed",
      "Not yet: 3. Referral ready",
      "Not yet: 4. Office",
      "Not yet: 5. Follow-up",
    ]);
    const next = screen.getByRole("link", { name: /Review the routing suggestion/ });
    expect(next).toHaveAttribute("href", "#card-routing");
    expect(document.getElementById("card-routing")).not.toBeNull();
  });

  it("SV-2026-0001 is at Office, and after the follow-up run it is at Follow-up", async () => {
    const before = await panelFor("SV-2026-0001");
    expect(screen.getByText("Current step:").parentElement).toHaveTextContent("4. Office");
    before.unmount();
    await runFollowUp("manual", new Date(), { onlyExamples: true });
    await panelFor("SV-2026-0001");
    expect(screen.getByText("Current step:").parentElement).toHaveTextContent("5. Follow-up");
    expect(screen.getByRole("link", { name: /Review the follow-up/ })).toHaveAttribute("href", "#card-follow-up");
  });

  it("a closed case shows every step done and Closed", () => {
    render(<PipelineBar step="follow_up" closed />);
    const items = within(screen.getByRole("list", { name: "Case progress" })).getAllByRole("listitem");
    expect(items.slice(0, 5).every((li) => li.textContent?.startsWith("Done:"))).toBe(true);
    expect(items[5]).toHaveTextContent("Closed");
  });
});

describe("agent suggestions: Suggests, Why, Approve · Change · Dismiss", () => {
  it("the unsure routing suggestion opens its choices and approves with the moderator's office", async () => {
    await panelFor("SV-2026-0007");
    const card = within(document.getElementById("card-routing")!);
    expect(card.getByText("Suggests")).toBeInTheDocument();
    expect(card.getByText("Why")).toBeInTheDocument();
    expect(card.getByText(/The agent isn’t sure/)).toBeInTheDocument();
    // Because the agent isn't sure, the choices are already open.
    expect(card.getByRole("button", { name: "Hide changes" })).toHaveAttribute("aria-expanded", "true");
    fireEvent.change(card.getByLabelText("Office"), { target: { value: "parks" } });
    await act(async () => fireEvent.click(card.getByRole("button", { name: "Approve with my changes" })));
    expect(approveRoutingAction).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ officeId: "parks" }));
  });

  it("the referral message is read-only until Change, and Approve sends only an edited message", async () => {
    // Reset demo leaves SV-2026-0007 waiting on routing; approve it in the store to get a referral draft.
    const { approveRouting } = await import("@/lib/pipeline/pipeline");
    const routing = (await getCasePipeline("SV-2026-0007")).proposals.find((p) => p.kind === "routing" && p.status === "pending")!;
    await approveRouting(routing.id, "mod", { officeId: "parks" });
    document.body.innerHTML = "";
    await panelFor("SV-2026-0007");
    expect(screen.getByRole("link", { name: /Review the message to the office/ })).toHaveAttribute("href", "#card-referral");
    const card = within(document.getElementById("card-referral")!);
    expect(card.queryByRole("textbox")).toBeNull();
    expect(card.getByText(/Nothing is sent/)).toBeInTheDocument();
    fireEvent.click(card.getByRole("button", { name: "Change" }));
    const box = card.getByRole("textbox");
    fireEvent.change(box, { target: { value: `${(box as HTMLTextAreaElement).value} Gracias.` } });
    await act(async () => fireEvent.click(card.getByRole("button", { name: "Approve with my changes" })));
    expect(approveReferralAction).toHaveBeenCalledWith(expect.any(String), expect.stringMatching(/Gracias\.$/));
  });

  it("Dismiss rejects only that suggestion", async () => {
    await panelFor("SV-2026-0002");
    const card = within(document.getElementById("card-routing")!);
    expect(card.getByText(/Possible duplicate/)).toBeInTheDocument();
    expect(card.getByRole("button", { name: "Merge into SV-2026-0001" })).toBeInTheDocument();
    await act(async () => fireEvent.click(card.getByRole("button", { name: "Dismiss" })));
    expect(rejectProposalAction).toHaveBeenCalledTimes(1);
  });

  it("the less common tools are still there", async () => {
    const p = await getCasePipeline("SV-2026-0007");
    render(<PipelineTools caseNumber="SV-2026-0007" state={p.state} proposals={p.proposals} outbox={p.outbox} offices={offices} />);
    expect(screen.getByRole("button", { name: "Ask the Routing Agent again" })).toBeInTheDocument();
    expect(screen.getByText("Choose the office and priority yourself")).toBeInTheDocument();
  });
});

describe("the way back to the public side", () => {
  it("the moderator case page links to what residents see for that case", async () => {
    const c = (await getCaseByCaseNumber("SV-2026-0001"))!;
    render(<ModerationPanel caseData={c} communityDisplayName="Santiago de Veraguas" categoryLabel="Road" />);
    expect(screen.getByRole("link", { name: "Open the public case page →" })).toHaveAttribute("href", "/cases/SV-2026-0001");
  });
});

describe("Home's counts use the same five steps", () => {
  it("puts each example case on its step", async () => {
    const { rows } = await getPipelineDashboard();
    const step = (n: string) => rows.find((r) => r.caseNumber === n)?.displayStep;
    expect(step("SV-2026-0007")).toBe("drafted");
    expect(step("SV-2026-0001")).toBe("office");
  });
});

describe("navigation", () => {
  it("has four clear places, and marks where you are", () => {
    pathname = "/admin/cases/SV-2026-0001";
    render(<AdminNav />);
    const nav = screen.getByRole("navigation", { name: "Admin" });
    expect(within(nav).getAllByRole("link").map((a) => a.textContent)).toEqual(["Home", "All cases", "Demo office", "Settings"]);
    expect(within(nav).getByRole("link", { name: "All cases" })).toHaveAttribute("aria-current", "page");
    expect(within(nav).getByRole("link", { name: "Home" })).toHaveAttribute("href", "/admin/pipeline");
  });

  it("shows “Back to Pipeline” everywhere except Home", () => {
    for (const p of ["/admin", "/admin/cases/SV-2026-0007", "/admin/settings", "/admin/communities", "/admin/offices"]) {
      pathname = p;
      const { unmount } = render(<BackToPipeline />);
      expect(screen.getByRole("link", { name: "← Back to Pipeline" })).toHaveAttribute("href", "/admin/pipeline");
      unmount();
    }
    pathname = "/admin/pipeline";
    const { container } = render(<BackToPipeline />);
    expect(container).toBeEmptyDOMElement();
  });

  it("Settings lists the setup screens; owner-only ones only for the owner; nothing when signed out", async () => {
    getCurrentModerator.mockResolvedValue(null);
    expect(await AdminSettingsPage()).toBeNull();

    getCurrentModerator.mockResolvedValue({ email: "m@example.com", name: "M", role: "moderator", via: "google" });
    const asModerator = render(await AdminSettingsPage());
    expect(screen.getAllByRole("link").map((a) => a.getAttribute("href"))).toEqual(["/admin/communities", "/admin/sources"]);
    asModerator.unmount();

    getCurrentModerator.mockResolvedValue({ email: "o@example.com", name: "O", role: "owner", via: "google" });
    render(await AdminSettingsPage());
    expect(screen.getAllByRole("link").map((a) => a.getAttribute("href"))).toEqual(["/admin/communities", "/admin/sources", "/admin/moderators", "/admin/offices"]);
  });
});

describe("the demo guide points at things that exist", () => {
  it("every step's highlighted element is on a real screen", () => {
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const f of readdirSync(dir)) {
        const full = join(dir, f);
        if (statSync(full).isDirectory()) {
          if (f !== "__tests__") walk(full);
        } else if (full.endsWith(".tsx")) files.push(readFileSync(full, "utf8"));
      }
    };
    walk(join(__dirname, "../../.."));
    const source = files.join("\n");
    for (const s of DEMO_STEPS) {
      if (!s.target) continue;
      // Either a fixed attribute, or a component that sets it (data-demo={onlyExamples ? "…" : undefined}).
      const found = [`data-demo="${s.target}"`, `demo="${s.target}"`, `? "${s.target}"`].some((form) => source.includes(form));
      expect(found, `step ${s.n}: ${s.target}`).toBe(true);
    }
  });

  it("names the new buttons and screens", () => {
    const text = JSON.stringify(DEMO_STEPS);
    for (const label of ["What needs your attention", "Cases by step", "Review the routing suggestion", "Approve with my changes", "Approve and publish", "Approve and close the case", "History: everything agents and people did"]) {
      expect(text).toContain(label);
    }
    for (const old of ["Waiting for a moderator", "Agent timeline / audit log", "Confirm and close the case", "Approve → outbox"]) {
      expect(text).not.toContain(old);
    }
  });
});
