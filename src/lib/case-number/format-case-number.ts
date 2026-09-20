/**
 * Public case numbers are the only identifier a resident gets back (spec: anonymous by
 * default, no account/login) — format: <COMMUNITY PREFIX>-<YEAR>-<0001>, sequence scoped per
 * community per year so two communities (or two years) never collide or reveal total volume
 * across the whole platform.
 */
export function formatCaseNumber(communityId: string, year: number, sequence: number): string {
  const prefix = communityId
    .split("-")
    .filter(Boolean)
    .map((segment) => segment[0]?.toUpperCase() ?? "")
    .join("");
  const paddedSequence = String(sequence).padStart(4, "0");
  return `${prefix}-${year}-${paddedSequence}`;
}
