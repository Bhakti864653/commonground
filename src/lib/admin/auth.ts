import { cookies } from "next/headers";
import crypto from "crypto";
import { getModeratorRepository } from "@/lib/moderators/moderator-store";
import { hashSessionToken, normalizeEmail, type ModeratorRole } from "@/lib/moderators/logic";

/**
 * This prototype has no accounts at all (PRD non-goals), so there's no real session to check
 * against — the closest honest equivalent to Concord's ADMIN_EMAIL gate for a single-operator
 * app (MODERATION.md "Access") is a shared passphrase. The cookie never stores the passphrase
 * itself: it's an HMAC computed *from* it, so a leaked cookie value alone can't be reversed
 * back into the real code, and a forged cookie can't be produced without knowing it.
 */
export const ADMIN_COOKIE_NAME = "cg_admin";
const SESSION_MESSAGE = "commonground-admin-session";

/**
 * Trimmed on read — a value pasted from a chat code block or a dashboard field very easily
 * picks up a trailing newline/space, which would otherwise silently fail every comparison
 * here (exact-length check, before timingSafeEqual even runs). Same root cause as the
 * ANTHROPIC_API_KEY trailing-newline incident documented in Concord's own DEVLOG.
 */
function getAccessCode(): string | undefined {
  return process.env.ADMIN_ACCESS_CODE?.trim();
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
  return timingSafeEqualStrings(candidate.trim(), code);
}

/** The moderator's own sign-in (Google): a random token whose hash is in moderator_sessions. */
export const MODERATOR_SESSION_COOKIE = "cg_session";

/**
 * Who is using /admin. A moderator signed in with Google has their email; the shared access
 * code (kept only until Google sign-in replaces it) has none and acts as the owner, so the
 * operator can never be locked out while switching over.
 */
export type CurrentModerator = { email: string | null; name: string; role: ModeratorRole; via: "google" | "access_code" };

/** OWNER_EMAIL: the one person who can add and remove moderators (made owner when they sign in). */
export function ownerEmail(): string | undefined {
  const value = process.env.OWNER_EMAIL?.trim();
  return value ? normalizeEmail(value) : undefined;
}

async function accessCodeSignedIn(): Promise<boolean> {
  const token = signAdminToken();
  if (!token) return false;
  const cookieValue = (await cookies()).get(ADMIN_COOKIE_NAME)?.value;
  return Boolean(cookieValue) && timingSafeEqualStrings(cookieValue!, token);
}

export async function getCurrentModerator(): Promise<CurrentModerator | null> {
  const sessionToken = (await cookies()).get(MODERATOR_SESSION_COOKIE)?.value;
  if (sessionToken) {
    const moderator = await getModeratorRepository().getSessionModerator(hashSessionToken(sessionToken));
    if (moderator) {
      return { email: moderator.email, name: moderator.name, role: moderator.role, via: "google" };
    }
  }
  if (await accessCodeSignedIn()) return { email: null, name: "", role: "owner", via: "access_code" };
  return null;
}

export async function isAdminAuthenticated(): Promise<boolean> {
  return (await getCurrentModerator()) !== null;
}

/** Defense in depth: every admin-mutating server action calls this too, not just the layout. */
export async function requireAdmin(): Promise<CurrentModerator> {
  const moderator = await getCurrentModerator();
  if (!moderator) throw new Error("Admin authentication required");
  return moderator;
}

/** Adding and removing moderators: the owner only. */
export async function requireOwner(): Promise<CurrentModerator> {
  const moderator = await requireAdmin();
  if (moderator.role !== "owner") throw new Error("Owner access required");
  return moderator;
}
