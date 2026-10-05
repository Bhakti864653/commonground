import { beforeEach, describe, expect, it, vi } from "vitest";

const jar = new Map<string, string>();
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (jar.has(name) ? { name, value: jar.get(name)! } : undefined),
    set: (name: string, value: string) => jar.set(name, value),
    delete: (name: string) => jar.delete(name),
  }),
}));

import { getCurrentModerator, requireOwner } from "@/lib/admin/auth";
import { logoutAdmin } from "@/lib/admin/actions";
import { memoryModeratorRepository, __resetModeratorsForTests } from "@/lib/moderators/memory-moderator-store";
import { hashSessionToken, newSessionToken, sessionExpiry } from "@/lib/moderators/logic";
import { actorIdOf } from "@/lib/admin/actor";

async function signedInAs(email: string): Promise<string> {
  const token = newSessionToken();
  await memoryModeratorRepository.createSession(email, hashSessionToken(token), sessionExpiry(new Date()));
  jar.set("cg_session", token);
  return token;
}

describe("moderator sessions", () => {
  beforeEach(() => {
    jar.clear();
    __resetModeratorsForTests();
    delete process.env.ADMIN_ACCESS_CODE;
  });

  it("knows who is signed in, and records actions under their email", async () => {
    await memoryModeratorRepository.addModerator({ email: "ana@example.com", name: "Ana" }, "owner@example.com");
    await signedInAs("ana@example.com");
    const me = await getCurrentModerator();
    expect(me).toEqual({ email: "ana@example.com", name: "Ana", role: "moderator", via: "google" });
    expect(actorIdOf(me)).toBe("ana@example.com");
    await expect(requireOwner()).rejects.toThrow("Owner access required");
  });

  it("lets the owner manage moderators", async () => {
    await memoryModeratorRepository.ensureOwner("owner@example.com", "Owner");
    await signedInAs("owner@example.com");
    await expect(requireOwner()).resolves.toMatchObject({ email: "owner@example.com", role: "owner" });
  });

  it("signs out a removed moderator at once", async () => {
    await memoryModeratorRepository.addModerator({ email: "ana@example.com" }, "owner@example.com");
    await signedInAs("ana@example.com");
    await memoryModeratorRepository.removeModerator("ana@example.com");
    expect(await getCurrentModerator()).toBeNull();
  });

  it("ignores a made-up session cookie", async () => {
    jar.set("cg_session", "made-up");
    expect(await getCurrentModerator()).toBeNull();
  });

  it("logging out deletes the session on the server, not just the cookie", async () => {
    await memoryModeratorRepository.addModerator({ email: "ana@example.com" }, "owner@example.com");
    const token = await signedInAs("ana@example.com");
    await logoutAdmin();
    expect(jar.has("cg_session")).toBe(false);
    expect(await memoryModeratorRepository.getSessionModerator(hashSessionToken(token))).toBeUndefined();
  });

  it("still accepts the shared access code, as the owner, recorded as 'admin'", async () => {
    process.env.ADMIN_ACCESS_CODE = "code";
    const { signAdminToken } = await import("@/lib/admin/auth");
    jar.set("cg_admin", signAdminToken()!);
    const me = await getCurrentModerator();
    expect(me).toEqual({ email: null, name: "", role: "owner", via: "access_code" });
    expect(actorIdOf(me)).toBe("admin");
  });
});
