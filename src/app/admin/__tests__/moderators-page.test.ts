import { beforeEach, describe, expect, it, vi } from "vitest";

const current = vi.fn();
vi.mock("@/lib/admin/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/admin/auth")>();
  const getCurrentModerator = () => current();
  return {
    ...actual,
    getCurrentModerator,
    requireOwner: async () => {
      const me = await getCurrentModerator();
      if (!me) throw new Error("Admin authentication required");
      if (me.role !== "owner") throw new Error("Owner access required");
      return me;
    },
  };
});

import AdminModeratorsPage from "@/app/admin/moderators/page";
import { adminAddModerator, adminListModerators, adminRemoveModerator } from "@/lib/admin/moderator-actions";
import { memoryModeratorRepository, __resetModeratorsForTests } from "@/lib/moderators/memory-moderator-store";

const OWNER = { email: "owner@example.com", name: "Owner", role: "owner", via: "google" } as const;
const MODERATOR = { email: "ana@example.com", name: "Ana", role: "moderator", via: "google" } as const;

describe("the Moderators page and its actions", () => {
  beforeEach(() => {
    __resetModeratorsForTests();
    current.mockReset();
  });

  it("renders nothing for someone not signed in, and never lists moderators", async () => {
    current.mockResolvedValue(null);
    expect(await AdminModeratorsPage()).toBeNull();
    await expect(adminListModerators()).rejects.toThrow("Admin authentication required");
  });

  it("tells a regular moderator it's the owner's page, and refuses their changes", async () => {
    current.mockResolvedValue(MODERATOR);
    const page = await AdminModeratorsPage();
    expect(JSON.stringify(page)).toContain("Only the owner can add or remove moderators.");
    await expect(adminListModerators()).rejects.toThrow("Owner access required");
    await expect(adminAddModerator({ email: "x@example.com" })).rejects.toThrow("Owner access required");
    await expect(adminRemoveModerator("owner@example.com")).rejects.toThrow("Owner access required");
    expect(await memoryModeratorRepository.listModerators()).toEqual([]);
  });

  it("lets the owner add someone (recorded as added by the owner) and remove them", async () => {
    current.mockResolvedValue(OWNER);
    const added = await adminAddModerator({ email: "Ana@Example.com", name: "Ana" });
    expect(added).toMatchObject({ ok: true, moderator: { email: "ana@example.com", addedBy: "owner@example.com" } });
    expect((await adminListModerators()).map((m) => m.email)).toEqual(["ana@example.com"]);
    expect(await adminRemoveModerator("ana@example.com")).toEqual({ ok: true });
    expect(await adminRemoveModerator(42)).toEqual({ ok: false, error: "not_found" });
  });
});
