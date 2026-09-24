"use server";

import { askGuide, type GuideChatResult } from "./chat";
import type { Language } from "@/lib/i18n/dictionary";
import { isLanguage } from "@/lib/i18n/languages";

export async function askGuideAction(
  communityId: string,
  message: string,
  language: Language,
  history: Array<{ role: "user" | "assistant"; content: string }>,
): Promise<GuideChatResult> {
  // A server action is callable with any value; an unknown language falls back to Spanish,
  // the pilot's default, rather than reaching the model prompt.
  return askGuide(communityId, message.slice(0, 2000), isLanguage(language) ? language : "es", history);
}
