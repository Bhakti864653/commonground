import type { CaseRepository } from "./case-repository";
import { memoryCaseRepository, __resetMemoryCaseStore } from "./memory-case-store";
import { createSqlCaseRepository } from "./sql-case-store";
import { getSqlClient } from "@/lib/db/pool";
import { getCommunity } from "./community-store";

export type { NewCaseInput } from "./new-case";
export type { CaseRepository } from "./case-repository";

let sqlRepository: CaseRepository | null = null;

/**
 * Where cases are stored: Postgres (Neon) when DATABASE_URL is set, otherwise the in-memory
 * prototype store. Tests always get the in-memory store, even if DATABASE_URL happens to be in
 * the environment, so no test can ever write to a real database.
 */
export function getCaseRepository(): CaseRepository {
  const url = process.env.DATABASE_URL;
  if (!url || process.env.VITEST) return memoryCaseRepository;
  sqlRepository ??= createSqlCaseRepository(getSqlClient(url), getCommunity);
  return sqlRepository;
}

// The app's case API: the same names as before, now async, delegating to the configured store.
// Callers import from here, never from a specific implementation.
const repo = () => getCaseRepository();

export const createCase: CaseRepository["createCase"] = (...a) => repo().createCase(...a);
export const getCaseByCaseNumber: CaseRepository["getCaseByCaseNumber"] = (...a) => repo().getCaseByCaseNumber(...a);
export const listCasesForCommunity: CaseRepository["listCasesForCommunity"] = (...a) =>
  repo().listCasesForCommunity(...a);
export const listAllCasesForAdmin: CaseRepository["listAllCasesForAdmin"] = (...a) => repo().listAllCasesForAdmin(...a);
export const listOpenCasesForCommunity: CaseRepository["listOpenCasesForCommunity"] = (...a) =>
  repo().listOpenCasesForCommunity(...a);
export const deleteCase: CaseRepository["deleteCase"] = (...a) => repo().deleteCase(...a);
export const flagInaccuracy: CaseRepository["flagInaccuracy"] = (...a) => repo().flagInaccuracy(...a);
export const markInaccuracyFlagReviewed: CaseRepository["markInaccuracyFlagReviewed"] = (...a) =>
  repo().markInaccuracyFlagReviewed(...a);
export const changeCaseStatus: CaseRepository["changeCaseStatus"] = (...a) => repo().changeCaseStatus(...a);
export const setVerificationState: CaseRepository["setVerificationState"] = (...a) => repo().setVerificationState(...a);
export const markDuplicate: CaseRepository["markDuplicate"] = (...a) => repo().markDuplicate(...a);
export const addAdminNote: CaseRepository["addAdminNote"] = (...a) => repo().addAdminNote(...a);
export const removeCaseContent: CaseRepository["removeCaseContent"] = (...a) => repo().removeCaseContent(...a);
export const restoreCaseContent: CaseRepository["restoreCaseContent"] = (...a) => repo().restoreCaseContent(...a);
export const addAgentSuggestions: CaseRepository["addAgentSuggestions"] = (...a) => repo().addAgentSuggestions(...a);
export const setAgentSuggestionStatus: CaseRepository["setAgentSuggestionStatus"] = (...a) =>
  repo().setAgentSuggestionStatus(...a);
export const addTimelineEvent: CaseRepository["addTimelineEvent"] = (...a) => repo().addTimelineEvent(...a);
export const addReferralSuggestion: CaseRepository["addReferralSuggestion"] = (...a) =>
  repo().addReferralSuggestion(...a);
export const approveReferral: CaseRepository["approveReferral"] = (...a) => repo().approveReferral(...a);
export const rejectReferral: CaseRepository["rejectReferral"] = (...a) => repo().rejectReferral(...a);

/** Test-only: empties the in-memory store (the store every test runs against). */
export function __resetCaseStoreForTests(): void {
  __resetMemoryCaseStore();
}
