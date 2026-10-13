import type { PipelineStage, Proposal } from "./types";
import type { OfficeStatus } from "@/lib/office/types";

/**
 * How the moderator screens describe where a case is and what to do next. Display only: the
 * stored pipeline stages (types.ts) and every rule behind them stay exactly as they are.
 */

export const DISPLAY_STEPS = ["drafted", "routed", "referral_ready", "office", "follow_up"] as const;
export type DisplayStep = (typeof DISPLAY_STEPS)[number];

export const DISPLAY_STEP_LABELS: Record<DisplayStep, string> = {
  drafted: "Drafted",
  routed: "Routed",
  referral_ready: "Referral ready",
  office: "Office",
  follow_up: "Follow-up",
};

/** One plain sentence per step, for the step bar's screen-reader text and the Home counts. */
export const DISPLAY_STEP_HINTS: Record<DisplayStep, string> = {
  drafted: "Reported, no office chosen yet.",
  routed: "An office was chosen.",
  referral_ready: "A message to the office is ready (never sent).",
  office: "The office has the case in its inbox.",
  follow_up: "Checked again because nothing moved for a while.",
};

/**
 * Drafted → Routed → Referral ready → Office → Follow-up. "Referral ready" covers both a draft
 * waiting for approval and an approved message in the outbox; once the (demo) office inbox has
 * the case, it's at "Office".
 */
export function displayStepOf(stage: PipelineStage, hasOfficeReferral: boolean): DisplayStep {
  switch (stage) {
    case "follow_up":
      return "follow_up";
    case "referral_prepared":
      return hasOfficeReferral ? "office" : "referral_ready";
    case "reviewed":
      return "referral_ready";
    case "routed":
      return "routed";
    default:
      return "drafted";
  }
}

/** Where each agent suggestion card lives on the case page (the "Next action" button jumps there). */
export const CARD_IDS = {
  routing: "card-routing",
  referral: "card-referral",
  follow_up: "card-follow-up",
  office_note: "card-office-note",
  office_resolution: "card-office-resolution",
} as const;

export type NextAction =
  | { kind: "jump"; label: string; target: string }
  | { kind: "route"; label: string }
  | { kind: "draft"; label: string }
  | { kind: "wait"; label: string };

export type NextActionInput = {
  pendingKinds: Proposal["kind"][];
  hasOffice: boolean;
  canDraft: boolean;
  officeStatuses: OfficeStatus[];
  closed: boolean;
  isDuplicate: boolean;
};

/**
 * The ONE thing to do next on a case. Decisions an office is waiting on come first, then the
 * agents' suggestions in pipeline order, then the step that moves the case forward.
 */
export function nextActionFor(input: NextActionInput): NextAction {
  const has = (k: Proposal["kind"]) => input.pendingKinds.includes(k);
  if (has("office_resolution")) return { kind: "jump", label: "Confirm the office’s fix", target: CARD_IDS.office_resolution };
  if (has("office_note")) return { kind: "jump", label: "Check the office’s note", target: CARD_IDS.office_note };
  if (has("routing")) return { kind: "jump", label: "Review the routing suggestion", target: CARD_IDS.routing };
  if (has("referral")) return { kind: "jump", label: "Review the message to the office", target: CARD_IDS.referral };
  if (has("follow_up")) return { kind: "jump", label: "Review the follow-up", target: CARD_IDS.follow_up };
  if (input.closed) return { kind: "wait", label: "Nothing to do: this case is closed" };
  if (input.isDuplicate) return { kind: "wait", label: "Nothing to do: merged into another case" };
  if (!input.hasOffice) return { kind: "route", label: "Ask the Routing Agent for an office" };
  if (input.canDraft) return { kind: "draft", label: "Draft the message to the office" };
  if (input.officeStatuses.some((s) => s !== "resolved")) return { kind: "wait", label: "Nothing to do: waiting for the office" };
  return { kind: "wait", label: "Nothing to do right now" };
}
