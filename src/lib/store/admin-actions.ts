"use server";

import { requireAdmin } from "@/lib/admin/auth";
import {
  addAdminNote,
  changeCaseStatus,
  listAllCasesForAdmin,
  markDuplicate,
  markInaccuracyFlagReviewed,
  setVerificationState,
} from "@/lib/store/case-store";
import { getCaseByCaseNumber } from "@/lib/store/case-store";
import {
  toPublicCase,
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
 */
export async function adminSetVerification(
  caseNumber: string,
  verificationState: VerificationState,
  source?: { title: string; url: string },
): Promise<boolean> {
  await requireAdmin();
  let verifiedSource: VerifiedSource | undefined;
  if (verificationState === "officially_verified") {
    if (!source?.title.trim() || !source.url.trim()) return false;
    verifiedSource = {
      title: source.title.trim(),
      url: source.url.trim(),
      checkedAt: new Date().toISOString(),
      moderatorActorId: ACTOR_ID,
    };
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
