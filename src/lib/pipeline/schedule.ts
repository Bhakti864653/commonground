import type { Priority } from "./types";

/**
 * How many days a case may go without progress before the Follow-up Agent flags it. One place
 * to change the rules.
 */
export const FOLLOW_UP_AFTER_DAYS: Record<Priority, number> = {
  urgent: 2,
  high: 4,
  medium: 7,
  low: 14,
};

/** The most cases one follow-up run drafts for, so a run stays inside Groq's free limits. */
export const MAX_FOLLOW_UPS_PER_RUN = 6;

const DAY_MS = 24 * 60 * 60 * 1000;

export function daysBetween(fromIso: string, now: Date): number {
  return Math.floor((now.getTime() - Date.parse(fromIso)) / DAY_MS);
}

export type FollowUpCandidate = {
  caseNumber: string;
  priority: Priority;
  /** When something last happened on the case. */
  lastProgressAt: string;
  status: string;
  isDuplicate: boolean;
  removed: boolean;
  /** A follow-up suggestion is already waiting for a moderator. */
  hasPendingFollowUp: boolean;
  /** The office's own status on its latest referral, if any. */
  officeStatus?: "new" | "received" | "in_progress" | "resolved" | "not_our_department";
};

/**
 * An office that reported the problem resolved (waiting for a moderator to confirm), or said
 * it's not its department (waiting for re-routing), isn't chased. "Received" or "In progress"
 * that stall are, like any other case.
 */
const OFFICE_DONE = new Set(["resolved", "not_our_department"]);

const FINISHED_STATUSES = new Set(["closed", "not_verifiable"]);

export type OverdueCase = FollowUpCandidate & { daysWithoutProgress: number; thresholdDays: number };

/** The cases that are overdue for a follow-up, longest-waiting (relative to their limit) first. */
export function findOverdueCases(candidates: FollowUpCandidate[], now: Date): OverdueCase[] {
  return candidates
    .filter((c) => !FINISHED_STATUSES.has(c.status) && !c.isDuplicate && !c.removed && !c.hasPendingFollowUp && !OFFICE_DONE.has(c.officeStatus ?? ""))
    .map((c) => ({
      ...c,
      daysWithoutProgress: daysBetween(c.lastProgressAt, now),
      thresholdDays: FOLLOW_UP_AFTER_DAYS[c.priority],
    }))
    .filter((c) => c.daysWithoutProgress >= c.thresholdDays)
    .sort((a, b) => b.daysWithoutProgress / b.thresholdDays - a.daysWithoutProgress / a.thresholdDays);
}

const ESCALATION: Record<Priority, Priority> = { low: "medium", medium: "high", high: "urgent", urgent: "urgent" };

/** The next priority up; a case waiting twice its limit is a candidate for escalation. */
export function suggestEscalation(priority: Priority, daysWithoutProgress: number): Priority | null {
  if (priority === "urgent") return null;
  return daysWithoutProgress >= FOLLOW_UP_AFTER_DAYS[priority] * 2 ? ESCALATION[priority] : null;
}

/** Monday 00:00 UTC of the week `now` falls in, as YYYY-MM-DD. */
export function weekStartOf(now: Date): string {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const day = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - day);
  return d.toISOString().slice(0, 10);
}
