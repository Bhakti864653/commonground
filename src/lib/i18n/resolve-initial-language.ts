import type { CommunityConfig } from "@/lib/schema/community";
import type { Language } from "./dictionary";
import { isLanguage } from "./languages";

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

/**
 * The first of the visitor's browser languages (most preferred first, e.g. `navigator.languages`)
 * that CommonGround speaks, or null. Regional variants match their base language ("fr-CA" → fr,
 * "pt-BR" → pt). Chinese matches only Simplified variants — the interface is Simplified Chinese,
 * so a Traditional-Chinese browser (zh-TW, zh-HK, zh-Hant) keeps looking further down its list.
 */
export function pickBrowserLanguage(preferred: readonly string[]): Language | null {
  for (const tag of preferred) {
    const lower = tag.toLowerCase();
    const base = lower.split("-")[0];
    if (base === "zh") {
      if (lower === "zh" || lower.startsWith("zh-cn") || lower.startsWith("zh-sg") || lower.startsWith("zh-hans")) return "zh";
      continue;
    }
    if (isLanguage(base)) return base;
  }
  return null;
}
