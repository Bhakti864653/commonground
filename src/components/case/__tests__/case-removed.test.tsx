import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { CaseRemoved } from "@/components/case/CaseRemoved";
import { LanguageProvider } from "@/lib/i18n/context";
import { INFO } from "@/lib/i18n/community-info";
import { REMOVAL_REASON_LABELS } from "@/lib/schema/report";

describe("removed case notice", () => {
  it("shows the case number and the public reason, with a way back to activity", () => {
    // A Spanish-speaking browser, like the pilot's residents (jsdom defaults to English).
    vi.spyOn(window.navigator, "languages", "get").mockReturnValue(["es-PA"]);
    render(
      <LanguageProvider>
        <CaseRemoved caseNumber="SV-2026-0009" removal={{ reason: "personal_information", removedAt: "2026-09-25T12:00:00Z" }} />
      </LanguageProvider>,
    );
    expect(screen.getByRole("heading", { level: 1, name: INFO.removed.heading.es })).toBeInTheDocument();
    expect(screen.getByText("SV-2026-0009")).toBeInTheDocument();
    expect(screen.getByText(new RegExp(REMOVAL_REASON_LABELS.personal_information.es))).toBeInTheDocument();
    expect(screen.getByRole("link", { name: INFO.removed.explore.es })).toHaveAttribute("href", "/activity");
  });
});
