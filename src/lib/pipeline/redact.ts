import type { Language } from "@/lib/i18n/languages";

/**
 * Finds and removes personal details from residents' text before it is saved or shown to an
 * agent. Rule-based on purpose: it has to work when the AI is down, and it must never send the
 * text anywhere to decide. It catches the common shapes (emails, phone numbers, Panamanian ID
 * numbers, house/apartment numbers, "my name is …" in the seven interface languages). It can miss
 * unusual ones, which is why moderators still read every case before anything is published.
 */
export type PiiKind = "email" | "phone" | "id_number" | "house_number" | "name";

export type RedactionResult = { text: string; found: PiiKind[] };

/** What replaces a removed detail, in the resident's own language. */
export const REDACTION_TOKEN: Record<Language, string> = {
  es: "[dato personal eliminado]",
  en: "[personal detail removed]",
  pt: "[dado pessoal removido]",
  fr: "[donnée personnelle retirée]",
  zh: "[已删除个人信息]",
  hi: "[निजी जानकारी हटाई गई]",
  it: "[dato personale rimosso]",
};

// Case numbers ("SV-2026-0011") and dates ("12-10-2026", "2026-10-12") look like digit runs, so
// they're protected before phone and ID matching.
const PROTECTED = /\b(?:[A-Z]{2,4}-\d{4}-\d{4}|\d{1,2}[-/.]\d{1,2}[-/.](?:19|20)\d{2}|(?:19|20)\d{2}-\d{2}-\d{2})\b/g;
const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
// Panamanian cédula: province (1–13, or PE/E/N/…), book, entry — e.g. 8-123-4567, PE-12-345.
const CEDULA = /\b(?:(?:1[0-3]|[1-9])(?:AV|PI)?|PE|E|N)-\d{1,4}-\d{1,6}\b/gi;
// 7+ digits, optionally with a leading + and spaces, dashes, dots or brackets between them.
const PHONE = /(?<![\w-])\+?\d(?:[\s.()-]*\d){6,}(?![\w-])/g;
const HOUSE_NUMBER =
  /(?<![\p{L}\d])(?:casa|house|apartamento|apartment|apto|apt|depto|departamento|edificio|building|lote|maison|appartement|appartamento|numero|número|no\.|nº|n°|#)\s*#?\s*\d+[a-z]?\b/giu;
// "my name is X": the next one to three capitalized words (Latin scripts).
const NAME_LATIN =
  // The trigger may start a sentence ("Me llamo…"); the name itself must be capitalized.
  /\b(?:[Mm]e llamo|[Mm]i nombre es|[Mm]y name is|[Ii] am called|[Mm]eu nome [ée]|[Mm]e chamo|[Jj]e m['’]appelle|[Mm]on nom est|[Mm]i chiamo|[Ii]l mio nome [èe])\s+((?:[A-ZÁÉÍÓÚÑÀÈÌÒÙÂÊÎÔÛÇ][\p{L}'’-]+)(?:\s+[A-ZÁÉÍÓÚÑÀÈÌÒÙÂÊÎÔÛÇ][\p{L}'’-]+){0,2})/gu;
// Chinese "我叫X" / "我的名字是X": up to four characters after it.
const NAME_ZH = /(?:我叫|我的名字是|我的名字叫)\s*([\p{Script=Han}]{1,4})/gu;
// Hindi "मेरा नाम X है".
const NAME_HI = /मेरा नाम\s+([\p{L}\p{M}]+(?:\s+[\p{L}\p{M}]+)?)\s+है/gu;

export function redactPersonalInfo(input: string, language: Language = "es"): RedactionResult {
  const token = REDACTION_TOKEN[language];
  const found = new Set<PiiKind>();
  const protectedNumbers: string[] = [];
  let text = input.replace(PROTECTED, (m) => {
    protectedNumbers.push(m);
    return `\u0000${protectedNumbers.length - 1}\u0000`;
  });

  const replace = (pattern: RegExp, kind: PiiKind, keep?: (m: string) => boolean) => {
    text = text.replace(pattern, (m) => {
      if (keep?.(m)) return m;
      found.add(kind);
      return token;
    });
  };

  replace(EMAIL, "email");
  replace(CEDULA, "id_number");
  replace(PHONE, "phone");
  replace(HOUSE_NUMBER, "house_number");
  for (const pattern of [NAME_LATIN, NAME_ZH, NAME_HI]) {
    text = text.replace(pattern, (whole, name: string) => {
      found.add("name");
      return whole.replace(name, token);
    });
  }

  text = text.replace(/\u0000(\d+)\u0000/g, (_, i) => protectedNumbers[Number(i)]);
  return { text, found: [...found] };
}

/** True when the text still contains something the redactor would remove. */
export function containsPersonalInfo(text: string): boolean {
  return redactPersonalInfo(text).found.length > 0;
}
