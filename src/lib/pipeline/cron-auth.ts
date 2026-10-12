import { timingSafeEqual } from "node:crypto";

/**
 * Vercel's cron sends "Authorization: Bearer <CRON_SECRET>". Constant-time comparison; with no
 * secret configured, nothing is ever authorized.
 */
export function isAuthorizedCron(header: string | null, secret: string | undefined): boolean {
  if (!secret || !header) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const given = Buffer.from(header);
  return given.length === expected.length && timingSafeEqual(given, expected);
}
