"use server";

import {
  createCase,
  deleteCase,
  flagInaccuracy,
  listCasesForCommunity,
  type NewCaseInput,
} from "@/lib/store/case-store";
import { ReportStatusSchema, toPublicCase, type PublicCase } from "@/lib/schema/report";
import type { CommunityConfig } from "@/lib/schema/community";
import { detectTrends, type Trend } from "@/lib/insights/trends";
import { filterCases } from "@/lib/explore/filter-cases";
import { getCommunity, listCommunities, startCommunityForPlace } from "@/lib/store/community-store";
import { recordCommunityRequest } from "@/lib/store/community-store";
import { placeAtPoint, searchPlaces, type GeocodeResult } from "@/lib/places/geocode";
import { isLanguage } from "@/lib/i18n/languages";
import { z } from "zod";
import { after } from "next/server";
import { runIntake } from "@/lib/pipeline/pipeline";
import { redactPersonalInfo, type PiiKind } from "@/lib/pipeline/redact";
import { getPublishedSummary } from "@/lib/pipeline/pipeline";
import { getCurrentModerator } from "@/lib/admin/auth";
import { isDemoGuideOn } from "@/lib/demo-guide/demo-mode";
import { getPipelineRepository } from "@/lib/pipeline/store";
import { DEMO_CASE_CREATED_ACTION, DEMO_CASE_CREATED_SUMMARY } from "@/lib/pipeline/demo-cases";

/**
 * The signed-in moderator, when demo mode is on (the demo guide's cookie); otherwise null. Fails
 * safe: if either check can't run, the report is simply a normal resident report.
 */
async function demoModeModerator() {
  try {
    const moderator = await getCurrentModerator();
    return moderator && (await isDemoGuideOn()) ? moderator : null;
  } catch {
    return null;
  }
}

/**
 * Only `publicCaseNumber` + `managementToken` (+ what the privacy filter removed) — the wizard
 * needs the token to build the one-time manage link, but nothing else about the freshly created
 * case needs to reach the client as a blanket object.
 *
 * Personal details (phones, emails, ID numbers, house numbers, "my name is…") are removed from
 * the description on the server before it is saved, whatever the browser sent; the resident's
 * review screen shows the same filter beforehand. The removed text is never stored.
 */
export async function submitCase(
  input: NewCaseInput,
  intake?: { title?: unknown },
): Promise<{ publicCaseNumber: string; managementToken: string; redacted: PiiKind[] }> {
  const language = isLanguage(input?.consent?.language) ? input.consent.language : "es";
  const redaction =
    typeof input?.description === "string" ? redactPersonalInfo(input.description, language) : { text: input?.description, found: [] };
  // Demo mode: a signed-in moderator with the demo guide on creates an EXAMPLE case (labelled
  // "Ejemplo", deleted by Reset demo). Both checks run on the server; the cookie alone (which
  // anyone could set) is not enough, so a resident's report always stays a resident's report.
  const moderator = await demoModeModerator();
  const created = await createCase({ ...input, description: redaction.text }, undefined, { demo: moderator !== null });
  if (moderator) {
    await getPipelineRepository().addAudit({
      caseNumber: created.publicCaseNumber,
      communityId: created.communityId,
      actorType: "moderator",
      actor: moderator.email ?? moderator.name,
      action: DEMO_CASE_CREATED_ACTION,
      summary: DEMO_CASE_CREATED_SUMMARY,
    });
  }
  const title = typeof intake?.title === "string" && intake.title.trim() ? redactPersonalInfo(intake.title.trim().slice(0, 120), language).text : undefined;
  // The agentic pipeline (Routing Agent + Critic, several Groq calls) runs after the response,
  // so the resident gets their case number immediately. It never throws by design; the catch
  // only guards against a bug, which must not surface as a failed submission after the fact.
  after(async () => {
    try {
      await runIntake(created.publicCaseNumber, { title, redacted: redaction.found });
    } catch (error) {
      console.error(`[pipeline] ${created.publicCaseNumber}: intake crashed`, error);
    }
  });
  return { publicCaseNumber: created.publicCaseNumber, managementToken: created.managementToken, redacted: redaction.found };
}

/** The latest weekly summary moderators published for a community: counts and case numbers only. */
export async function getWeeklySummaryForActivity(communityId: string) {
  if (typeof communityId !== "string") return null;
  return getPublishedSummary(communityId);
}

export async function listCasesForActivity(communityId: string): Promise<PublicCase[]> {
  return (await listCasesForCommunity(communityId)).map(toPublicCase);
}

/** Aggregate counts only (never a specific case's private data) — safe to show publicly. */
export async function getTrendsForActivity(communityId: string): Promise<Trend[]> {
  return detectTrends((await listCasesForCommunity(communityId)).map(toPublicCase));
}

export async function deleteSubmission(
  caseNumber: string,
  managementToken: string,
): Promise<boolean> {
  if (typeof caseNumber !== "string" || typeof managementToken !== "string") return false;
  return deleteCase(caseNumber, managementToken);
}

/** Public endpoint: the optional note is bounded so an anonymous caller can't store unlimited text. */
export async function reportInaccuracy(caseNumber: string, note?: string): Promise<boolean> {
  if (typeof caseNumber !== "string") return false;
  if (note !== undefined && (typeof note !== "string" || note.length > 1000)) return false;
  return flagInaccuracy(caseNumber, note);
}

/**
 * Every community a resident can pick, including ones a moderator set up at runtime. Moderator
 * emails are stripped — they're never needed client-side.
 */
export async function listCommunitiesForResidents(): Promise<CommunityConfig[]> {
  return (await listCommunities()).map((c) => ({ ...c, moderation: { ...c.moderation, moderatorEmails: [] } }));
}

export type CommunityInfo = Pick<CommunityConfig, "id" | "displayName" | "status" | "trustedSources" | "officialContacts">;

/**
 * Fresh from the server each time (a moderator may have just added or removed an entry), so the
 * Contacts page never shows a stale copy from the client's community list.
 */
export async function getCommunityInfo(communityId: string): Promise<CommunityInfo | null> {
  const community = typeof communityId === "string" ? await getCommunity(communityId) : undefined;
  if (!community) return null;
  const { id, displayName, status, trustedSources, officialContacts } = community;
  return { id, displayName, status, trustedSources, officialContacts };
}

/**
 * The community for a place a visitor added: an existing one if the place already has one,
 * otherwise a new starter community (clearly marked as not reviewed). Parts are validated in the
 * store; moderator emails are stripped like everywhere else residents see a community.
 */
export async function startCommunityForPlaceAction(
  parts: unknown,
): Promise<{ ok: true; community: CommunityConfig } | { ok: false; error: "invalid" | "full" }> {
  const result = await startCommunityForPlace(parts);
  if (!result.ok) return result;
  const c = result.community;
  return { ok: true, community: { ...c, moderation: { ...c.moderation, moderatorEmails: [] } } };
}

/**
 * Place search for the "add a place" dialog. Only on an explicit Search click (Nominatim forbids
 * autocomplete); the query goes out from this server, never from the visitor's browser.
 */
export async function searchPlacesAction(query: unknown, language: unknown): Promise<GeocodeResult> {
  if (typeof query !== "string" || query.trim().length < 2 || query.length > 120) return { ok: false };
  return searchPlaces(query, isLanguage(language) ? language : "en");
}

/** "Tap the map": the named place around a point. Coordinates are rounded and never stored. */
export async function placeAtPointAction(lat: unknown, lng: unknown, language: unknown): Promise<GeocodeResult> {
  if (typeof lat !== "number" || typeof lng !== "number" || !Number.isFinite(lat) || !Number.isFinite(lng)) return { ok: false };
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return { ok: false };
  return placeAtPoint(lat, lng, isLanguage(language) ? language : "en");
}

/**
 * "Ask for CommonGround here" from a place that isn't set up. Anonymous; validated inside the
 * store (place name, optional note, language only — never contact details).
 */
export async function requestCommunity(input: unknown): Promise<boolean> {
  return recordCommunityRequest(input);
}

/** Runtime-validated: a server action is a public endpoint callable with any JSON. */
const SearchFiltersSchema = z.object({
  query: z.string().max(200),
  type: z.enum(["all", "report", "proposal"]),
  status: z.union([z.literal("all"), ReportStatusSchema]),
  categoryId: z.string().max(80),
  areaId: z.string().max(80),
});

export type CaseSearchResult = { total: number; items: { caseItem: PublicCase; index: number }[] };

/**
 * Server-side search and filtering for Explore. Each result carries its position in the
 * community's newest-first list, so its number still matches its pin on the home map.
 * Invalid input or an unknown community returns an empty result rather than throwing.
 */
export async function searchCases(communityId: string, rawFilters: unknown): Promise<CaseSearchResult> {
  const community = typeof communityId === "string" ? await getCommunity(communityId) : undefined;
  const parsed = SearchFiltersSchema.safeParse(rawFilters);
  if (!community || !parsed.success) return { total: 0, items: [] };

  const all = (await listCasesForCommunity(community.id))
    .map(toPublicCase)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const indexById = new Map(all.map((c, i) => [c.id, i]));
  const matches = filterCases(all, parsed.data, community);
  return { total: all.length, items: matches.map((caseItem) => ({ caseItem, index: indexById.get(caseItem.id) ?? 0 })) };
}
