import type Groq from "groq-sdk";
import { z } from "zod";
import { GUIDE_MODEL } from "./groq-client";
import type { Case } from "@/lib/schema/report";
import type { CaseAnalysisSuggestion } from "./case-analysis";
import type { AgentTraceStep } from "./sub-agents";

export type CritiqueDecision = {
  suggestion: CaseAnalysisSuggestion;
  decision: "keep" | "discard";
  reason: string;
};

const CRITIQUE_TOOL: Groq.Chat.Completions.ChatCompletionTool = {
  type: "function",
  function: {
    name: "record_critique",
    description:
      "Record your keep/discard verdict for every candidate suggestion, in the same order " +
      "they were given. Call this exactly once, one verdict per candidate.",
    parameters: {
      type: "object",
      properties: {
        verdicts: {
          type: "array",
          items: {
            type: "object",
            properties: {
              index: { type: "number", description: "0-based index into the candidate list you were given." },
              decision: { type: "string", enum: ["keep", "discard"] },
              reason: { type: "string" },
            },
            required: ["index", "decision", "reason"],
            additionalProperties: false,
          },
        },
      },
      required: ["verdicts"],
      additionalProperties: false,
    },
  },
};

const CritiqueArgsSchema = z.object({
  verdicts: z.array(
    z.object({
      index: z.number(),
      decision: z.enum(["keep", "discard"]),
      reason: z.string(),
    }),
  ),
});

const SYSTEM_PROMPT = `You are a critique agent — a second opinion reviewing another agent's
draft suggestions before a human moderator ever sees them. Every candidate you're given has
already passed hard, deterministic validation (real case numbers, real enum values, no
self-duplicates) — your job is judging reasoning quality, not re-checking those facts.

Duplicate, status, and verification are independent dimensions of the same case, not
alternatives — a case can genuinely be a likely duplicate AND need verification AND warrant a
status change, all at once. Do NOT discard a suggestion just because another specialist also
made one; only discard two suggestions against each other if their actual values are logically
impossible together (e.g. two different suggested statuses would need to both be true at once,
which can't happen here since each specialist only ever produces one suggestion of its own
kind). A tool-grounded duplicate match is real evidence — never prefer an unsupported or vaguely
reasoned suggestion over one backed by an actual tool result.

For each candidate, decide keep or discard on reasoning quality alone:
- A "status" suggestion must be grounded in real evidence in the description, not a guess.
- A "needs_verification" suggestion's reasoning must quote a specific, checkable claim from the
  case description — discard it if the reasoning is vague or speculative.
- A "duplicate" suggestion backed by a real tool call result should normally be kept.
Discard anything that fails these checks, even if it looks reasonable on the surface. You must
finish by calling record_critique exactly once, with one verdict per candidate.`;

/**
 * A soft second opinion on reasoning quality — NOT the hard safety net. `raw` must already be
 * deterministically valid (case-analysis.ts's orchestrator runs
 * `suggestion-validation.ts`'s `filterDeterministicallyValid` before ever calling this, and
 * again on this function's own output, so this model call is never the last line of defense).
 * Returns a decision *for every candidate*, not just the survivors, so the trace UI can show
 * exactly what happened to each one, including a short reason for a rejection.
 */
export async function critiqueSuggestions(
  client: Groq,
  targetCase: Case,
  raw: CaseAnalysisSuggestion[],
): Promise<{ decisions: CritiqueDecision[]; trace: AgentTraceStep }> {
  if (raw.length === 0) {
    return { decisions: [], trace: { agent: "critique", toolCalls: [], outcome: "No suggestions to critique." } };
  }

  try {
    const completion = await client.chat.completions.create({
      model: GUIDE_MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Case description:\n${targetCase.description}\n\nCandidate suggestions:\n${JSON.stringify(
            raw.map((s, index) => ({ index, kind: s.kind, suggestedValue: s.suggestedValue, reasoning: s.reasoning })),
          )}`,
        },
      ],
      tools: [CRITIQUE_TOOL],
      tool_choice: { type: "function", function: { name: "record_critique" } },
    });

    const call = completion.choices[0]?.message?.tool_calls?.[0];
    if (!call) throw new Error("No critique tool call returned");
    const parsed = CritiqueArgsSchema.parse(JSON.parse(call.function.arguments));

    let discardedCount = 0;
    const decisions: CritiqueDecision[] = raw.map((suggestion, index) => {
      // A candidate the critic never addressed is kept by default — fail open per-item too.
      const verdict = parsed.verdicts.find((v) => v.index === index);
      if (!verdict || verdict.decision === "keep") {
        return { suggestion, decision: "keep", reason: verdict?.reason ?? "No objection raised." };
      }
      discardedCount++;
      return { suggestion, decision: "discard", reason: verdict.reason };
    });

    const outcome =
      discardedCount > 0
        ? `Kept ${raw.length - discardedCount} of ${raw.length} suggestion(s); discarded ${discardedCount}.`
        : `Kept all ${raw.length} suggestion(s).`;

    return { decisions, trace: { agent: "critique", toolCalls: [], outcome } };
  } catch {
    return {
      decisions: raw.map((suggestion) => ({
        suggestion,
        decision: "keep",
        reason: "Critique unavailable — kept unchanged (already passed deterministic validation).",
      })),
      trace: { agent: "critique", toolCalls: [], outcome: "Critique unavailable — kept all suggestions unchanged." },
    };
  }
}
