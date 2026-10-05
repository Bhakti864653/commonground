import type { PublicCase, ReportStatusEvent, TimelineEventKind } from "@/lib/schema/report";

/** The timeline steps the "Agente IA" page shows: the agent's own steps and moderators' referral decisions. */
export type AgentFeedKind = Exclude<TimelineEventKind, "status">;

/**
 * One line of the public agent feed. Built only from a `PublicCase` timeline entry, and only
 * from fields that are public by construction: each kind has fixed text, so there is no note,
 * reasoning, urgency or drafted message to carry. Adding a field here that `PublicCase` doesn't
 * have is a compile error.
 */
export type AgentFeedItem = {
  id: ReportStatusEvent["id"];
  caseNumber: PublicCase["publicCaseNumber"];
  kind: AgentFeedKind;
  contactId?: ReportStatusEvent["contactId"];
  occurredAt: ReportStatusEvent["occurredAt"];
  /** Demonstration cases are labeled as such wherever they appear. */
  isDemo: boolean;
};

export type AgentCounts = {
  /** Reports the AI reviewed at least once. */
  reviewed: number;
  /** Referrals the AI prepared. */
  prepared: number;
  /** Referrals a moderator approved. Not a success count: the office still has to respond. */
  approved: number;
};

const MODERATOR_KINDS: ReadonlySet<AgentFeedKind> = new Set(["referral_approved", "referral_declined"]);

/** The agent's own steps, plus a moderator's decision on a referral. Never a plain status change. */
export function isAgentFeedEvent(event: ReportStatusEvent): event is ReportStatusEvent & { kind: AgentFeedKind } {
  const kind = event.kind ?? "status";
  if (kind === "status") return false;
  if (event.actorType === "agent") return !MODERATOR_KINDS.has(kind);
  return event.actorType === "moderator" && MODERATOR_KINDS.has(kind);
}

/** Removed cases keep no public content, so they stay out of the feed and the counts. */
const visible = (cases: PublicCase[]) => cases.filter((c) => !c.removal);

/** Every agent-feed entry across these cases, newest first (entries sharing a time keep timeline order). */
export function buildAgentFeed(cases: PublicCase[]): AgentFeedItem[] {
  const items = visible(cases).flatMap((c) =>
    c.statusHistory.flatMap((event, index) =>
      isAgentFeedEvent(event)
        ? [
            {
              item: {
                id: event.id,
                caseNumber: c.publicCaseNumber,
                kind: event.kind,
                ...(event.contactId ? { contactId: event.contactId } : {}),
                occurredAt: event.occurredAt,
                isDemo: c.sourceType === "demonstration",
              } satisfies AgentFeedItem,
              index,
            },
          ]
        : [],
    ),
  );
  items.sort((a, b) => b.item.occurredAt.localeCompare(a.item.occurredAt) || b.index - a.index);
  return items.map(({ item }) => item);
}

export function countAgentActivity(cases: PublicCase[]): AgentCounts {
  const counts: AgentCounts = { reviewed: 0, prepared: 0, approved: 0 };
  for (const c of visible(cases)) {
    const events = c.statusHistory.filter(isAgentFeedEvent);
    if (events.some((e) => e.kind === "ai_reviewed")) counts.reviewed += 1;
    counts.prepared += events.filter((e) => e.kind === "referral_prepared").length;
    counts.approved += events.filter((e) => e.kind === "referral_approved").length;
  }
  return counts;
}

export const AGENT_FEED_PAGE_SIZE = 20;
