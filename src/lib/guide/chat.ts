import type Groq from "groq-sdk";
import { getGroqClient, GUIDE_MODEL } from "./groq-client";
import { TOOL_DEFINITIONS, communityContextBlock, executeTool } from "./tools";
import { detectEmergencyPhrase } from "./emergency";
import { getCommunityById } from "@/data/communities";
import type { Language } from "@/lib/i18n/dictionary";

const MAX_TOOL_STEPS = 3;

export type GuideChatResult = {
  emergency: boolean;
  answer: string;
};

const EMERGENCY_MESSAGE = {
  es: "Esto suena a una emergencia. CommonGround no es un servicio de emergencia y no puede ayudar en este momento — por favor contacta directamente a los servicios de emergencia oficiales de tu área.",
  en: "This sounds like it could be an emergency. CommonGround is not an emergency service and can't help right now — please contact your local official emergency services directly.",
};

const UNAVAILABLE_MESSAGE = {
  es: "La Guía no está disponible en este momento.",
  en: "The Guide isn't available right now.",
};

function systemPrompt(communityId: string, language: Language): string {
  const community = getCommunityById(communityId);
  const isDemo = community?.status === "demo";
  return `You are the CommonGround Guide — a calm community navigator, not the product itself.
Respond in ${language === "es" ? "Spanish" : "English"}, in plain text only — no markdown
formatting (no **bold**, no bullet lists with dashes), since this chat renders plain text.

${communityContextBlock(communityId)}

You can: answer questions about how CommonGround's process works, help someone figure out
which category fits their situation, check whether a similar case already exists (use
search_similar_cases/get_case_details), and explain what a case's status/verification means.

You must never: invent a phone number, address, official, deadline, or government response;
claim to be a government employee; promise an issue will be fixed; give a medical or legal
conclusion; tell someone a dangerous situation is safe; claim you can submit, forward, modify,
or close a case yourself (you can't — only the resident's own report form or a moderator can).

This community currently has no verified official contacts or sources configured yet${
    isDemo ? " (it's a fictional demonstration community)" : ""
  } — if asked for one, say so honestly rather than inventing one. If you don't know something
with real confidence, say so plainly instead of guessing.`;
}

/**
 * Single-turn (the caller may pass prior turns as `history` for continuity, but there's no
 * server-side conversation memory — nothing here is persisted). Emergency phrases are checked
 * before any LLM call at all, per PRIVACY.md: the banner must never depend on the model
 * noticing it.
 */
export async function askGuide(
  communityId: string,
  message: string,
  language: Language,
  history: Array<{ role: "user" | "assistant"; content: string }> = [],
): Promise<GuideChatResult> {
  if (detectEmergencyPhrase(message)) {
    return { emergency: true, answer: EMERGENCY_MESSAGE[language] };
  }

  const client = getGroqClient();
  if (!client) {
    return { emergency: false, answer: UNAVAILABLE_MESSAGE[language] };
  }

  const messages: Groq.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt(communityId, language) },
    ...history.slice(-6),
    { role: "user", content: message },
  ];

  for (let step = 0; step < MAX_TOOL_STEPS; step++) {
    const completion = await client.chat.completions.create({
      model: GUIDE_MODEL,
      messages,
      tools: step === MAX_TOOL_STEPS - 1 ? undefined : TOOL_DEFINITIONS,
      tool_choice: step === MAX_TOOL_STEPS - 1 ? undefined : "auto",
    });

    const responseMessage = completion.choices[0]?.message;
    if (!responseMessage) break;
    messages.push(responseMessage);

    const toolCalls = responseMessage.tool_calls ?? [];
    if (toolCalls.length === 0) {
      return { emergency: false, answer: responseMessage.content ?? UNAVAILABLE_MESSAGE[language] };
    }

    for (const call of toolCalls) {
      const result = await executeTool(call.function.name, call.function.arguments, {
        communityId,
      });
      messages.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify(result) });
    }
  }

  return { emergency: false, answer: UNAVAILABLE_MESSAGE[language] };
}
