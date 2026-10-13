import type { NextRequest } from "next/server";
import { startOfficeGoogleSignIn } from "@/lib/office/google-routes";

/** "Sign in with Google" for invited office accounts. Refuses while the office portal is off. */
export function GET(request: NextRequest) {
  return startOfficeGoogleSignIn(request);
}
