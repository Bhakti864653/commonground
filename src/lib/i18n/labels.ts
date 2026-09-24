import type { ExtraLanguage, Language } from "./languages";

/**
 * Config data (areas, categories, consent text, notes) always has English and Spanish and may
 * carry more. Anything missing falls back to English — a moderator may only have typed two.
 */
export type Labelled = { label: string; labelEs?: string; labels?: Partial<Record<ExtraLanguage, string>> };

export function labelOf(item: Labelled, language: Language): string;
export function labelOf(item: Labelled | undefined | null, language: Language): string | undefined;
export function labelOf(item: Labelled | undefined | null, language: Language): string | undefined {
  if (!item) return undefined;
  if (language === "es") return item.labelEs ?? item.label;
  if (language === "en") return item.label;
  return item.labels?.[language] ?? item.label;
}

/** The consent text a resident agrees to, in their language (English if not translated). */
export function consentTextOf(
  privacy: { consentTextEs: string; consentTextEn: string; consentTexts?: Partial<Record<ExtraLanguage, string>> },
  language: Language,
): string {
  if (language === "es") return privacy.consentTextEs;
  if (language === "en") return privacy.consentTextEn;
  return privacy.consentTexts?.[language] ?? privacy.consentTextEn;
}

/** A status-history note in the reader's language; moderator notes are often single-language. */
export function noteOf(
  event: { note?: string; noteEs?: string; notes?: Partial<Record<ExtraLanguage, string>> },
  language: Language,
): string | undefined {
  if (language === "es") return event.noteEs ?? event.note;
  if (language === "en") return event.note ?? event.noteEs;
  return event.notes?.[language] ?? event.note ?? event.noteEs;
}
