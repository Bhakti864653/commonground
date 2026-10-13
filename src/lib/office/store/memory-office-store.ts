import { OfficeAccountSchema, OfficeNoteSchema, OfficeReferralSchema, type OfficeAccount, type OfficeNote, type OfficeReferral } from "../types";
import type { OfficeRepository } from "./office-repository";
import { memoryOutboxSnapshot } from "@/lib/pipeline/store/memory-pipeline-store";
import { getCaseByCaseNumber as memoryCase } from "@/lib/store/memory-case-store";

type State = {
  referrals: OfficeReferral[];
  notes: OfficeNote[];
  accounts: OfficeAccount[];
  sessions: Array<{ email: string; tokenHash: string; expiresAt: string }>;
  seeded: boolean;
};

function getStore(): State {
  const g = globalThis as typeof globalThis & { __commonGroundOfficeStore__?: State };
  if (!g.__commonGroundOfficeStore__) {
    g.__commonGroundOfficeStore__ = { referrals: [], notes: [], accounts: [], sessions: [], seeded: true };
    // The example cases' approved referrals arrive in their office's inbox as "new".
    backfillMemoryOfficeReferrals();
  }
  return g.__commonGroundOfficeStore__;
}

/** Raw access for the demo seed/reset (office/demo.ts). */
export function memoryOfficeState(): State {
  return getStore();
}

const copy = <T>(value: T): T => structuredClone(value);
const newestFirst = (a: OfficeReferral, b: OfficeReferral) => b.createdAt.localeCompare(a.createdAt);

export const memoryOfficeRepository: OfficeRepository = {
  async createReferral(input, now = new Date()) {
    const r = OfficeReferralSchema.parse({ ...input, id: crypto.randomUUID(), status: "new", createdAt: now.toISOString(), statusChangedAt: now.toISOString() });
    getStore().referrals.push(r);
    return copy(r);
  },
  async listForOffice(officeId, demo) {
    return copy(getStore().referrals.filter((r) => r.officeId === officeId && r.isDemo === demo).sort(newestFirst));
  },
  async getForOffice(id, officeId, demo) {
    return copy(getStore().referrals.find((r) => r.id === id && r.officeId === officeId && r.isDemo === demo));
  },
  async listForCase(caseNumber) {
    return copy(getStore().referrals.filter((r) => r.caseNumber === caseNumber).sort(newestFirst));
  },
  async listAll() {
    return copy([...getStore().referrals].sort(newestFirst));
  },
  async setStatus(id, officeId, status, declineReason, now = new Date()) {
    const r = getStore().referrals.find((x) => x.id === id && x.officeId === officeId);
    if (!r) return null;
    r.status = status;
    r.declineReason = declineReason;
    r.statusChangedAt = now.toISOString();
    return copy(r);
  },

  async addNote(input, now = new Date()) {
    const n = OfficeNoteSchema.parse({ ...input, id: crypto.randomUUID(), createdAt: now.toISOString() });
    getStore().notes.push(n);
    return copy(n);
  },
  async listNotesForReferral(referralId, officeId) {
    return copy(getStore().notes.filter((n) => n.referralId === referralId && n.officeId === officeId));
  },
  async listNotesForCase(caseNumber) {
    return copy(getStore().notes.filter((n) => n.caseNumber === caseNumber));
  },

  async listAccounts() {
    return copy(getStore().accounts);
  },
  async getAccount(email) {
    return copy(getStore().accounts.find((a) => a.email === email.toLowerCase()));
  },
  async addAccount(input, now = new Date()) {
    const email = input.email.trim().toLowerCase();
    if (getStore().accounts.some((a) => a.email === email)) return null;
    const a = OfficeAccountSchema.parse({ ...input, email, createdAt: now.toISOString() });
    getStore().accounts.push(a);
    return copy(a);
  },
  async disableAccount(email, now = new Date()) {
    const a = getStore().accounts.find((x) => x.email === email.toLowerCase());
    if (!a || a.disabledAt) return false;
    a.disabledAt = now.toISOString();
    getStore().sessions = getStore().sessions.filter((s) => s.email !== a.email);
    return true;
  },
  async createSession(email, tokenHash, expiresAt) {
    getStore().sessions.push({ email: email.toLowerCase(), tokenHash, expiresAt: expiresAt.toISOString() });
  },
  async getSessionAccount(tokenHash, now = new Date()) {
    const s = getStore().sessions.find((x) => x.tokenHash === tokenHash && x.expiresAt > now.toISOString());
    const a = s && getStore().accounts.find((x) => x.email === s.email && !x.disabledAt);
    return copy(a);
  },
  async deleteSession(tokenHash) {
    getStore().sessions = getStore().sessions.filter((s) => s.tokenHash !== tokenHash);
  },
};

export function __resetMemoryOfficeStore(): void {
  const g = globalThis as typeof globalThis & { __commonGroundOfficeStore__?: State };
  g.__commonGroundOfficeStore__ = { referrals: [], notes: [], accounts: [], sessions: [], seeded: true };
}

/**
 * The in-memory version of BACKFILL_OFFICE_REFERRALS_SQL: a "new" office referral for each
 * approved referral in the outbox that has none (example cases marked as demo; closed cases skipped).
 */
export function backfillMemoryOfficeReferrals(onlyCases?: Set<string>): void {
  const store = getStore();
  for (const o of memoryOutboxSnapshot()) {
    if (o.kind !== "referral" || !o.caseNumber || (onlyCases && !onlyCases.has(o.caseNumber))) continue;
    if (store.referrals.some((r) => r.outboxId === o.id)) continue;
    const c = memoryCase(o.caseNumber);
    if (!c || c.status === "closed") continue;
    store.referrals.push(
      OfficeReferralSchema.parse({
        id: crypto.randomUUID(),
        caseNumber: o.caseNumber,
        communityId: o.communityId,
        officeId: o.officeId,
        status: "new",
        isDemo: c.sourceType === "demonstration",
        createdAt: o.createdAt,
        statusChangedAt: o.createdAt,
        outboxId: o.id,
      }),
    );
  }
}

/** Reset demo, office half: drops these example cases' office referrals and notes, then re-delivers them. */
export function resetDemoOfficeInMemory(caseNumbers: Set<string>): void {
  const store = getStore();
  store.referrals = store.referrals.filter((r) => !caseNumbers.has(r.caseNumber));
  store.notes = store.notes.filter((n) => !caseNumbers.has(n.caseNumber));
  backfillMemoryOfficeReferrals(caseNumbers);
}
