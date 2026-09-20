"use server";

import {
  createCase,
  deleteCase,
  flagInaccuracy,
  getCaseByCaseNumber,
  listCasesForCommunity,
  type NewCaseInput,
} from "@/lib/store/case-store";
import type { Case } from "@/lib/schema/report";

export async function submitCase(input: NewCaseInput): Promise<Case> {
  return createCase(input);
}

export async function lookupCase(caseNumber: string): Promise<Case | null> {
  return getCaseByCaseNumber(caseNumber.trim().toUpperCase()) ?? null;
}

export async function listCasesForActivity(communityId: string): Promise<Case[]> {
  return listCasesForCommunity(communityId);
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
