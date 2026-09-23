import { describe, expect, it } from "vitest";
import { validateSuggestionDeterministically } from "@/lib/guide/suggestion-validation";
import type { CaseAnalysisSuggestion } from "@/lib/guide/case-analysis";

const TARGET_CASE_NUMBER = "SV-2026-0002";
const TARGET_COMMUNITY_ID = "santiago-veraguas";

function contextWithCases(cases: Record<string, string>) {
  return {
    targetCaseNumber: TARGET_CASE_NUMBER,
    targetCommunityId: TARGET_COMMUNITY_ID,
    lookupCaseCommunity: (caseNumber: string) => cases[caseNumber],
  };
}

function duplicateSuggestion(caseNumber: string): CaseAnalysisSuggestion {
  return { kind: "duplicate", suggestedValue: caseNumber, reasoning: "test" };
}

describe("validateSuggestionDeterministically — duplicate", () => {
  it("accepts a real, different case in the same community", () => {
    const context = contextWithCases({ "SV-2026-0001": TARGET_COMMUNITY_ID });
    const result = validateSuggestionDeterministically(duplicateSuggestion("SV-2026-0001"), context);
    expect(result).toEqual({ valid: true });
  });

  it("rejects a case number that doesn't exist", () => {
    const context = contextWithCases({});
    const result = validateSuggestionDeterministically(duplicateSuggestion("SV-2026-9999"), context);
    expect(result.valid).toBe(false);
  });

  it("rejects a case being marked as a duplicate of itself", () => {
    const context = contextWithCases({ [TARGET_CASE_NUMBER]: TARGET_COMMUNITY_ID });
    const result = validateSuggestionDeterministically(duplicateSuggestion(TARGET_CASE_NUMBER), context);
    expect(result.valid).toBe(false);
  });

  it("rejects a real case number that belongs to a different community", () => {
    const context = contextWithCases({ "RD-2026-0001": "riverbend-demo" });
    const result = validateSuggestionDeterministically(duplicateSuggestion("RD-2026-0001"), context);
    expect(result.valid).toBe(false);
  });
});

describe("validateSuggestionDeterministically — status", () => {
  const context = contextWithCases({});

  it("accepts a real status value", () => {
    const suggestion: CaseAnalysisSuggestion = { kind: "status", suggestedValue: "in_progress", reasoning: "x" };
    expect(validateSuggestionDeterministically(suggestion, context)).toEqual({ valid: true });
  });

  it("rejects an invalid status value", () => {
    const suggestion: CaseAnalysisSuggestion = { kind: "status", suggestedValue: "not_a_real_status", reasoning: "x" };
    expect(validateSuggestionDeterministically(suggestion, context).valid).toBe(false);
  });
});

describe("validateSuggestionDeterministically — verification", () => {
  const context = contextWithCases({});

  it("accepts needs_verification", () => {
    const suggestion: CaseAnalysisSuggestion = { kind: "verification", suggestedValue: "needs_verification", reasoning: "x" };
    expect(validateSuggestionDeterministically(suggestion, context)).toEqual({ valid: true });
  });

  it("rejects an invalid verification value", () => {
    const suggestion: CaseAnalysisSuggestion = { kind: "verification", suggestedValue: "not_a_real_state", reasoning: "x" };
    expect(validateSuggestionDeterministically(suggestion, context).valid).toBe(false);
  });

  it("rejects officially_verified — an AI agent can never suggest it, evidence or not", () => {
    const suggestion: CaseAnalysisSuggestion = {
      kind: "verification",
      suggestedValue: "officially_verified",
      reasoning: "quotes a very specific claim from the description",
    };
    const result = validateSuggestionDeterministically(suggestion, context);
    expect(result.valid).toBe(false);
    expect(result.valid === false && result.reason).toMatch(/officially_verified/);
  });
});
