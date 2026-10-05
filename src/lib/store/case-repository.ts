import type {
  AgentSuggestion,
  Case,
  ReferralDraft,
  RemovalReason,
  ReportStatus,
  TimelineEventKind,
  VerificationState,
  VerifiedSource,
} from "@/lib/schema/report";
import type { NewCaseInput } from "./memory-case-store";

/** Every write takes an optional clock so tests can pin timestamps. */
type Clock = () => Date;

/**
 * Everything the app can do with cases, independent of where they are stored. Two
 * implementations: the in-memory prototype store (memory-case-store.ts — used by tests and when
 * no database is configured) and, later, Supabase Postgres. Every method is async because a
 * database call is; the in-memory one just resolves immediately.
 *
 * Reads return copies: changing a returned case never changes the stored one (a database works
 * that way too), so every change has to go through one of the write methods below.
 */
export interface CaseRepository {
  createCase(input: NewCaseInput, now?: Clock): Promise<Case>;
  getCaseByCaseNumber(publicCaseNumber: string): Promise<Case | undefined>;
  listCasesForCommunity(communityId: string): Promise<Case[]>;
  listAllCasesForAdmin(): Promise<Case[]>;
  listOpenCasesForCommunity(communityId: string, excludeCaseNumber?: string): Promise<Case[]>;

  deleteCase(publicCaseNumber: string, managementToken: string, now?: Clock): Promise<boolean>;
  flagInaccuracy(publicCaseNumber: string, note: string | undefined, now?: Clock): Promise<boolean>;
  markInaccuracyFlagReviewed(publicCaseNumber: string, flagId: string, now?: Clock): Promise<boolean>;

  changeCaseStatus(
    publicCaseNumber: string,
    status: ReportStatus,
    actorId: string,
    note?: string,
    now?: Clock,
  ): Promise<boolean>;
  setVerificationState(
    publicCaseNumber: string,
    verificationState: VerificationState,
    actorId: string,
    verifiedSource?: VerifiedSource,
    now?: Clock,
  ): Promise<boolean>;
  markDuplicate(publicCaseNumber: string, duplicateOfCaseNumber: string, actorId: string, now?: Clock): Promise<boolean>;
  addAdminNote(publicCaseNumber: string, note: string, actorId: string, now?: Clock): Promise<boolean>;
  removeCaseContent(
    publicCaseNumber: string,
    reason: RemovalReason,
    actorId: string,
    privateNote?: string,
    now?: Clock,
  ): Promise<boolean>;
  restoreCaseContent(publicCaseNumber: string, actorId: string, now?: Clock): Promise<boolean>;

  addAgentSuggestions(
    publicCaseNumber: string,
    suggestions: Array<Pick<AgentSuggestion, "kind" | "suggestedValue" | "reasoning">>,
    now?: Clock,
  ): Promise<boolean>;
  setAgentSuggestionStatus(
    publicCaseNumber: string,
    suggestionId: string,
    status: "approved" | "rejected",
    now?: Clock,
  ): Promise<boolean>;

  addTimelineEvent(
    publicCaseNumber: string,
    event: { kind: Exclude<TimelineEventKind, "status">; actorType: "agent" | "moderator"; contactId?: string },
    now?: Clock,
  ): Promise<boolean>;
  addReferralSuggestion(
    publicCaseNumber: string,
    referral: ReferralDraft,
    reasoning: string,
    now?: Clock,
  ): Promise<AgentSuggestion | null>;
  approveReferral(
    publicCaseNumber: string,
    suggestionId: string,
    message: string,
    actorId: string,
    now?: Clock,
  ): Promise<boolean>;
  rejectReferral(publicCaseNumber: string, suggestionId: string, actorId: string, now?: Clock): Promise<boolean>;
}
