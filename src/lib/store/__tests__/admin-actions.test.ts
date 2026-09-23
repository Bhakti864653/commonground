import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/admin/auth", () => ({ requireAdmin: vi.fn() }));

import { requireAdmin } from "@/lib/admin/auth";
import {
  adminAddNote,
  adminChangeStatus,
  adminMarkDuplicate,
  adminReviewInaccuracyFlag,
  adminSetVerification,
  listCasesForAdmin,
  getCaseForAdmin,
  getAdminDuplicateClusters,
} from "@/lib/store/admin-actions";
import { createCase, __resetCaseStoreForTests } from "@/lib/store/case-store";
import { buildApproximateArea } from "@/lib/privacy/approximate-area";
import { buildConsentRecord } from "@/lib/privacy/consent";
import { SANTIAGO_VERAGUAS } from "@/data/communities";

function makeRealCase() {
  return createCase({
    type: "report",
    communityId: SANTIAGO_VERAGUAS.id,
    categoryId: SANTIAGO_VERAGUAS.categories[0].id,
    description: "Test case",
    approximateArea: buildApproximateArea(SANTIAGO_VERAGUAS.areas[0], "en"),
    consent: buildConsentRecord(SANTIAGO_VERAGUAS.privacy.consentVersion, "en"),
  });
}

describe("admin server actions reject unauthenticated calls", () => {
  beforeEach(() => {
    __resetCaseStoreForTests();
    vi.mocked(requireAdmin).mockRejectedValue(new Error("Admin authentication required"));
  });

  it("every read/write admin action rejects when requireAdmin rejects", async () => {
    await expect(listCasesForAdmin()).rejects.toThrow();
    await expect(getCaseForAdmin("SV-2026-0001")).rejects.toThrow();
    await expect(getAdminDuplicateClusters()).rejects.toThrow();
    await expect(adminChangeStatus("SV-2026-0001", "in_progress")).rejects.toThrow();
    await expect(adminSetVerification("SV-2026-0001", "needs_verification")).rejects.toThrow();
    await expect(adminMarkDuplicate("SV-2026-0001", "SV-2026-0002")).rejects.toThrow();
    await expect(adminAddNote("SV-2026-0001", "note")).rejects.toThrow();
    await expect(adminReviewInaccuracyFlag("SV-2026-0001", "flag-id")).rejects.toThrow();
  });
});

describe("adminSetVerification requires approved evidence for officially_verified", () => {
  beforeEach(() => {
    __resetCaseStoreForTests();
    vi.mocked(requireAdmin).mockResolvedValue(undefined);
  });

  it("refuses officially_verified with no source", async () => {
    const created = makeRealCase();
    const ok = await adminSetVerification(created.publicCaseNumber, "officially_verified");
    expect(ok).toBe(false);
  });

  it("refuses officially_verified with an empty title/url", async () => {
    const created = makeRealCase();
    const ok = await adminSetVerification(created.publicCaseNumber, "officially_verified", {
      title: "  ",
      url: "  ",
    });
    expect(ok).toBe(false);
  });

  it("accepts officially_verified with a real source, and it's visible on the case", async () => {
    const created = makeRealCase();
    const ok = await adminSetVerification(created.publicCaseNumber, "officially_verified", {
      title: "Municipal notice",
      url: "https://example.gov/notice",
    });
    expect(ok).toBe(true);
    const fetched = await getCaseForAdmin(created.publicCaseNumber);
    expect(fetched?.verificationState).toBe("officially_verified");
    expect(fetched?.verifiedSource?.title).toBe("Municipal notice");
  });

  it("does not require evidence for any other verification state", async () => {
    const created = makeRealCase();
    const ok = await adminSetVerification(created.publicCaseNumber, "needs_verification");
    expect(ok).toBe(true);
  });

  it("rejects a javascript: URL rather than storing it as a clickable link", async () => {
    const created = makeRealCase();
    const ok = await adminSetVerification(created.publicCaseNumber, "officially_verified", {
      title: "Fake notice",
      url: "javascript:alert(document.cookie)",
    });
    expect(ok).toBe(false);
    const fetched = await getCaseForAdmin(created.publicCaseNumber);
    expect(fetched?.verificationState).not.toBe("officially_verified");
  });

  it("rejects a malformed URL", async () => {
    const created = makeRealCase();
    const ok = await adminSetVerification(created.publicCaseNumber, "officially_verified", {
      title: "Bad URL",
      url: "not a url at all",
    });
    expect(ok).toBe(false);
  });

  it("rejects a blank title with an otherwise valid URL", async () => {
    const created = makeRealCase();
    const ok = await adminSetVerification(created.publicCaseNumber, "officially_verified", {
      title: "   ",
      url: "https://example.gov/notice",
    });
    expect(ok).toBe(false);
  });

  it("rejects an excessively long title", async () => {
    const created = makeRealCase();
    const ok = await adminSetVerification(created.publicCaseNumber, "officially_verified", {
      title: "x".repeat(500),
      url: "https://example.gov/notice",
    });
    expect(ok).toBe(false);
  });

  it("rejects an excessively long URL", async () => {
    const created = makeRealCase();
    const ok = await adminSetVerification(created.publicCaseNumber, "officially_verified", {
      title: "Municipal notice",
      url: `https://example.gov/${"x".repeat(3000)}`,
    });
    expect(ok).toBe(false);
  });

  it("accepts a valid https URL and trims surrounding whitespace", async () => {
    const created = makeRealCase();
    const ok = await adminSetVerification(created.publicCaseNumber, "officially_verified", {
      title: "  Municipal notice  ",
      url: "  https://example.gov/notice  ",
    });
    expect(ok).toBe(true);
    const fetched = await getCaseForAdmin(created.publicCaseNumber);
    expect(fetched?.verifiedSource?.title).toBe("Municipal notice");
    expect(fetched?.verifiedSource?.url).toBe("https://example.gov/notice");
  });

  it("accepts a valid plain http URL too", async () => {
    const created = makeRealCase();
    const ok = await adminSetVerification(created.publicCaseNumber, "officially_verified", {
      title: "Legacy notice board",
      url: "http://example.gov/notice",
    });
    expect(ok).toBe(true);
  });

  it.each([
    ["data:", "data:text/html,<script>alert(1)</script>"],
    ["file:", "file:///etc/passwd"],
    ["ftp:", "ftp://example.gov/notice"],
    ["vbscript:", "vbscript:msgbox(1)"],
  ])("rejects an unsupported %s URL scheme", async (_scheme, url) => {
    const created = makeRealCase();
    const ok = await adminSetVerification(created.publicCaseNumber, "officially_verified", {
      title: "Municipal notice",
      url,
    });
    expect(ok).toBe(false);
    const fetched = await getCaseForAdmin(created.publicCaseNumber);
    expect(fetched?.verificationState).not.toBe("officially_verified");
    expect(fetched?.verifiedSource).toBeUndefined();
  });
});

/**
 * A server action is a public endpoint — anyone with an admin session can call it with
 * arbitrary JSON, bypassing both the UI and TypeScript. These cast past the declared types on
 * purpose to simulate exactly that.
 */
describe("adminSetVerification rejects invalid runtime input from a direct call", () => {
  type Args = Parameters<typeof adminSetVerification>;

  beforeEach(() => {
    __resetCaseStoreForTests();
    vi.mocked(requireAdmin).mockResolvedValue(undefined);
  });

  it("rejects an unknown verification state instead of storing it", async () => {
    const created = makeRealCase();
    const before = (await getCaseForAdmin(created.publicCaseNumber))?.verificationState;
    const ok = await adminSetVerification(created.publicCaseNumber, "hacked" as Args[1]);
    expect(ok).toBe(false);
    const fetched = await getCaseForAdmin(created.publicCaseNumber);
    expect(fetched?.verificationState).toBe(before);
    expect(fetched?.moderationActions ?? []).toHaveLength(0);
  });

  it("rejects a non-string verification state", async () => {
    const created = makeRealCase();
    const ok = await adminSetVerification(created.publicCaseNumber, 42 as unknown as Args[1]);
    expect(ok).toBe(false);
  });

  it.each([
    ["a string", "https://example.gov/notice"],
    ["null", null],
    ["an array", ["Municipal notice", "https://example.gov/notice"]],
    ["non-string fields", { title: 123, url: { href: "https://example.gov/notice" } }],
    ["missing url", { title: "Municipal notice" }],
  ])("rejects officially_verified when the source is %s", async (_label, source) => {
    const created = makeRealCase();
    const ok = await adminSetVerification(
      created.publicCaseNumber,
      "officially_verified",
      source as unknown as Args[2],
    );
    expect(ok).toBe(false);
    const fetched = await getCaseForAdmin(created.publicCaseNumber);
    expect(fetched?.verificationState).not.toBe("officially_verified");
  });

  it("returns a plain false (never throws or leaks validation detail) for invalid input", async () => {
    const created = makeRealCase();
    await expect(
      adminSetVerification(created.publicCaseNumber, "officially_verified", {
        title: "",
        url: "javascript:alert(1)",
      }),
    ).resolves.toBe(false);
  });

  it("returns false for a case number that doesn't exist", async () => {
    const ok = await adminSetVerification("SV-2026-9999", "officially_verified", {
      title: "Municipal notice",
      url: "https://example.gov/notice",
    });
    expect(ok).toBe(false);
  });
});
