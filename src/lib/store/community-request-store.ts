import { z } from "zod";
import { LANGUAGE_CODES } from "@/lib/i18n/languages";

/**
 * "Ask for CommonGround in your community": a visitor whose place isn't set up yet can say they'd
 * use it, so the interest isn't lost at a dead end. Anonymous by design — no name, email, or
 * contact details are asked for or stored, so nobody can be contacted back (the form says so).
 *
 * Same prototype persistence as cases (globalThis, lost on restart/redeploy). The list is capped
 * so an anonymous endpoint can't grow memory without bound.
 */
export const MAX_STORED_REQUESTS = 1000;

export type CommunityRequest = {
  id: string;
  placeName: string;
  /** Accent- and case-insensitive key, so "Montréal" and "montreal" count as one place. */
  placeKey: string;
  note?: string;
  language: (typeof LANGUAGE_CODES)[number];
  createdAt: string;
};

export type CommunityRequestSummary = {
  placeName: string;
  count: number;
  latestAt: string;
  /** Up to the 5 most recent non-empty notes, newest first. */
  notes: string[];
};

type State = { requests: CommunityRequest[] };

function getStore(): State {
  const g = globalThis as typeof globalThis & { __commonGroundCommunityRequests__?: State };
  return (g.__commonGroundCommunityRequests__ ??= { requests: [] });
}

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
  placeName: z.string().trim().min(1).max(60),
  note: z
    .string()
    .trim()
    .max(500)
    .optional()
    .transform((v) => (v ? v : undefined)),
  language: z.enum(LANGUAGE_CODES),
});

export function recordCommunityRequest(rawInput: unknown, now: Date = new Date()): boolean {
  const parsed = CommunityRequestInputSchema.safeParse(rawInput);
  if (!parsed.success) return false;
  const store = getStore();
  store.requests.push({
    id: crypto.randomUUID(),
    placeName: parsed.data.placeName,
    placeKey: placeKeyOf(parsed.data.placeName),
    note: parsed.data.note,
    language: parsed.data.language,
    createdAt: now.toISOString(),
  });
  if (store.requests.length > MAX_STORED_REQUESTS) {
    store.requests.splice(0, store.requests.length - MAX_STORED_REQUESTS);
  }
  return true;
}

/** Grouped by place, most-requested first — what a moderator needs to decide where to set up next. */
export function listCommunityRequestSummaries(): CommunityRequestSummary[] {
  const groups = new Map<string, CommunityRequest[]>();
  for (const r of getStore().requests) {
    const list = groups.get(r.placeKey) ?? [];
    list.push(r);
    groups.set(r.placeKey, list);
  }
  return [...groups.values()]
    .map((list) => {
      const newestFirst = [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      return {
        placeName: newestFirst[0].placeName,
        count: list.length,
        latestAt: newestFirst[0].createdAt,
        notes: newestFirst.flatMap((r) => (r.note ? [r.note] : [])).slice(0, 5),
      };
    })
    .sort((a, b) => b.count - a.count || b.latestAt.localeCompare(a.latestAt));
}

/** Test-only reset. */
export function __resetCommunityRequestsForTests(): void {
  getStore().requests = [];
}
