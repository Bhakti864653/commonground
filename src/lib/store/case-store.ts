import { formatCaseNumber } from "@/lib/case-number/format-case-number";
import {
  CaseSchema,
  type AgentSuggestion,
  type Case,
  type ApproximateArea,
  type ReportStatus,
  type UserConsent,
  type VerificationState,
} from "@/lib/schema/report";
import { getCommunityById } from "@/data/communities";
import { validateImageMetadata } from "@/lib/privacy/image-validation";

export type NewCaseInput = {
  type: "report" | "proposal";
  communityId: string;
  categoryId: string;
  description: string;
  approximateArea: ApproximateArea;
  consent: UserConsent;
  image?: Case["image"];
};

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
 */
function getStore(): CaseStoreState {
  const g = globalThis as typeof globalThis & { __commonGroundCaseStore__?: CaseStoreState };
  if (!g.__commonGroundCaseStore__) {
    g.__commonGroundCaseStore__ = { cases: [], sequencesByCommunityYear: {} };
  }
  return g.__commonGroundCaseStore__;
}

function nextSequence(store: CaseStoreState, communityId: string, year: number): number {
  const key = `${communityId}:${year}`;
  const next = (store.sequencesByCommunityYear[key] ?? 0) + 1;
  store.sequencesByCommunityYear[key] = next;
  return next;
}

export function createCase(input: NewCaseInput, now: () => Date = () => new Date()): Case {
  const community = getCommunityById(input.communityId);
  if (!community) {
    throw new Error(`Unknown community: ${input.communityId}`);
  }

  // Defense in depth — the wizard already checks this client-side, but a server action can be
  // called directly with fabricated metadata, so this can't be the only check (PRIVACY.md).
  if (input.image) {
    const result = validateImageMetadata(input.image);
    if (!result.valid) {
      throw new Error(`Invalid image metadata: ${result.reason}`);
    }
  }

  const store = getStore();
  const createdAt = now();
  const year = createdAt.getUTCFullYear();
  const sequence = nextSequence(store, input.communityId, year);
  const nowIso = createdAt.toISOString();

  const candidate: Case = {
    id: crypto.randomUUID(),
    type: input.type,
    publicCaseNumber: formatCaseNumber(input.communityId, year, sequence),
    communityId: input.communityId,
    categoryId: input.categoryId,
    description: input.description,
    approximateArea: input.approximateArea,
    createdAt: nowIso,
    status: "received",
    statusHistory: [
      {
        id: crypto.randomUUID(),
        status: "received",
        occurredAt: nowIso,
        actorType: "system",
      },
    ],
    sourceType: community.status === "demo" ? "demonstration" : "community",
    verificationState: community.status === "demo" ? "demonstration_data" : "community_report",
    image: input.image,
    consent: input.consent,
    adminNotes: [],
    inaccuracyFlags: [],
    moderationActions: [],
    agentSuggestions: [],
    managementToken: crypto.randomUUID(),
  };

  // Nothing bypasses schema validation on write (ARCHITECTURE.md) — this both double-checks
  // every field the wizard assembled and normalizes defaults (e.g. adminNotes: []).
  const validated = CaseSchema.parse(candidate);
  store.cases.push(validated);
  return validated;
}

/** A soft-deleted case behaves as not-found on the public side — "deleted" means gone. */
export function getCaseByCaseNumber(publicCaseNumber: string): Case | undefined {
  return getStore().cases.find((c) => c.publicCaseNumber === publicCaseNumber && !c.deletedAt);
}

export function listCasesForCommunity(communityId: string): Case[] {
  return getStore()
    .cases.filter((c) => c.communityId === communityId && !c.deletedAt)
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
  if (!found) return false;
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

export function setVerificationState(
  publicCaseNumber: string,
  verificationState: VerificationState,
  actorId: string,
  now: () => Date = () => new Date(),
): boolean {
  const found = getCaseByCaseNumber(publicCaseNumber);
  if (!found) return false;
  found.verificationState = verificationState;
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

/** Test-only: the store is a `globalThis` singleton, so tests need a way back to empty. */
export function __resetCaseStoreForTests(): void {
  const g = globalThis as typeof globalThis & { __commonGroundCaseStore__?: CaseStoreState };
  g.__commonGroundCaseStore__ = { cases: [], sequencesByCommunityYear: {} };
}
