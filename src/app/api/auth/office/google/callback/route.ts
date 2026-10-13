import type { NextRequest } from "next/server";
import { finishOfficeGoogleSignIn } from "@/lib/office/google-routes";

/** Where Google sends an office account back. Refuses while the office portal is off. */
export function GET(request: NextRequest) {
  return finishOfficeGoogleSignIn(request);
}
