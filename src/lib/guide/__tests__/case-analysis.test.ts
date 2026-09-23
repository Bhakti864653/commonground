import { describe, expect, it, vi, beforeEach } from "vitest";
import type { Case } from "@/lib/schema/report";

vi.mock("@/lib/guide/groq-client", () => ({ getGroqClient: vi.fn(), GUIDE_MODEL: "test-model" }));
vi.mock("@/lib/store/case-store", () => ({ getCaseByCaseNumber: vi.fn() }));
vi.mock("@/lib/guide/sub-agents", () => ({
  runDuplicateAgent: vi.fn(),
  runStatusAgent: vi.fn(),
  runVerificationAgent: vi.fn(),
}));
vi.mock("@/lib/guide/critique", () => ({ critiqueSuggestions: vi.fn() }));

import { analyzeCaseForSuggestions } from "@/lib/guide/case-analysis";
import { getGroqClient } from "@/lib/guide/groq-client";
import { getCaseByCaseNumber } from "@/lib/store/case-store";
import { runDuplicateAgent, runStatusAgent, runVerificationAgent } from "@/lib/guide/sub-agents";
import { critiqueSuggestions } from "@/lib/guide/critique";

const TARGET_CASE = { publicCaseNumber: "SV-2026-0002", communityId: "santiago-veraguas" } as Case;
const OTHER_CASE = { publicCaseNumber: "SV-2026-0001", communityId: "santiago-veraguas" } as Case;

function noSuggestion(agent: "duplicate" | "status" | "verification") {
  return { suggestion: null, trace: { agent, toolCalls: [], outcome: "No change suggested." } };
}

function emptyCritique() {
  return { decisions: [], trace: { agent: "critique" as const, toolCalls: [], outcome: "No suggestions to critique." } };
}

describe("analyzeCaseForSuggestions (orchestration, mocked model boundary)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getGroqClient).mockReturnValue({} as ReturnType<typeof getGroqClient>);
    vi.mocked(getCaseByCaseNumber).mockImplementation((caseNumber: string) =>
      caseNumber === TARGET_CASE.publicCaseNumber
        ? TARGET_CASE
        : caseNumber === OTHER_CASE.publicCaseNumber
          ? OTHER_CASE
          : undefined,
    );
  });

  it("handles all three specialists returning nothing", async () => {
    vi.mocked(runDuplicateAgent).mockResolvedValue(noSuggestion("duplicate"));
    vi.mocked(runStatusAgent).mockResolvedValue(noSuggestion("status"));
    vi.mocked(runVerificationAgent).mockResolvedValue(noSuggestion("verification"));
    vi.mocked(critiqueSuggestions).mockResolvedValue(emptyCritique());

    const result = await analyzeCaseForSuggestions(TARGET_CASE.publicCaseNumber);
    expect(result.suggestions).toEqual([]);
    expect(result.decisions).toEqual([]);
    expect(result.trace).toHaveLength(4);
    expect(critiqueSuggestions).toHaveBeenCalledWith(expect.anything(), TARGET_CASE, [], expect.anything());
  });

  it("passes each specialist's real tool calls to critique as evidence", async () => {
    const duplicateSuggestion = {
      kind: "duplicate" as const,
      suggestedValue: OTHER_CASE.publicCaseNumber,
      reasoning: "same light pole",
    };
    const toolCalls = [
      { name: "search_similar_cases", args: "{}", result: [{ caseNumber: OTHER_CASE.publicCaseNumber }] },
    ];
    vi.mocked(runDuplicateAgent).mockResolvedValue({
      suggestion: duplicateSuggestion,
      trace: { agent: "duplicate", toolCalls, outcome: "Suggested duplicate." },
    });
    vi.mocked(runStatusAgent).mockResolvedValue(noSuggestion("status"));
    vi.mocked(runVerificationAgent).mockResolvedValue(noSuggestion("verification"));
    vi.mocked(critiqueSuggestions).mockResolvedValue(emptyCritique());

    await analyzeCaseForSuggestions(TARGET_CASE.publicCaseNumber);
    expect(critiqueSuggestions).toHaveBeenCalledWith(
      expect.anything(),
      TARGET_CASE,
      [duplicateSuggestion],
      expect.objectContaining({ duplicate: toolCalls }),
    );
  });

  it("does not crash when one specialist throws — the other two still produce results", async () => {
    vi.mocked(runDuplicateAgent).mockRejectedValue(new Error("groq network error"));
    vi.mocked(runStatusAgent).mockResolvedValue(noSuggestion("status"));
    const verificationSuggestion = {
      kind: "verification" as const,
      suggestedValue: "needs_verification",
      reasoning: "specific claim quoted",
    };
    vi.mocked(runVerificationAgent).mockResolvedValue({
      suggestion: verificationSuggestion,
      trace: { agent: "verification", toolCalls: [], outcome: "Suggested needs_verification." },
    });
    vi.mocked(critiqueSuggestions).mockResolvedValue({
      decisions: [{ suggestion: verificationSuggestion, decision: "keep", reason: "ok" }],
      trace: { agent: "critique", toolCalls: [], outcome: "Kept all 1 suggestion(s)." },
    });

    const result = await analyzeCaseForSuggestions(TARGET_CASE.publicCaseNumber);
    expect(result.suggestions).toEqual([verificationSuggestion]);
    // The failed specialist's own trace step reflects the failure, not a crash.
    expect(result.trace.find((t) => t.agent === "duplicate")?.outcome).toMatch(/failed/i);
  });

  it("rejects an unknown duplicate case number deterministically, before it ever reaches critique", async () => {
    const badDuplicate = {
      kind: "duplicate" as const,
      suggestedValue: "SV-2026-9999",
      reasoning: "hallucinated",
    };
    vi.mocked(runDuplicateAgent).mockResolvedValue({
      suggestion: badDuplicate,
      trace: { agent: "duplicate", toolCalls: [], outcome: "Suggested duplicate of SV-2026-9999." },
    });
    vi.mocked(runStatusAgent).mockResolvedValue(noSuggestion("status"));
    vi.mocked(runVerificationAgent).mockResolvedValue(noSuggestion("verification"));
    vi.mocked(critiqueSuggestions).mockResolvedValue(emptyCritique());

    const result = await analyzeCaseForSuggestions(TARGET_CASE.publicCaseNumber);
    expect(critiqueSuggestions).toHaveBeenCalledWith(expect.anything(), TARGET_CASE, [], expect.anything());
    expect(result.suggestions).toEqual([]);
    expect(result.decisions[0]).toMatchObject({ finalDecision: "rejected_deterministic" });
  });

  it("accepts a valid tool-grounded duplicate suggestion and carries it through to the final result", async () => {
    const goodDuplicate = {
      kind: "duplicate" as const,
      suggestedValue: OTHER_CASE.publicCaseNumber,
      reasoning: "matched via search_similar_cases",
    };
    vi.mocked(runDuplicateAgent).mockResolvedValue({
      suggestion: goodDuplicate,
      trace: { agent: "duplicate", toolCalls: [{ name: "search_similar_cases", args: "{}", result: {} }], outcome: "ok" },
    });
    vi.mocked(runStatusAgent).mockResolvedValue(noSuggestion("status"));
    vi.mocked(runVerificationAgent).mockResolvedValue(noSuggestion("verification"));
    vi.mocked(critiqueSuggestions).mockResolvedValue({
      decisions: [{ suggestion: goodDuplicate, decision: "keep", reason: "tool-grounded" }],
      trace: { agent: "critique", toolCalls: [], outcome: "Kept all 1 suggestion(s)." },
    });

    const result = await analyzeCaseForSuggestions(TARGET_CASE.publicCaseNumber);
    expect(result.suggestions).toEqual([goodDuplicate]);
    expect(result.decisions[0]).toMatchObject({ finalDecision: "kept" });
  });

  it("re-validates critique-kept suggestions and rejects officially_verified even if critique kept it", async () => {
    vi.mocked(runDuplicateAgent).mockResolvedValue(noSuggestion("duplicate"));
    vi.mocked(runStatusAgent).mockResolvedValue(noSuggestion("status"));
    vi.mocked(runVerificationAgent).mockResolvedValue(noSuggestion("verification"));
    const buggyKeptSuggestion = {
      kind: "verification" as const,
      suggestedValue: "officially_verified",
      reasoning: "should never have gotten this far",
    };
    vi.mocked(critiqueSuggestions).mockResolvedValue({
      decisions: [{ suggestion: buggyKeptSuggestion, decision: "keep", reason: "buggy critique kept it" }],
      trace: { agent: "critique", toolCalls: [], outcome: "Kept all 1 suggestion(s)." },
    });

    const result = await analyzeCaseForSuggestions(TARGET_CASE.publicCaseNumber);
    expect(result.suggestions).toEqual([]);
    expect(result.decisions[0]).toMatchObject({ finalDecision: "rejected_deterministic" });
  });
});
