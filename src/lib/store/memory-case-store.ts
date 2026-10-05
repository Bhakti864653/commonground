import { formatCaseNumber } from "@/lib/case-number/format-case-number";
import type { CaseRepository } from "./case-repository";
import { DEMO_CASE_SEEDS, DEMO_COMMUNITY_ID, DEMO_CONSENT_VERSION, DEMO_STATUS_CHANGE_NOTE } from "./demo-seed";
import {
  CaseSchema,
  ReferralDraftSchema,
  type AgentSuggestion,
  type Case,
  type ReferralDraft,
  type TimelineEventKind,
  type RemovalReason,
  type ReportStatus,
  type VerificationState,
  type VerifiedSource,
} from "@/lib/schema/report";
import { SANTIAGO_VERAGUAS } from "@/data/communities";
import { prepareNewCase, type NewCaseInput } from "./new-case";

export type { NewCaseInput } from "./new-case";

type CaseStoreState = {
  cases: Case[];
  sequencesByCommunityYear: Record<string, number>;
};

/**
 * Attached to `globalThis` so the store survives Turbopack's dev-mode module re-evaluation on
 * every file save (a plain module-level `let` would silently reset on each HMR reload) — same
 * reasoning as the well-known "attach the Prisma client to globalThis in dev" pattern. This is
 * the prototype's whole persistence layer (ARCHITECTURE.md: local mock persistence, no real DB
 * yet); a real database is a documented later swap.
 *
 * On Vercel this `globalThis` is per serverless invocation, not shared across them — a real
 * submission made in one request is not guaranteed to still be there for a later one. Rather
 * than let every cold start present an empty app with the agentic features silently waiting for
 * data that will never reliably arrive, a fresh store seeds a fixed set of cases (clearly
 * `sourceType: "demonstration"` / `verificationState: "demonstration_data"`, never presented as
 * real resident submissions) so duplicate clustering, trend detection, and status auto-draft are
 * always visibly exercised. Real submissions land on top of these in the same store.
 */
function getStore(): CaseStoreState {
  const g = globalThis as typeof globalThis & { __commonGroundCaseStore__?: CaseStoreState };
  if (!g.__commonGroundCaseStore__) {
    g.__commonGroundCaseStore__ = { cases: [], sequencesByCommunityYear: {} };
    seedDemoCases(g.__commonGroundCaseStore__);
  }
  return g.__commonGroundCaseStore__;
}

function daysAgoIso(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

function seedDemoCases(store: CaseStoreState): void {
  const year = new Date().getUTCFullYear();
  for (const seed of DEMO_CASE_SEEDS) {
    // Carry the pilot area's translated names, the same as a real submission would.
    const areaLabels = SANTIAGO_VERAGUAS.areas.find((a) => a.id === seed.areaId)?.labels;
    const createdAt = daysAgoIso(seed.daysAgo);
    const sequence = nextSequence(store, DEMO_COMMUNITY_ID, year);
    const statusHistory: Case["statusHistory"] = [
      {
        id: crypto.randomUUID(),
        status: "received",
        occurredAt: createdAt,
        actorType: "system",
      },
    ];
    let finalStatus: ReportStatus = seed.status;
    const moderationActions: Case["moderationActions"] = [];
    if (seed.secondStatus) {
      const changedAt = daysAgoIso(Math.max(seed.daysAgo - 4, 0));
      statusHistory.push({
        id: crypto.randomUUID(),
        status: seed.secondStatus,
        occurredAt: changedAt,
        actorType: "moderator",
        // Describes only what CommonGround itself recorded — never an institution's action.
        ...DEMO_STATUS_CHANGE_NOTE,
      });
      moderationActions.push({
        id: crypto.randomUUID(),
        actorId: "demo-seed",
        action: "status_change",
        occurredAt: changedAt,
        detail: seed.secondStatus,
      });
      finalStatus = seed.secondStatus;
    } else if (seed.status !== "received") {
      statusHistory.push({
        id: crypto.randomUUID(),
        status: seed.status,
        occurredAt: daysAgoIso(Math.max(seed.daysAgo - 2, 0)),
        actorType: "moderator",
      });
      moderationActions.push({
        id: crypto.randomUUID(),
        actorId: "demo-seed",
        action: "status_change",
        occurredAt: daysAgoIso(Math.max(seed.daysAgo - 2, 0)),
        detail: seed.status,
      });
    }

    const candidate: Case = {
      id: crypto.randomUUID(),
      type: seed.type,
      publicCaseNumber: formatCaseNumber(DEMO_COMMUNITY_ID, year, sequence),
      communityId: DEMO_COMMUNITY_ID,
      categoryId: seed.categoryId,
      description: seed.description,
      approximateArea: {
        kind: "neighborhood",
        areaId: seed.areaId,
        label: seed.areaLabel,
        ...(areaLabels ? { labels: areaLabels } : {}),
        labelEs: seed.areaLabelEs,
      },
      createdAt,
      status: finalStatus,
      statusHistory,
      sourceType: "demonstration",
      verificationState: "demonstration_data",
      consent: {
        consentVersion: DEMO_CONSENT_VERSION,
        consentedAt: createdAt,
        language: "es",
      },
      adminNotes: [],
      inaccuracyFlags: [],
      moderationActions,
      agentSuggestions: [],
      managementToken: crypto.randomUUID(),
    } as Case;

    store.cases.push(CaseSchema.parse(candidate));
  }
}

function nextSequence(store: CaseStoreState, communityId: string, year: number): number {
  const key = `${communityId}:${year}`;
  const next = (store.sequencesByCommunityYear[key] ?? 0) + 1;
  store.sequencesByCommunityYear[key] = next;
  return next;
}

export function createCase(input: NewCaseInput, now: () => Date = () => new Date()): Case {
  const createdAt = now();
  const prepared = prepareNewCase(input, createdAt);
  const store = getStore();
  const year = createdAt.getUTCFullYear();
  const created: Case = {
    ...prepared,
    publicCaseNumber: formatCaseNumber(input.communityId, year, nextSequence(store, input.communityId, year)),
  };
  store.cases.push(created);
  return created;
}

/** A soft-deleted case behaves as not-found on the public side — "deleted" means gone. */
export function getCaseByCaseNumber(publicCaseNumber: string): Case | undefined {
  return getStore().cases.find((c) => c.publicCaseNumber === publicCaseNumber && !c.deletedAt);
}

/** What residents (and the Guide) can browse — removed content drops out of every list. */
export function listCasesForCommunity(communityId: string): Case[] {
  return getStore()
    .cases.filter((c) => c.communityId === communityId && !c.deletedAt && !c.removal)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/**
 * Soft-delete (never a hard removal, matching the schema's pre-existing `deletedAt` field) —
 * requires the exact management token handed to the submitter at creation, since this
 * prototype has no accounts to check real ownership against. Returns false, rather than
 * throwing, for a wrong token or an already-deleted/nonexistent case, so the caller can show a
 * generic failure without distinguishing "wrong token" from "already gone" (avoids confirming
 * to a guesser which case numbers exist).
 */
export function deleteCase(
  publicCaseNumber: string,
  managementToken: string,
  now: () => Date = () => new Date(),
): boolean {
  const store = getStore();
  const found = store.cases.find(
    (c) => c.publicCaseNumber === publicCaseNumber && !c.deletedAt,
  );
  if (!found || found.managementToken !== managementToken) return false;
  found.deletedAt = now().toISOString();
  return true;
}

/** Anyone can flag a case as inaccurate (spec MVP goal #11) — no token required. */
export function flagInaccuracy(
  publicCaseNumber: string,
  note: string | undefined,
  now: () => Date = () => new Date(),
): boolean {
  const found = getCaseByCaseNumber(publicCaseNumber);
  if (!found || found.removal) return false;
  found.inaccuracyFlags.push({
    id: crypto.randomUUID(),
    note: note?.trim() || undefined,
    occurredAt: now().toISOString(),
  });
  return true;
}

/** Every community, not just the active one — this is the moderator's own view (Phase 5). */
export function listAllCasesForAdmin(): Case[] {
  return getStore()
    .cases.filter((c) => !c.deletedAt)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function recordModerationAction(
  found: Case,
  action: Case["moderationActions"][number]["action"],
  actorId: string,
  detail: string | undefined,
  now: () => Date,
): void {
  found.moderationActions.push({
    id: crypto.randomUUID(),
    actorId,
    action,
    occurredAt: now().toISOString(),
    detail,
  });
}

/**
 * Moderator-only (MODERATION.md) — appends a real `ReportStatusEvent` so the resident-facing
 * ActionTrail/StatusHistoryTimeline (Phase 4) reflect it immediately, plus a `ModerationAction`
 * for the audit trail (MODERATION.md: "who changed this and when is always answerable").
 */
export function changeCaseStatus(
  publicCaseNumber: string,
  status: ReportStatus,
  actorId: string,
  note?: string,
  now: () => Date = () => new Date(),
): boolean {
  const found = getCaseByCaseNumber(publicCaseNumber);
  if (!found) return false;
  const nowIso = now().toISOString();
  found.status = status;
  found.statusHistory.push({
    id: crypto.randomUUID(),
    status,
    occurredAt: nowIso,
    actorType: "moderator",
    note,
  });
  recordModerationAction(found, "status_change", actorId, note ?? status, now);
  return true;
}

/**
 * `verifiedSource` is required by the caller (see `src/lib/admin/actions.ts`'s
 * `adminSetVerification`) whenever `verificationState` is "officially_verified" — this function
 * itself still guards it too, since it's callable from other code paths (defense in depth, same
 * discipline as everywhere else in this file).
 */
export function setVerificationState(
  publicCaseNumber: string,
  verificationState: VerificationState,
  actorId: string,
  verifiedSource?: VerifiedSource,
  now: () => Date = () => new Date(),
): boolean {
  if (verificationState === "officially_verified" && !verifiedSource) return false;
  const found = getCaseByCaseNumber(publicCaseNumber);
  if (!found) return false;
  found.verificationState = verificationState;
  found.verifiedSource = verificationState === "officially_verified" ? verifiedSource : undefined;
  recordModerationAction(
    found,
    verificationState === "officially_verified" ? "mark_verified" : "mark_unverified",
    actorId,
    verificationState,
    now,
  );
  return true;
}

export function markDuplicate(
  publicCaseNumber: string,
  duplicateOfCaseNumber: string,
  actorId: string,
  now: () => Date = () => new Date(),
): boolean {
  const found = getCaseByCaseNumber(publicCaseNumber);
  const original = getCaseByCaseNumber(duplicateOfCaseNumber);
  if (!found || !original || found.publicCaseNumber === original.publicCaseNumber) return false;
  found.isDuplicateOf = duplicateOfCaseNumber;
  recordModerationAction(found, "mark_duplicate", actorId, duplicateOfCaseNumber, now);
  return true;
}

export function addAdminNote(
  publicCaseNumber: string,
  note: string,
  actorId: string,
  now: () => Date = () => new Date(),
): boolean {
  const found = getCaseByCaseNumber(publicCaseNumber);
  if (!found || !note.trim()) return false;
  found.adminNotes.push({
    id: crypto.randomUUID(),
    authorId: actorId,
    createdAt: now().toISOString(),
    note: note.trim(),
  });
  recordModerationAction(found, "add_note", actorId, undefined, now);
  return true;
}

/**
 * Moderator-only. Hides the content (description and photo) from every public view while
 * keeping the case number, its history, and the public reason — never a hard delete, so the
 * decision stays reviewable and reversible. The optional note is private (audit trail only).
 */
export function removeCaseContent(
  publicCaseNumber: string,
  reason: RemovalReason,
  actorId: string,
  privateNote?: string,
  now: () => Date = () => new Date(),
): boolean {
  const found = getCaseByCaseNumber(publicCaseNumber);
  if (!found || found.removal) return false;
  found.removal = { reason, removedAt: now().toISOString() };
  const note = privateNote?.trim();
  recordModerationAction(found, "remove_content", actorId, note ? `${reason}: ${note}` : reason, now);
  return true;
}

/** Undoes a removal made by mistake; recorded like every other moderator action. */
export function restoreCaseContent(
  publicCaseNumber: string,
  actorId: string,
  now: () => Date = () => new Date(),
): boolean {
  const found = getCaseByCaseNumber(publicCaseNumber);
  if (!found || !found.removal) return false;
  found.removal = undefined;
  recordModerationAction(found, "restore_content", actorId, undefined, now);
  return true;
}

export function markInaccuracyFlagReviewed(
  publicCaseNumber: string,
  flagId: string,
  now: () => Date = () => new Date(),
): boolean {
  const found = getCaseByCaseNumber(publicCaseNumber);
  const flag = found?.inaccuracyFlags.find((f) => f.id === flagId);
  if (!flag) return false;
  flag.reviewedAt = now().toISOString();
  return true;
}

/** Read-only, used by the Guide's `search_similar_cases` tool — never a mutation. */
export function listOpenCasesForCommunity(communityId: string, excludeCaseNumber?: string): Case[] {
  return listCasesForCommunity(communityId).filter(
    (c) => c.publicCaseNumber !== excludeCaseNumber && !c.isDuplicateOf,
  );
}

/**
 * The Guide only ever appends suggestions here — never a case field a resident/moderator
 * relies on. Old pending suggestions of the same kind are cleared first so re-running analysis
 * doesn't pile up stale duplicates of its own.
 */
export function addAgentSuggestions(
  publicCaseNumber: string,
  suggestions: Array<Pick<AgentSuggestion, "kind" | "suggestedValue" | "reasoning">>,
  now: () => Date = () => new Date(),
): boolean {
  const found = getCaseByCaseNumber(publicCaseNumber);
  if (!found) return false;
  const kinds = new Set(suggestions.map((s) => s.kind));
  found.agentSuggestions = found.agentSuggestions.filter(
    (s) => s.status !== "pending" || !kinds.has(s.kind),
  );
  const nowIso = now().toISOString();
  for (const s of suggestions) {
    found.agentSuggestions.push({
      id: crypto.randomUUID(),
      kind: s.kind,
      suggestedValue: s.suggestedValue,
      reasoning: s.reasoning,
      createdAt: nowIso,
      status: "pending",
    });
  }
  return true;
}

/** Only touches the suggestion's own status — applying it (if approved) is the caller's job. */
export function setAgentSuggestionStatus(
  publicCaseNumber: string,
  suggestionId: string,
  status: "approved" | "rejected",
  now: () => Date = () => new Date(),
): boolean {
  const found = getCaseByCaseNumber(publicCaseNumber);
  const suggestion = found?.agentSuggestions.find((s) => s.id === suggestionId);
  if (!suggestion || suggestion.status !== "pending") return false;
  suggestion.status = status;
  suggestion.reviewedAt = now().toISOString();
  return true;
}

/**
 * Appends a public timeline entry that isn't a status change (a referral-pipeline step). The
 * entry carries only its kind, actor, and optional office id — its text is fixed per kind and
 * rendered by the case page, so nothing private can be written here.
 */
export function addTimelineEvent(
  publicCaseNumber: string,
  event: { kind: Exclude<TimelineEventKind, "status">; actorType: "agent" | "moderator"; contactId?: string },
  now: () => Date = () => new Date(),
): boolean {
  const found = getCaseByCaseNumber(publicCaseNumber);
  if (!found) return false;
  found.statusHistory.push({
    id: crypto.randomUUID(),
    status: found.status,
    occurredAt: now().toISOString(),
    actorType: event.actorType,
    kind: event.kind,
    contactId: event.contactId,
  });
  return true;
}

/**
 * Stores the referral pipeline's draft as a pending suggestion. A newer draft replaces an older
 * pending one, the same rule `addAgentSuggestions` applies to the other kinds.
 */
export function addReferralSuggestion(
  publicCaseNumber: string,
  referral: ReferralDraft,
  reasoning: string,
  now: () => Date = () => new Date(),
): AgentSuggestion | null {
  const found = getCaseByCaseNumber(publicCaseNumber);
  if (!found) return null;
  const parsed = ReferralDraftSchema.safeParse(referral);
  if (!parsed.success) return null;
  found.agentSuggestions = found.agentSuggestions.filter((s) => s.status !== "pending" || s.kind !== "referral");
  const suggestion: AgentSuggestion = {
    id: crypto.randomUUID(),
    kind: "referral",
    suggestedValue: parsed.data.contactId,
    reasoning,
    createdAt: now().toISOString(),
    status: "pending",
    referral: parsed.data,
  };
  found.agentSuggestions.push(suggestion);
  return suggestion;
}

function pendingReferral(found: Case | undefined, suggestionId: string) {
  const suggestion = found?.agentSuggestions.find((s) => s.id === suggestionId);
  if (!found || found.removal || !suggestion || suggestion.kind !== "referral" || suggestion.status !== "pending" || !suggestion.referral) {
    return null;
  }
  return { found, suggestion, referral: suggestion.referral };
}

/**
 * A moderator approved a referral (with the message as they finally edited it). The case moves to
 * "referred" with one public entry naming the office, and the audit trail records who approved
 * it. Approval is a decision to deliver it by hand — nothing here contacts the office. The
 * caller validates `message` (referral/validate.ts) before calling this.
 */
export function approveReferral(
  publicCaseNumber: string,
  suggestionId: string,
  message: string,
  actorId: string,
  now: () => Date = () => new Date(),
): boolean {
  const target = pendingReferral(getCaseByCaseNumber(publicCaseNumber), suggestionId);
  if (!target) return false;
  const { found, suggestion, referral } = target;
  const nowIso = now().toISOString();
  referral.message = message;
  suggestion.status = "approved";
  suggestion.reviewedAt = nowIso;
  found.status = "referred";
  found.statusHistory.push({
    id: crypto.randomUUID(),
    status: "referred",
    occurredAt: nowIso,
    actorType: "moderator",
    kind: "referral_approved",
    contactId: referral.contactId,
  });
  recordModerationAction(found, "approve_referral", actorId, referral.contactId, now);
  return true;
}

/**
 * A moderator decided not to send a referral. The public timeline says so (without a reason), so
 * the earlier "waiting for approval" entry isn't left hanging; the status doesn't change.
 */
export function rejectReferral(
  publicCaseNumber: string,
  suggestionId: string,
  actorId: string,
  now: () => Date = () => new Date(),
): boolean {
  const target = pendingReferral(getCaseByCaseNumber(publicCaseNumber), suggestionId);
  if (!target) return false;
  const { found, suggestion, referral } = target;
  const nowIso = now().toISOString();
  suggestion.status = "rejected";
  suggestion.reviewedAt = nowIso;
  found.statusHistory.push({
    id: crypto.randomUUID(),
    status: found.status,
    occurredAt: nowIso,
    actorType: "moderator",
    kind: "referral_declined",
    contactId: referral.contactId,
  });
  recordModerationAction(found, "reject_referral", actorId, referral.contactId, now);
  return true;
}

/** Test-only: the store is a `globalThis` singleton, so tests need a way back to empty. */
export function __resetMemoryCaseStore(): void {
  const g = globalThis as typeof globalThis & { __commonGroundCaseStore__?: CaseStoreState };
  g.__commonGroundCaseStore__ = { cases: [], sequencesByCommunityYear: {} };
}

/** Copies, so a caller changing a returned case can't change the stored one, as with a database. */
const copy = <T>(value: T): T => structuredClone(value);

/**
 * The in-memory store behind the shared CaseRepository interface: the functions above, made
 * async, with every returned case copied.
 */
export const memoryCaseRepository: CaseRepository = {
  createCase: async (input, now) => copy(createCase(input, now)),
  getCaseByCaseNumber: async (n) => copy(getCaseByCaseNumber(n)),
  listCasesForCommunity: async (id) => copy(listCasesForCommunity(id)),
  listAllCasesForAdmin: async () => copy(listAllCasesForAdmin()),
  listOpenCasesForCommunity: async (id, exclude) => copy(listOpenCasesForCommunity(id, exclude)),
  deleteCase: async (...args) => deleteCase(...args),
  flagInaccuracy: async (...args) => flagInaccuracy(...args),
  markInaccuracyFlagReviewed: async (...args) => markInaccuracyFlagReviewed(...args),
  changeCaseStatus: async (...args) => changeCaseStatus(...args),
  setVerificationState: async (...args) => setVerificationState(...args),
  markDuplicate: async (...args) => markDuplicate(...args),
  addAdminNote: async (...args) => addAdminNote(...args),
  removeCaseContent: async (...args) => removeCaseContent(...args),
  restoreCaseContent: async (...args) => restoreCaseContent(...args),
  addAgentSuggestions: async (...args) => addAgentSuggestions(...args),
  setAgentSuggestionStatus: async (...args) => setAgentSuggestionStatus(...args),
  addTimelineEvent: async (...args) => addTimelineEvent(...args),
  addReferralSuggestion: async (...args) => copy(addReferralSuggestion(...args)),
  approveReferral: async (...args) => approveReferral(...args),
  rejectReferral: async (...args) => rejectReferral(...args),
};
