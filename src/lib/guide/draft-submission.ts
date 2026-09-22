import type Groq from "groq-sdk";
import { z } from "zod";
import type { CommunityConfig } from "@/lib/schema/community";

export type GuideDraftSubmission = {
  type: "report" | "proposal";
  categoryId: string;
  description: string;
  /** `null` means the resident (via the model, on their behalf) chose "prefer not to say". */
  areaId: string | null;
};

const PREFER_NOT_TO_SAY = "prefer_not_to_say";

/**
 * Built per-request from the active community's real config, not a fixed module-level schema —
 * `categoryId`/`areaId` are constrained to an enum of ids that actually exist, so the model
 * can't hallucinate one, same discipline as case-analysis.ts's ReportStatusSchema.options enum
 * baked into its prompt.
 */
export function buildDraftSubmissionTool(
  community: CommunityConfig,
): Groq.Chat.Completions.ChatCompletionTool {
  const categoryIds = community.categories.map((c) => c.id);
  const areaIds = [...community.areas.map((a) => a.id), PREFER_NOT_TO_SAY];
  return {
    type: "function",
    function: {
      name: "draft_case_submission",
      description:
        "Draft a report or proposal for the resident to review and explicitly confirm — this " +
        "never submits anything by itself. Only call this once the conversation has given you " +
        "a clear picture: which type, which category, a real description of what's going on, " +
        "and an area choice (or that the resident prefers not to say). Ask clarifying " +
        "questions first if you don't have enough yet — never draft from one vague message.",
      parameters: {
        type: "object",
        properties: {
          type: { type: "string", enum: ["report", "proposal"] },
          categoryId: { type: "string", enum: categoryIds },
          description: {
            type: "string",
            description:
              "A clear description in the resident's own words/language, grounded only in " +
              "what they actually told you in this conversation.",
          },
          areaId: {
            type: "string",
            enum: areaIds,
            description: `One of the community's real area ids, or "${PREFER_NOT_TO_SAY}".`,
          },
        },
        required: ["type", "categoryId", "description", "areaId"],
        additionalProperties: false,
      },
    },
  };
}

const RawDraftArgsSchema = z.object({
  type: z.enum(["report", "proposal"]),
  categoryId: z.string(),
  description: z.string().min(1),
  areaId: z.string(),
});

export type ParsedDraftResult =
  | { ok: true; draft: GuideDraftSubmission }
  | { ok: false; error: string };

/**
 * Re-validates tool-call arguments against the real community config rather than trusting the
 * schema's enum to have constrained the model — tool arguments are model output, never trusted
 * outright, the same "never invent a case number" discipline case-analysis.ts applies to its
 * own suggestions.
 */
export function parseDraftSubmissionArgs(
  rawArguments: string,
  community: CommunityConfig,
): ParsedDraftResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawArguments);
  } catch {
    return { ok: false, error: "Invalid arguments" };
  }
  const result = RawDraftArgsSchema.safeParse(parsed);
  if (!result.success) {
    return { ok: false, error: "Missing or invalid fields" };
  }
  const { type, categoryId, description, areaId } = result.data;
  if (!community.categories.some((c) => c.id === categoryId)) {
    return { ok: false, error: `Unknown categoryId: ${categoryId}` };
  }
  if (areaId !== PREFER_NOT_TO_SAY && !community.areas.some((a) => a.id === areaId)) {
    return { ok: false, error: `Unknown areaId: ${areaId}` };
  }
  return {
    ok: true,
    draft: {
      type,
      categoryId,
      description: description.trim(),
      areaId: areaId === PREFER_NOT_TO_SAY ? null : areaId,
    },
  };
}
