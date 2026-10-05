import { NextResponse, type NextRequest } from "next/server";
import { buildGoogleAuthUrl, exchangeGoogleCode, googleConfig, newLoginAttempt, type GoogleLoginAttempt } from "./google";
import { MODERATOR_SESSION_COOKIE, ownerEmail } from "./auth";
import { getModeratorRepository } from "@/lib/moderators/moderator-store";
import { SESSION_DAYS, hashSessionToken, newSessionToken, sessionExpiry } from "@/lib/moderators/logic";

/**
 * The two halves of "Sign in with Google" (routes under /api/auth/google). Kept here, not in
 * the route files, so tests can call them with a request and a fake Google.
 */

const ATTEMPT_COOKIE = "cg_google";
const CALLBACK_PATH = "/api/auth/google/callback";

/** Why a sign-in didn't work — shown on the admin sign-in page. */
export type LoginProblem = "unavailable" | "cancelled" | "failed" | "not_moderator";

const secure = () => process.env.NODE_ENV === "production";
const redirectUri = (request: NextRequest) => `${request.nextUrl.origin}${CALLBACK_PATH}`;

function backToAdmin(request: NextRequest, problem?: LoginProblem): NextResponse {
  const url = new URL("/admin", request.nextUrl.origin);
  if (problem) url.searchParams.set("login", problem);
  const response = NextResponse.redirect(url);
  response.cookies.delete({ name: ATTEMPT_COOKIE, path: "/api/auth/google" });
  return response;
}

/** Step 1: send the moderator to Google, remembering (in a 10-minute httpOnly cookie) what to expect back. */
export function startGoogleSignIn(request: NextRequest): NextResponse {
  const config = googleConfig();
  if (!config) return backToAdmin(request, "unavailable");
  const attempt = newLoginAttempt();
  const response = NextResponse.redirect(buildGoogleAuthUrl(config, redirectUri(request), attempt));
  response.cookies.set(ATTEMPT_COOKIE, Buffer.from(JSON.stringify(attempt)).toString("base64url"), {
    httpOnly: true,
    sameSite: "lax",
    secure: secure(),
    path: "/api/auth/google",
    maxAge: 10 * 60,
  });
  return response;
}

function readAttempt(request: NextRequest): GoogleLoginAttempt | null {
  const raw = request.cookies.get(ATTEMPT_COOKIE)?.value;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(Buffer.from(raw, "base64url").toString("utf8"));
    return typeof parsed?.state === "string" && typeof parsed?.nonce === "string" && typeof parsed?.verifier === "string"
      ? parsed
      : null;
  } catch {
    return null;
  }
}

/**
 * Step 2: Google sends the moderator back with a one-time code. Checks it's the same sign-in
 * that started here, asks Google who it is, and lets them in only if they're the owner
 * (OWNER_EMAIL) or on the moderator list. Then starts a 7-day session.
 */
export async function finishGoogleSignIn(
  request: NextRequest,
  now: Date = new Date(),
  fetchImpl: typeof fetch = fetch,
): Promise<NextResponse> {
  const config = googleConfig();
  if (!config) return backToAdmin(request, "unavailable");
  const params = request.nextUrl.searchParams;
  if (params.get("error")) return backToAdmin(request, "cancelled");
  const attempt = readAttempt(request);
  const code = params.get("code");
  if (!attempt || !code || params.get("state") !== attempt.state) return backToAdmin(request, "failed");

  const identity = await exchangeGoogleCode(config, code, redirectUri(request), attempt, now, fetchImpl);
  if (!identity) return backToAdmin(request, "failed");

  const repo = getModeratorRepository();
  const moderator =
    identity.email === ownerEmail()
      ? await repo.ensureOwner(identity.email, identity.name, now)
      : await repo.getModerator(identity.email);
  if (!moderator) return backToAdmin(request, "not_moderator");

  const token = newSessionToken();
  await repo.createSession(moderator.email, hashSessionToken(token), sessionExpiry(now), now);
  const response = backToAdmin(request);
  response.cookies.set(MODERATOR_SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: secure(),
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
  return response;
}
