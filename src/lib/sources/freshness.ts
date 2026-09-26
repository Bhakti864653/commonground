/**
 * How fresh a community contact or approved source is. Following the NHS service manual's
 * "Know that a page is up to date" pattern (found during the 2026-09-25 source-verification
 * pass, see docs/MCP_RESEARCH_AUDIT.md), every checked entry shows both when it was last checked
 * and when its next review is due.
 *
 * - `current`: verified, with a real check date no more than REVIEW_AFTER_DAYS ago.
 * - `review_due`: verified once, but the check is older than that — it may have changed.
 * - `unverified`: never verified, or its check date is missing, invalid, or in the future.
 *   An entry that can't prove when it was checked is never presented as verified.
 */
export type Freshness = "current" | "review_due" | "unverified";

/** Phone numbers and official pages change; half a year between checks. */
export const REVIEW_AFTER_DAYS = 180;

const DAY_MS = 24 * 60 * 60 * 1000;

export type Checkable = { verified: boolean; lastVerifiedAt?: string };

export type FreshnessResult = {
  state: Freshness;
  /** The check date as a Date at noon UTC (a calendar day, safe from timezone shifts). */
  checkedOn?: Date;
  nextReviewDue?: Date;
};

/** A calendar date (YYYY-MM-DD) or a full ISO timestamp; anything else is not a date. */
export function parseCheckDate(value: string | undefined): Date | undefined {
  if (!value) return undefined;
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00Z` : value;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return undefined;
  // Reject impossible calendar dates like 2026-02-31 (Date would silently roll them over).
  if (/^\d{4}-\d{2}-\d{2}$/.test(value) && date.toISOString().slice(0, 10) !== value) return undefined;
  return date;
}

export function sourceFreshness(entry: Checkable, now: Date = new Date()): FreshnessResult {
  if (!entry.verified) return { state: "unverified" };
  const checkedOn = parseCheckDate(entry.lastVerifiedAt);
  // A check "in the future" is a data error, not a fresh check.
  if (!checkedOn || checkedOn.getTime() > now.getTime() + DAY_MS) return { state: "unverified" };
  const nextReviewDue = new Date(checkedOn.getTime() + REVIEW_AFTER_DAYS * DAY_MS);
  return { state: now.getTime() > nextReviewDue.getTime() ? "review_due" : "current", checkedOn, nextReviewDue };
}

const PRIORITY: Record<Freshness, number> = { review_due: 0, unverified: 1, current: 2 };

/**
 * Review queue order: review-due first (they were trusted and may now be wrong), then
 * unverified, then current. Within a group, the oldest check comes first.
 */
export function sortForReview<T extends Checkable>(entries: T[], now: Date = new Date()): T[] {
  return entries
    .map((entry) => ({ entry, f: sourceFreshness(entry, now) }))
    .sort((a, b) => {
      const byState = PRIORITY[a.f.state] - PRIORITY[b.f.state];
      if (byState !== 0) return byState;
      return (a.f.checkedOn?.getTime() ?? 0) - (b.f.checkedOn?.getTime() ?? 0);
    })
    .map(({ entry }) => entry);
}

/** Only a verified, dated, not-overdue entry may be labelled an official source. */
export function canShowAsOfficial(entry: Checkable & { trustLevel?: string }, now: Date = new Date()): boolean {
  return entry.trustLevel === "official_verified" && sourceFreshness(entry, now).state === "current";
}
