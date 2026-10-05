import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { SANTIAGO_VERAGUAS } from "@/data/communities";

const searchCases = vi.fn();
vi.mock("@/lib/store/actions", () => ({
  searchCases: (...args: unknown[]) => searchCases(...args),
  getTrendsForActivity: () => Promise.resolve([]),
}));
vi.mock("@/lib/community/context", () => ({ useCommunity: () => ({ community: SANTIAGO_VERAGUAS }) }));
vi.mock("@/lib/places/context", () => ({ usePlaces: () => ({ activePlace: { kind: "community" } }) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

import ExplorePage from "@/app/(app)/activity/page";
import { LanguageProvider } from "@/lib/i18n/context";
import { FIELD } from "@/lib/i18n/field-notes";
import { UI_STRINGS } from "@/lib/i18n/dictionary";

function renderExplore() {
  vi.spyOn(window.navigator, "languages", "get").mockReturnValue(["es-PA"]);
  return render(
    <LanguageProvider>
      <ExplorePage />
    </LanguageProvider>,
  );
}

const zeroCount = new RegExp(FIELD.explore.results.es.replace("{count}", "0"));

describe("Explore case count", () => {
  beforeEach(() => {
    searchCases.mockReset();
  });

  it("shows loading instead of a zero count before results arrive", () => {
    searchCases.mockReturnValue(new Promise(() => {}));
    renderExplore();
    expect(screen.queryByText(zeroCount)).not.toBeInTheDocument();
    expect(screen.getAllByText(UI_STRINGS.activity.loading.es).length).toBeGreaterThan(0);
  });

  it("shows an error with a reload button when the search fails", async () => {
    searchCases.mockRejectedValue(new Error("Failed to find Server Action"));
    renderExplore();
    expect(await screen.findByRole("alert")).toHaveTextContent(FIELD.home.loadError.es);
    expect(screen.getByRole("button", { name: FIELD.home.reload.es })).toBeInTheDocument();
    expect(screen.queryByText(zeroCount)).not.toBeInTheDocument();
  });
});
