"use server";

import { cookies } from "next/headers";
import { ADMIN_COOKIE_NAME, MODERATOR_SESSION_COOKIE, signAdminToken, verifyAccessCode } from "./auth";
import { getModeratorRepository } from "@/lib/moderators/moderator-store";
import { hashSessionToken } from "@/lib/moderators/logic";

export async function loginAdmin(code: string): Promise<boolean> {
  if (!verifyAccessCode(code)) return false;
  const token = signAdminToken();
  if (!token) return false;
  const store = await cookies();
  store.set(ADMIN_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
  return true;
}

/** Ends this browser's sign-in: the Google session is deleted on the server too, not just forgotten here. */
export async function logoutAdmin(): Promise<void> {
  const store = await cookies();
  const sessionToken = store.get(MODERATOR_SESSION_COOKIE)?.value;
  if (sessionToken) await getModeratorRepository().deleteSession(hashSessionToken(sessionToken));
  store.delete(MODERATOR_SESSION_COOKIE);
  store.delete(ADMIN_COOKIE_NAME);
}
