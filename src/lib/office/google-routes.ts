import { NextResponse, type NextRequest } from "next/server";
import { buildGoogleAuthUrl, exchangeGoogleCode, googleConfig, newLoginAttempt, type GoogleLoginAttempt } from "@/lib/admin/google";
import { SESSION_DAYS, hashSessionToken, newSessionToken, sessionExpiry } from "@/lib/moderators/logic";
import { isOfficePortalEnabled, OFFICE_SESSION_COOKIE } from "./auth";
import { getOfficeRepository } from "./store";

/**
 * "Sign in with Google" for invited office accounts (routes under /api/auth/office/google).
 * Same flow as moderators, with its own cookies and session table. Refuses outright while the
 * office portal is off. Only an email an admin invited (and didn't disable) gets a session.
 */

const ATTEMPT_COOKIE = "cg_office_google";
const ATTEMPT_PATH = "/api/auth/office";
const CALLBACK_PATH = "/api/auth/office/google/callback";

export type OfficeLoginProblem = "disabled" | "unavailable" | "cancelled" | "failed" | "not_invited";

const secure = () => process.env.NODE_ENV === "production";
const redirectUri = (request: NextRequest) => `${request.nextUrl.origin}${CALLBACK_PATH}`;

function backToOffice(request: NextRequest, problem?: OfficeLoginProblem): NextResponse {
  const url = new URL("/office", request.nextUrl.origin);
  if (problem) url.searchParams.set("login", problem);
  const response = NextResponse.redirect(url);
  response.cookies.delete({ name: ATTEMPT_COOKIE, path: ATTEMPT_PATH });
  return response;
}

export function startOfficeGoogleSignIn(request: NextRequest): NextResponse {
  if (!isOfficePortalEnabled()) return backToOffice(request, "disabled");
  const config = googleConfig();
  if (!config) return backToOffice(request, "unavailable");
  const attempt = newLoginAttempt();
  const response = NextResponse.redirect(buildGoogleAuthUrl(config, redirectUri(request), attempt));
  response.cookies.set(ATTEMPT_COOKIE, Buffer.from(JSON.stringify(attempt)).toString("base64url"), {
    httpOnly: true,
    sameSite: "lax",
    secure: secure(),
    path: ATTEMPT_PATH,
    maxAge: 10 * 60,
  });
  return response;
}

function readAttempt(request: NextRequest): GoogleLoginAttempt | null {
  const raw = request.cookies.get(ATTEMPT_COOKIE)?.value;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(Buffer.from(raw, "base64url").toString("utf8"));
    return typeof parsed?.state === "string" && typeof parsed?.nonce === "string" && typeof parsed?.verifier === "string" ? parsed : null;
  } catch {
    return null;
  }
}

export async function finishOfficeGoogleSignIn(request: NextRequest, now: Date = new Date(), fetchImpl: typeof fetch = fetch): Promise<NextResponse> {
  if (!isOfficePortalEnabled()) return backToOffice(request, "disabled");
  const config = googleConfig();
  if (!config) return backToOffice(request, "unavailable");
  const params = request.nextUrl.searchParams;
  if (params.get("error")) return backToOffice(request, "cancelled");
  const attempt = readAttempt(request);
  const code = params.get("code");
  if (!attempt || !code || params.get("state") !== attempt.state) return backToOffice(request, "failed");

  const identity = await exchangeGoogleCode(config, code, redirectUri(request), attempt, now, fetchImpl);
  if (!identity) return backToOffice(request, "failed");
  const repo = getOfficeRepository();
  const account = await repo.getAccount(identity.email);
  if (!account || account.disabledAt) return backToOffice(request, "not_invited");

  const token = newSessionToken();
  await repo.createSession(account.email, hashSessionToken(token), sessionExpiry(now), now);
  const response = backToOffice(request);
  response.cookies.set(OFFICE_SESSION_COOKIE, token, { httpOnly: true, sameSite: "lax", secure: secure(), path: "/", maxAge: SESSION_DAYS * 24 * 60 * 60 });
  return response;
}
