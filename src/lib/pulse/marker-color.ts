import type { Case } from "@/lib/schema/report";
import type { Theme } from "@/lib/theme/theme";

/**
 * 3D_EXPERIENCE.md's exact palette: "teal for constructive proposals, yellow for under-review
 * items, coral reserved only for verified urgent warnings." There's no "urgent" concept
 * anywhere in the schema yet (no case has ever needed it), so coral is deliberately never
 * assigned here — inventing an urgency heuristic the data doesn't back would be exactly the
 * kind of alarming, unjustified signal this view is required to avoid. Everything the doc
 * doesn't name a color for (closed/referred/in_progress/not_verifiable/updated) falls back to
 * a neutral tone rather than a guessed one.
 */
const PULSE_COLORS = {
  light: { teal: "#167d78", yellow: "#f4c95d", slate: "#65727d" },
  // Same meanings, the dark theme's token values (globals.css) — the light teal/slate nearly
  // disappear against the dark ground.
  dark: { teal: "#4db6ac", yellow: "#e0b54a", slate: "#9aa8b3" },
} as const;

const UNDER_REVIEW_STATUSES: Case["status"][] = ["received", "under_review", "in_discussion"];

export function markerColorForCase(c: Pick<Case, "type" | "status">, theme: Theme = "light"): string {
  const colors = PULSE_COLORS[theme];
  if (c.type === "proposal") return colors.teal;
  if (UNDER_REVIEW_STATUSES.includes(c.status)) return colors.yellow;
  return colors.slate;
}
