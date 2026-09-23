import { z } from "zod";
import { getGroqClient } from "./groq-client";
import { getCaseByCaseNumber } from "@/lib/store/case-store";
import { runDuplicateAgent, runStatusAgent, runVerificationAgent } from "./sub-agents";
import { critiqueSuggestions } from "./critique";
import { validateSuggestionDeterministically, type SuggestionValidationContext } from "./suggestion-validation";
import type { AgentTraceStep } from "./sub-agents";

export type { AgentTraceStep };

const RawSuggestionSchema = z.object({
  kind: z.enum(["duplicate", "status", "verification"]),
  suggestedValue: z.string(),
  reasoning: z.string(),
});

export type CaseAnalysisSuggestion = z.infer<typeof RawSuggestionSchema>;

/**
 * `kind` doubles as "which specialist produced this" — each of the three agents in
 * sub-agents.ts only ever emits its own kind, so no separate producer field is needed.
 */
export type SuggestionDecision = {
  kind: CaseAnalysisSuggestion["kind"];
  suggestedValue: string;
  reasoning: string;
  finalDecision: "kept" | "rejected_deterministic" | "rejected_critique";
  reason: string;
};

export type CaseAnalysisResult = {
  suggestions: CaseAnalysisSuggestion[];
  trace: AgentTraceStep[];
  /** The full decision trail for every candidate, including ones that never reached critique. */
  decisions: SuggestionDecision[];
};

type SubAgentResult = { suggestion: CaseAnalysisSuggestion | null; trace: AgentTraceStep };

/**
 * One specialist throwing (a Groq network error, a timeout) must never take down the other two
 * — `Promise.all` alone would reject the whole batch on a single rejection. Wrapping each call
 * so it can never reject turns a partial failure into "this specialist found nothing," which is
 * always a safe fallback (worst case, a moderator gets fewer suggestions this run, not a crash).
 */
async function runAgentSafely(
  agent: AgentTraceStep["agent"],
  fn: () => Promise<SubAgentResult>,
): Promise<SubAgentResult> {
  try {
    return await fn();
  } catch {
    return {
      suggestion: null,
      trace: { agent, toolCalls: [], outcome: "This specialist failed to run and was skipped." },
    };
  }
}

/**
 * Orchestrator for a small multi-agent system: three independent specialist agents
 * (duplicate/status/verification, sub-agents.ts) run concurrently over the same case — each one
 * only reasons about its own narrow question, with only the tools it actually needs. Every raw
 * candidate then runs through deterministic validation (suggestion-validation.ts) BEFORE it ever
 * reaches the critique model, and every critique-kept suggestion runs through the same
 * deterministic check again AFTER — the critique model is a soft second opinion on reasoning
 * quality, never the actual safety boundary. Nothing here ever mutates a case; see
 * case-store.ts's `addAgentSuggestions`, which only ever appends pending suggestions a moderator
 * still has to act on.
 */
export async function analyzeCaseForSuggestions(caseNumber: string): Promise<CaseAnalysisResult> {
  const client = getGroqClient();
  if (!client) return { suggestions: [], trace: [], decisions: [] };

  const targetCase = getCaseByCaseNumber(caseNumber);
  if (!targetCase) return { suggestions: [], trace: [], decisions: [] };

  const [duplicate, status, verification] = await Promise.all([
    runAgentSafely("duplicate", () => runDuplicateAgent(client, targetCase)),
    runAgentSafely("status", () => runStatusAgent(client, targetCase)),
    runAgentSafely("verification", () => runVerificationAgent(client, targetCase)),
  ]);

  // A final schema-level guard on each candidate, even though each sub-agent already builds a
  // well-typed object — never trust it just because it should already be valid.
  const candidates = [duplicate.suggestion, status.suggestion, verification.suggestion].filter(
    (s): s is CaseAnalysisSuggestion => s !== null && RawSuggestionSchema.safeParse(s).success,
  );

  const context: SuggestionValidationContext = {
    targetCaseNumber: targetCase.publicCaseNumber,
    targetCommunityId: targetCase.communityId,
    lookupCaseCommunity: (n) => getCaseByCaseNumber(n)?.communityId,
  };

  const decisions: SuggestionDecision[] = [];
  const deterministicallyValid: CaseAnalysisSuggestion[] = [];

  for (const candidate of candidates) {
    const result = validateSuggestionDeterministically(candidate, context);
    if (result.valid) {
      deterministicallyValid.push(candidate);
    } else {
      decisions.push({
        kind: candidate.kind,
        suggestedValue: candidate.suggestedValue,
        reasoning: candidate.reasoning,
        finalDecision: "rejected_deterministic",
        reason: result.reason,
      });
    }
  }

  const { decisions: critiqueDecisions, trace: critiqueTrace } = await critiqueSuggestions(
    client,
    targetCase,
    deterministicallyValid,
  );

  const kept: CaseAnalysisSuggestion[] = [];
  for (const cd of critiqueDecisions) {
    if (cd.decision === "discard") {
      decisions.push({
        kind: cd.suggestion.kind,
        suggestedValue: cd.suggestion.suggestedValue,
        reasoning: cd.suggestion.reasoning,
        finalDecision: "rejected_critique",
        reason: cd.reason,
      });
      continue;
    }
    // Post-validation: re-check even a critique-kept suggestion before it's final — the
    // critique model's "keep" is never the last word either.
    const revalidated = validateSuggestionDeterministically(cd.suggestion, context);
    if (revalidated.valid) {
      kept.push(cd.suggestion);
      decisions.push({
        kind: cd.suggestion.kind,
        suggestedValue: cd.suggestion.suggestedValue,
        reasoning: cd.suggestion.reasoning,
        finalDecision: "kept",
        reason: cd.reason,
      });
    } else {
      decisions.push({
        kind: cd.suggestion.kind,
        suggestedValue: cd.suggestion.suggestedValue,
        reasoning: cd.suggestion.reasoning,
        finalDecision: "rejected_deterministic",
        reason: revalidated.reason,
      });
    }
  }

  return {
    suggestions: kept,
    trace: [duplicate.trace, status.trace, verification.trace, critiqueTrace],
    decisions,
  };
}
