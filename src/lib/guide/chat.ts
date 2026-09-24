import type Groq from "groq-sdk";
import { getGroqClient, GUIDE_MODEL } from "./groq-client";
import { TOOL_DEFINITIONS, communityContextBlock, executeTool } from "./tools";
import { detectEmergencyPhrase } from "./emergency";
import { buildDraftSubmissionTool, parseDraftSubmissionArgs, type GuideDraftSubmission } from "./draft-submission";
import { getCommunity as getCommunityById } from "@/lib/store/community-store";
import type { Language } from "@/lib/i18n/dictionary";
import { modelLanguageName } from "@/lib/i18n/languages";
import { labelOf } from "@/lib/i18n/labels";

const MAX_TOOL_STEPS = 3;

export type GuideChatResult = {
  emergency: boolean;
  answer: string;
  /** Present only when the model drafted a submission — nothing is created until the resident
   *  explicitly confirms it client-side (see GuideChat.tsx's DraftReviewCard). */
  draft?: GuideDraftSubmission;
};

const DRAFT_READY_MESSAGE = {
  es: "Preparé un borrador según lo que me contaste. Revísalo abajo antes de enviarlo — no se ha enviado nada todavía.",
  en: "I've put together a draft based on what you told me. Review it below before sending it — nothing has been submitted yet.",
  pt: "Preparei um rascunho com base no que você me contou. Revise-o abaixo antes de enviar — nada foi enviado ainda.",
  fr: "J’ai préparé un brouillon à partir de ce que vous m’avez dit. Relisez-le ci-dessous avant de l’envoyer : rien n’a encore été envoyé.",
  zh: "我根据你告诉我的内容准备了一份草稿。提交前请在下方查看——目前还没有提交任何内容。",
  hi: "आपने जो बताया, उसके आधार पर मैंने एक मसौदा तैयार किया है। भेजने से पहले इसे नीचे देख लें — अभी तक कुछ भी नहीं भेजा गया है।",
  it: "Ho preparato una bozza in base a ciò che mi hai detto. Rivedila qui sotto prima di inviarla: non è stato ancora inviato nulla.",
};

const EMERGENCY_MESSAGE = {
  es: "Esto suena a una emergencia. CommonGround no es un servicio de emergencia y no puede ayudar en este momento — por favor contacta directamente a los servicios de emergencia oficiales de tu área.",
  en: "This sounds like it could be an emergency. CommonGround is not an emergency service and can't help right now — please contact your local official emergency services directly.",
  pt: "Isto parece ser uma emergência. O CommonGround não é um serviço de emergência e não pode ajudar agora — entre em contato diretamente com os serviços oficiais de emergência da sua região.",
  fr: "Cela ressemble à une urgence. CommonGround n’est pas un service d’urgence et ne peut pas aider maintenant : contactez directement les services d’urgence officiels de votre région.",
  zh: "这听起来可能是紧急情况。CommonGround 不是紧急服务，现在无法提供帮助——请直接联系当地官方紧急服务。",
  hi: "यह आपातकालीन स्थिति लग रही है। CommonGround आपातकालीन सेवा नहीं है और अभी मदद नहीं कर सकता — कृपया सीधे अपने क्षेत्र की आधिकारिक आपातकालीन सेवाओं से संपर्क करें।",
  it: "Sembra un’emergenza. CommonGround non è un servizio di emergenza e non può aiutarti adesso: contatta direttamente i servizi di emergenza ufficiali della tua zona.",
};

const UNAVAILABLE_MESSAGE = {
  es: "La Guía no está disponible en este momento.",
  en: "The Guide isn't available right now.",
  pt: "O Guia não está disponível agora.",
  fr: "Le Guide n’est pas disponible pour le moment.",
  zh: "向导暂时不可用。",
  hi: "गाइड अभी उपलब्ध नहीं है।",
  it: "La Guida non è disponibile al momento.",
};

function systemPrompt(communityId: string, language: Language): string {
  const community = getCommunityById(communityId);
  const isDemo = community?.status === "demo";
  const areaNames = (community?.areas ?? [])
    .map((a) => labelOf(a, language))
    .join(", ");
  const categoryNames = (community?.categories ?? [])
    .map((c) => `${c.id} = "${labelOf(c, language)}"`)
    .join(", ");
  return `You are the CommonGround Guide — a calm community navigator, not the product itself.
Respond in ${modelLanguageName(language)}, in plain text only — no markdown
formatting (no **bold**, no bullet lists with dashes), since this chat renders plain text.

${communityContextBlock(communityId)}
When talking to the resident, call categories by these names (never by their internal ids):
${categoryNames || "none configured"}.

You can: answer questions about how CommonGround's process works, help someone figure out
which category fits their situation, check whether a similar case already exists (use
search_similar_cases/get_case_details), explain what a case's status/verification means, and —
once you genuinely have enough from the conversation (type, category, a real description, and
an area choice or "prefer not to say") — draft a report or proposal with draft_case_submission
for the resident to review. Ask clarifying questions first if you don't have enough yet; never
draft from a single vague message.

Location privacy: CommonGround only ever records an approximate area. The only location you may
ask about is which of these configured areas it's in — ${areaNames || "none configured"} — or
let them say they'd prefer not to say. Never ask for, or invite them to share, a street name,
intersection, house or building number, exact address, a landmark precise enough to identify a
home, GPS coordinates, or their name or phone number. If they volunteer one, don't repeat it
back; just ask which area it's in.

You must never: invent a phone number, address, official, deadline, or government response;
claim to be a government employee; promise an issue will be fixed; give a medical or legal
conclusion; tell someone a dangerous situation is safe; claim you can submit, forward, modify,
or close a case yourself — drafting one is the most you can do, only the resident's own
explicit confirmation of that draft (or a moderator, separately) actually creates or changes
anything.

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

  const community = getCommunityById(communityId);
  const draftTool = community ? buildDraftSubmissionTool(community) : null;
  const tools = draftTool ? [...TOOL_DEFINITIONS, draftTool] : TOOL_DEFINITIONS;

  const messages: Groq.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt(communityId, language) },
    ...history.slice(-6),
    { role: "user", content: message },
  ];

  for (let step = 0; step < MAX_TOOL_STEPS; step++) {
    const completion = await client.chat.completions.create({
      model: GUIDE_MODEL,
      messages,
      tools: step === MAX_TOOL_STEPS - 1 ? undefined : tools,
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
      if (call.function.name === "draft_case_submission" && community) {
        const parsed = parseDraftSubmissionArgs(call.function.arguments, community);
        if (parsed.ok) {
          return {
            emergency: false,
            answer: responseMessage.content?.trim() || DRAFT_READY_MESSAGE[language],
            draft: parsed.draft,
          };
        }
        messages.push({
          role: "tool",
          tool_call_id: call.id,
          content: JSON.stringify({ error: parsed.error }),
        });
        continue;
      }
      const result = await executeTool(call.function.name, call.function.arguments, {
        communityId,
      });
      messages.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify(result) });
    }
  }

  return { emergency: false, answer: UNAVAILABLE_MESSAGE[language] };
}
