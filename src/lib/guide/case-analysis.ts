import { z } from "zod";
import { getGroqClient } from "./groq-client";
import { getCaseByCaseNumber } from "@/lib/store/case-store";
import { runDuplicateAgent, runStatusAgent, runVerificationAgent } from "./sub-agents";
import { critiqueSuggestions } from "./critique";
import type { AgentTraceStep } from "./sub-agents";

export type { AgentTraceStep };

const RawSuggestionSchema = z.object({
  kind: z.enum(["duplicate", "status", "verification"]),
  suggestedValue: z.string(),
  reasoning: z.string(),
});

export type CaseAnalysisSuggestion = z.infer<typeof RawSuggestionSchema>;

export type CaseAnalysisResult = {
  suggestions: CaseAnalysisSuggestion[];
  trace: AgentTraceStep[];
};

/**
 * Orchestrator for a small multi-agent system: three independent specialist agents
 * (duplicate/status/verification, sub-agents.ts) run concurrently over the same case — each one
 * only reasons about its own narrow question, with only the tools it actually needs — then a
 * critique agent (critique.ts) reviews the combined output before anything reaches a moderator.
 * Nothing here ever mutates a case; see case-store.ts's `addAgentSuggestions`, which only ever
 * appends pending suggestions a moderator still has to act on.
 */
export async function analyzeCaseForSuggestions(caseNumber: string): Promise<CaseAnalysisResult> {
  const client = getGroqClient();
  if (!client) return { suggestions: [], trace: [] };

  const targetCase = getCaseByCaseNumber(caseNumber);
  if (!targetCase) return { suggestions: [], trace: [] };

  const [duplicate, status, verification] = await Promise.all([
    runDuplicateAgent(client, targetCase),
    runStatusAgent(client, targetCase),
    runVerificationAgent(client, targetCase),
  ]);

  // A final schema-level guard on the merged output, even though each sub-agent already builds
  // a well-typed object — never trust it just because it should already be valid.
  const raw = z
    .array(RawSuggestionSchema)
    .parse(
      [duplicate.suggestion, status.suggestion, verification.suggestion].filter(
        (s): s is CaseAnalysisSuggestion => s !== null,
      ),
    );

  const { kept, trace: critiqueTrace } = await critiqueSuggestions(client, targetCase, raw);

  return {
    suggestions: kept,
    trace: [duplicate.trace, status.trace, verification.trace, critiqueTrace],
  };
}
