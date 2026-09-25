"use server";

import { requireAdmin } from "@/lib/admin/auth";
import {
  addAdminNote,
  changeCaseStatus,
  listAllCasesForAdmin,
  markDuplicate,
  markInaccuracyFlagReviewed,
  removeCaseContent,
  restoreCaseContent,
  setVerificationState,
} from "@/lib/store/case-store";
import { getCaseByCaseNumber } from "@/lib/store/case-store";
import {
  RemovalReasonSchema,
  toPublicCase,
  VerificationStateSchema,
  VerifiedSourceSchema,
  type Case,
  type ReportStatus,
  type VerificationState,
  type VerifiedSource,
} from "@/lib/schema/report";
import { findDuplicateClusters, type DuplicateCluster } from "@/lib/insights/duplicate-clusters";

const ACTOR_ID = "admin";

export async function listCasesForAdmin(): Promise<Case[]> {
  await requireAdmin();
  return listAllCasesForAdmin();
}

export async function getCaseForAdmin(caseNumber: string): Promise<Case | null> {
  await requireAdmin();
  return getCaseByCaseNumber(caseNumber) ?? null;
}

/**
 * Recomputed fresh on every call — "autonomous" here means the moderator never has to ask for
 * it (it's just always current when they load the admin page), not that a real background
 * scheduler runs it; this app's serverless deploy target and in-memory store don't reliably
 * support one yet.
 */
export async function getAdminDuplicateClusters(): Promise<DuplicateCluster[]> {
  await requireAdmin();
  return findDuplicateClusters(listAllCasesForAdmin().map(toPublicCase));
}

export async function adminChangeStatus(
  caseNumber: string,
  status: ReportStatus,
  note?: string,
): Promise<boolean> {
  await requireAdmin();
  return changeCaseStatus(caseNumber, status, ACTOR_ID, note);
}

/**
 * "officially_verified" is not a bare label a moderator can toggle on — it requires providing a
 * real external source, checked at the moment of marking it (spec: "a moderator must provide or
 * select approved evidence before manually marking information officially verified"). Every
 * other verification state needs no evidence and rejects one passed by mistake.
 *
 * The candidate source is validated with `VerifiedSourceSchema.safeParse` — never trusting the
 * caller's TypeScript type or any client-side validation, since this is a server action anyone
 * with a valid admin session can call directly with arbitrary arguments. This is what rejects a
 * `javascript:` URL, a blank/whitespace-only value, or an unreasonably long title/URL.
 * Every rejection is a plain `false` — no validation or internal error detail reaches the caller.
 */
export async function adminSetVerification(
  caseNumber: string,
  verificationState: VerificationState,
  source?: { title: string; url: string },
): Promise<boolean> {
  await requireAdmin();
  // The TypeScript type isn't enforced at runtime for a direct server-action call — without
  // this, an arbitrary string would be stored as the case's verification state.
  if (!VerificationStateSchema.safeParse(verificationState).success) return false;
  let verifiedSource: VerifiedSource | undefined;
  if (verificationState === "officially_verified") {
    if (!source) return false;
    const parsed = VerifiedSourceSchema.safeParse({
      title: source.title,
      url: source.url,
      checkedAt: new Date().toISOString(),
      moderatorActorId: ACTOR_ID,
    });
    if (!parsed.success) return false;
    verifiedSource = parsed.data;
  }
  return setVerificationState(caseNumber, verificationState, ACTOR_ID, verifiedSource);
}

export async function adminMarkDuplicate(
  caseNumber: string,
  duplicateOfCaseNumber: string,
): Promise<boolean> {
  await requireAdmin();
  return markDuplicate(caseNumber, duplicateOfCaseNumber, ACTOR_ID);
}

export async function adminAddNote(caseNumber: string, note: string): Promise<boolean> {
  await requireAdmin();
  return addAdminNote(caseNumber, note, ACTOR_ID);
}

export async function adminReviewInaccuracyFlag(
  caseNumber: string,
  flagId: string,
): Promise<boolean> {
  await requireAdmin();
  return markInaccuracyFlagReviewed(caseNumber, flagId);
}

/**
 * Runtime-validated like every other admin action: the reason must be a known value and the
 * private note is capped, since a server action can be called directly with anything.
 */
export async function adminRemoveContent(
  caseNumber: string,
  reason: string,
  privateNote?: string,
): Promise<boolean> {
  await requireAdmin();
  const parsedReason = RemovalReasonSchema.safeParse(reason);
  if (!parsedReason.success) return false;
  if (privateNote !== undefined && (typeof privateNote !== "string" || privateNote.length > 500)) return false;
  return removeCaseContent(caseNumber, parsedReason.data, ACTOR_ID, privateNote);
}

export async function adminRestoreContent(caseNumber: string): Promise<boolean> {
  await requireAdmin();
  return restoreCaseContent(caseNumber, ACTOR_ID);
}
