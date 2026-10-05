import Groq from "groq-sdk";
import { getGroqClient } from "@/lib/guide/groq-client";
import { detectEmergencyPhrase } from "@/lib/guide/emergency";
import { addReferralSuggestion, addTimelineEvent, getCaseByCaseNumber } from "@/lib/store/case-store";
import { getCommunity } from "@/lib/store/community-store";
import { classifyCase, critiqueReferral, draftReferral } from "./agents";
import { routeReferral } from "./route";
import { addCaseReference, formatReportDate, normalizeClassification, validateReferralMessage } from "./validate";
import { publicCaseUrl } from "@/lib/site-url";

export type ReferralStep = "classify" | "route" | "draft" | "critique";

export type ReferralPipelineResult =
  | { outcome: "prepared"; suggestionId: string; contactId: string; steps: ReferralStepTrace[] }
  | {
      outcome: "skipped";
      reason:
        | "case_not_found"
        | "no_routing"
        | "no_api_key"
        | "classify_failed"
        | "emergency"
        | "no_office"
        | "draft_failed"
        | "draft_invalid";
      steps: ReferralStepTrace[];
    };

export type ReferralStepTrace = { step: ReferralStep; outcome: string };

/** Server log only: the case number, the step, and an error status — never case text or keys. */
function logSkip(caseNumber: string, detail: string) {
  console.warn(`[referral-agent] ${caseNumber}: ${detail}`);
}

function describeError(error: unknown): string {
  if (error instanceof Groq.APIError) return `Groq ${error.status ?? "no status"}`;
  return error instanceof Error ? error.name : "unknown error";
}

/**
 * Same contract as case-analysis.ts's `runAgentSafely`: a step that throws (a Groq rate limit, a
 * timeout, unparseable output) never takes the pipeline down with it — it becomes `null`, a trace
 * line, and a log line, and the pipeline decides what that means for the remaining steps.
 */
async function runStepSafely<T>(
  caseNumber: string,
  step: ReferralStep,
  steps: ReferralStepTrace[],
  fn: () => Promise<T>,
): Promise<T | null> {
  try {
    return await fn();
  } catch (error) {
    const detail = describeError(error);
    steps.push({ step, outcome: `failed (${detail})` });
    logSkip(caseNumber, `${step} step failed: ${detail}`);
    return null;
  }
}

/**
 * classify → route → draft → critique, run after a case is submitted (see `submitCase`).
 *
 * - Nothing here changes a case's status or sends anything anywhere. The only writes are a
 *   pending "referral" suggestion a moderator must approve, and fixed-text public timeline
 *   entries saying what the AI did.
 * - Routing is deterministic (`routeReferral`); the model only explains it.
 * - The drafted message passes `validateReferralMessage` before it is stored; the critique adds
 *   notes for the moderator, it can't make an invalid message valid.
 * - Reports matching an emergency phrase get no referral: they belong with emergency services,
 *   which the resident was already shown, not in a queue for the municipal office.
 * - With no Groq key, or when classification fails, no public entry is written at all — the
 *   timeline only ever claims steps that really happened.
 */
export async function runReferralPipeline(caseNumber: string): Promise<ReferralPipelineResult> {
  const steps: ReferralStepTrace[] = [];
  const skip = (reason: Extract<ReferralPipelineResult, { outcome: "skipped" }>["reason"]) => {
    logSkip(caseNumber, `skipped (${reason})`);
    return { outcome: "skipped" as const, reason, steps };
  };

  const targetCase = await getCaseByCaseNumber(caseNumber);
  if (!targetCase) return skip("case_not_found");
  const community = getCommunity(targetCase.communityId);
  // A community with no routing (the fictional demo, any community a moderator set up) simply
  // doesn't use referrals yet; that's not an error worth logging.
  if (!community?.referralRouting?.length) return { outcome: "skipped", reason: "no_routing", steps };

  const client = getGroqClient();
  if (!client) return skip("no_api_key");

  const rawClassification = await runStepSafely(caseNumber, "classify", steps, () =>
    classifyCase(client, targetCase, community),
  );
  const classification = rawClassification
    ? normalizeClassification(rawClassification, community, targetCase.categoryId)
    : null;
  if (!classification) return skip("classify_failed");
  const emergency = detectEmergencyPhrase(targetCase.description);
  const urgency = emergency ? "high" : classification.urgency;
  steps.push({ step: "classify", outcome: `category ${classification.categoryAssessment}, urgency ${urgency}` });
  await addTimelineEvent(caseNumber, { kind: "ai_reviewed", actorType: "agent" });

  if (emergency) return skip("emergency");

  const office = routeReferral(community, targetCase.categoryId);
  if (!office) {
    steps.push({ step: "route", outcome: "no verified office for this category" });
    return skip("no_office");
  }
  steps.push({ step: "route", outcome: office.id });

  const draft = await runStepSafely(caseNumber, "draft", steps, () =>
    draftReferral(client, targetCase, community, office),
  );
  if (!draft) return skip("draft_failed");
  const caseUrl = publicCaseUrl(caseNumber);
  const message = addCaseReference(draft.message.trim(), formatReportDate(targetCase.createdAt), caseUrl);
  const validation = validateReferralMessage(message, caseNumber, caseUrl);
  if (!validation.valid) {
    steps.push({ step: "draft", outcome: `rejected: ${validation.reason}` });
    return skip("draft_invalid");
  }
  steps.push({ step: "draft", outcome: "valid" });

  const review = await runStepSafely(caseNumber, "critique", steps, () =>
    critiqueReferral(client, targetCase, community, message),
  );
  const reviewNote = !review
    ? "Review step unavailable — the message passed the automatic checks only."
    : review.verdict === "concerns"
      ? `Review concerns: ${review.concerns ?? "unspecified"}`
      : "Review found no problems.";
  if (review) steps.push({ step: "critique", outcome: review.verdict });

  const reasoning = [
    `Classification: ${classification.reasoning}`,
    `Urgency (${urgency}): ${emergency ? "matches an emergency phrase." : classification.urgencyReason}`,
    classification.categoryAssessment === "questioned"
      ? `Category questioned — "${classification.suggestedCategoryId}" may fit better.`
      : null,
    `Office: ${draft.routeExplanation}`,
    reviewNote,
  ]
    .filter(Boolean)
    .join("\n");

  const suggestion = await addReferralSuggestion(
    caseNumber,
    {
      contactId: office.id,
      urgency,
      urgencyReason: classification.urgencyReason,
      message,
      categoryAssessment: classification.categoryAssessment,
      suggestedCategoryId: classification.suggestedCategoryId,
    },
    reasoning,
  );
  if (!suggestion) return skip("draft_invalid");

  await addTimelineEvent(caseNumber, { kind: "referral_prepared", actorType: "agent", contactId: office.id });
  await addTimelineEvent(caseNumber, { kind: "awaiting_approval", actorType: "agent", contactId: office.id });
  return { outcome: "prepared", suggestionId: suggestion.id, contactId: office.id, steps };
}
