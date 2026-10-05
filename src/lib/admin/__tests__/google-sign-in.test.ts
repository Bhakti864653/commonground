// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { readIdToken, type GoogleConfig } from "@/lib/admin/google";
import { finishGoogleSignIn, startGoogleSignIn } from "@/lib/admin/google-routes";
import { memoryModeratorRepository, __resetModeratorsForTests } from "@/lib/moderators/memory-moderator-store";
import { hashSessionToken } from "@/lib/moderators/logic";

const CONFIG: GoogleConfig = { clientId: "client-123.apps.googleusercontent.com", clientSecret: "shh" };
const NOW = new Date("2026-10-05T12:00:00Z");
const ORIGIN = "https://commonground.example";

function idToken(claims: Record<string, unknown>): string {
  const part = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${part({ alg: "RS256" })}.${part(claims)}.signature`;
}

const goodClaims = (nonce: string, email = "Ana@Example.com") => ({
  iss: "https://accounts.google.com",
  aud: CONFIG.clientId,
  exp: NOW.getTime() / 1000 + 300,
  nonce,
  email,
  email_verified: true,
  name: "Ana Pérez",
});

describe("readIdToken", () => {
  it("returns the verified, lowercased email and name", () => {
    expect(readIdToken(idToken(goodClaims("n1")), CONFIG, "n1", NOW)).toEqual({ email: "ana@example.com", name: "Ana Pérez" });
  });

  it.each([
    ["another app's token", { aud: "someone-else" }],
    ["a different issuer", { iss: "https://evil.example" }],
    ["an expired token", { exp: NOW.getTime() / 1000 - 1 }],
    ["a replayed sign-in (wrong nonce)", { nonce: "other" }],
    ["an unverified email", { email_verified: false }],
    ["no email", { email: undefined }],
  ])("rejects %s", (_, override) => {
    expect(readIdToken(idToken({ ...goodClaims("n1"), ...override }), CONFIG, "n1", NOW)).toBeNull();
  });

  it("rejects garbage", () => {
    expect(readIdToken("not-a-token", CONFIG, "n1", NOW)).toBeNull();
    expect(readIdToken("a.%%%.c", CONFIG, "n1", NOW)).toBeNull();
  });
});

describe("Google sign-in routes", () => {
  const ENV = { ...process.env };

  beforeEach(() => {
    __resetModeratorsForTests();
    process.env.GOOGLE_CLIENT_ID = CONFIG.clientId;
    process.env.GOOGLE_CLIENT_SECRET = CONFIG.clientSecret;
    process.env.OWNER_EMAIL = "Owner@Example.com";
  });
  afterEach(() => {
    process.env = { ...ENV };
  });

  /** Starts a sign-in, then comes back from "Google" as `email`. */
  async function signInAs(email: string, options: { state?: string; tokenOk?: boolean } = {}) {
    const start = startGoogleSignIn(new NextRequest(`${ORIGIN}/api/auth/google`));
    const google = new URL(start.headers.get("location")!);
    const attemptCookie = start.cookies.get("cg_google")!.value;
    const nonce = google.searchParams.get("nonce")!;
    const state = options.state ?? google.searchParams.get("state")!;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- typed like fetch, so the test can read the request
    const fakeGoogle = vi.fn(async (_url: string, _init?: RequestInit) =>
      options.tokenOk === false
        ? new Response("{}", { status: 400 })
        : Response.json({ id_token: idToken(goodClaims(nonce, email)) }),
    );
    const callback = new NextRequest(`${ORIGIN}/api/auth/google/callback?code=abc&state=${state}`, {
      headers: { cookie: `cg_google=${attemptCookie}` },
    });
    const response = await finishGoogleSignIn(callback, NOW, fakeGoogle as unknown as typeof fetch);
    return { start, google, response, fakeGoogle };
  }

  it("sends the browser to Google with PKCE, a nonce and this site's callback", async () => {
    const { start, google } = await signInAs("owner@example.com");
    expect(google.origin + google.pathname).toBe("https://accounts.google.com/o/oauth2/v2/auth");
    expect(google.searchParams.get("client_id")).toBe(CONFIG.clientId);
    expect(google.searchParams.get("redirect_uri")).toBe(`${ORIGIN}/api/auth/google/callback`);
    expect(google.searchParams.get("code_challenge_method")).toBe("S256");
    expect(google.searchParams.get("scope")).toBe("openid email profile");
    const cookie = start.cookies.get("cg_google")!;
    expect(cookie.httpOnly).toBe(true);
    expect(cookie.value).not.toContain(google.searchParams.get("code_challenge")!);
  });

  it("lets the owner in, making them the owner, with a 7-day httpOnly session", async () => {
    const { response, fakeGoogle } = await signInAs("owner@example.com");
    expect(response.headers.get("location")).toBe(`${ORIGIN}/admin`);
    const session = response.cookies.get("cg_session")!;
    expect(session.httpOnly).toBe(true);
    expect(session.maxAge).toBe(7 * 24 * 60 * 60);
    expect(await memoryModeratorRepository.getSessionModerator(hashSessionToken(session.value), NOW)).toMatchObject({
      email: "owner@example.com",
      role: "owner",
      name: "Ana Pérez",
    });
    // The secret goes to Google from the server only.
    const body = String(fakeGoogle.mock.calls[0][1]?.body);
    expect(body).toContain("client_secret=shh");
    expect(body).toContain("code_verifier=");
  });

  it("lets in a moderator the owner added", async () => {
    await memoryModeratorRepository.addModerator({ email: "ana@example.com" }, "owner@example.com");
    const { response } = await signInAs("Ana@Example.com");
    expect(response.headers.get("location")).toBe(`${ORIGIN}/admin`);
    expect(response.cookies.get("cg_session")).toBeDefined();
  });

  it("turns away anyone not on the list, without a session", async () => {
    const { response } = await signInAs("stranger@example.com");
    expect(response.headers.get("location")).toBe(`${ORIGIN}/admin?login=not_moderator`);
    expect(response.cookies.get("cg_session")).toBeUndefined();
    expect(await memoryModeratorRepository.listModerators()).toEqual([]);
  });

  it("refuses a callback that didn't start here (state mismatch)", async () => {
    const { response, fakeGoogle } = await signInAs("owner@example.com", { state: "forged" });
    expect(response.headers.get("location")).toBe(`${ORIGIN}/admin?login=failed`);
    expect(fakeGoogle).not.toHaveBeenCalled();
  });

  it("reports a failed code exchange", async () => {
    const { response } = await signInAs("owner@example.com", { tokenOk: false });
    expect(response.headers.get("location")).toBe(`${ORIGIN}/admin?login=failed`);
  });

  it("reports a cancelled sign-in and a server without Google configured", async () => {
    const cancelled = await finishGoogleSignIn(new NextRequest(`${ORIGIN}/api/auth/google/callback?error=access_denied`));
    expect(cancelled.headers.get("location")).toBe(`${ORIGIN}/admin?login=cancelled`);
    delete process.env.GOOGLE_CLIENT_ID;
    expect(startGoogleSignIn(new NextRequest(`${ORIGIN}/api/auth/google`)).headers.get("location")).toBe(
      `${ORIGIN}/admin?login=unavailable`,
    );
  });
});
