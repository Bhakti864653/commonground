import type Groq from "groq-sdk";
import { z } from "zod";
import type { CommunityConfig } from "@/lib/schema/community";
import { MAX_DESCRIPTION_LENGTH } from "@/lib/schema/report";
import type { Language } from "@/lib/i18n/languages";
import { redactPersonalInfo, type PiiKind } from "@/lib/pipeline/redact";
import { detectEmergencyPhrase } from "./emergency";

export const DRAFT_URGENCIES = ["low", "medium", "high", "urgent"] as const;
export type DraftUrgency = (typeof DRAFT_URGENCIES)[number];

export type GuideDraftSubmission = {
  type: "report" | "proposal";
  categoryId: string;
  description: string;
  /** `null` means the resident (via the model, on their behalf) chose "prefer not to say". */
  areaId: string | null;
  /** A short title in the resident's language (private to moderators; helps them scan cases). */
  title: string;
  /** How serious it sounds; always "urgent" when the conversation matched an emergency phrase. */
  urgency: DraftUrgency;
  /** Personal details the privacy filter removed from the description/title (never stored). */
  redacted: PiiKind[];
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
          title: {
            type: "string",
            description: "A short title (under 80 characters) in the resident's language, e.g. 'Blocked drain on the main street'. No names or addresses.",
          },
          urgency: {
            type: "string",
            enum: [...DRAFT_URGENCIES],
            description:
              "urgent: someone may be in danger right now (injury, fire, collapse, live wires, flooding with people at risk). " +
              "high: a real risk to safety or health. medium: a real problem that has lasted a while. low: everything else, including proposals.",
          },
        },
        required: ["type", "categoryId", "description", "areaId", "title", "urgency"],
        additionalProperties: false,
      },
    },
  };
}

const RawDraftArgsSchema = z.object({
  type: z.enum(["report", "proposal"]),
  categoryId: z.string(),
  description: z.string().min(1).max(MAX_DESCRIPTION_LENGTH),
  areaId: z.string(),
  title: z.string().max(200).optional(),
  urgency: z.enum(DRAFT_URGENCIES).optional(),
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
  options: { language?: Language; emergencyInConversation?: boolean } = {},
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
  const { type, categoryId, description, areaId, title, urgency } = result.data;
  if (!community.categories.some((c) => c.id === categoryId)) {
    return { ok: false, error: `Unknown categoryId: ${categoryId}` };
  }
  if (areaId !== PREFER_NOT_TO_SAY && !community.areas.some((a) => a.id === areaId)) {
    return { ok: false, error: `Unknown areaId: ${areaId}` };
  }
  // The privacy filter runs here, so the resident confirms exactly what will be saved.
  const language = options.language ?? "es";
  const cleanDescription = redactPersonalInfo(description.trim(), language);
  const cleanTitle = redactPersonalInfo((title?.trim() || description.trim()).slice(0, 80), language);
  const emergency = options.emergencyInConversation === true || detectEmergencyPhrase(description);
  return {
    ok: true,
    draft: {
      type,
      categoryId,
      description: cleanDescription.text,
      areaId: areaId === PREFER_NOT_TO_SAY ? null : areaId,
      title: cleanTitle.text,
      urgency: emergency ? "urgent" : (urgency ?? (type === "proposal" ? "low" : "medium")),
      redacted: [...new Set([...cleanDescription.found, ...cleanTitle.found])],
    },
  };
}
