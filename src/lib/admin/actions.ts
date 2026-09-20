"use server";

import { cookies } from "next/headers";
import { ADMIN_COOKIE_NAME, signAdminToken, verifyAccessCode } from "./auth";

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

export async function logoutAdmin(): Promise<void> {
  const store = await cookies();
  store.delete(ADMIN_COOKIE_NAME);
}
