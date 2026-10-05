/**
 * The public address of the site, for links that leave the app (a referral's case link).
 * `PUBLIC_SITE_URL` overrides it; on Vercel, `VERCEL_PROJECT_PRODUCTION_URL` is set
 * automatically; otherwise the production address. Server-only, so no NEXT_PUBLIC_ prefix.
 */
export function publicSiteUrl(): string {
  const explicit = process.env.PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, "");
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercel) return `https://${vercel}`;
  return "https://commonground-psi.vercel.app";
}

/** The public page for a case — the only link a referral message may contain. */
export function publicCaseUrl(caseNumber: string): string {
  return `${publicSiteUrl()}/cases/${encodeURIComponent(caseNumber)}`;
}
