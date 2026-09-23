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
  // Proposals use the fresh turquoise of the landscape palette (globals.css); the dark set is
  // brighter so markers stay visible against the night-time ground.
  light: { teal: "#1f8f84", yellow: "#f2b92a", slate: "#56665f" },
  dark: { teal: "#45c9bb", yellow: "#f0c75a", slate: "#9db0a8" },
} as const;

const UNDER_REVIEW_STATUSES: Case["status"][] = ["received", "under_review", "in_discussion"];

export function markerColorForCase(c: Pick<Case, "type" | "status">, theme: Theme = "light"): string {
  const colors = PULSE_COLORS[theme];
  if (c.type === "proposal") return colors.teal;
  if (UNDER_REVIEW_STATUSES.includes(c.status)) return colors.yellow;
  return colors.slate;
}
