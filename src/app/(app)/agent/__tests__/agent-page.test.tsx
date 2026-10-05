import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { SANTIAGO_VERAGUAS } from "@/data/communities";
import type { AgentActivityPage, PendingReferral } from "@/lib/agent/actions";

const listAgentActivity = vi.fn();
const listPendingReferrals = vi.fn();
vi.mock("@/lib/agent/actions", () => ({
  listAgentActivity: (...args: unknown[]) => listAgentActivity(...args),
  listPendingReferrals: (...args: unknown[]) => listPendingReferrals(...args),
}));
vi.mock("@/lib/community/context", () => ({ useCommunity: () => ({ community: SANTIAGO_VERAGUAS }) }));
vi.mock("@/lib/places/context", () => ({ usePlaces: () => ({ activePlace: { kind: "community" } }) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

import AgentPage from "@/app/(app)/agent/page";
import { LanguageProvider } from "@/lib/i18n/context";
import { FIELD } from "@/lib/i18n/field-notes";

const t = FIELD.agent;
const OFFICE = "alcaldia-santiago-oficina";
const minutesAgo = (m: number) => new Date(Date.now() - m * 60_000).toISOString();

function activity(overrides: Partial<AgentActivityPage> = {}): AgentActivityPage {
  return {
    items: [
      { id: "e3", caseNumber: "SV-2026-0001", kind: "referral_approved", contactId: OFFICE, occurredAt: minutesAgo(5), isDemo: true },
      { id: "e2", caseNumber: "SV-2026-0009", kind: "referral_prepared", contactId: OFFICE, occurredAt: minutesAgo(60), isDemo: false },
      { id: "e1", caseNumber: "SV-2026-0009", kind: "ai_reviewed", occurredAt: minutesAgo(61), isDemo: false },
    ],
    total: 3,
    counts: { reviewed: 7, prepared: 4, approved: 2 },
    offices: [{ id: OFFICE, name: "Mayor's office of Santiago", nameEs: "Alcaldía de Santiago" }],
    ...overrides,
  };
}

function renderPage() {
  vi.spyOn(window.navigator, "languages", "get").mockReturnValue(["es-PA"]);
  return render(
    <LanguageProvider>
      <AgentPage />
    </LanguageProvider>,
  );
}

describe("Agente IA page", () => {
  beforeEach(() => {
    listAgentActivity.mockReset();
    listPendingReferrals.mockReset();
    listPendingReferrals.mockResolvedValue(null);
  });

  it("explains the process and shows the steps", () => {
    listAgentActivity.mockReturnValue(new Promise(() => {}));
    renderPage();
    expect(screen.getByText(t.intro.es)).toBeInTheDocument();
    const steps = screen.getByRole("list", { name: "" });
    for (const key of ["report", "reviews", "prepares", "approves", "referred"] as const) {
      expect(within(steps).getByText(t.steps[key].es)).toBeInTheDocument();
    }
    expect(screen.getByRole("status")).toHaveTextContent(t.loading.es);
  });

  it("shows the counts and the feed with the public text, the time, a case link and demo labels", async () => {
    listAgentActivity.mockResolvedValue(activity());
    renderPage();
    expect(await screen.findByText(t.counts.reviewed.es)).toBeInTheDocument();
    expect(screen.getByText("7")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("La IA preparó una remisión a Alcaldía de Santiago")).toBeInTheDocument();
    expect(screen.getByText("Moderación aprobó la remisión a Alcaldía de Santiago")).toBeInTheDocument();
    // Never implies the office acted.
    expect(screen.getByText(t.referredWaiting.es)).toBeInTheDocument();
    expect(screen.getByText(/hace 5 min/)).toBeInTheDocument();
    const links = screen.getAllByRole("link", { name: new RegExp(t.viewCase.es) });
    expect(links.map((l) => l.getAttribute("href"))).toEqual(["/cases/SV-2026-0001", "/cases/SV-2026-0009", "/cases/SV-2026-0009"]);
    // Only the demo item carries the label.
    expect(screen.getAllByText(t.demo.es)).toHaveLength(1);
    expect(within(links[0]).getByText(t.demo.es)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: t.loadMore.es })).not.toBeInTheDocument();
  });

  it("hides the moderator section from everyone the server didn't recognise as a moderator", async () => {
    listAgentActivity.mockResolvedValue(activity());
    renderPage();
    await screen.findByText(t.counts.reviewed.es);
    expect(listPendingReferrals).toHaveBeenCalledWith(SANTIAGO_VERAGUAS.id);
    expect(screen.queryByText(t.pendingTitle.es)).not.toBeInTheDocument();
    expect(document.querySelector('a[href^="/admin"]')).toBeNull();
  });

  it("shows moderators the referrals waiting for approval, linked to /admin", async () => {
    const pending: PendingReferral[] = [{ caseNumber: "SV-2026-0004", contactId: OFFICE, preparedAt: minutesAgo(30), isDemo: true }];
    listPendingReferrals.mockResolvedValue(pending);
    listAgentActivity.mockResolvedValue(activity());
    renderPage();
    const heading = await screen.findByText(t.pendingTitle.es);
    const section = heading.closest("section")!;
    expect(within(section).getByText("Remisión a Alcaldía de Santiago")).toBeInTheDocument();
    expect(within(section).getByRole("link", { name: t.review.es })).toHaveAttribute("href", "/admin/cases/SV-2026-0004");
  });

  it("offers load more when there are older entries", async () => {
    listAgentActivity.mockResolvedValue(activity({ total: 25 }));
    renderPage();
    expect(await screen.findByRole("button", { name: t.loadMore.es })).toBeInTheDocument();
  });

  it("shows a friendly empty state with a link to send a report", async () => {
    listAgentActivity.mockResolvedValue(activity({ items: [], total: 0, counts: { reviewed: 0, prepared: 0, approved: 0 } }));
    renderPage();
    expect(await screen.findByText(t.emptyTitle.es)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: t.emptyCta.es })).toHaveAttribute("href", "/report/new");
  });

  it("shows an error with a reload button when loading fails", async () => {
    listAgentActivity.mockRejectedValue(new Error("Failed to find Server Action"));
    renderPage();
    expect(await screen.findByRole("alert")).toHaveTextContent(t.loadError.es);
    expect(screen.getByRole("button", { name: FIELD.home.reload.es })).toBeInTheDocument();
    expect(screen.queryByText(t.emptyTitle.es)).not.toBeInTheDocument();
  });
});
