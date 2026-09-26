import { describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { FreshnessBadge } from "@/components/sources/FreshnessBadge";
import { INFO } from "@/lib/i18n/community-info";
import { LANGUAGE_CODES } from "@/lib/i18n/languages";
import type { Freshness } from "@/lib/sources/freshness";

const STATES: Freshness[] = ["current", "review_due", "unverified"];

describe("FreshnessBadge", () => {
  it("pairs an icon with visible text and an accessible explanation for every state and language", () => {
    for (const lang of LANGUAGE_CODES) {
      for (const state of STATES) {
        const { container } = render(<FreshnessBadge state={state} language={lang} />);
        const badge = container.querySelector(`[data-freshness="${state}"]`)!;
        const t = INFO.resources.freshness[state];
        // Visible label and the explanation are both in the accessible text — never color alone.
        expect(badge.textContent).toContain(t.label[lang]);
        expect(badge.textContent).toContain(t.explain[lang]);
        expect(badge.getAttribute("title")).toBe(t.explain[lang]);
        // The icon is decorative; the words carry the meaning.
        const svg = badge.querySelector("svg");
        expect(svg?.getAttribute("aria-hidden")).toBe("true");
        cleanup();
      }
    }
  });

  it("uses distinct labels, so states are distinguishable without color", () => {
    const labels = STATES.map((s) => INFO.resources.freshness[s].label.en);
    expect(new Set(labels).size).toBe(3);
  });
});
