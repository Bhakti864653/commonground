import type Groq from "groq-sdk";
import { z } from "zod";
import type { Case } from "@/lib/schema/report";
import type { CommunityConfig } from "@/lib/schema/community";
import { getReferralOffice, REFERRAL_OFFICE_IDS } from "@/data/referral-offices";
import { detectEmergencyPhrase } from "@/lib/guide/emergency";
import { runToolAgent, type AgentRunResult } from "../agent-runner";
import { closeAlternatives, needsModeratorDecision, ruleBasedPriority, ruleBasedRoute, scoreOffices } from "../routing-rules";
import { UNTRUSTED_DATA_RULE, looksLikePromptInjection } from "../untrusted";
import { PrioritySchema, RoutingPayloadSchema, type Priority, type RoutingPayload } from "../types";
import { caseBlock, caseReadTools, DUPLICATE_THRESHOLD, findSimilarCases, officeListForPrompt } from "./context";

/**
 * Routing Agent: which office would be responsible, how urgent it is, how sure it is, and
 * whether this duplicates an open case. It can look things up (searchSimilarCases, getCase) and
 * must finish with proposeRouting. Its answer is only a proposal: a moderator accepts or changes
 * it. Code, not the model, decides when a moderator must choose (low confidence or several
 * offices fit), keeps emergencies urgent, and keeps only duplicates that really exist.
 */

const ProposeRoutingArgs = z.object({
  officeId: z.string(),
  reason: z.string().min(1).max(500),
  priority: PrioritySchema,
  priorityReason: z.string().min(1).max(500),
  confidence: z.number().min(0).max(1),
  alternativeOfficeIds: z.array(z.string()).max(3).default([]),
  possibleDuplicates: z.array(z.object({ caseNumber: z.string(), score: z.number().min(0).max(1) })).max(5).default([]),
});
type ProposeRoutingArgs = z.infer<typeof ProposeRoutingArgs>;

const PRIORITY_RANK: Record<Priority, number> = { low: 0, medium: 1, high: 2, urgent: 3 };

export type RoutingOutcome = {
  payload: RoutingPayload;
  toolCalls: string[];
  /** Set when the AI failed and the rule-based route was used instead. */
  failureNote?: string;
};

export async function runRoutingAgent(client: Groq | null, c: Case, community: CommunityConfig | undefined, now: Date): Promise<RoutingOutcome> {
  const emergency = detectEmergencyPhrase(c.description);
  const injectionSuspected = looksLikePromptInjection(c.description);
  const rules = ruleBasedRoute(c.description, c.categoryId);
  const rulesPriority = ruleBasedPriority(c.description, emergency, c.type === "proposal");
  const similar = await findSimilarCases(c, now);
  const realDuplicates = similar.filter((s) => s.score >= DUPLICATE_THRESHOLD);

  let result: AgentRunResult<ProposeRoutingArgs> | null = null;
  if (client) {
    const scores = scoreOffices(c.description, c.categoryId);
    result = await runToolAgent({
      client,
      system: `You are the Routing Agent of CommonGround, an independent community project (a student
demo). Decide which office would be responsible for a resident's report, from this fixed list only:
${officeListForPrompt()}

Also set a priority: "urgent" only if people may be in danger right now (injury, fire, collapse,
live wires, flooding with people at risk); "high" for a real risk to safety or health, or a
problem affecting many people now; "medium" for a real problem that has lasted a while or keeps
coming back; "low" for everything else, including proposals.

Give a confidence from 0 to 1. If two offices could reasonably handle it, list the others in
alternativeOfficeIds and lower your confidence. Call searchSimilarCases once to check for
duplicates; list in possibleDuplicates only cases that describe the same problem in the same
place, with their score. Keep reasons to one sentence, in English, based only on the report.

A keyword-based ranking (a hint, not the answer): ${JSON.stringify(scores)}.

${UNTRUSTED_DATA_RULE}

Finish by calling proposeRouting.`,
      user: caseBlock(c, community, now),
      readTools: caseReadTools(c, now),
      finalTool: {
        name: "proposeRouting",
        description: "Propose the office, priority, confidence and possible duplicates. A moderator reviews it.",
        parameters: {
          type: "object",
          properties: {
            officeId: { type: "string", enum: REFERRAL_OFFICE_IDS },
            reason: { type: "string", description: "One sentence: why this office." },
            priority: { type: "string", enum: PrioritySchema.options },
            priorityReason: { type: "string", description: "One sentence: why this priority." },
            confidence: { type: "number", minimum: 0, maximum: 1 },
            alternativeOfficeIds: { type: "array", items: { type: "string", enum: REFERRAL_OFFICE_IDS } },
            possibleDuplicates: {
              type: "array",
              items: {
                type: "object",
                properties: { caseNumber: { type: "string" }, score: { type: "number" } },
                required: ["caseNumber", "score"],
                additionalProperties: false,
              },
            },
          },
          required: ["officeId", "reason", "priority", "priorityReason", "confidence"],
          additionalProperties: false,
        },
        schema: ProposeRoutingArgs,
        validate: (v) => {
          if (!getReferralOffice(v.officeId)) return `officeId must be one of ${REFERRAL_OFFICE_IDS.join(", ")}`;
          const unknown = v.alternativeOfficeIds.find((id) => !getReferralOffice(id));
          return unknown ? `unknown alternative office ${unknown}` : null;
        },
      },
    });
  }

  if (result?.ok) {
    const v = result.value;
    // An emergency stays urgent, and the AI can't rank a case below the rule-based floor for real risks.
    let priority = v.priority;
    let priorityReason = v.priorityReason;
    if (emergency) {
      priority = "urgent";
      priorityReason = rulesPriority.reason;
    } else if (PRIORITY_RANK[rulesPriority.priority] >= PRIORITY_RANK.high && PRIORITY_RANK[priority] < PRIORITY_RANK[rulesPriority.priority]) {
      priority = rulesPriority.priority;
      priorityReason = `${v.priorityReason} Raised by the safety rules: ${rulesPriority.reason}`;
    }
    const alternatives = [...new Set(v.alternativeOfficeIds.filter((id) => id !== v.officeId))];
    // Only duplicates that really exist in this community's open cases, with the measured score.
    const duplicates = mergeDuplicates(
      v.possibleDuplicates.flatMap((d) => {
        const real = similar.find((s) => s.caseNumber === d.caseNumber);
        return real ? [{ caseNumber: real.caseNumber, score: real.score }] : [];
      }),
      realDuplicates,
    );
    return {
      payload: RoutingPayloadSchema.parse({
        officeId: v.officeId,
        reason: v.reason,
        priority,
        priorityReason,
        confidence: Math.round(v.confidence * 100) / 100,
        alternativeOfficeIds: alternatives,
        needsModeratorDecision: needsModeratorDecision(v.confidence, alternatives) || injectionSuspected,
        possibleDuplicates: duplicates,
        injectionSuspected,
        source: "ai",
      }),
      toolCalls: result.toolCalls,
    };
  }

  const office = getReferralOffice(rules.officeId)!;
  const alternatives = closeAlternatives(scoreOffices(c.description, c.categoryId), rules.officeId);
  return {
    payload: RoutingPayloadSchema.parse({
      officeId: rules.officeId,
      reason: rules.matched.length
        ? `Rule-based: the category and the words ${rules.matched.slice(0, 4).map((w) => `"${w}"`).join(", ")} point to ${office.name}.`
        : `Rule-based: the category points to ${office.name}.`,
      priority: rulesPriority.priority,
      priorityReason: `Rule-based: ${rulesPriority.reason}`,
      confidence: rules.confidence,
      alternativeOfficeIds: alternatives,
      needsModeratorDecision: needsModeratorDecision(rules.confidence, alternatives) || injectionSuspected,
      possibleDuplicates: mergeDuplicates([], realDuplicates),
      injectionSuspected,
      source: "rules",
    }),
    toolCalls: result?.toolCalls ?? [],
    failureNote: client
      ? `${result && !result.ok ? result.message : "The AI didn't answer."} This is the rule-based suggestion instead — please check it.`
      : "The AI isn't configured on this server. This is the rule-based suggestion — please check it.",
  };
}

function mergeDuplicates(fromAgent: Array<{ caseNumber: string; score: number }>, measured: Array<{ caseNumber: string; score: number }>) {
  const byNumber = new Map<string, number>();
  for (const d of [...fromAgent, ...measured]) byNumber.set(d.caseNumber, Math.max(byNumber.get(d.caseNumber) ?? 0, d.score));
  return [...byNumber].map(([caseNumber, score]) => ({ caseNumber, score })).sort((a, b) => b.score - a.score).slice(0, 5);
}
