import { FALLBACK_OFFICE_ID, REFERRAL_OFFICES, type ReferralOffice } from "@/data/referral-offices";
import type { Priority } from "./types";

/**
 * The rule-based half of routing. It ranks the configured offices for a case (the Routing Agent
 * sees this ranking as a hint), decides when a moderator must choose, and is the whole answer
 * when the AI is unavailable.
 */

function normalize(text: string): string {
  return text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function wordsOf(text: string): Set<string> {
  return new Set(normalize(text).split(/[^\p{L}\p{N}-]+/u).filter(Boolean));
}

export type OfficeScore = { officeId: string; score: number; matched: string[] };

/** Category match counts 2, each distinct keyword 1. Sorted best first; zero scores dropped. */
export function scoreOffices(
  description: string,
  categoryId: string,
  offices: ReferralOffice[] = REFERRAL_OFFICES,
): OfficeScore[] {
  const words = wordsOf(description);
  const flat = normalize(description);
  return offices
    .map((office) => {
      const matched = office.keywords.filter((k) =>
        // Scripts without spaces (Chinese) and Hindi phrases are matched as substrings.
        /[一-鿿ऀ-ॿ]/.test(k) ? flat.includes(k) : words.has(k),
      );
      const score = (office.categoryIds.includes(categoryId) ? 2 : 0) + matched.length;
      return { officeId: office.id, score, matched };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);
}

/** Below this, a moderator decides. */
export const MIN_CONFIDENCE = 0.6;

/** Offices within one point of the best one also "fit". */
export function closeAlternatives(scores: OfficeScore[], chosenId: string): string[] {
  const best = scores[0]?.score ?? 0;
  return scores.filter((s) => s.officeId !== chosenId && s.officeId !== FALLBACK_OFFICE_ID && best - s.score <= 1).map((s) => s.officeId).slice(0, 3);
}

export function needsModeratorDecision(confidence: number, alternativeOfficeIds: string[]): boolean {
  return confidence < MIN_CONFIDENCE || alternativeOfficeIds.length > 0;
}

/** The fallback route when the AI can't run: the top-scoring office, with a confidence from the margin. */
export function ruleBasedRoute(description: string, categoryId: string, offices: ReferralOffice[] = REFERRAL_OFFICES): {
  officeId: string;
  confidence: number;
  alternatives: string[];
  matched: string[];
} {
  const scores = scoreOffices(description, categoryId, offices);
  const top = scores[0];
  // Nothing matches: general services, or (if that office is excluded) the first one left.
  const fallback = offices.some((o) => o.id === FALLBACK_OFFICE_ID) ? FALLBACK_OFFICE_ID : (offices[0]?.id ?? FALLBACK_OFFICE_ID);
  if (!top) return { officeId: fallback, confidence: 0.3, alternatives: [], matched: [] };
  const margin = top.score - (scores[1]?.score ?? 0);
  const confidence = Math.min(0.9, 0.4 + 0.15 * margin + 0.05 * top.matched.length);
  return {
    officeId: top.officeId,
    confidence: Math.round(confidence * 100) / 100,
    alternatives: closeAlternatives(scores, top.officeId),
    matched: top.matched,
  };
}

// Words that suggest a real risk to people right now (on top of the emergency-phrase list).
const HIGH_RISK = [
  "accidente", "accident", "herido", "injured", "peligro", "danger", "dangerous", "peligroso",
  "ninos", "children", "escuela", "school", "noche", "night", "oscuro", "dark", "riesgo", "risk",
];
const LONG_RUNNING = ["semanas", "weeks", "meses", "months", "siempre", "always", "recurrente", "recurring", "cada vez", "every time", "otra vez", "again", "veces", "times"];

/** A rule-based priority with its reason, for the fallback and as a floor for the AI's choice. */
export function ruleBasedPriority(description: string, emergency: boolean, isProposal: boolean): { priority: Priority; reason: string } {
  if (emergency) return { priority: "urgent", reason: "The description matches an emergency phrase (people may be at risk)." };
  if (isProposal) return { priority: "low", reason: "It's a proposal for an improvement, not a current problem." };
  const flat = normalize(description);
  const risk = HIGH_RISK.filter((w) => flat.includes(w));
  if (risk.length) return { priority: "high", reason: `The description mentions a possible risk to people (${risk.slice(0, 3).join(", ")}).` };
  const long = LONG_RUNNING.filter((w) => flat.includes(w));
  if (long.length) return { priority: "medium", reason: `The problem has lasted a while or keeps coming back (${long.slice(0, 3).join(", ")}).` };
  return { priority: "low", reason: "No sign of immediate risk or a long-running problem in the description." };
}
