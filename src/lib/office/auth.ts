import "server-only";
import { cookies } from "next/headers";
import { getReferralOffice } from "@/data/referral-offices";
import { hashSessionToken } from "@/lib/moderators/logic";
import { getOfficeRepository } from "./store";
import type { OfficeActor } from "./types";

/**
 * The real office portal is OFF unless OFFICE_PORTAL_ENABLED is exactly "true". While off, no
 * office can sign in or act — every entry point checks this on the server, not just the UI.
 * See docs/GO_LIVE_CHECKLIST.md for what must happen before it is ever turned on.
 */
export function isOfficePortalEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return env.OFFICE_PORTAL_ENABLED === "true";
}

export const OFFICE_SESSION_COOKIE = "cg_office_session";

export type CurrentOffice = { email: string; name: string; officeId: string };

/** The signed-in office account, or null (always null while the portal is off). */
export async function getCurrentOffice(): Promise<CurrentOffice | null> {
  if (!isOfficePortalEnabled()) return null;
  const token = (await cookies()).get(OFFICE_SESSION_COOKIE)?.value;
  if (!token) return null;
  const account = await getOfficeRepository().getSessionAccount(hashSessionToken(token));
  if (!account || !getReferralOffice(account.officeId)) return null;
  return { email: account.email, name: account.name, officeId: account.officeId };
}

/** Every real-office server action calls this first. */
export async function requireOffice(): Promise<OfficeActor> {
  if (!isOfficePortalEnabled()) throw new Error("The office portal is not enabled");
  const office = await getCurrentOffice();
  if (!office) throw new Error("Office sign-in required");
  return { officeId: office.officeId, actor: office.email, demo: false };
}
