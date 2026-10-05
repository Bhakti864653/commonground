"use server";

import { listCasesForCommunity } from "@/lib/store/case-store";
import { getCommunity } from "@/lib/store/community-store";
import { toPublicCase } from "@/lib/schema/report";
import { isAdminAuthenticated } from "@/lib/admin/auth";
import { timelineOfficeNames, type TimelineOfficeName } from "@/lib/guide/referral/route";
import { AGENT_FEED_PAGE_SIZE, buildAgentFeed, countAgentActivity, type AgentCounts, type AgentFeedItem } from "./activity";

export type AgentActivityPage = {
  items: AgentFeedItem[];
  /** All feed entries for the community, for "load more". */
  total: number;
  counts: AgentCounts;
  /** Office names (already public on /resources) to fill into "prepared a referral to {office}". */
  offices: TimelineOfficeName[];
};

/**
 * The public "Agente IA" feed for one community: built from `PublicCase` timelines only (see
 * agent/activity.ts), so nothing private can reach it. An unknown community is simply empty.
 */
export async function listAgentActivity(communityId: string, offset: unknown = 0): Promise<AgentActivityPage> {
  const start = typeof offset === "number" && Number.isInteger(offset) && offset > 0 ? offset : 0;
  const community = await getCommunity(communityId);
  if (!community) return { items: [], total: 0, counts: { reviewed: 0, prepared: 0, approved: 0 }, offices: [] };
  const cases = (await listCasesForCommunity(communityId)).map(toPublicCase);
  const feed = buildAgentFeed(cases);
  return {
    items: feed.slice(start, start + AGENT_FEED_PAGE_SIZE),
    total: feed.length,
    counts: countAgentActivity(cases),
    offices: timelineOfficeNames(community),
  };
}

export type PendingReferral = { caseNumber: string; contactId: string; preparedAt: string; isDemo: boolean };

/**
 * Referrals waiting for a moderator, for the moderator-only section of the page. Anyone without
 * the admin cookie gets `null` — the list never leaves the server for them, it isn't just hidden.
 * Only the case number, office and time go out; the draft itself stays on /admin.
 */
export async function listPendingReferrals(communityId: string): Promise<PendingReferral[] | null> {
  if (!(await isAdminAuthenticated())) return null;
  const cases = await listCasesForCommunity(communityId);
  return cases
    .filter((c) => !c.removal)
    .flatMap((c) =>
      c.agentSuggestions
        .filter((s) => s.kind === "referral" && s.status === "pending")
        .map((s) => ({
          caseNumber: c.publicCaseNumber,
          contactId: s.suggestedValue,
          preparedAt: s.createdAt,
          isDemo: c.sourceType === "demonstration",
        })),
    )
    .sort((a, b) => a.preparedAt.localeCompare(b.preparedAt));
}
