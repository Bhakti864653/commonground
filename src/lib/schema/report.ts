import { z } from "zod";

export const ReportTypeSchema = z.enum(["report", "proposal"]);
export type ReportTypeValue = z.infer<typeof ReportTypeSchema>;

export const ReportStatusSchema = z.enum([
  "received",
  "under_review",
  "in_discussion",
  "referred",
  "in_progress",
  "updated",
  "closed",
  "not_verifiable",
]);
export type ReportStatus = z.infer<typeof ReportStatusSchema>;

/** Spec §14 — every status must have a plain-language label in both languages. */
export const STATUS_LABELS: Record<ReportStatus, { es: string; en: string }> = {
  received: { es: "Recibido", en: "Received" },
  under_review: { es: "En revisión", en: "Under review" },
  in_discussion: { es: "En discusión", en: "In discussion" },
  referred: { es: "Derivado", en: "Referred" },
  in_progress: { es: "En progreso", en: "In progress" },
  updated: { es: "Actualizado", en: "Updated" },
  closed: { es: "Cerrado", en: "Closed" },
  not_verifiable: { es: "No verificable", en: "Not verifiable" },
};

/** Spec §18 — the fixed "Observed -> Organized -> Reviewed -> Connected -> Updated" action trail. */
export const ACTION_TRAIL_STAGES = [
  "observed",
  "organized",
  "reviewed",
  "connected",
  "updated",
] as const;
export type ActionTrailStage = (typeof ACTION_TRAIL_STAGES)[number];

/** Maps each status to the trail stages it has reached; never implies "resolved" early. */
export const STATUS_TO_TRAIL_PROGRESS: Record<ReportStatus, ActionTrailStage[]> = {
  received: ["observed"],
  under_review: ["observed", "organized"],
  in_discussion: ["observed", "organized", "reviewed"],
  referred: ["observed", "organized", "reviewed", "connected"],
  in_progress: ["observed", "organized", "reviewed", "connected"],
  updated: ["observed", "organized", "reviewed", "connected", "updated"],
  closed: ["observed", "organized", "reviewed", "connected", "updated"],
  not_verifiable: ["observed", "organized", "reviewed"],
};

export const VerificationStateSchema = z.enum([
  "community_report",
  "officially_verified",
  "needs_verification",
  "demonstration_data",
]);
export type VerificationState = z.infer<typeof VerificationStateSchema>;

export const VERIFICATION_LABELS: Record<VerificationState, { es: string; en: string }> = {
  community_report: { es: "Reportado por la comunidad", en: "Community report" },
  officially_verified: { es: "Información oficial verificada", en: "Officially verified" },
  needs_verification: { es: "Pendiente de verificación", en: "Needs verification" },
  demonstration_data: { es: "Datos de demostración", en: "Demonstration data" },
};

/**
 * Never an exact address (spec §11/§26): `approxLat`/`approxLng`, when present, represent a
 * broad region centroid only, always paired with a human label.
 */
export const ApproximateAreaSchema = z.object({
  kind: z.enum(["neighborhood", "landmark", "region", "prefer_not_to_say"]),
  areaId: z.string().optional(),
  label: z.string(),
  labelEs: z.string().optional(),
  approxLat: z.number().optional(),
  approxLng: z.number().optional(),
});
export type ApproximateArea = z.infer<typeof ApproximateAreaSchema>;

export const ReportStatusEventSchema = z.object({
  id: z.string(),
  status: ReportStatusSchema,
  occurredAt: z.string(),
  actorType: z.enum(["system", "moderator", "verified_source"]),
  note: z.string().optional(),
  noteEs: z.string().optional(),
});
export type ReportStatusEvent = z.infer<typeof ReportStatusEventSchema>;

export const UserConsentSchema = z.object({
  consentVersion: z.string(),
  consentedAt: z.string(),
  language: z.enum(["es", "en"]),
});
export type UserConsent = z.infer<typeof UserConsentSchema>;

/** Never serialized to any public-facing response (spec §21: "keep private notes hidden"). */
export const AdminNoteSchema = z.object({
  id: z.string(),
  authorId: z.string(),
  createdAt: z.string(),
  note: z.string(),
});
export type AdminNote = z.infer<typeof AdminNoteSchema>;

/**
 * A public, anyone-can-submit flag ("report inaccurate information," spec MVP goal #11) — a
 * distinct type from `AdminNote`/`ModerationAction` since it's submitted by an unauthenticated
 * viewer, not a moderator. Never shown on the public case view; a moderator's review queue
 * (Phase 5) is the only consumer.
 */
export const InaccuracyFlagSchema = z.object({
  id: z.string(),
  note: z.string().optional(),
  occurredAt: z.string(),
  /** Set once a moderator has looked at it (Phase 5) — never cleared by the flag's submitter. */
  reviewedAt: z.string().optional(),
});
export type InaccuracyFlag = z.infer<typeof InaccuracyFlagSchema>;

/**
 * Phase 6 — the CommonGround Guide never mutates a case itself; it can only append one of
 * these, and a moderator has to explicitly approve one before it does anything real (approving
 * just calls the exact same `adminChangeStatus`/`adminMarkDuplicate`/`adminSetVerification`
 * functions a human using the panel directly would call). This is the whole mechanism behind
 * "agentic reasoning, human-approved actions."
 */
export const AgentSuggestionSchema = z.object({
  id: z.string(),
  kind: z.enum(["duplicate", "status", "verification"]),
  /** A case number (duplicate), a ReportStatus value (status), or a VerificationState value. */
  suggestedValue: z.string(),
  reasoning: z.string(),
  createdAt: z.string(),
  status: z.enum(["pending", "approved", "rejected"]).default("pending"),
  reviewedAt: z.string().optional(),
});
export type AgentSuggestion = z.infer<typeof AgentSuggestionSchema>;

export const ModerationActionSchema = z.object({
  id: z.string(),
  actorId: z.string(),
  actorEmail: z.string().optional(),
  action: z.enum([
    "status_change",
    "mark_duplicate",
    "mark_verified",
    "mark_unverified",
    "add_source",
    "remove_content",
    "add_note",
  ]),
  occurredAt: z.string(),
  detail: z.string().optional(),
});
export type ModerationAction = z.infer<typeof ModerationActionSchema>;

/** Spec §11 — an upload warning is shown wherever this is attached ("photos may contain personal information"). */
export const ImageMetadataSchema = z.object({
  fileName: z.string(),
  mimeType: z.string(),
  sizeBytes: z.number(),
  uploadedAt: z.string(),
});
export type ImageMetadata = z.infer<typeof ImageMetadataSchema>;

/**
 * The minimal record that makes "officially_verified" a real, checkable claim instead of a bare
 * label: a moderator must provide an actual external source before selecting that state (see
 * `src/lib/admin/actions.ts`'s `adminSetVerification`, which enforces this is present). Public,
 * not a private field — showing residents the real source is the whole point of "verified
 * information" per the PRD, the same way a community's own trustedSources/officialContacts are
 * public.
 */
export const VerifiedSourceSchema = z.object({
  title: z.string().min(1),
  url: z.string().url(),
  checkedAt: z.string(),
  moderatorActorId: z.string(),
});
export type VerifiedSource = z.infer<typeof VerifiedSourceSchema>;

const CaseBaseSchema = z.object({
  id: z.string(),
  publicCaseNumber: z.string(),
  communityId: z.string(),
  categoryId: z.string(),
  description: z.string().min(1),
  approximateArea: ApproximateAreaSchema,
  createdAt: z.string(),
  status: ReportStatusSchema,
  statusHistory: z.array(ReportStatusEventSchema),
  sourceType: z.enum(["community", "demonstration"]),
  verificationState: VerificationStateSchema,
  /** Only ever set when verificationState is "officially_verified" — see VerifiedSourceSchema. */
  verifiedSource: VerifiedSourceSchema.optional(),
  image: ImageMetadataSchema.optional(),
  consent: UserConsentSchema,
  adminNotes: z.array(AdminNoteSchema).default([]),
  inaccuracyFlags: z.array(InaccuracyFlagSchema).default([]),
  moderationActions: z.array(ModerationActionSchema).default([]),
  agentSuggestions: z.array(AgentSuggestionSchema).default([]),
  isDuplicateOf: z.string().optional(),
  deletedAt: z.string().optional(),
  /**
   * A random capability token, shown to the submitter exactly once (spec MVP goal #12,
   * "delete their submission") — never displayed on the public case view. Since this
   * prototype has no accounts, holding this token is the only proof of ownership; losing it
   * means the submission can no longer be deleted, the same tradeoff as the public case
   * number itself being the only way to look a case up again.
   */
  managementToken: z.string(),
});

export const ReportSchema = CaseBaseSchema.extend({
  type: z.literal("report"),
});
export type Report = z.infer<typeof ReportSchema>;

export const ProposalSchema = CaseBaseSchema.extend({
  type: z.literal("proposal"),
});
export type Proposal = z.infer<typeof ProposalSchema>;

export const CaseSchema = z.discriminatedUnion("type", [ReportSchema, ProposalSchema]);
export type Case = z.infer<typeof CaseSchema>;

/**
 * What a resident/anonymous visitor is ever allowed to see — structurally excludes
 * `adminNotes`/`moderationActions`/`agentSuggestions`/`inaccuracyFlags`/`managementToken` at
 * the type level, not just "we didn't render them this time" (EVALUATION.md, Phase 5: "a
 * public serializer must never include AdminNote fields — enforced by a type-level test, not
 * just a runtime check"). Every resident-facing server action and component prop should use
 * this type, never `Case`, so passing a private field through is a compile error, not a leak
 * waiting to be noticed. Only admin-side code (already gated by `requireAdmin()`) uses `Case`
 * directly.
 */
export type PublicCase = Omit<
  Case,
  "managementToken" | "adminNotes" | "moderationActions" | "agentSuggestions" | "inaccuracyFlags"
>;

export function toPublicCase(c: Case): PublicCase {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- deliberately omitting these fields
  const { managementToken, adminNotes, moderationActions, agentSuggestions, inaccuracyFlags, ...rest } = c;
  return rest;
}
