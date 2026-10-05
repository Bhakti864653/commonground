import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { SANTIAGO_VERAGUAS } from "@/data/communities";

const listCasesForActivity = vi.fn();
vi.mock("@/lib/store/actions", () => ({ listCasesForActivity: (id: string) => listCasesForActivity(id) }));
vi.mock("@/lib/community/context", () => ({ useCommunity: () => ({ community: SANTIAGO_VERAGUAS }) }));
vi.mock("@/lib/places/context", () => ({ usePlaces: () => ({ activePlace: { kind: "community" } }) }));
// The street map needs WebGL; it isn't what's under test here.
vi.mock("@/components/map/CommunityMap", () => ({ CommunityMap: () => null }));

import Home from "@/app/(app)/home/page";
import { LanguageProvider } from "@/lib/i18n/context";
import { FIELD } from "@/lib/i18n/field-notes";
import { UI_STRINGS } from "@/lib/i18n/dictionary";
import type { PublicCase } from "@/lib/schema/report";

function renderHome() {
  vi.spyOn(window.navigator, "languages", "get").mockReturnValue(["es-PA"]);
  return render(
    <LanguageProvider>
      <Home />
    </LanguageProvider>,
  );
}

const oneCase: PublicCase = {
  id: "1",
  type: "report",
  publicCaseNumber: "SV-2026-0001",
  communityId: SANTIAGO_VERAGUAS.id,
  categoryId: "flooding-drainage",
  description: "Alcantarilla tapada.",
  approximateArea: { kind: "neighborhood", areaId: "centro", label: "Central area", labelEs: "Área central" },
  createdAt: "2026-10-01T10:00:00Z",
  status: "received",
  statusHistory: [{ id: "a", status: "received", occurredAt: "2026-10-01T10:00:00Z", actorType: "system" }],
  sourceType: "community",
  verificationState: "community_report",
  consent: { consentVersion: "v1", consentedAt: "2026-10-01T10:00:00Z", language: "es" },
};

describe("home case count", () => {
  beforeEach(() => {
    listCasesForActivity.mockReset();
  });

  it("says it's loading — not '0 casos' — before the cases arrive", () => {
    listCasesForActivity.mockReturnValue(new Promise(() => {}));
    renderHome();
    expect(screen.queryByText(/0 casos/)).not.toBeInTheDocument();
    expect(screen.getAllByText(UI_STRINGS.activity.loading.es).length).toBeGreaterThan(0);
  });

  it("shows the real count once loaded", async () => {
    listCasesForActivity.mockResolvedValue([oneCase]);
    renderHome();
    expect(await screen.findByText(/1 casos/)).toBeInTheDocument();
    expect(screen.queryByText(UI_STRINGS.activity.loading.es)).not.toBeInTheDocument();
  });

  it("shows an error with a reload button instead of '0 casos' when loading fails", async () => {
    listCasesForActivity.mockRejectedValue(new Error("Failed to find Server Action"));
    renderHome();
    expect(await screen.findByRole("alert")).toHaveTextContent(FIELD.home.loadError.es);
    expect(screen.getByRole("button", { name: FIELD.home.reload.es })).toBeInTheDocument();
    expect(screen.queryByText(/0 casos/)).not.toBeInTheDocument();
  });
});

describe("map case-count badge", () => {
  it("says it's loading instead of '00 casos' until cases arrive", async () => {
    const { CommunityMap } = await vi.importActual<typeof import("@/components/map/CommunityMap")>("@/components/map/CommunityMap");
    const illustrated = { ...SANTIAGO_VERAGUAS, map: undefined };
    const { rerender } = render(
      <CommunityMap community={illustrated} cases={[]} loading selectedId={null} onSelect={() => {}} language="es" />,
    );
    expect(screen.queryByText(/00 casos/)).not.toBeInTheDocument();
    expect(screen.getByText(UI_STRINGS.activity.loading.es)).toBeInTheDocument();
    rerender(<CommunityMap community={illustrated} cases={[oneCase]} selectedId={null} onSelect={() => {}} language="es" />);
    expect(screen.queryByText(UI_STRINGS.activity.loading.es)).not.toBeInTheDocument();
  });
});
