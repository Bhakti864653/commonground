import { ReportStatusSchema, VerificationStateSchema } from "@/lib/schema/report";
import type { CaseAnalysisSuggestion } from "./case-analysis";

export type ValidationResult = { valid: true } | { valid: false; reason: string };

export type SuggestionValidationContext = {
  targetCaseNumber: string;
  targetCommunityId: string;
  /** Returns the real community id for a case number that actually exists, else undefined. */
  lookupCaseCommunity: (caseNumber: string) => string | undefined;
};

/**
 * The real safety boundary for every agent suggestion — a Groq model (the specialist agents,
 * the critique agent) is never trusted as the last word, since any of them can hallucinate a
 * case number or a value outside a real enum. This is pure and synchronous specifically so it
 * can run identically before AND after the critique model call (case-analysis.ts's
 * orchestrator), and so it's unit-testable without a live API key.
 */
export function validateSuggestionDeterministically(
  suggestion: CaseAnalysisSuggestion,
  context: SuggestionValidationContext,
): ValidationResult {
  if (suggestion.kind === "duplicate") {
    if (suggestion.suggestedValue === context.targetCaseNumber) {
      return { valid: false, reason: "A case cannot be a duplicate of itself." };
    }
    const duplicateCommunityId = context.lookupCaseCommunity(suggestion.suggestedValue);
    if (duplicateCommunityId === undefined) {
      return { valid: false, reason: "References a case number that doesn't exist." };
    }
    if (duplicateCommunityId !== context.targetCommunityId) {
      return { valid: false, reason: "References a case from a different community." };
    }
    return { valid: true };
  }

  if (suggestion.kind === "status") {
    if (!ReportStatusSchema.safeParse(suggestion.suggestedValue).success) {
      return { valid: false, reason: "Not a real status value." };
    }
    return { valid: true };
  }

  if (suggestion.kind === "verification") {
    const parsed = VerificationStateSchema.safeParse(suggestion.suggestedValue);
    if (!parsed.success) {
      return { valid: false, reason: "Not a real verification value." };
    }
    if (parsed.data === "officially_verified") {
      return {
        valid: false,
        reason: "An AI agent can never suggest officially_verified without approved evidence.",
      };
    }
    return { valid: true };
  }

  return { valid: false, reason: "Unknown suggestion kind." };
}

export function filterDeterministicallyValid(
  suggestions: CaseAnalysisSuggestion[],
  context: SuggestionValidationContext,
): CaseAnalysisSuggestion[] {
  return suggestions.filter((s) => validateSuggestionDeterministically(s, context).valid);
}
