/**
 * PRIVACY.md's exact trigger-phrase list (Spanish, English, Portuguese, French, and Simplified
 * Chinese — written without accents, since input is accent-stripped before matching). This runs *before* any LLM
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
  "fuga de gas",
  "olor a gas",
  "huele a gas",
  "i'm drowning",
  "im drowning",
  "immediate danger",
  "fire",
  "person injured",
  "urgent help",
  "gas leak",
  "smell gas",
  "smells like gas",
  "smell of gas",
  // Portuguese
  "estou me afogando",
  "perigo imediato",
  "fogo",
  "incendio",
  "pessoa ferida",
  "ajuda urgente",
  "vazamento de gas",
  "cheiro de gas",
  // French — "feu" alone would also match "feuille", so only full phrases
  "je me noie",
  "danger immediat",
  "au feu",
  "il y a le feu",
  "incendie",
  "personne blessee",
  "aide urgente",
  "fuite de gaz",
  "odeur de gaz",
  "ca sent le gaz",
  // Simplified Chinese
  "溺水",
  "快淹死",
  "紧急危险",
  "着火",
  "火灾",
  "有人受伤",
  "紧急求助",
  "煤气泄漏",
  "燃气泄漏",
  "闻到煤气",
  "闻到燃气",
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
