import type { OfficeAccount, OfficeNote, OfficeReferral, OfficeStatus } from "../types";

/**
 * Office referrals, notes, accounts and sessions. Every office-facing read takes the office id
 * and filters by it in the query itself, so one office can never load another's referral.
 */
export interface OfficeRepository {
  createReferral(input: Pick<OfficeReferral, "caseNumber" | "communityId" | "officeId" | "isDemo" | "outboxId">, now?: Date): Promise<OfficeReferral>;
  /** One office's referrals; `demo` picks example referrals only (true) or real ones only (false). */
  listForOffice(officeId: string, demo: boolean): Promise<OfficeReferral[]>;
  getForOffice(id: string, officeId: string, demo: boolean): Promise<OfficeReferral | undefined>;
  /** Moderators only: every referral for a case. */
  listForCase(caseNumber: string): Promise<OfficeReferral[]>;
  listAll(): Promise<OfficeReferral[]>;
  setStatus(id: string, officeId: string, status: OfficeStatus, declineReason: string | undefined, now?: Date): Promise<OfficeReferral | null>;

  addNote(input: Omit<OfficeNote, "id" | "createdAt">, now?: Date): Promise<OfficeNote>;
  listNotesForReferral(referralId: string, officeId: string): Promise<OfficeNote[]>;
  /** Moderators only. */
  listNotesForCase(caseNumber: string): Promise<OfficeNote[]>;

  listAccounts(): Promise<OfficeAccount[]>;
  getAccount(email: string): Promise<OfficeAccount | undefined>;
  addAccount(input: Pick<OfficeAccount, "email" | "officeId" | "name" | "invitedBy">, now?: Date): Promise<OfficeAccount | null>;
  disableAccount(email: string, now?: Date): Promise<boolean>;
  createSession(email: string, tokenHash: string, expiresAt: Date, now?: Date): Promise<void>;
  /** The enabled account behind a live session, or undefined. */
  getSessionAccount(tokenHash: string, now?: Date): Promise<OfficeAccount | undefined>;
  deleteSession(tokenHash: string): Promise<void>;
}
