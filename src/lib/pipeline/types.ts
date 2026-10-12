import { z } from "zod";
import { LANGUAGE_CODES } from "@/lib/i18n/languages";

/**
 * The agentic pipeline's records: what agents propose, what moderators approved, the dry-run
 * outbox, and the audit log. All private to moderators — none of it is ever passed to a public
 * page. Public changes happen only through the case's normal timeline, and only on approval.
 */

export const PrioritySchema = z.enum(["low", "medium", "high", "urgent"]);
export type Priority = z.infer<typeof PrioritySchema>;

export const PIPELINE_STAGES = ["drafted", "routed", "reviewed", "referral_prepared", "follow_up"] as const;
export type PipelineStage = (typeof PIPELINE_STAGES)[number];

export const STAGE_LABELS: Record<PipelineStage, string> = {
  drafted: "Drafted",
  routed: "Routed",
  reviewed: "Reviewed by agents",
  referral_prepared: "Referral prepared (sending paused)",
  follow_up: "Follow-up",
};

/**
 * Where an output came from: the AI, the rule-based fallback used when the AI is unavailable, or
 * hand-written example data on the demonstration cases.
 */
export const OutputSourceSchema = z.enum(["ai", "rules", "example"]);
export type OutputSource = z.infer<typeof OutputSourceSchema>;

const LocalizedTextSchema = z.object(
  Object.fromEntries(LANGUAGE_CODES.map((l) => [l, z.string().min(1).max(600)])) as Record<
    (typeof LANGUAGE_CODES)[number],
    z.ZodString
  >,
);

export const CritiqueIssueSchema = z.object({
  type: z.enum(["mistake", "bias", "missing_info", "personal_data", "other"]),
  note: z.string().min(1).max(400),
});

export const CritiqueSchema = z.object({
  verdict: z.enum(["ok", "concerns"]),
  issues: z.array(CritiqueIssueSchema).max(8).default([]),
  source: OutputSourceSchema,
});
export type Critique = z.infer<typeof CritiqueSchema>;

export const DuplicateHintSchema = z.object({
  caseNumber: z.string(),
  score: z.number().min(0).max(1),
});

export const RoutingPayloadSchema = z.object({
  officeId: z.string(),
  reason: z.string().min(1).max(500),
  priority: PrioritySchema,
  priorityReason: z.string().min(1).max(500),
  confidence: z.number().min(0).max(1),
  alternativeOfficeIds: z.array(z.string()).max(3).default([]),
  /** Low confidence or several offices fit: the moderator should decide. */
  needsModeratorDecision: z.boolean(),
  possibleDuplicates: z.array(DuplicateHintSchema).max(5).default([]),
  /** The report contains text that looks like instructions to the AI (treated as data). */
  injectionSuspected: z.boolean().default(false),
  source: OutputSourceSchema,
});
export type RoutingPayload = z.infer<typeof RoutingPayloadSchema>;

export const MAX_REFERRAL_LENGTH = 1500;

export const ReferralPayloadSchema = z.object({
  officeId: z.string(),
  messageEs: z.string().min(1).max(MAX_REFERRAL_LENGTH),
  /** The same message in the moderator's language, when that isn't Spanish. */
  translation: z.object({ language: z.enum(LANGUAGE_CODES), text: z.string().min(1).max(MAX_REFERRAL_LENGTH) }).optional(),
  facts: z.object({ daysOpen: z.number().int().min(0), residentCount: z.number().int().min(1), caseUrl: z.string() }),
  source: OutputSourceSchema,
});
export type ReferralPayload = z.infer<typeof ReferralPayloadSchema>;

export const FollowUpPayloadSchema = z.object({
  daysWithoutProgress: z.number().int().min(0),
  thresholdDays: z.number().int().min(1),
  priority: PrioritySchema,
  /** Reminder to the office, in Spanish — goes to the dry-run outbox if approved. */
  reminderEs: z.string().min(1).max(MAX_REFERRAL_LENGTH),
  /** A short public status update, in all seven languages. */
  publicUpdate: LocalizedTextSchema,
  escalateTo: PrioritySchema.nullable(),
  escalateReason: z.string().max(400).optional(),
  source: OutputSourceSchema,
});
export type FollowUpPayload = z.infer<typeof FollowUpPayloadSchema>;

export const WeeklySummaryPayloadSchema = z.object({
  weekStart: z.string(),
  newCases: z.number().int().min(0),
  resolvedCases: z.number().int().min(0),
  openCases: z.number().int().min(0),
  oldestOpen: z.array(z.object({ caseNumber: z.string(), daysOpen: z.number().int().min(0) })).max(5),
  hotspots: z.array(z.object({ areaId: z.string(), count: z.number().int().min(1) })).max(5),
  /** One or two sentences, all seven languages; absent when the AI was unavailable. */
  highlight: LocalizedTextSchema.optional(),
  source: OutputSourceSchema,
});
export type WeeklySummaryPayload = z.infer<typeof WeeklySummaryPayloadSchema>;

const proposalBase = {
  id: z.string(),
  caseNumber: z.string().optional(),
  communityId: z.string(),
  status: z.enum(["pending", "approved", "rejected"]),
  createdAt: z.string(),
  reviewedAt: z.string().optional(),
  reviewedBy: z.string().optional(),
  critique: CritiqueSchema.optional(),
  /** Set when an agent failed and this is a fallback: shown to the moderator. */
  failureNote: z.string().optional(),
};

export const ProposalSchema = z.discriminatedUnion("kind", [
  z.object({ ...proposalBase, kind: z.literal("routing"), payload: RoutingPayloadSchema }),
  z.object({ ...proposalBase, kind: z.literal("referral"), payload: ReferralPayloadSchema }),
  z.object({ ...proposalBase, kind: z.literal("follow_up"), payload: FollowUpPayloadSchema }),
  z.object({ ...proposalBase, kind: z.literal("weekly_summary"), payload: WeeklySummaryPayloadSchema }),
]);
export type Proposal = z.infer<typeof ProposalSchema>;
export type ProposalKind = Proposal["kind"];
export type NewProposal = Omit<Proposal, "id" | "status" | "createdAt" | "reviewedAt" | "reviewedBy">;

export const CasePipelineStateSchema = z.object({
  caseNumber: z.string(),
  communityId: z.string(),
  /** Set when a moderator approves routing. */
  officeId: z.string().optional(),
  priority: PrioritySchema.optional(),
  routedAt: z.string().optional(),
  /** From the Guide's draft, when the resident used it. */
  title: z.string().max(120).optional(),
  emergency: z.boolean().default(false),
  referralQueuedAt: z.string().optional(),
  lastFollowUpAt: z.string().optional(),
  /** The last time anything moved on this case (routing, outbox, follow-up, status change). */
  lastProgressAt: z.string().optional(),
});
export type CasePipelineState = z.infer<typeof CasePipelineStateSchema>;

export const OutboxItemSchema = z.object({
  id: z.string(),
  caseNumber: z.string().optional(),
  communityId: z.string(),
  officeId: z.string(),
  kind: z.enum(["referral", "follow_up"]),
  toLabel: z.string(),
  toAddress: z.string(),
  subject: z.string(),
  bodyEs: z.string(),
  translation: z.object({ language: z.enum(LANGUAGE_CODES), text: z.string() }).optional(),
  /** The only status there is: nothing is ever sent. */
  status: z.literal("dry_run"),
  createdAt: z.string(),
  approvedBy: z.string(),
});
export type OutboxItem = z.infer<typeof OutboxItemSchema>;

export const AGENT_NAMES = [
  "Guide",
  "Routing Agent",
  "Referral Agent",
  "Critic Agent",
  "Follow-up Agent",
  "Summary Agent",
  "Privacy filter",
] as const;

export const AuditEntrySchema = z.object({
  id: z.string(),
  caseNumber: z.string().optional(),
  communityId: z.string(),
  occurredAt: z.string(),
  actorType: z.enum(["agent", "moderator", "system"]),
  /** An agent's name, a moderator's id, or "scheduler". */
  actor: z.string(),
  action: z.string(),
  /** One plain-English line: what happened and why. Never a resident's personal details. */
  summary: z.string().max(1000),
});
export type AuditEntry = z.infer<typeof AuditEntrySchema>;
