import type Groq from "groq-sdk";
import { z } from "zod";
import { GUIDE_MODEL } from "./groq-client";
import type { Case } from "@/lib/schema/report";
import type { CaseAnalysisSuggestion } from "./case-analysis";
import type { AgentTraceStep } from "./sub-agents";

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
draft suggestions before a human moderator ever sees them. For each candidate, decide keep or
discard against these rules:
- A "duplicate" suggestion must reference a real, different case — never the case itself.
- An "officially_verified" suggestion's reasoning must quote a specific, checkable claim from
  the case description — discard it if the reasoning is vague or speculative.
- A "status" suggestion must be grounded in real evidence in the description, not a guess.
- Suggestions must not contradict each other (e.g. marking the same case both a duplicate and
  officially verified is inconsistent — discard the weaker one if you see this).
Discard anything that fails these checks, even if it looks reasonable on the surface. You must
finish by calling record_critique exactly once, with one verdict per candidate.`;

/**
 * A soft second opinion on reasoning quality, not the hard safety net — the real enum/existence
 * validation already happens where each suggestion is built (sub-agents.ts) and again when a
 * moderator approves one (admin-actions.ts). Fails open on any error: keeping every raw
 * suggestion unchanged is always safe, since nothing here can execute anything by itself.
 */
export async function critiqueSuggestions(
  client: Groq,
  targetCase: Case,
  raw: CaseAnalysisSuggestion[],
): Promise<{ kept: CaseAnalysisSuggestion[]; trace: AgentTraceStep }> {
  if (raw.length === 0) {
    return { kept: [], trace: { agent: "critique", toolCalls: [], outcome: "No suggestions to critique." } };
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

    const kept: CaseAnalysisSuggestion[] = [];
    let discardedCount = 0;
    raw.forEach((candidate, index) => {
      // A candidate the critic never addressed is kept by default — fail open per-item too.
      const verdict = parsed.verdicts.find((v) => v.index === index);
      if (!verdict || verdict.decision === "keep") {
        kept.push(candidate);
      } else {
        discardedCount++;
      }
    });

    const outcome =
      discardedCount > 0
        ? `Kept ${kept.length} of ${raw.length} suggestion(s); discarded ${discardedCount}.`
        : `Kept all ${raw.length} suggestion(s).`;

    return { kept, trace: { agent: "critique", toolCalls: [], outcome } };
  } catch {
    return {
      kept: raw,
      trace: { agent: "critique", toolCalls: [], outcome: "Critique unavailable — kept all suggestions unchanged." },
    };
  }
}
