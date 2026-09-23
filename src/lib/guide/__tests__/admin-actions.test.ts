import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/admin/auth", () => ({ requireAdmin: vi.fn() }));

import { requireAdmin } from "@/lib/admin/auth";
import { generateBriefingAction, reviewAgentSuggestion, runCaseAnalysis } from "@/lib/guide/admin-actions";

describe("Guide admin actions reject unauthenticated calls", () => {
  beforeEach(() => {
    vi.mocked(requireAdmin).mockRejectedValue(new Error("Admin authentication required"));
  });

  it("runCaseAnalysis rejects without ever calling Groq", async () => {
    await expect(runCaseAnalysis("SV-2026-0001")).rejects.toThrow();
  });

  it("generateBriefingAction rejects without ever calling Groq", async () => {
    await expect(generateBriefingAction("santiago-veraguas")).rejects.toThrow();
  });

  it("reviewAgentSuggestion rejects before touching any case data", async () => {
    await expect(reviewAgentSuggestion("SV-2026-0001", "suggestion-id", "approve")).rejects.toThrow();
  });
});
