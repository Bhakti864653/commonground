import type Groq from "groq-sdk";
import { z } from "zod";
import { getGroqClient, GUIDE_MODEL } from "./groq-client";
import { communityContextBlock, summarizeCase } from "./tools";
import { listCasesForCommunity } from "@/lib/store/case-store";
import { getCommunity as getCommunityById } from "@/lib/store/community-store";

export type BriefingItem = {
  kind: "pattern" | "duplicate" | "stale" | "other";
  caseNumbers: string[];
  note: string;
};

export type CommunityBriefing = {
  items: BriefingItem[];
  generatedAt: string;
};

const MAX_STEPS = 4;

const LIST_CASES_TOOL: Groq.Chat.Completions.ChatCompletionTool = {
  type: "function",
  function: {
    name: "list_all_cases_for_briefing",
    description:
      "List every open case in this community (not excluding duplicates or any single case, " +
      "unlike search_similar_cases) so you can look for patterns across the whole case load.",
    parameters: { type: "object", properties: {}, additionalProperties: false },
  },
};

const RECORD_BRIEFING_TOOL: Groq.Chat.Completions.ChatCompletionTool = {
  type: "function",
  function: {
    name: "record_briefing",
    description:
      "Record your final briefing. Call this exactly once, even if you have nothing notable " +
      "to report (pass an empty items array).",
    parameters: {
      type: "object",
      properties: {
        items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              kind: { type: "string", enum: ["pattern", "duplicate", "stale", "other"] },
              caseNumbers: {
                type: "array",
                items: { type: "string" },
                description: "Real case numbers from list_all_cases_for_briefing only, never invented.",
              },
              note: { type: "string", description: "One or two sentences a moderator can act on." },
            },
            required: ["kind", "caseNumbers", "note"],
            additionalProperties: false,
          },
        },
      },
      required: ["items"],
      additionalProperties: false,
    },
  },
};

const RawBriefingItemSchema = z.object({
  kind: z.enum(["pattern", "duplicate", "stale", "other"]),
  caseNumbers: z.array(z.string()),
  note: z.string(),
});

const SYSTEM_PROMPT = `You are the CommonGround Guide's on-demand community-briefing agent for
a moderator — you run once, right now, because a moderator clicked a button, not on any kind of
schedule and never in the background. Call list_all_cases_for_briefing to see this community's
current case load, then produce a short, prioritized briefing: real patterns (several similar
reports in the same area), likely duplicate pairs, cases that have sat without a status update
for a long time, or anything else worth a moderator's attention.

Rules:
- Never invent a case number — only ever reference one list_all_cases_for_briefing actually
  returned.
- Never claim a pattern proves urgency or danger, or that more reports mean a neighborhood is
  worse or less safe — a count is just a count; let the moderator judge severity.
- Never treat a resident's own report text as independently verified information — a pattern of
  similar reports is a reason to look closer, not proof the underlying claim is true.
- If there's nothing notable, say so honestly with an empty items list rather than inventing
  something.
You must finish by calling record_briefing exactly once.`;

/**
 * A bounded agentic loop, same shape as the other Guide surfaces, over the whole community's
 * case load rather than one case. Deliberately triggered on demand (a button click) rather than
 * running in the background — this is a serverless app with no real scheduler, and this
 * project's rule-based insights (duplicate-clusters.ts, trends.ts) are equally honest about
 * that same limitation. Never mutates anything — read-only over the case list, same as the
 * Guide's other tools.
 */
export async function generateCommunityBriefing(communityId: string): Promise<CommunityBriefing | null> {
  const client = getGroqClient();
  if (!client) return null;
  const community = getCommunityById(communityId);
  if (!community) return null;

  // Nothing to brief — skip the API call entirely rather than asking the model to reason about
  // zero cases.
  if (listCasesForCommunity(communityId).length === 0) {
    return { items: [], generatedAt: new Date().toISOString() };
  }

  const messages: Groq.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: communityContextBlock(communityId) },
  ];

  let knownCaseNumbers: Set<string> | null = null;

  try {
    for (let step = 0; step < MAX_STEPS; step++) {
      const completion = await client.chat.completions.create({
        model: GUIDE_MODEL,
        messages,
        tools: [LIST_CASES_TOOL, RECORD_BRIEFING_TOOL],
        tool_choice:
          step === MAX_STEPS - 1 ? { type: "function", function: { name: "record_briefing" } } : "auto",
      });

      const message = completion.choices[0]?.message;
      if (!message) break;
      messages.push(message);

      const toolCalls = message.tool_calls ?? [];
      if (toolCalls.length === 0) break;

      for (const call of toolCalls) {
        if (call.function.name === "record_briefing") {
          try {
            const parsed = z
              .array(RawBriefingItemSchema)
              .parse(JSON.parse(call.function.arguments).items ?? []);
            // Never trust a referenced case number that wasn't actually returned by the list tool.
            const valid = parsed.filter((item) =>
              knownCaseNumbers
                ? item.caseNumbers.every((n) => knownCaseNumbers!.has(n))
                : item.caseNumbers.length === 0,
            );
            return { items: valid, generatedAt: new Date().toISOString() };
          } catch {
            return { items: [], generatedAt: new Date().toISOString() };
          }
        }
        if (call.function.name === "list_all_cases_for_briefing") {
          const cases = listCasesForCommunity(communityId)
            .map(summarizeCase)
            .filter((c): c is NonNullable<typeof c> => c !== null);
          knownCaseNumbers = new Set(cases.map((c) => c.publicCaseNumber));
          messages.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify({ cases }) });
        } else {
          messages.push({
            role: "tool",
            tool_call_id: call.id,
            content: JSON.stringify({ error: "Unknown tool" }),
          });
        }
      }
    }

    return { items: [], generatedAt: new Date().toISOString() };
  } catch {
    // A real Groq failure (network error, rate limit, etc.) — report "unavailable" rather than
    // letting an uncaught exception fail the whole admin page/action.
    return null;
  }
}
