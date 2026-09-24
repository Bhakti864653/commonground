/**
 * The languages CommonGround's interface speaks. Spanish first for the Santiago de Veraguas
 * pilot, then English; Portuguese, French, and Simplified Chinese were added 2026-09-24.
 * `modelName` is what the Guide is told to reply in; `dateLocale` formats dates.
 */
export const LANGUAGES = [
  { code: "es", nativeName: "Español", htmlLang: "es", dateLocale: "es-PA", modelName: "Spanish" },
  { code: "en", nativeName: "English", htmlLang: "en", dateLocale: "en-US", modelName: "English" },
  { code: "pt", nativeName: "Português", htmlLang: "pt-BR", dateLocale: "pt-BR", modelName: "Brazilian Portuguese" },
  { code: "fr", nativeName: "Français", htmlLang: "fr", dateLocale: "fr-FR", modelName: "French" },
  { code: "zh", nativeName: "中文（简体）", htmlLang: "zh-Hans", dateLocale: "zh-CN", modelName: "Simplified Chinese" },
] as const;

export type Language = (typeof LANGUAGES)[number]["code"];

export const LANGUAGE_CODES = LANGUAGES.map((l) => l.code) as [Language, ...Language[]];

/** Languages beyond the two every config field has (label = English, labelEs = Spanish). */
export type ExtraLanguage = Exclude<Language, "es" | "en">;

export function isLanguage(value: unknown): value is Language {
  return typeof value === "string" && (LANGUAGE_CODES as string[]).includes(value);
}

function info(language: Language) {
  return LANGUAGES.find((l) => l.code === language) ?? LANGUAGES[0];
}

export const dateLocale = (language: Language) => info(language).dateLocale;
export const htmlLang = (language: Language) => info(language).htmlLang;
export const modelLanguageName = (language: Language) => info(language).modelName;

/** A piece of interface text in every supported language. */
export type LocalizedText = Record<Language, string>;
