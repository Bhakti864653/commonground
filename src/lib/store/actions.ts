"use server";

import {
  createCase,
  deleteCase,
  flagInaccuracy,
  listCasesForCommunity,
  type NewCaseInput,
} from "@/lib/store/case-store";
import { toPublicCase, type PublicCase } from "@/lib/schema/report";
import { detectTrends, type Trend } from "@/lib/insights/trends";

/**
 * Only `publicCaseNumber` + `managementToken` — the wizard needs the token to build the
 * one-time manage link, but nothing else about the freshly created case (which has no private
 * data yet anyway) needs to reach the client as a blanket object.
 */
export async function submitCase(
  input: NewCaseInput,
): Promise<{ publicCaseNumber: string; managementToken: string }> {
  const created = createCase(input);
  return { publicCaseNumber: created.publicCaseNumber, managementToken: created.managementToken };
}

export async function listCasesForActivity(communityId: string): Promise<PublicCase[]> {
  return listCasesForCommunity(communityId).map(toPublicCase);
}

/** Aggregate counts only (never a specific case's private data) — safe to show publicly. */
export async function getTrendsForActivity(communityId: string): Promise<Trend[]> {
  return detectTrends(listCasesForCommunity(communityId).map(toPublicCase));
}

export async function deleteSubmission(
  caseNumber: string,
  managementToken: string,
): Promise<boolean> {
  return deleteCase(caseNumber, managementToken);
}

export async function reportInaccuracy(caseNumber: string, note?: string): Promise<boolean> {
  return flagInaccuracy(caseNumber, note);
}
