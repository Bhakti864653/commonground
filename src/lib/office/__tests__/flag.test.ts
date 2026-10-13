// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const jar = new Map<string, string>();
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (jar.has(name) ? { name, value: jar.get(name)! } : undefined),
    delete: (name: string) => jar.delete(name),
  }),
}));

import { hashSessionToken } from "@/lib/moderators/logic";
import { getOfficeRepository } from "../store";
import { getCurrentOffice, isOfficePortalEnabled, OFFICE_SESSION_COOKIE, requireOffice } from "../auth";
import { officeAddNoteAction, officeChangeStatusAction, officeInboxAction } from "../actions";
import { finishOfficeGoogleSignIn, startOfficeGoogleSignIn } from "../google-routes";

/** A real, invited office account with a live session cookie. */
async function signedInOffice() {
  const email = `staff${Math.random().toString(36).slice(2)}@lighting.example`;
  await getOfficeRepository().addAccount({ email, officeId: "lighting", name: "Staff", invitedBy: "owner" });
  const token = `token-${email}`;
  await getOfficeRepository().createSession(email, hashSessionToken(token), new Date(Date.now() + 86_400_000));
  jar.set(OFFICE_SESSION_COOKIE, token);
  return email;
}

beforeEach(() => jar.clear());
afterEach(() => vi.unstubAllEnvs());

describe("OFFICE_PORTAL_ENABLED", () => {
  it("is off unless exactly 'true'", () => {
    expect(isOfficePortalEnabled({})).toBe(false);
    expect(isOfficePortalEnabled({ OFFICE_PORTAL_ENABLED: "false" })).toBe(false);
    expect(isOfficePortalEnabled({ OFFICE_PORTAL_ENABLED: "1" })).toBe(false);
    expect(isOfficePortalEnabled({ OFFICE_PORTAL_ENABLED: "true" })).toBe(true);
  });

  it("while off, even a valid office session gets nothing", async () => {
    vi.stubEnv("OFFICE_PORTAL_ENABLED", "");
    await signedInOffice();
    expect(await getCurrentOffice()).toBeNull();
    await expect(requireOffice()).rejects.toThrow(/not enabled/);
    await expect(officeInboxAction()).rejects.toThrow(/not enabled/);
    await expect(officeChangeStatusAction("x", "received")).rejects.toThrow(/not enabled/);
    await expect(officeAddNoteAction("x", { kind: "public", text: "hola" })).rejects.toThrow(/not enabled/);
  });

  it("while off, office sign-in refuses before contacting Google", async () => {
    vi.stubEnv("OFFICE_PORTAL_ENABLED", "false");
    vi.stubEnv("GOOGLE_CLIENT_ID", "id");
    vi.stubEnv("GOOGLE_CLIENT_SECRET", "secret");
    const fetchImpl = vi.fn();
    const start = startOfficeGoogleSignIn(new NextRequest("https://example.test/api/auth/office/google"));
    expect(start.headers.get("location")).toBe("https://example.test/office?login=disabled");
    const finish = await finishOfficeGoogleSignIn(new NextRequest("https://example.test/api/auth/office/google/callback?code=c&state=s"), new Date(), fetchImpl);
    expect(finish.headers.get("location")).toBe("https://example.test/office?login=disabled");
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(finish.cookies.get(OFFICE_SESSION_COOKIE)).toBeUndefined();
  });

  it("when turned on, an invited account works, and a disabled one doesn't", async () => {
    vi.stubEnv("OFFICE_PORTAL_ENABLED", "true");
    const email = await signedInOffice();
    expect(await getCurrentOffice()).toMatchObject({ email, officeId: "lighting" });
    expect(await requireOffice()).toMatchObject({ officeId: "lighting", demo: false });
    await getOfficeRepository().disableAccount(email);
    expect(await getCurrentOffice()).toBeNull();
  });

  it("there is no sign-up: an email nobody invited gets no account", async () => {
    expect(await getOfficeRepository().getAccount("stranger@example.com")).toBeUndefined();
  });
});
