import type { CommunityConfig } from "@/lib/schema/community";
import type { Language } from "./dictionary";

/**
 * Pure so it's unit-testable without a DOM: the initial language is the active community's
 * default, clamped to what that community actually supports (a config could in theory list
 * a defaultLanguage outside its own supportedLanguages after hand-editing).
 */
export function resolveInitialLanguage(community: CommunityConfig): Language {
  if (community.supportedLanguages.includes(community.defaultLanguage)) {
    return community.defaultLanguage;
  }
  return community.supportedLanguages[0];
}
