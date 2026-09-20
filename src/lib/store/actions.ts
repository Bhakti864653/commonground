"use server";

import { createCase, getCaseByCaseNumber, type NewCaseInput } from "@/lib/store/case-store";
import type { Case } from "@/lib/schema/report";

export async function submitCase(input: NewCaseInput): Promise<Case> {
  return createCase(input);
}

export async function lookupCase(caseNumber: string): Promise<Case | null> {
  return getCaseByCaseNumber(caseNumber.trim().toUpperCase()) ?? null;
}
