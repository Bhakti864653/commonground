import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { signAdminToken, verifyAccessCode } from "@/lib/admin/auth";

const ORIGINAL_ENV = process.env.ADMIN_ACCESS_CODE;

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
