/**
 * Places a visitor can pick in the top-bar selector that are NOT configured CommonGround
 * communities: a built-in "Panama City" entry and any places the visitor adds themselves. They
 * have no categories, areas, or cases behind them, so the app shows an honest "not set up yet"
 * state for them instead of sample data. Added places live only in this browser.
 *
 * A visitor adds a place by its parts — country, state/province/region, city or town, and
 * optionally neighborhood — because "Canada" alone says nothing about where CommonGround would
 * be needed. Only names are kept, never coordinates.
 */

export const PLACES_STORAGE_KEY = "commonground-places";
/** Per part (country, region, city, neighborhood). */
export const MAX_PLACE_PART_LENGTH = 60;
const MAX_LABEL_LENGTH = 4 * MAX_PLACE_PART_LENGTH + 6;
const MAX_PLACES = 20;

export type PlaceParts = { country: string; region?: string; city?: string; neighborhood?: string };

/** `parts` is missing only for places saved by an older version, when a place was just a name. */
export type SavedPlace = { label: string; parts?: PlaceParts };

export const BUILT_IN_PLACES = [
  {
    key: "panama-city",
    es: "Ciudad de Panamá",
    en: "Panama City",
    pt: "Cidade do Panamá",
    fr: "Panama (ville)",
    zh: "巴拿马城",
    hi: "पनामा सिटी",
    it: "Città di Panamá",
    parts: { country: "Panamá", region: "Panamá", city: "Ciudad de Panamá" },
  },
] as const;

const clean = (value: unknown) => (typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "");

/** "Plateau-Mont-Royal, Montréal, Québec, Canada" — most specific first. */
export function formatPlaceLabel(parts: PlaceParts): string {
  return [parts.neighborhood, parts.city, parts.region, parts.country].map(clean).filter(Boolean).join(", ");
}

export type PartsError = "missing_country" | "missing_city" | "too_long";

/** Country and city/town are required — anything less is too vague to act on. */
export function normalizeParts(raw: unknown): { ok: true; parts: PlaceParts } | { ok: false; reason: PartsError } {
  const r = (raw ?? {}) as Record<string, unknown>;
  const parts: PlaceParts = {
    country: clean(r.country),
    region: clean(r.region) || undefined,
    city: clean(r.city) || undefined,
    neighborhood: clean(r.neighborhood) || undefined,
  };
  if (!parts.country) return { ok: false, reason: "missing_country" };
  if (!parts.city) return { ok: false, reason: "missing_city" };
  if ([parts.country, parts.region, parts.city, parts.neighborhood].some((p) => p && p.length > MAX_PLACE_PART_LENGTH)) {
    return { ok: false, reason: "too_long" };
  }
  return { ok: true, parts };
}

/** Parses stored places defensively: anything malformed is dropped, never trusted. */
export function parseStoredPlaces(raw: string | null): SavedPlace[] {
  if (!raw) return [];
  try {
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return [];
    const seen = new Set<string>();
    const places: SavedPlace[] = [];
    for (const item of value) {
      let place: SavedPlace | null = null;
      if (typeof item === "string") {
        // Saved before places had parts: keep the plain name.
        const label = clean(item);
        if (label && label.length <= MAX_PLACE_PART_LENGTH) place = { label };
      } else if (item && typeof item === "object") {
        const normalized = normalizeParts((item as { parts?: unknown }).parts);
        if (normalized.ok) place = { label: formatPlaceLabel(normalized.parts), parts: normalized.parts };
      }
      if (!place || place.label.length > MAX_LABEL_LENGTH || seen.has(place.label.toLowerCase())) continue;
      seen.add(place.label.toLowerCase());
      places.push(place);
      if (places.length >= MAX_PLACES) break;
    }
    return places;
  } catch {
    return [];
  }
}

export type AddPlaceResult =
  | { ok: true; places: SavedPlace[]; place: SavedPlace }
  | { ok: false; reason: PartsError | "duplicate" | "full" };

/**
 * Adds a place unless it's missing its country or city, has an overly long part, is already
 * listed (case-insensitive, including configured communities and built-in places passed in
 * `existingNames`), or the list is full.
 */
export function addPlace(places: SavedPlace[], rawParts: unknown, existingNames: string[]): AddPlaceResult {
  const normalized = normalizeParts(rawParts);
  if (!normalized.ok) return normalized;
  const place: SavedPlace = { label: formatPlaceLabel(normalized.parts), parts: normalized.parts };
  const taken = [...places.map((p) => p.label), ...existingNames].map((n) => n.toLowerCase());
  if (taken.includes(place.label.toLowerCase())) return { ok: false, reason: "duplicate" };
  if (places.length >= MAX_PLACES) return { ok: false, reason: "full" };
  return { ok: true, places: [...places, place], place };
}
