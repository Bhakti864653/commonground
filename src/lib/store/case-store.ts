import { formatCaseNumber } from "@/lib/case-number/format-case-number";
import {
  CaseSchema,
  type AgentSuggestion,
  type Case,
  type ApproximateArea,
  type ReportStatus,
  type UserConsent,
  type VerificationState,
  type VerifiedSource,
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

type DemoCaseSeed = {
  type: "report" | "proposal";
  categoryId: string;
  description: string;
  areaId: string;
  areaLabel: string;
  areaLabelEs: string;
  daysAgo: number;
  status: ReportStatus;
  secondStatus?: ReportStatus;
};

const DEMO_COMMUNITY_ID = "santiago-veraguas";

const DEMO_CASE_SEEDS: DemoCaseSeed[] = [
  // Near-duplicate pair (road-infrastructure/centro) — exercises duplicate cluster detection.
  {
    type: "report",
    categoryId: "road-infrastructure",
    areaId: "centro",
    areaLabel: "Central area",
    areaLabelEs: "Área central",
    description:
      "Hay un poste de luz dañado frente a la escuela primaria del centro, no enciende desde hace una semana.",
    daysAgo: 9,
    status: "received",
  },
  {
    type: "report",
    categoryId: "road-infrastructure",
    areaId: "centro",
    areaLabel: "Central area",
    areaLabelEs: "Área central",
    description:
      "Hay un poste de luz dañado cerca de la escuela primaria del centro, no enciende desde hace varios días.",
    daysAgo: 6,
    status: "received",
  },
  // Three reports in the same category+area within 30 days — exercises trend detection.
  {
    type: "report",
    categoryId: "flooding-drainage",
    areaId: "norte",
    areaLabel: "Northern area",
    areaLabelEs: "Área norte",
    description:
      "La alcantarilla en la calle principal del área norte está bloqueada y el agua se acumula cada vez que llueve.",
    daysAgo: 14,
    status: "under_review",
  },
  {
    type: "report",
    categoryId: "flooding-drainage",
    areaId: "norte",
    areaLabel: "Northern area",
    areaLabelEs: "Área norte",
    description:
      "El drenaje de la avenida norte sigue tapado, se forma un charco grande después de cada lluvia.",
    daysAgo: 8,
    status: "received",
  },
  {
    type: "report",
    categoryId: "flooding-drainage",
    areaId: "norte",
    areaLabel: "Northern area",
    areaLabelEs: "Área norte",
    description:
      "Inundación recurrente en el área norte por el mismo drenaje bloqueado, ya pasó tres veces este mes.",
    daysAgo: 2,
    status: "received",
  },
  // A case with a status change already applied — exercises the auto-drafted status explanation.
  {
    type: "report",
    categoryId: "garbage-sanitation",
    areaId: "sur",
    areaLabel: "Southern area",
    areaLabelEs: "Área sur",
    description: "Acumulación de basura sin recoger en el área sur desde hace dos semanas.",
    daysAgo: 11,
    status: "received",
    secondStatus: "in_progress",
  },
  // A proposal, and a closed case — variety for the general admin/case list.
  {
    type: "proposal",
    categoryId: "other",
    areaId: "este",
    areaLabel: "Eastern area",
    areaLabelEs: "Área este",
    description: "Propongo instalar más luminarias solares en el parque del área este.",
    daysAgo: 4,
    status: "under_review",
  },
  {
    type: "report",
    categoryId: "road-infrastructure",
    areaId: "oeste",
    areaLabel: "Western area",
    areaLabelEs: "Área oeste",
    description: "Bache grande en la vía principal del área oeste, ya provocó un accidente menor.",
    daysAgo: 25,
    status: "closed",
  },
];

function seedDemoCases(store: CaseStoreState): void {
  const year = new Date().getUTCFullYear();
  for (const seed of DEMO_CASE_SEEDS) {
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
        note: "A community moderator updated this case's status.",
        noteEs: "Un moderador de la comunidad actualizó el estado de este caso.",
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
        labelEs: seed.areaLabelEs,
      },
      createdAt,
      status: finalStatus,
      statusHistory,
      sourceType: "demonstration",
      verificationState: "demonstration_data",
      consent: {
        consentVersion: "2026-09-19.v1",
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
