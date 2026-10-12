import { getReferralOffice } from "@/data/referral-offices";
import { SANTIAGO_VERAGUAS } from "@/data/communities";
import { DEMO_CASE_SEEDS } from "@/lib/store/demo-seed";
import type { LocalizedText } from "@/lib/i18n/languages";
import {
  AuditEntrySchema,
  CasePipelineStateSchema,
  OutboxItemSchema,
  ProposalSchema,
  type AuditEntry,
  type CasePipelineState,
  type Critique,
  type OutboxItem,
  type Priority,
  type Proposal,
} from "../types";
import { FOLLOW_UP_AFTER_DAYS } from "../schedule";
import {
  DEMO_ACTOR_SUFFIX,
  DEMO_FOLLOW_UP_UPDATE,
  DEMO_PIPELINE_SEEDS,
  demoReferralMessage,
  demoReminderMessage,
  demoSummaryEs,
  type DemoPipelineSeed,
} from "./demo-pipeline-data";

/**
 * Turns one DemoPipelineSeed into concrete records, with times as "days ago" and the case number,
 * its link, and duplicate case numbers as placeholders ({CASE}, {URL}, {DUP0}, {DUP1}…). The
 * in-memory store and the SQL generator each fill those in their own way, so both get exactly
 * the same history.
 */
export type DemoRecords = {
  description: string;
  duplicateDescriptions: string[];
  state: {
    officeId?: string;
    priority?: Priority;
    routedDaysAgo?: number;
    referralQueuedDaysAgo?: number;
    lastFollowUpDaysAgo?: number;
    lastProgressDaysAgo: number;
  };
  proposals: Array<{
    kind: Proposal["kind"];
    status: Proposal["status"];
    createdDaysAgo: number;
    reviewedDaysAgo?: number;
    payload: Proposal["payload"];
    critique: Critique;
  }>;
  outbox: Array<{ kind: "referral" | "follow_up"; daysAgo: number; officeId: string; toLabel: string; toAddress: string; subject: string; bodyEs: string }>;
  audit: Array<Pick<AuditEntry, "actorType" | "actor" | "action" | "summary"> & { daysAgo: number }>;
  publicEvents: Array<{ kind: "referral_queued" | "follow_up_update"; daysAgo: number; notes?: LocalizedText }>;
};

export const DEMO_MODERATOR = "demo-seed";
/** A few minutes, in days — steps that follow each other closely. */
const MINUTES = (m: number) => m / (24 * 60);

function critique(concern?: string): Critique {
  return concern
    ? { verdict: "concerns", issues: [{ type: "missing_info", note: concern }], source: "example" }
    : { verdict: "ok", issues: [], source: "example" };
}

export function buildDemoRecords(seed: DemoPipelineSeed): DemoRecords {
  const caseSeed = DEMO_CASE_SEEDS.find((c) => c.description === seed.description);
  if (!caseSeed) throw new Error(`Demo pipeline seed has no matching demo case: ${seed.description}`);
  const category = SANTIAGO_VERAGUAS.categories.find((c) => c.id === caseSeed.categoryId);
  const office = getReferralOffice(seed.routing.officeId);
  if (!office) throw new Error(`Unknown office in demo seed: ${seed.routing.officeId}`);
  const r = seed.routing;
  const dupes = r.duplicates ?? [];
  const records: DemoRecords = {
    description: seed.description,
    duplicateDescriptions: dupes.map((d) => d.description),
    state: { lastProgressDaysAgo: caseSeed.daysAgo },
    proposals: [],
    outbox: [],
    audit: [],
    publicEvents: [],
  };
  const audit = (daysAgo: number, actorType: AuditEntry["actorType"], actor: string, action: string, summary: string) =>
    records.audit.push({ daysAgo, actorType, actor: actorType === "agent" ? actor + DEMO_ACTOR_SUFFIX : actor, action, summary });

  const routingAt = Math.min(r.createdDaysAgo, caseSeed.daysAgo) - MINUTES(2);
  records.proposals.push({
    kind: "routing",
    status: r.approvedDaysAgo === undefined ? "pending" : "approved",
    createdDaysAgo: routingAt,
    reviewedDaysAgo: r.approvedDaysAgo,
    payload: {
      officeId: r.officeId,
      reason: r.reason,
      priority: r.priority,
      priorityReason: r.priorityReason,
      confidence: r.confidence,
      alternativeOfficeIds: r.alternativeOfficeIds ?? [],
      needsModeratorDecision: r.needsModeratorDecision ?? false,
      possibleDuplicates: dupes.map((d, i) => ({ caseNumber: `{DUP${i}}`, score: d.score })),
      injectionSuspected: false,
      source: "example",
    },
    critique: critique(r.critiqueConcern),
  });
  audit(routingAt, "agent", "Routing Agent", "routing_proposed", `Suggested ${office.name}, priority ${r.priority} (confidence ${Math.round(r.confidence * 100)}%). ${r.reason}`);
  audit(routingAt - MINUTES(1), "agent", "Critic Agent", "critique", r.critiqueConcern ? `Concern: ${r.critiqueConcern}` : "Checked the routing suggestion: no problems found.");
  if (r.approvedDaysAgo === undefined) return records;

  audit(r.approvedDaysAgo, "moderator", DEMO_MODERATOR, "routing_approved", `Approved routing to ${office.name}, priority ${r.priority}.`);
  records.state = { officeId: r.officeId, priority: r.priority, routedDaysAgo: r.approvedDaysAgo, lastProgressDaysAgo: r.approvedDaysAgo };

  const ref = seed.referral;
  if (!ref) return records;
  const daysOpen = Math.max(caseSeed.daysAgo - ref.createdDaysAgo, 0);
  const bodyEs = demoReferralMessage(
    office.nameEs,
    category?.labelEs ?? caseSeed.categoryId,
    caseSeed.areaLabelEs,
    demoSummaryEs(seed.description),
    Math.round(daysOpen),
  );
  records.proposals.push({
    kind: "referral",
    status: ref.approvedDaysAgo === undefined ? "pending" : "approved",
    createdDaysAgo: ref.createdDaysAgo - MINUTES(1),
    reviewedDaysAgo: ref.approvedDaysAgo,
    payload: {
      officeId: r.officeId,
      messageEs: bodyEs,
      facts: { daysOpen: Math.round(daysOpen), residentCount: 1 + dupes.filter((d) => d.score >= 0.5).length, caseUrl: "{URL}" },
      source: "example",
    },
    critique: critique(),
  });
  audit(ref.createdDaysAgo - MINUTES(1), "agent", "Referral Agent", "referral_drafted", `Drafted a referral in Spanish to ${office.name}.`);
  audit(ref.createdDaysAgo - MINUTES(2), "agent", "Critic Agent", "critique", "Checked the referral: case number, link and facts present; no personal data.");
  if (ref.approvedDaysAgo === undefined) return records;

  audit(ref.approvedDaysAgo, "moderator", DEMO_MODERATOR, "referral_approved", `Approved the referral. Added to the outbox as "Ready to send – demo mode (not sent)".`);
  records.outbox.push({
    kind: "referral",
    daysAgo: ref.approvedDaysAgo,
    officeId: r.officeId,
    toLabel: office.nameEs,
    toAddress: office.contact.email,
    subject: `Caso {CASE} – CommonGround`,
    bodyEs,
  });
  records.publicEvents.push({ kind: "referral_queued", daysAgo: ref.approvedDaysAgo });
  records.state = { ...records.state, referralQueuedDaysAgo: ref.approvedDaysAgo, lastProgressDaysAgo: ref.approvedDaysAgo };

  const fu = seed.followUp;
  if (!fu) return records;
  const reminder = demoReminderMessage(office.nameEs, fu.daysWithoutProgress);
  records.proposals.push({
    kind: "follow_up",
    status: fu.approvedDaysAgo === undefined ? "pending" : "approved",
    createdDaysAgo: fu.createdDaysAgo,
    reviewedDaysAgo: fu.approvedDaysAgo,
    payload: {
      daysWithoutProgress: fu.daysWithoutProgress,
      thresholdDays: FOLLOW_UP_AFTER_DAYS[r.priority],
      priority: r.priority,
      reminderEs: reminder,
      publicUpdate: DEMO_FOLLOW_UP_UPDATE,
      escalateTo: fu.escalateTo,
      ...(fu.escalateTo ? { escalateReason: `No progress for ${fu.daysWithoutProgress} days, more than twice the ${FOLLOW_UP_AFTER_DAYS[r.priority]}-day limit for ${r.priority} cases.` } : {}),
      source: "example",
    },
    critique: critique(),
  });
  audit(fu.createdDaysAgo, "agent", "Follow-up Agent", "follow_up_flagged", `No progress for ${fu.daysWithoutProgress} days (limit ${FOLLOW_UP_AFTER_DAYS[r.priority]} for ${r.priority}). Drafted a reminder and a public update${fu.escalateTo ? `; suggests escalating to ${fu.escalateTo}` : ""}.`);
  if (fu.approvedDaysAgo === undefined) {
    records.state = { ...records.state, lastFollowUpDaysAgo: fu.createdDaysAgo };
    return records;
  }
  audit(fu.approvedDaysAgo, "moderator", DEMO_MODERATOR, "follow_up_approved", "Approved the follow-up: reminder added to the outbox (not sent) and the public update published.");
  records.outbox.push({
    kind: "follow_up",
    daysAgo: fu.approvedDaysAgo,
    officeId: r.officeId,
    toLabel: office.nameEs,
    toAddress: office.contact.email,
    subject: `Recordatorio: caso {CASE} – CommonGround`,
    bodyEs: reminder,
  });
  records.publicEvents.push({ kind: "follow_up_update", daysAgo: fu.approvedDaysAgo, notes: DEMO_FOLLOW_UP_UPDATE });
  records.state = { ...records.state, lastFollowUpDaysAgo: fu.approvedDaysAgo, lastProgressDaysAgo: fu.approvedDaysAgo };
  return records;
}

export const DEMO_PIPELINE_RECORDS: DemoRecords[] = DEMO_PIPELINE_SEEDS.map(buildDemoRecords);

/** Fills the placeholders in any string, or any JSON value, of a demo record. */
export function fillPlaceholders<T>(value: T, caseNumber: string, caseUrl: string, duplicates: string[]): T {
  const text = JSON.stringify(value)
    .split("{CASE}").join(caseNumber)
    .split("{URL}").join(caseUrl)
    .replace(/\{DUP(\d+)\}/g, (_, i) => duplicates[Number(i)] ?? "");
  return JSON.parse(text) as T;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * One demo case's example pipeline records as concrete rows, with times anchored to the case's
 * own creation time (as db/seed.sql does). Used by the in-memory seed and by "Reset demo".
 */
export function materializeDemoPipeline(
  record: DemoRecords,
  target: { caseNumber: string; communityId: string; createdAt: string; caseUrl: string; duplicateNumbers: string[] },
): { state: CasePipelineState; proposals: Proposal[]; outbox: OutboxItem[]; audit: AuditEntry[] } {
  const caseSeed = DEMO_CASE_SEEDS.find((c) => c.description === record.description)!;
  const created = Date.parse(target.createdAt);
  const at = (daysAgo: number) => new Date(created + (caseSeed.daysAgo - daysAgo) * DAY_MS).toISOString();
  const opt = (daysAgo: number | undefined) => (daysAgo === undefined ? undefined : at(daysAgo));
  const r = fillPlaceholders(record, target.caseNumber, target.caseUrl, target.duplicateNumbers);
  const { caseNumber, communityId } = target;
  return {
    state: CasePipelineStateSchema.parse({
      caseNumber,
      communityId,
      emergency: false,
      officeId: r.state.officeId,
      priority: r.state.priority,
      routedAt: opt(r.state.routedDaysAgo),
      referralQueuedAt: opt(r.state.referralQueuedDaysAgo),
      lastFollowUpAt: opt(r.state.lastFollowUpDaysAgo),
      lastProgressAt: at(r.state.lastProgressDaysAgo),
    }),
    proposals: r.proposals.map((p) =>
      ProposalSchema.parse({
        id: crypto.randomUUID(),
        kind: p.kind,
        caseNumber,
        communityId,
        status: p.status,
        createdAt: at(p.createdDaysAgo),
        ...(p.reviewedDaysAgo === undefined ? {} : { reviewedAt: at(p.reviewedDaysAgo), reviewedBy: DEMO_MODERATOR }),
        payload: p.payload,
        critique: p.critique,
      }),
    ),
    outbox: r.outbox.map(({ daysAgo, ...item }) =>
      OutboxItemSchema.parse({ ...item, id: crypto.randomUUID(), caseNumber, communityId, status: "dry_run", createdAt: at(daysAgo), approvedBy: DEMO_MODERATOR }),
    ),
    audit: r.audit.map(({ daysAgo, ...entry }) => AuditEntrySchema.parse({ ...entry, id: crypto.randomUUID(), caseNumber, communityId, occurredAt: at(daysAgo) })),
  };
}
