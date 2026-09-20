import { formatCaseNumber } from "@/lib/case-number/format-case-number";
import { CaseSchema, type Case, type ApproximateArea, type UserConsent } from "@/lib/schema/report";
import { getCommunityById } from "@/data/communities";

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

/** Test-only: the store is a `globalThis` singleton, so tests need a way back to empty. */
export function __resetCaseStoreForTests(): void {
  const g = globalThis as typeof globalThis & { __commonGroundCaseStore__?: CaseStoreState };
  g.__commonGroundCaseStore__ = { cases: [], sequencesByCommunityYear: {} };
}
