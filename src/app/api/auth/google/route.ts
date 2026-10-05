import type { NextRequest } from "next/server";
import { startGoogleSignIn } from "@/lib/admin/google-routes";

/** "Sign in with Google" for moderators: sends the browser to Google. */
export function GET(request: NextRequest) {
  return startGoogleSignIn(request);
}
