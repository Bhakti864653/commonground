/**
 * The case-number prefix for a community: the first character of each hyphenated segment of
 * its id ("santiago-veraguas" → "SV"). Exported so community creation can guarantee no two
 * communities ever share a prefix (case pages look cases up by number across communities).
 */
export function casePrefix(communityId: string): string {
  return communityId
    .split("-")
    .filter(Boolean)
    .map((segment) => segment[0]?.toUpperCase() ?? "")
    .join("");
}

/**
 * Public case numbers are the only identifier a resident gets back (spec: anonymous by
 * default, no account/login) — format: <COMMUNITY PREFIX>-<YEAR>-<0001>, sequence scoped per
 * community per year so two communities (or two years) never collide or reveal total volume
 * across the whole platform.
 */
export function formatCaseNumber(communityId: string, year: number, sequence: number): string {
  const paddedSequence = String(sequence).padStart(4, "0");
  return `${casePrefix(communityId)}-${year}-${paddedSequence}`;
}
