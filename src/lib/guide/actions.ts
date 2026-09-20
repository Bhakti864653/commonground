"use server";

import { askGuide, type GuideChatResult } from "./chat";
import type { Language } from "@/lib/i18n/dictionary";

export async function askGuideAction(
  communityId: string,
  message: string,
  language: Language,
  history: Array<{ role: "user" | "assistant"; content: string }>,
): Promise<GuideChatResult> {
  return askGuide(communityId, message.slice(0, 2000), language, history);
}
