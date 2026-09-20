"use server";

import { requireAdmin } from "@/lib/admin/auth";
import { analyzeCaseForSuggestions } from "./case-analysis";
import {
  addAgentSuggestions,
  changeCaseStatus,
  getCaseByCaseNumber,
  markDuplicate,
  setAgentSuggestionStatus,
  setVerificationState,
} from "@/lib/store/case-store";
import { ReportStatusSchema, VerificationStateSchema } from "@/lib/schema/report";

const ACTOR_ID = "guide-agent";

export async function runCaseAnalysis(caseNumber: string): Promise<boolean> {
  await requireAdmin();
  const suggestions = await analyzeCaseForSuggestions(caseNumber);
  if (suggestions.length === 0) return true;
  return addAgentSuggestions(caseNumber, suggestions);
}

/**
 * Approving a suggestion never does anything a moderator couldn't already do directly — it
 * calls the exact same `changeCaseStatus`/`setVerificationState`/`markDuplicate` functions the
 * ModerationPanel's own buttons call. The Guide only ever gets to *draft* one of these calls;
 * a human click is what actually runs it.
 */
export async function reviewAgentSuggestion(
  caseNumber: string,
  suggestionId: string,
  decision: "approve" | "reject",
): Promise<boolean> {
  await requireAdmin();

  if (decision === "reject") {
    return setAgentSuggestionStatus(caseNumber, suggestionId, "rejected");
  }

  const found = getCaseByCaseNumber(caseNumber);
  const suggestion = found?.agentSuggestions.find((s) => s.id === suggestionId);
  if (!suggestion || suggestion.status !== "pending") return false;

  let applied = false;
  if (suggestion.kind === "duplicate") {
    applied = markDuplicate(caseNumber, suggestion.suggestedValue, ACTOR_ID);
  } else if (suggestion.kind === "status") {
    const parsed = ReportStatusSchema.safeParse(suggestion.suggestedValue);
    applied = parsed.success && changeCaseStatus(caseNumber, parsed.data, ACTOR_ID);
  } else if (suggestion.kind === "verification") {
    const parsed = VerificationStateSchema.safeParse(suggestion.suggestedValue);
    applied = parsed.success && setVerificationState(caseNumber, parsed.data, ACTOR_ID);
  }

  if (!applied) return false;
  return setAgentSuggestionStatus(caseNumber, suggestionId, "approved");
}
