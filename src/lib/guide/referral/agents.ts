import type Groq from "groq-sdk";
import { z } from "zod";
import { GUIDE_MODEL } from "@/lib/guide/groq-client";
import type { Case } from "@/lib/schema/report";
import type { CommunityConfig, OfficialContact } from "@/lib/schema/community";

/**
 * Forces exactly one call of `tool` and parses its arguments — the same "the only way to finish is
 * to record" shape the admin specialists use, without the tool loop: none of these steps needs to
 * look anything up. Throws on any failure; the pipeline's `runStepSafely` turns that into a
 * logged, skipped step.
 */
async function recordOnce<T>(
  client: Groq,
  system: string,
  user: string,
  tool: Groq.Chat.Completions.ChatCompletionTool,
  schema: z.ZodType<T>,
): Promise<T> {
  const name = tool.function?.name ?? "";
  const completion = await client.chat.completions.create({
    model: GUIDE_MODEL,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    tools: [tool],
    tool_choice: { type: "function", function: { name } },
  });
  const call = completion.choices[0]?.message?.tool_calls?.[0];
  if (!call || call.function.name !== name) throw new Error(`No ${name} call returned`);
  return schema.parse(JSON.parse(call.function.arguments));
}

/** Only public case fields, with labels in Spanish — what every step is allowed to see. */
export function publicCaseBlock(targetCase: Case, community: CommunityConfig): string {
  const category = community.categories.find((c) => c.id === targetCase.categoryId);
  const area =
    targetCase.approximateArea.kind === "prefer_not_to_say"
      ? "No indicada"
      : (targetCase.approximateArea.labelEs ?? targetCase.approximateArea.label);
  return JSON.stringify({
    caseNumber: targetCase.publicCaseNumber,
    type: targetCase.type === "proposal" ? "propuesta" : "reporte",
    categoryId: targetCase.categoryId,
    category: category?.labelEs ?? targetCase.categoryId,
    approximateArea: area,
    community: `${community.displayName}, ${community.region ?? ""} ${community.country}`.trim(),
    description: targetCase.description,
  });
}

// ---- classify ----------------------------------------------------------------------------

const CLASSIFY_TOOL: Groq.Chat.Completions.ChatCompletionTool = {
  type: "function",
  function: {
    name: "record_classification",
    description: "Record your classification of the case. Call this exactly once.",
    parameters: {
      type: "object",
      properties: {
        categoryAssessment: { type: "string", enum: ["confirmed", "questioned"] },
        suggestedCategoryId: {
          type: "string",
          description: "Only when questioned: one of the community's real category ids that fits better.",
        },
        urgency: { type: "string", enum: ["low", "medium", "high"] },
        reasoning: { type: "string", description: "One or two sentences grounded in the description." },
      },
      required: ["categoryAssessment", "urgency", "reasoning"],
      additionalProperties: false,
    },
  },
};

const ClassifyArgsSchema = z.object({
  categoryAssessment: z.string(),
  suggestedCategoryId: z.string().optional(),
  urgency: z.string(),
  reasoning: z.string(),
});

export async function classifyCase(client: Groq, targetCase: Case, community: CommunityConfig) {
  const categories = community.categories.map((c) => ({ id: c.id, name: c.labelEs }));
  const system = `You review one community report for CommonGround, an independent civic project in
${community.displayName}, ${community.country}. Decide two things, using only the case description.

1. Category: "confirmed" if the resident's category fits, "questioned" if another of these real
   categories clearly fits better (then give its id): ${JSON.stringify(categories)}.
2. Urgency: "high" if the description shows a current risk to people's safety or health, or a
   problem affecting many people right now; "medium" for a real problem that is getting worse or
   has lasted a while; "low" for everything else, including proposals and ideas.

Never invent facts that aren't in the description. Finish by calling record_classification.`;
  return recordOnce(client, system, publicCaseBlock(targetCase, community), CLASSIFY_TOOL, ClassifyArgsSchema);
}

// ---- draft -------------------------------------------------------------------------------

const DRAFT_TOOL: Groq.Chat.Completions.ChatCompletionTool = {
  type: "function",
  function: {
    name: "record_referral_draft",
    description: "Record the drafted message and why this office fits. Call this exactly once.",
    parameters: {
      type: "object",
      properties: {
        message: { type: "string", description: "The message to the office, in Spanish, plain text." },
        routeExplanation: {
          type: "string",
          description: "One or two sentences (English) on why this office is the right recipient.",
        },
      },
      required: ["message", "routeExplanation"],
      additionalProperties: false,
    },
  },
};

const DraftArgsSchema = z.object({ message: z.string(), routeExplanation: z.string() });

export async function draftReferral(
  client: Groq,
  targetCase: Case,
  community: CommunityConfig,
  office: OfficialContact,
) {
  const officeName = office.nameEs ?? office.name;
  const system = `You write a short referral message, in formal and polite Spanish, from CommonGround
(an independent community technology project — it does not represent any government or
institution) to the office "${officeName}". A CommonGround moderator will read it on a phone call
or send it by WhatsApp, so it must be plain text, under 900 characters, with no markdown.

The message must:
- greet the office formally and say it comes from CommonGround, an independent community project;
- include the case number exactly as given, the category, and the approximate area;
- summarize the description faithfully in Spanish (translate it if needed), adding no facts;
- politely ask whether the office can look into it or say who handles it;
- thank them and sign as "Equipo de moderación de CommonGround".

It must never: include names, phone numbers, emails, links, or exact addresses (if the description
contains any, leave them out); claim to be a government office; promise anything; or say the
problem is an emergency unless the description says so.

Also explain in one or two sentences (English) why this office fits, given the routing note:
"${community.referralRouting?.find((r) => r.categoryId === targetCase.categoryId)?.verificationNote ?? ""}".
Finish by calling record_referral_draft.`;
  return recordOnce(client, system, publicCaseBlock(targetCase, community), DRAFT_TOOL, DraftArgsSchema);
}

// ---- critique ----------------------------------------------------------------------------

const CRITIQUE_TOOL: Groq.Chat.Completions.ChatCompletionTool = {
  type: "function",
  function: {
    name: "record_referral_review",
    description: "Record your review of the drafted referral. Call this exactly once.",
    parameters: {
      type: "object",
      properties: {
        verdict: { type: "string", enum: ["ok", "concerns"] },
        concerns: { type: "string", description: "If verdict is concerns: what a moderator should fix (English)." },
      },
      required: ["verdict"],
      additionalProperties: false,
    },
  },
};

const CritiqueArgsSchema = z.object({ verdict: z.enum(["ok", "concerns"]), concerns: z.string().optional() });

/**
 * A second opinion for the moderator, not a gate: the message has already passed deterministic
 * validation, and a moderator reads it before anything happens. Concerns are shown on the
 * moderator's card instead of discarding the draft.
 */
export async function critiqueReferral(client: Groq, targetCase: Case, community: CommunityConfig, message: string) {
  const system = `You check a referral message that CommonGround moderators may send to a local office.
Compare it with the original case. Report "concerns" if the message adds facts that aren't in the
case, leaves out the case number, includes any personal detail (a name, phone, address), promises
anything, sounds like a government office, or isn't formal Spanish. Otherwise report "ok".
Finish by calling record_referral_review.`;
  const user = `Case:\n${publicCaseBlock(targetCase, community)}\n\nMessage:\n${message}`;
  return recordOnce(client, system, user, CRITIQUE_TOOL, CritiqueArgsSchema);
}
