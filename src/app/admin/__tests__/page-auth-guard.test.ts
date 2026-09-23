import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/admin/auth", () => ({ isAdminAuthenticated: vi.fn() }));
vi.mock("@/lib/store/admin-actions", () => ({
  listCasesForAdmin: vi.fn(),
  getAdminDuplicateClusters: vi.fn(),
  getCaseForAdmin: vi.fn(),
}));

import { isAdminAuthenticated } from "@/lib/admin/auth";
import { getAdminDuplicateClusters, getCaseForAdmin, listCasesForAdmin } from "@/lib/store/admin-actions";
import AdminPage from "@/app/admin/page";
import AdminCasePage from "@/app/admin/cases/[caseNumber]/page";

/**
 * The layout's own auth check does NOT stop these page components from being invoked — Next.js
 * renders a page and the layout it's nested in as one pass (see admin/layout.tsx's own comment
 * on this). Every protected page needs its own guard, checked before any protected data fetch —
 * these tests are what would have caught the original "Admin authentication required" build
 * failure, by asserting the protected fetch functions are never even called when unauthenticated.
 */
describe("admin page-level auth guards", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("AdminPage never fetches protected data when unauthenticated", async () => {
    vi.mocked(isAdminAuthenticated).mockResolvedValue(false);
    const result = await AdminPage();
    expect(result).toBeNull();
    expect(listCasesForAdmin).not.toHaveBeenCalled();
    expect(getAdminDuplicateClusters).not.toHaveBeenCalled();
  });

  it("AdminCasePage never fetches protected data when unauthenticated", async () => {
    vi.mocked(isAdminAuthenticated).mockResolvedValue(false);
    const result = await AdminCasePage({ params: Promise.resolve({ caseNumber: "SV-2026-0001" }) });
    expect(result).toBeNull();
    expect(getCaseForAdmin).not.toHaveBeenCalled();
  });
});
