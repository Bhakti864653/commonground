import crypto from "crypto";

/**
 * "Sign in with Google" for moderators (OpenID Connect, authorization-code flow with PKCE).
 * No library: the flow is three steps — send the moderator to Google, get a one-time code back,
 * swap the code for an ID token directly with Google over HTTPS. Because the token comes
 * straight from Google's token endpoint (not through the browser), its contents can be trusted
 * after checking it's for this app, unexpired, and for a verified email (OpenID Connect Core
 * §3.1.3.7). Only the email and name are used; nothing from Google is stored besides them.
 */

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const ISSUERS = new Set(["https://accounts.google.com", "accounts.google.com"]);

export type GoogleConfig = { clientId: string; clientSecret: string };

/** Both settings come from Google Cloud's OAuth client. Without them the Google button is hidden. */
export function googleConfig(): GoogleConfig | null {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  return clientId && clientSecret ? { clientId, clientSecret } : null;
}

const random = () => crypto.randomBytes(32).toString("base64url");

/** What the browser keeps (in a short-lived httpOnly cookie) between leaving for Google and coming back. */
export type GoogleLoginAttempt = { state: string; nonce: string; verifier: string };

export function newLoginAttempt(): GoogleLoginAttempt {
  return { state: random(), nonce: random(), verifier: random() };
}

export function buildGoogleAuthUrl(config: GoogleConfig, redirectUri: string, attempt: GoogleLoginAttempt): string {
  const challenge = crypto.createHash("sha256").update(attempt.verifier).digest("base64url");
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state: attempt.state,
    nonce: attempt.nonce,
    code_challenge: challenge,
    code_challenge_method: "S256",
    prompt: "select_account",
  });
  return `${AUTH_URL}?${params}`;
}

export type GoogleIdentity = { email: string; name: string };

/** Checks an ID token received directly from Google's token endpoint and returns who signed in. */
export function readIdToken(idToken: string, config: GoogleConfig, nonce: string, now: Date): GoogleIdentity | null {
  const payload = idToken.split(".")[1];
  if (!payload) return null;
  let claims: Record<string, unknown>;
  try {
    claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    return null;
  }
  const audience = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  if (!ISSUERS.has(String(claims.iss))) return null;
  if (!audience.includes(config.clientId)) return null;
  if (typeof claims.exp !== "number" || claims.exp * 1000 <= now.getTime()) return null;
  if (claims.nonce !== nonce) return null;
  // Google sends a boolean today; older tokens used the string "true".
  if (claims.email_verified !== true && claims.email_verified !== "true") return null;
  if (typeof claims.email !== "string" || !claims.email.includes("@")) return null;
  return { email: claims.email.toLowerCase(), name: typeof claims.name === "string" ? claims.name.slice(0, 80) : "" };
}

/** Swaps the one-time code for the signed-in person's identity, or null if anything doesn't check out. */
export async function exchangeGoogleCode(
  config: GoogleConfig,
  code: string,
  redirectUri: string,
  attempt: GoogleLoginAttempt,
  now: Date = new Date(),
  fetchImpl: typeof fetch = fetch,
): Promise<GoogleIdentity | null> {
  try {
    const response = await fetchImpl(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
        code_verifier: attempt.verifier,
      }),
    });
    if (!response.ok) return null;
    const body = (await response.json()) as { id_token?: unknown };
    return typeof body.id_token === "string" ? readIdToken(body.id_token, config, attempt.nonce, now) : null;
  } catch {
    return null;
  }
}
