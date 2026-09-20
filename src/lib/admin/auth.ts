import { cookies } from "next/headers";
import crypto from "crypto";

/**
 * This prototype has no accounts at all (PRD non-goals), so there's no real session to check
 * against — the closest honest equivalent to Concord's ADMIN_EMAIL gate for a single-operator
 * app (MODERATION.md "Access") is a shared passphrase. The cookie never stores the passphrase
 * itself: it's an HMAC computed *from* it, so a leaked cookie value alone can't be reversed
 * back into the real code, and a forged cookie can't be produced without knowing it.
 */
export const ADMIN_COOKIE_NAME = "cg_admin";
const SESSION_MESSAGE = "commonground-admin-session";

function getAccessCode(): string | undefined {
  return process.env.ADMIN_ACCESS_CODE;
}

export function signAdminToken(): string | null {
  const code = getAccessCode();
  if (!code) return null;
  return crypto.createHmac("sha256", code).update(SESSION_MESSAGE).digest("hex");
}

function timingSafeEqualStrings(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export function verifyAccessCode(candidate: string): boolean {
  const code = getAccessCode();
  if (!code) return false;
  return timingSafeEqualStrings(candidate, code);
}

export async function isAdminAuthenticated(): Promise<boolean> {
  const token = signAdminToken();
  if (!token) return false;
  const store = await cookies();
  const cookieValue = store.get(ADMIN_COOKIE_NAME)?.value;
  if (!cookieValue) return false;
  return timingSafeEqualStrings(cookieValue, token);
}

/** Defense in depth: every admin-mutating server action calls this too, not just the layout. */
export async function requireAdmin(): Promise<void> {
  if (!(await isAdminAuthenticated())) {
    throw new Error("Admin authentication required");
  }
}
