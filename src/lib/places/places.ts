/**
 * Places a visitor can pick in the top-bar selector that are NOT configured CommonGround
 * communities: a built-in "Panama City" entry and any names the visitor adds themselves. They
 * have no categories, areas, or cases behind them, so the app shows an honest "not set up yet"
 * state for them instead of sample data. Added names live only in this browser.
 */

export const PLACES_STORAGE_KEY = "commonground-places";
export const MAX_PLACE_NAME_LENGTH = 60;
const MAX_PLACES = 20;

export const BUILT_IN_PLACES = [
  { key: "panama-city", es: "Ciudad de Panamá", en: "Panama City", pt: "Cidade do Panamá", fr: "Panama (ville)", zh: "巴拿马城", hi: "पनामा सिटी", it: "Città di Panamá" },
] as const;

/** Parses stored place names defensively: anything malformed is dropped, never trusted. */
export function parseStoredPlaces(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return [];
    const seen = new Set<string>();
    const names: string[] = [];
    for (const item of value) {
      if (typeof item !== "string") continue;
      const name = item.trim();
      if (!name || name.length > MAX_PLACE_NAME_LENGTH || seen.has(name.toLowerCase())) continue;
      seen.add(name.toLowerCase());
      names.push(name);
      if (names.length >= MAX_PLACES) break;
    }
    return names;
  } catch {
    return [];
  }
}

export type AddPlaceResult =
  | { ok: true; places: string[]; name: string }
  | { ok: false; reason: "empty" | "too_long" | "duplicate" | "full" };

/**
 * Adds a name unless it's blank, too long, already listed (case-insensitive, including the
 * configured communities and built-in places passed in `existingNames`), or the list is full.
 */
export function addPlace(places: string[], rawName: string, existingNames: string[]): AddPlaceResult {
  const name = rawName.trim().replace(/\s+/g, " ");
  if (!name) return { ok: false, reason: "empty" };
  if (name.length > MAX_PLACE_NAME_LENGTH) return { ok: false, reason: "too_long" };
  const taken = [...places, ...existingNames].map((n) => n.toLowerCase());
  if (taken.includes(name.toLowerCase())) return { ok: false, reason: "duplicate" };
  if (places.length >= MAX_PLACES) return { ok: false, reason: "full" };
  return { ok: true, places: [...places, name], name };
}
