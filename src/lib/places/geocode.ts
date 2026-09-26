import { z } from "zod";
import type { Language } from "@/lib/i18n/languages";
import { formatPlaceLabel, type PlaceParts } from "./places";

/**
 * Place search and "tap the map" lookup through OpenStreetMap's Nominatim, called only from the
 * server (so a visitor's IP address is never sent to a third party) and only on an explicit
 * action — Nominatim's usage policy forbids autocomplete. The policy also requires an identifying
 * User-Agent, at most one request per second, caching, and attribution (shown beside the map).
 * https://operations.osmfoundation.org/policies/nominatim/
 *
 * Nothing here is stored: coordinates are used only to answer the request, then discarded.
 */

const USER_AGENT = "CommonGround/0.1 (+https://commonground-psi.vercel.app; community civic prototype)";
const BASE = "https://nominatim.openstreetmap.org";
const MIN_INTERVAL_MS = 1100;
const CACHE_LIMIT = 300;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export type { PlaceParts };

export type PlaceSuggestion = {
  /** Built from the parts (never Nominatim's full name, which can include streets and postcodes). */
  label: string;
  parts: PlaceParts;
  /** For drawing the map only — never stored. [south, north, west, east] */
  bbox: [number, number, number, number];
};

export type GeocodeResult = { ok: true; results: PlaceSuggestion[] } | { ok: false };

const AddressSchema = z.record(z.string(), z.string()).optional();
const NominatimItemSchema = z.object({
  addresstype: z.string().optional(),
  boundingbox: z.array(z.string()).length(4),
  address: AddressSchema,
});

/**
 * Only areas, never buildings, streets, shops, or other points: CommonGround places are
 * neighborhoods and towns, not addresses.
 */
const AREA_TYPES = new Set([
  "country", "state", "province", "region", "state_district", "county", "municipality",
  "city", "town", "village", "hamlet", "borough", "city_district", "district",
  "suburb", "quarter", "neighbourhood",
]);

const first = (address: Record<string, string>, keys: string[]) => keys.map((k) => address[k]).find(Boolean);

/**
 * Nominatim's address keys vary by country (a "state" in the US, a "province" in Canada, a
 * "region" or "state_district" elsewhere; a "city", "town", or "village"). Pure, so it's
 * unit-testable without the network.
 */
export function partsFromAddress(address: Record<string, string> | undefined): PlaceParts | null {
  if (!address?.country) return null;
  return {
    country: address.country,
    region: first(address, ["state", "province", "region", "state_district", "county"]),
    city: first(address, ["city", "town", "village", "municipality", "hamlet"]),
    neighborhood: first(address, ["neighbourhood", "suburb", "quarter", "city_district", "borough"]),
  };
}

export function parseNominatimItem(item: unknown): PlaceSuggestion | null {
  const parsed = NominatimItemSchema.safeParse(item);
  if (!parsed.success) return null;
  if (parsed.data.addresstype && !AREA_TYPES.has(parsed.data.addresstype)) return null;
  const parts = partsFromAddress(parsed.data.address);
  const bbox = parsed.data.boundingbox.map(Number) as [number, number, number, number];
  if (!parts || bbox.some((n) => !Number.isFinite(n))) return null;
  return { label: formatPlaceLabel(parts), parts, bbox };
}

type CacheEntry = { at: number; value: PlaceSuggestion[] };
type State = { cache: Map<string, CacheEntry>; nextSlot: number };

function getState(): State {
  const g = globalThis as typeof globalThis & { __commonGroundGeocode__?: State };
  return (g.__commonGroundGeocode__ ??= { cache: new Map(), nextSlot: 0 });
}

/** Spaces calls at least MIN_INTERVAL_MS apart (per server instance). */
async function waitForSlot(): Promise<void> {
  const state = getState();
  const now = Date.now();
  const slot = Math.max(now, state.nextSlot);
  state.nextSlot = slot + MIN_INTERVAL_MS;
  if (slot > now) await new Promise((resolve) => setTimeout(resolve, slot - now));
}

async function cached(key: string, load: () => Promise<PlaceSuggestion[]>): Promise<PlaceSuggestion[]> {
  const { cache } = getState();
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.value;
  const value = await load();
  cache.set(key, { at: Date.now(), value });
  if (cache.size > CACHE_LIMIT) cache.delete(cache.keys().next().value!);
  return value;
}

async function fetchJson(url: string): Promise<unknown> {
  await waitForSlot();
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
    signal: AbortSignal.timeout(8000),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Nominatim ${res.status}`);
  return res.json();
}

export async function searchPlaces(query: string, language: Language): Promise<GeocodeResult> {
  const q = query.trim().replace(/\s+/g, " ");
  try {
    const results = await cached(`s|${language}|${q.toLowerCase()}`, async () => {
      // featureType=settlement returns towns, cities, and neighborhoods rather than buildings.
      const url = `${BASE}/search?format=jsonv2&addressdetails=1&limit=5&featureType=settlement&accept-language=${language}&q=${encodeURIComponent(q)}`;
      const data = await fetchJson(url);
      return Array.isArray(data) ? data.map(parseNominatimItem).filter((r): r is PlaceSuggestion => r !== null) : [];
    });
    return { ok: true, results };
  } catch {
    return { ok: false };
  }
}

/**
 * The neighborhood-level place at a tapped point. The point is rounded to 3 decimals (~100 m)
 * before it leaves the server, and zoom 14 asks Nominatim for the neighborhood (16+ would be
 * streets and buildings).
 */
export async function placeAtPoint(lat: number, lng: number, language: Language): Promise<GeocodeResult> {
  const rLat = Math.round(lat * 1000) / 1000;
  const rLng = Math.round(lng * 1000) / 1000;
  try {
    const results = await cached(`r|${language}|${rLat},${rLng}`, async () => {
      const url = `${BASE}/reverse?format=jsonv2&addressdetails=1&zoom=14&accept-language=${language}&lat=${rLat}&lon=${rLng}`;
      const item = parseNominatimItem(await fetchJson(url));
      return item ? [item] : [];
    });
    return { ok: true, results };
  } catch {
    return { ok: false };
  }
}
