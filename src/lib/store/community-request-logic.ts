import { z } from "zod";
import { LANGUAGE_CODES } from "@/lib/i18n/languages";
import { formatPlaceLabel, normalizeParts, type PlaceParts } from "@/lib/places/places";

/**
 * "Ask for CommonGround in your community": a visitor whose place isn't set up yet can say they'd
 * use it, so the interest isn't lost at a dead end. Anonymous by design — no name, email, or
 * contact details are asked for or stored, so nobody can be contacted back (the form says so).
 *
 * The rules shared by both request stores (in memory and Postgres). The list is capped so an
 * anonymous endpoint can't grow storage without bound.
 */
export const MAX_STORED_REQUESTS = 1000;

export type CommunityRequest = {
  id: string;
  placeName: string;
  /** Country / region / city / neighborhood, when the visitor gave them (older requests: name only). */
  parts?: PlaceParts;
  /** Accent- and case-insensitive key, so "Montréal" and "montreal" count as one place. */
  placeKey: string;
  note?: string;
  language: (typeof LANGUAGE_CODES)[number];
  createdAt: string;
};

export type CommunityRequestSummary = {
  placeName: string;
  parts?: PlaceParts;
  count: number;
  latestAt: string;
  /** Up to the 5 most recent non-empty notes, newest first. */
  notes: string[];
};

export function placeKeyOf(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** Validated at runtime: this sits behind a public Server Function. */
export const CommunityRequestInputSchema = z.object({
  placeName: z.string().trim().min(1).max(250),
  parts: z.unknown().optional(),
  note: z
    .string()
    .trim()
    .max(500)
    .optional()
    .transform((v) => (v ? v : undefined)),
  language: z.enum(LANGUAGE_CODES),
});

/** A validated request ready to store, or null if the input is invalid. */
export function buildCommunityRequest(rawInput: unknown, now: Date): CommunityRequest | null {
  const parsed = CommunityRequestInputSchema.safeParse(rawInput);
  if (!parsed.success) return null;
  // When parts are given they must be complete (country + city) and they define the name, so a
  // request is always as specific as the form required.
  let parts: PlaceParts | undefined;
  if (parsed.data.parts !== undefined) {
    const normalized = normalizeParts(parsed.data.parts);
    if (!normalized.ok) return null;
    parts = normalized.parts;
  }
  const placeName = parts ? formatPlaceLabel(parts) : parsed.data.placeName;
  return {
    id: crypto.randomUUID(),
    placeName,
    parts,
    placeKey: placeKeyOf(placeName),
    note: parsed.data.note,
    language: parsed.data.language,
    createdAt: now.toISOString(),
  };
}

/** Grouped by place, most-requested first — what a moderator needs to decide where to set up next. */
export function summarizeCommunityRequests(requests: CommunityRequest[]): CommunityRequestSummary[] {
  const groups = new Map<string, CommunityRequest[]>();
  for (const r of requests) {
    const list = groups.get(r.placeKey) ?? [];
    list.push(r);
    groups.set(r.placeKey, list);
  }
  return [...groups.values()]
    .map((list) => {
      const newestFirst = [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      return {
        placeName: newestFirst[0].placeName,
        parts: newestFirst.find((r) => r.parts)?.parts,
        count: list.length,
        latestAt: newestFirst[0].createdAt,
        notes: newestFirst.flatMap((r) => (r.note ? [r.note] : [])).slice(0, 5),
      };
    })
    .sort((a, b) => b.count - a.count || b.latestAt.localeCompare(a.latestAt));
}

