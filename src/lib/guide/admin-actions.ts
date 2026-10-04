"use server";

import { requireAdmin } from "@/lib/admin/auth";
import { analyzeCaseForSuggestions, type AgentTraceStep, type SuggestionDecision } from "./case-analysis";
import { generateCommunityBriefing, type CommunityBriefing } from "./briefing";
import {
  addAgentSuggestions,
  approveReferral,
  changeCaseStatus,
  getCaseByCaseNumber,
  markDuplicate,
  rejectReferral,
  setAgentSuggestionStatus,
  setVerificationState,
} from "@/lib/store/case-store";
import { ReportStatusSchema, VerificationStateSchema } from "@/lib/schema/report";
import { getCommunity } from "@/lib/store/community-store";
import { validateReferralMessage } from "./referral/validate";

const ACTOR_ID = "guide-agent";
/** Referral decisions are a moderator's own call, not the Guide's — same id the manual panel uses. */
const ACTOR_ID_MODERATOR = "admin";

export async function runCaseAnalysis(
  caseNumber: string,
): Promise<{ ok: boolean; trace: AgentTraceStep[]; decisions: SuggestionDecision[] }> {
  await requireAdmin();
  const { suggestions, trace, decisions } = await analyzeCaseForSuggestions(caseNumber);
  const ok = suggestions.length === 0 ? true : addAgentSuggestions(caseNumber, suggestions);
  return { ok, trace, decisions };
}

export async function generateBriefingAction(communityId: string): Promise<CommunityBriefing | null> {
  await requireAdmin();
  return generateCommunityBriefing(communityId);
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
    const target = getCaseByCaseNumber(caseNumber)?.agentSuggestions.find((s) => s.id === suggestionId);
    if (target?.kind === "referral") return false;
    return setAgentSuggestionStatus(caseNumber, suggestionId, "rejected");
  }

  const found = getCaseByCaseNumber(caseNumber);
  const suggestion = found?.agentSuggestions.find((s) => s.id === suggestionId);
  // Referrals have their own review path (reviewReferral), which records the public outcome.
  if (!suggestion || suggestion.status !== "pending" || suggestion.kind === "referral") return false;

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

export type ReferralReviewResult = { ok: true } | { ok: false; reason: string };

/**
 * Approve (with the moderator's final message) or reject a referral the pipeline prepared.
 * The edited message passes the same checks as the AI's draft, and the office must still be a
 * verified, non-emergency contact — contacts can change between drafting and approval.
 * Approving never contacts the office: the moderator delivers the message by hand.
 */
export async function reviewReferral(
  caseNumber: string,
  suggestionId: string,
  decision: "approve" | "reject",
  editedMessage?: string,
): Promise<ReferralReviewResult> {
  await requireAdmin();
  if (typeof caseNumber !== "string" || typeof suggestionId !== "string") return { ok: false, reason: "Invalid request." };

  if (decision === "reject") {
    return rejectReferral(caseNumber, suggestionId, ACTOR_ID_MODERATOR)
      ? { ok: true }
      : { ok: false, reason: "This referral is no longer pending." };
  }

  const found = getCaseByCaseNumber(caseNumber);
  const suggestion = found?.agentSuggestions.find((s) => s.id === suggestionId);
  if (!found || !suggestion?.referral) return { ok: false, reason: "This referral is no longer pending." };

  const message = typeof editedMessage === "string" ? editedMessage.trim() : suggestion.referral.message;
  const validation = validateReferralMessage(message, caseNumber);
  if (!validation.valid) return { ok: false, reason: validation.reason };

  const contact = getCommunity(found.communityId)?.officialContacts.find((c) => c.id === suggestion.referral?.contactId);
  if (!contact || !contact.verified || contact.isEmergencyService) {
    return { ok: false, reason: "The office is no longer a verified, non-emergency contact. Reject this referral instead." };
  }

  return approveReferral(caseNumber, suggestionId, message, ACTOR_ID_MODERATOR)
    ? { ok: true }
    : { ok: false, reason: "This referral is no longer pending." };
}
