import Groq from "groq-sdk";
import type { z } from "zod";
import { GUIDE_MODEL } from "@/lib/guide/groq-client";

/**
 * Runs one agent with real tool calling: the model may call read-only lookup tools (e.g.
 * searchSimilarCases, getCase) as many times as it needs within `maxSteps`, and must finish by
 * calling its one "propose" tool. That final call's arguments are parsed with a strict Zod
 * schema plus `validate` (checks against the real config); invalid output is sent back to the
 * model once with the error, then the run fails with `invalid_output` so the caller can fall back
 * and tell the moderator. Never throws for model or network problems — the result says what went
 * wrong. Groq rate limits (429) and server errors are already retried with backoff by the SDK
 * (maxRetries in groq-client.ts); what still fails comes back as `rate_limited`/`unavailable`.
 */

export type ReadTool = {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  run: (args: unknown) => Promise<unknown>;
};

export type FinalTool<T> = {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  schema: z.ZodType<T>;
  /** Extra checks against the real world (known office ids, etc.). Return an error, or null. */
  validate?: (value: T) => string | null;
};

export type AgentFailureReason = "unavailable" | "rate_limited" | "invalid_output";

export type AgentRunResult<T> =
  | { ok: true; value: T; toolCalls: string[] }
  | { ok: false; reason: AgentFailureReason; message: string; toolCalls: string[] };

export const FAILURE_MESSAGES: Record<AgentFailureReason, string> = {
  unavailable: "The AI service didn't respond.",
  rate_limited: "The AI service is busy (rate limit reached).",
  invalid_output: "The AI returned output that didn't match the required format, twice.",
};

type Message = Groq.Chat.Completions.ChatCompletionMessageParam;

function asTool(t: { name: string; description: string; parameters: Record<string, unknown> }) {
  return { type: "function" as const, function: { name: t.name, description: t.description, parameters: t.parameters } };
}

export function classifyAgentError(error: unknown): AgentFailureReason {
  if (error instanceof Groq.APIError && error.status === 429) return "rate_limited";
  return "unavailable";
}

export async function runToolAgent<T>(options: {
  client: Groq;
  system: string;
  user: string;
  readTools?: ReadTool[];
  finalTool: FinalTool<T>;
  maxSteps?: number;
}): Promise<AgentRunResult<T>> {
  const { client, system, user, readTools = [], finalTool, maxSteps = 4 } = options;
  const messages: Message[] = [
    { role: "system", content: system },
    { role: "user", content: user },
  ];
  const toolCalls: string[] = [];
  let retriedInvalid = false;

  for (let step = 0; step < maxSteps + 1; step++) {
    // The last step (or any step with no lookup tools) forces the final "propose" call.
    const forceFinal = step >= maxSteps - 1 || readTools.length === 0;
    let completion: Groq.Chat.Completions.ChatCompletion;
    try {
      completion = await client.chat.completions.create({
        model: GUIDE_MODEL,
        messages,
        tools: [...readTools.map(asTool), asTool(finalTool)],
        tool_choice: forceFinal ? { type: "function", function: { name: finalTool.name } } : "required",
      });
    } catch (error) {
      const reason = classifyAgentError(error);
      return { ok: false, reason, message: FAILURE_MESSAGES[reason], toolCalls };
    }

    const message = completion.choices[0]?.message;
    const calls = message?.tool_calls ?? [];
    if (!message || calls.length === 0) {
      if (retriedInvalid) break;
      retriedInvalid = true;
      messages.push({ role: "user", content: `You must finish by calling ${finalTool.name}.` });
      continue;
    }
    messages.push(message);

    for (const call of calls) {
      toolCalls.push(call.function.name);
      if (call.function.name === finalTool.name) {
        const error = parseFinal(call.function.arguments, finalTool);
        if (error === null) {
          return { ok: true, value: finalTool.schema.parse(JSON.parse(call.function.arguments)), toolCalls };
        }
        if (retriedInvalid) {
          return { ok: false, reason: "invalid_output", message: FAILURE_MESSAGES.invalid_output, toolCalls };
        }
        retriedInvalid = true;
        messages.push({
          role: "tool",
          tool_call_id: call.id,
          content: JSON.stringify({ error: `Invalid ${finalTool.name} arguments: ${error}. Call ${finalTool.name} again with corrected arguments.` }),
        });
        continue;
      }
      const tool = readTools.find((t) => t.name === call.function.name);
      let result: unknown;
      if (!tool) {
        result = { error: `Unknown tool: ${call.function.name}` };
      } else {
        let args: unknown = {};
        try {
          args = call.function.arguments ? JSON.parse(call.function.arguments) : {};
        } catch {
          args = null;
        }
        result = args === null ? { error: "Arguments were not valid JSON" } : await tool.run(args);
      }
      messages.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify(result) });
    }
  }
  return { ok: false, reason: "invalid_output", message: FAILURE_MESSAGES.invalid_output, toolCalls };
}

function parseFinal<T>(raw: string, tool: FinalTool<T>): string | null {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return "not valid JSON";
  }
  const parsed = tool.schema.safeParse(json);
  if (!parsed.success) {
    return parsed.error.issues
      .slice(0, 3)
      .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("; ");
  }
  return tool.validate?.(parsed.data) ?? null;
}
