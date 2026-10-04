"use server";

import { sanitizeHistory } from "./sanitize-history";
import { askGuide, type GuideChatResult } from "./chat";
import type { Language } from "@/lib/i18n/dictionary";
import { isLanguage } from "@/lib/i18n/languages";
import { transcribeAudio, type TranscriptionResult } from "./transcribe";

export async function askGuideAction(
  communityId: string,
  message: string,
  language: Language,
  history: Array<{ role: "user" | "assistant"; content: string }>,
): Promise<GuideChatResult> {
  // A server action is callable with any value; an unknown language falls back to Spanish,
  // the pilot's default, rather than reaching the model prompt.
  const lang = isLanguage(language) ? language : "es";
  const safeMessage = typeof message === "string" ? message.slice(0, 2000) : "";
  return askGuide(typeof communityId === "string" ? communityId : "", safeMessage, lang, sanitizeHistory(history));
}

/** Voice input for the resident chat: returns text to put in the message box, never sends it. */
export async function transcribeGuideAudioAction(formData: FormData): Promise<TranscriptionResult> {
  const language = formData.get("language");
  return transcribeAudio(formData.get("audio"), isLanguage(language) ? language : "es");
}
