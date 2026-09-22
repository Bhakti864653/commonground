import type Groq from "groq-sdk";
import { z } from "zod";
import { GUIDE_MODEL } from "./groq-client";
import { TOOL_DEFINITIONS, communityContextBlock, executeTool } from "./tools";
import { ReportStatusSchema, type Case } from "@/lib/schema/report";
import type { CaseAnalysisSuggestion } from "./case-analysis";

export type AgentTraceToolCall = { name: string; args: string; result: unknown };

export type AgentTraceStep = {
  agent: "duplicate" | "status" | "verification" | "critique";
  toolCalls: AgentTraceToolCall[];
  /** A one-line human summary of what this agent decided, for the admin trace view. */
  outcome: string;
};

function caseContextBlock(targetCase: Case): string {
  return JSON.stringify({
    caseNumber: targetCase.publicCaseNumber,
    type: targetCase.type,
    categoryId: targetCase.categoryId,
    description: targetCase.description,
    status: targetCase.status,
    verificationState: targetCase.verificationState,
  });
}

/**
 * Shared runner for a single-purpose specialist agent: it can call `tools` up to `maxSteps`
 * times, but the last step forces the model to call `recordTool` — the one way this agent can
 * ever "finish." Collects every real tool call into a trace so the admin UI can show exactly
 * what each specialist looked at, not just its final answer.
 */
async function runFocusedAgent<TArgs>({
  client,
  systemPrompt,
  userContent,
  tools,
  recordTool,
  recordToolName,
  maxSteps,
  toolContext,
  parseRecordArgs,
}: {
  client: Groq;
  systemPrompt: string;
  userContent: string;
  tools: Groq.Chat.Completions.ChatCompletionTool[];
  recordTool: Groq.Chat.Completions.ChatCompletionTool;
  recordToolName: string;
  maxSteps: number;
  toolContext: { communityId: string; excludeCaseNumber?: string };
  parseRecordArgs: (raw: string) => TArgs | null;
}): Promise<{ result: TArgs | null; toolCalls: AgentTraceToolCall[] }> {
  const messages: Groq.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userContent },
  ];
  const allTools = [...tools, recordTool];
  const toolCalls: AgentTraceToolCall[] = [];

  for (let step = 0; step < maxSteps; step++) {
    const forced = step === maxSteps - 1;
    const completion = await client.chat.completions.create({
      model: GUIDE_MODEL,
      messages,
      tools: allTools,
      tool_choice: forced ? { type: "function", function: { name: recordToolName } } : "auto",
    });

    const message = completion.choices[0]?.message;
    if (!message) break;
    messages.push(message);

    const calls = message.tool_calls ?? [];
    if (calls.length === 0) break;

    for (const call of calls) {
      if (call.function.name === recordToolName) {
        return { result: parseRecordArgs(call.function.arguments), toolCalls };
      }
      const result = await executeTool(call.function.name, call.function.arguments, toolContext);
      toolCalls.push({ name: call.function.name, args: call.function.arguments, result });
      messages.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify(result) });
    }
  }

  return { result: null, toolCalls };
}

const DUPLICATE_RECORD_TOOL: Groq.Chat.Completions.ChatCompletionTool = {
  type: "function",
  function: {
    name: "record_duplicate_suggestion",
    description: "Record your final duplicate-detection decision. Call this exactly once.",
    parameters: {
      type: "object",
      properties: {
        duplicateCaseNumber: {
          type: "string",
          description:
            "A real case number returned by search_similar_cases/get_case_details, or the " +
            "literal string \"none\" if this case is not a duplicate of anything you found.",
        },
        reasoning: { type: "string", description: "One or two sentences, grounded in tool results." },
      },
      required: ["duplicateCaseNumber", "reasoning"],
      additionalProperties: false,
    },
  },
};

const DuplicateArgsSchema = z.object({
  duplicateCaseNumber: z.string(),
  reasoning: z.string(),
});

/**
 * The only specialist that needs tools — everything it needs to decide is *other* cases, which
 * it doesn't already have. Bounded at 3 steps: up to 2 tool calls, then it must record.
 */
export async function runDuplicateAgent(
  client: Groq,
  targetCase: Case,
): Promise<{ suggestion: CaseAnalysisSuggestion | null; trace: AgentTraceStep }> {
  const systemPrompt = `You are a specialist duplicate-detection agent, one worker in a larger
moderation system. Your only job: decide whether the case below is a duplicate of another real,
different case in the same community. Use search_similar_cases and get_case_details as needed.
Never invent a case number — only ever reference one those tools actually returned. If you find
no real duplicate, say so honestly by recording "none" rather than guessing. You must finish by
calling record_duplicate_suggestion exactly once.`;

  const { result, toolCalls } = await runFocusedAgent({
    client,
    systemPrompt,
    userContent: `${communityContextBlock(targetCase.communityId)}\n\nCase to analyze:\n${caseContextBlock(targetCase)}`,
    tools: TOOL_DEFINITIONS,
    recordTool: DUPLICATE_RECORD_TOOL,
    recordToolName: "record_duplicate_suggestion",
    maxSteps: 3,
    toolContext: { communityId: targetCase.communityId, excludeCaseNumber: targetCase.publicCaseNumber },
    parseRecordArgs: (raw) => {
      try {
        const parsed = DuplicateArgsSchema.safeParse(JSON.parse(raw));
        return parsed.success ? parsed.data : null;
      } catch {
        return null;
      }
    },
  });

  if (!result || result.duplicateCaseNumber === "none" || result.duplicateCaseNumber === targetCase.publicCaseNumber) {
    return { suggestion: null, trace: { agent: "duplicate", toolCalls, outcome: "No duplicate found." } };
  }
  return {
    suggestion: { kind: "duplicate", suggestedValue: result.duplicateCaseNumber, reasoning: result.reasoning },
    trace: {
      agent: "duplicate",
      toolCalls,
      outcome: `Suggested duplicate of ${result.duplicateCaseNumber}.`,
    },
  };
}

const STATUS_OR_NONE = [...ReportStatusSchema.options, "none"] as const;

const STATUS_RECORD_TOOL: Groq.Chat.Completions.ChatCompletionTool = {
  type: "function",
  function: {
    name: "record_status_suggestion",
    description: "Record your final status-change decision. Call this exactly once.",
    parameters: {
      type: "object",
      properties: {
        newStatus: { type: "string", enum: [...STATUS_OR_NONE] },
        reasoning: { type: "string", description: "One or two sentences, grounded in the case description." },
      },
      required: ["newStatus", "reasoning"],
      additionalProperties: false,
    },
  },
};

const StatusArgsSchema = z.object({
  newStatus: z.enum(STATUS_OR_NONE),
  reasoning: z.string(),
});

/**
 * A pure-judgment specialist: everything it needs (the case's own description and current
 * status) is already in its prompt, so it gets no tools and a single forced completion rather
 * than a loop — a specialist doesn't need tool access just to look agentic.
 */
export async function runStatusAgent(
  client: Groq,
  targetCase: Case,
): Promise<{ suggestion: CaseAnalysisSuggestion | null; trace: AgentTraceStep }> {
  const systemPrompt = `You are a specialist status-review agent, one worker in a larger
moderation system. Your only job: decide whether this case's status should change, based only
on its own description and current status (given below — you have everything you need, no
tools). Only suggest a change with real evidence in the description (e.g. it mentions the issue
was already fixed, or clearly needs referral). Never suggest the status it already has — that's
a no-op, record "none" instead. If you have no real evidence for a change, record "none" rather
than guessing. You must finish by calling record_status_suggestion exactly once.`;

  const { result, toolCalls } = await runFocusedAgent({
    client,
    systemPrompt,
    userContent: caseContextBlock(targetCase),
    tools: [],
    recordTool: STATUS_RECORD_TOOL,
    recordToolName: "record_status_suggestion",
    maxSteps: 1,
    toolContext: { communityId: targetCase.communityId },
    parseRecordArgs: (raw) => {
      try {
        const parsed = StatusArgsSchema.safeParse(JSON.parse(raw));
        return parsed.success ? parsed.data : null;
      } catch {
        return null;
      }
    },
  });

  if (!result || result.newStatus === "none" || result.newStatus === targetCase.status) {
    return { suggestion: null, trace: { agent: "status", toolCalls, outcome: "No status change suggested." } };
  }
  return {
    suggestion: { kind: "status", suggestedValue: result.newStatus, reasoning: result.reasoning },
    trace: { agent: "status", toolCalls, outcome: `Suggested status: ${result.newStatus}.` },
  };
}

const VERIFICATION_OR_NONE = ["officially_verified", "none"] as const;

const VERIFICATION_RECORD_TOOL: Groq.Chat.Completions.ChatCompletionTool = {
  type: "function",
  function: {
    name: "record_verification_suggestion",
    description: "Record your final verification decision. Call this exactly once.",
    parameters: {
      type: "object",
      properties: {
        newVerificationState: { type: "string", enum: [...VERIFICATION_OR_NONE] },
        reasoning: {
          type: "string",
          description: "Must quote the specific checkable claim from the description, if suggesting officially_verified.",
        },
      },
      required: ["newVerificationState", "reasoning"],
      additionalProperties: false,
    },
  },
};

const VerificationArgsSchema = z.object({
  newVerificationState: z.enum(VERIFICATION_OR_NONE),
  reasoning: z.string(),
});

export async function runVerificationAgent(
  client: Groq,
  targetCase: Case,
): Promise<{ suggestion: CaseAnalysisSuggestion | null; trace: AgentTraceStep }> {
  const systemPrompt = `You are a specialist verification-review agent, one worker in a larger
moderation system. Your only job: decide whether this case's description contains a specific,
checkable claim that would justify marking it "officially_verified" (given below — you have
everything you need, no tools). Never speculate — only suggest officially_verified if your
reasoning quotes the exact claim from the description. Otherwise record "none". You must finish
by calling record_verification_suggestion exactly once.`;

  const { result, toolCalls } = await runFocusedAgent({
    client,
    systemPrompt,
    userContent: caseContextBlock(targetCase),
    tools: [],
    recordTool: VERIFICATION_RECORD_TOOL,
    recordToolName: "record_verification_suggestion",
    maxSteps: 1,
    toolContext: { communityId: targetCase.communityId },
    parseRecordArgs: (raw) => {
      try {
        const parsed = VerificationArgsSchema.safeParse(JSON.parse(raw));
        return parsed.success ? parsed.data : null;
      } catch {
        return null;
      }
    },
  });

  if (!result || result.newVerificationState === "none" || result.newVerificationState === targetCase.verificationState) {
    return { suggestion: null, trace: { agent: "verification", toolCalls, outcome: "No verification change suggested." } };
  }
  return {
    suggestion: {
      kind: "verification",
      suggestedValue: result.newVerificationState,
      reasoning: result.reasoning,
    },
    trace: { agent: "verification", toolCalls, outcome: `Suggested verification: ${result.newVerificationState}.` },
  };
}
