/**
 * PRIVACY.md's exact trigger-phrase list (Spanish and English). This runs *before* any LLM
 * call, deterministically — the emergency banner must never depend on a model actually
 * noticing the phrase, and must show "immediately, above any normal assistant response, never
 * buried in a longer answer."
 */
const TRIGGER_PHRASES = [
  "me estoy ahogando",
  "hay peligro inmediato",
  "fuego",
  "persona herida",
  "ayuda urgente",
  "i'm drowning",
  "im drowning",
  "immediate danger",
  "fire",
  "person injured",
  "urgent help",
];

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, ""); // strip accents so "peligro inmediato" matches either way
}

/**
 * Deliberately a blunt substring match, not intent detection — "fire" will also trigger on
 * "firefighter" or "fireplace". PRIVACY.md's own list is this literal; for a safety feature,
 * an occasional unnecessary banner is the correct tradeoff against ever missing a real one.
 */
export function detectEmergencyPhrase(text: string): boolean {
  const normalized = normalize(text);
  return TRIGGER_PHRASES.some((phrase) => normalized.includes(normalize(phrase)));
}
