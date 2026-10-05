import type { NextRequest } from "next/server";
import { finishGoogleSignIn } from "@/lib/admin/google-routes";

/** Where Google sends a moderator back after they choose their account. */
export function GET(request: NextRequest) {
  return finishGoogleSignIn(request);
}
