import type Groq from "groq-sdk";
import { getGroqClient, GUIDE_MODEL } from "./groq-client";
import { TOOL_DEFINITIONS, communityContextBlock, executeTool } from "./tools";
import { getCaseByCaseNumber } from "@/lib/store/case-store";
import { ReportStatusSchema, VerificationStateSchema } from "@/lib/schema/report";
import { z } from "zod";

const MAX_STEPS = 4;

const RECORD_SUGGESTIONS_TOOL: Groq.Chat.Completions.ChatCompletionTool = {
  type: "function",
  function: {
    name: "record_suggestions",
    description:
      "Record your final suggestions for a moderator to review. Call this once you're done " +
      "reasoning, even if your conclusion is that there are no suggestions (pass an empty array).",
    parameters: {
      type: "object",
      properties: {
        suggestions: {
          type: "array",
          items: {
            type: "object",
            properties: {
              kind: { type: "string", enum: ["duplicate", "status", "verification"] },
              suggestedValue: {
                type: "string",
                description:
                  "A case number for 'duplicate' (from search_similar_cases/get_case_details " +
                  "only, never invented), or the exact enum value for 'status'/'verification'.",
              },
              reasoning: { type: "string", description: "One or two sentences, grounded in the case/tool data." },
            },
            required: ["kind", "suggestedValue", "reasoning"],
            additionalProperties: false,
          },
        },
      },
      required: ["suggestions"],
      additionalProperties: false,
    },
  },
};

const RawSuggestionSchema = z.object({
  kind: z.enum(["duplicate", "status", "verification"]),
  suggestedValue: z.string(),
  reasoning: z.string(),
});

export type CaseAnalysisSuggestion = z.infer<typeof RawSuggestionSchema>;

const SYSTEM_PROMPT = `You are the CommonGround Guide's case-analysis assistant. You help a
human moderator by drafting suggestions — you never change anything yourself; a moderator must
approve every suggestion before it takes effect.

Rules (never break these):
- Never invent a case number — only reference one returned by search_similar_cases or
  get_case_details.
- A "duplicate" suggestion's suggestedValue must be another real case's number, never the case
  being analyzed itself.
- A "status" suggestedValue must be exactly one of: ${ReportStatusSchema.options.join(", ")}.
- A "verification" suggestedValue must be exactly one of: ${VerificationStateSchema.options.join(", ")}.
- Only suggest "verification": "officially_verified" if the case description itself already
  contains a specific, checkable claim your reasoning quotes — never speculate.
- If you have no real suggestion for a category, don't emit one. An empty list is a fine,
  honest answer.
- Ground every "reasoning" in the actual case description or tool results — never speculate
  about facts the community's config/case data doesn't contain.
- You may call search_similar_cases and get_case_details as many times as useful (up to a
  point), but you must finish by calling record_suggestions exactly once.`;

/**
 * Bounded agentic loop: the model can call tools up to MAX_STEPS times before it must call
 * `record_suggestions`. Nothing here ever mutates a case — see case-store.ts's
 * `addAgentSuggestions`, which only ever appends pending suggestions a moderator still has to
 * act on.
 */
export async function analyzeCaseForSuggestions(
  caseNumber: string,
): Promise<CaseAnalysisSuggestion[]> {
  const client = getGroqClient();
  if (!client) return [];

  const targetCase = getCaseByCaseNumber(caseNumber);
  if (!targetCase) return [];

  const messages: Groq.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "user",
      content: `${communityContextBlock(targetCase.communityId)}\n\nCase to analyze:\n${JSON.stringify(
        {
          caseNumber: targetCase.publicCaseNumber,
          type: targetCase.type,
          categoryId: targetCase.categoryId,
          description: targetCase.description,
          status: targetCase.status,
          verificationState: targetCase.verificationState,
        },
      )}`,
    },
  ];

  for (let step = 0; step < MAX_STEPS; step++) {
    const completion = await client.chat.completions.create({
      model: GUIDE_MODEL,
      messages,
      tools: [...TOOL_DEFINITIONS, RECORD_SUGGESTIONS_TOOL],
      tool_choice: step === MAX_STEPS - 1 ? { type: "function", function: { name: "record_suggestions" } } : "auto",
    });

    const message = completion.choices[0]?.message;
    if (!message) break;
    messages.push(message);

    const toolCalls = message.tool_calls ?? [];
    if (toolCalls.length === 0) break;

    for (const call of toolCalls) {
      if (call.function.name === "record_suggestions") {
        try {
          const parsed = JSON.parse(call.function.arguments);
          return z.array(RawSuggestionSchema).parse(parsed.suggestions ?? []);
        } catch {
          return [];
        }
      }
      const result = await executeTool(call.function.name, call.function.arguments, {
        communityId: targetCase.communityId,
        excludeCaseNumber: targetCase.publicCaseNumber,
      });
      messages.push({
        role: "tool",
        tool_call_id: call.id,
        content: JSON.stringify(result),
      });
    }
  }

  return [];
}
