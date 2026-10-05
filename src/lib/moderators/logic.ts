import crypto from "crypto";
import { z } from "zod";

/**
 * Moderator accounts (MODERATION.md "Access"): people who sign in to /admin with Google. The
 * owner (OWNER_EMAIL) adds and removes everyone else. Residents never have accounts.
 */
export type ModeratorRole = "owner" | "moderator";

export type Moderator = {
  email: string;
  name: string;
  role: ModeratorRole;
  addedAt: string;
  addedBy: string;
};

export const normalizeEmail = (email: string) => email.trim().toLowerCase();

export const NewModeratorInputSchema = z.object({
  email: z.email().max(254).transform(normalizeEmail),
  name: z.string().trim().max(80).default(""),
});

export type AddModeratorResult = { ok: true; moderator: Moderator } | { ok: false; error: "invalid" | "exists" };
export type RemoveModeratorResult = { ok: true } | { ok: false; error: "not_found" | "owner" };

/** How long a sign-in lasts before Google is asked again. */
export const SESSION_DAYS = 7;

/** A new random session token (goes in the cookie) — only its hash is ever stored. */
export function newSessionToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}

export function hashSessionToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function sessionExpiry(now: Date): Date {
  return new Date(now.getTime() + SESSION_DAYS * 24 * 60 * 60 * 1000);
}
