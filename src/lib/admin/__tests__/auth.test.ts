import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({ cookies: vi.fn() }));

import { cookies } from "next/headers";
import { isAdminAuthenticated, requireAdmin, signAdminToken, verifyAccessCode } from "@/lib/admin/auth";

const ORIGINAL_ENV = process.env.ADMIN_ACCESS_CODE;

function mockCookieValue(value: string | undefined) {
  vi.mocked(cookies).mockResolvedValue({
    get: () => (value === undefined ? undefined : { name: "cg_admin", value }),
  } as unknown as Awaited<ReturnType<typeof cookies>>);
}

describe("admin auth", () => {
  beforeEach(() => {
    process.env.ADMIN_ACCESS_CODE = "test-access-code";
  });

  afterEach(() => {
    process.env.ADMIN_ACCESS_CODE = ORIGINAL_ENV;
  });

  it("accepts only the exact configured code", () => {
    expect(verifyAccessCode("test-access-code")).toBe(true);
    expect(verifyAccessCode("wrong-code")).toBe(false);
    expect(verifyAccessCode("")).toBe(false);
  });

  it("produces a deterministic token from the code, never the code itself", () => {
    const token = signAdminToken();
    expect(token).toBeTruthy();
    expect(token).not.toBe("test-access-code");
    expect(signAdminToken()).toBe(token);
  });

  it("returns null/false when no code is configured", () => {
    delete process.env.ADMIN_ACCESS_CODE;
    expect(signAdminToken()).toBeNull();
    expect(verifyAccessCode("anything")).toBe(false);
  });

  it("tolerates a trailing newline/space on either side, from a dashboard paste", () => {
    process.env.ADMIN_ACCESS_CODE = "test-access-code\n";
    expect(verifyAccessCode("test-access-code")).toBe(true);
    expect(verifyAccessCode("test-access-code\n")).toBe(true);
    expect(verifyAccessCode("test-access-code  ")).toBe(true);
  });
});

describe("isAdminAuthenticated / requireAdmin", () => {
  beforeEach(() => {
    process.env.ADMIN_ACCESS_CODE = "test-access-code";
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env.ADMIN_ACCESS_CODE = ORIGINAL_ENV;
  });

  it("is false with no session cookie, and requireAdmin rejects", async () => {
    mockCookieValue(undefined);
    expect(await isAdminAuthenticated()).toBe(false);
    await expect(requireAdmin()).rejects.toThrow(/authentication required/i);
  });

  it("is false with a wrong cookie value, and requireAdmin rejects", async () => {
    mockCookieValue("not-the-real-token");
    expect(await isAdminAuthenticated()).toBe(false);
    await expect(requireAdmin()).rejects.toThrow(/authentication required/i);
  });

  it("is true with the real signed session token, and requireAdmin resolves", async () => {
    const token = signAdminToken();
    mockCookieValue(token ?? undefined);
    expect(await isAdminAuthenticated()).toBe(true);
    await expect(requireAdmin()).resolves.toBeUndefined();
  });

  it("is false when no access code is configured at all, even with a cookie present", async () => {
    delete process.env.ADMIN_ACCESS_CODE;
    mockCookieValue("anything");
    expect(await isAdminAuthenticated()).toBe(false);
  });
});
