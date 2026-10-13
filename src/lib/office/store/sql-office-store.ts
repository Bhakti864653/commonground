import type { SqlClient } from "@/lib/db/sql-client";
import { OfficeAccountSchema, OfficeNoteSchema, OfficeReferralSchema, type OfficeAccount, type OfficeNote, type OfficeReferral } from "../types";
import type { OfficeRepository } from "./office-repository";

/** The Postgres OfficeRepository (tables: db/migrations/0008_office_portal.sql). */

type Row = Record<string, unknown>;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const iso = (v: unknown) => (v === null || v === undefined ? undefined : (v instanceof Date ? v : new Date(String(v))).toISOString());
const opt = <T>(v: T | null | undefined) => (v === null ? undefined : v);

const toReferral = (r: Row): OfficeReferral =>
  OfficeReferralSchema.parse({
    id: String(r.id),
    caseNumber: r.case_number,
    communityId: r.community_id,
    officeId: r.office_id,
    status: r.status,
    declineReason: opt(r.decline_reason),
    isDemo: r.is_demo,
    createdAt: iso(r.created_at),
    statusChangedAt: iso(r.status_changed_at),
    outboxId: r.outbox_id ? String(r.outbox_id) : undefined,
  });
const toNote = (r: Row): OfficeNote =>
  OfficeNoteSchema.parse({ id: String(r.id), referralId: String(r.referral_id), caseNumber: r.case_number, officeId: r.office_id, kind: r.kind, text: r.text, author: r.author, createdAt: iso(r.created_at) });
const toAccount = (r: Row): OfficeAccount =>
  OfficeAccountSchema.parse({ email: r.email, officeId: r.office_id, name: r.name, invitedBy: r.invited_by, createdAt: iso(r.created_at), disabledAt: iso(r.disabled_at) });

/**
 * Creates a "new" office referral for every approved referral in the outbox that doesn't have one
 * yet. Example cases' referrals are marked is_demo (closed ones are skipped). Used by db/seed.sql,
 * migration 0008 and Reset demo; `onlyCases` limits it to some case numbers.
 */
export const BACKFILL_OFFICE_REFERRALS_SQL = `insert into public.office_referrals (case_number, community_id, office_id, status, is_demo, created_at, status_changed_at, outbox_id)
select o.case_number, o.community_id, o.office_id, 'new', c.source_type = 'demonstration', o.created_at, o.created_at, o.id
from public.pipeline_outbox o
join public.cases c on c.case_number = o.case_number
where o.kind = 'referral' and c.deleted_at is null and c.status <> 'closed'
  and not exists (select 1 from public.office_referrals r where r.outbox_id = o.id)`;

export function createSqlOfficeRepository(db: SqlClient): OfficeRepository {
  return {
    async createReferral(input, now = new Date()) {
      const { rows } = await db.query<Row>(
        `insert into public.office_referrals (case_number, community_id, office_id, status, is_demo, created_at, status_changed_at, outbox_id)
         values ($1, $2, $3, 'new', $4, $5::timestamptz, $5::timestamptz, $6) returning *`,
        [input.caseNumber, input.communityId, input.officeId, input.isDemo, now.toISOString(), input.outboxId ?? null],
      );
      return toReferral(rows[0]);
    },
    async listForOffice(officeId, demo) {
      const { rows } = await db.query<Row>(
        "select * from public.office_referrals where office_id = $1 and is_demo = $2 order by created_at desc, seq desc",
        [officeId, demo],
      );
      return rows.map(toReferral);
    },
    async getForOffice(id, officeId, demo) {
      if (!UUID.test(id)) return undefined;
      const { rows } = await db.query<Row>(
        "select * from public.office_referrals where id = $1::uuid and office_id = $2 and is_demo = $3",
        [id, officeId, demo],
      );
      return rows[0] ? toReferral(rows[0]) : undefined;
    },
    async listForCase(caseNumber) {
      const { rows } = await db.query<Row>("select * from public.office_referrals where case_number = $1 order by created_at desc, seq desc", [caseNumber]);
      return rows.map(toReferral);
    },
    async listAll() {
      const { rows } = await db.query<Row>("select * from public.office_referrals order by created_at desc, seq desc");
      return rows.map(toReferral);
    },
    async setStatus(id, officeId, status, declineReason, now = new Date()) {
      if (!UUID.test(id)) return null;
      const { rows } = await db.query<Row>(
        `update public.office_referrals set status = $3, decline_reason = $4, status_changed_at = $5::timestamptz
         where id = $1::uuid and office_id = $2 returning *`,
        [id, officeId, status, declineReason ?? null, now.toISOString()],
      );
      return rows[0] ? toReferral(rows[0]) : null;
    },

    async addNote(input, now = new Date()) {
      const { rows } = await db.query<Row>(
        `insert into public.office_notes (referral_id, case_number, office_id, kind, text, author, created_at)
         values ($1::uuid, $2, $3, $4, $5, $6, $7::timestamptz) returning *`,
        [input.referralId, input.caseNumber, input.officeId, input.kind, input.text, input.author, now.toISOString()],
      );
      return toNote(rows[0]);
    },
    async listNotesForReferral(referralId, officeId) {
      if (!UUID.test(referralId)) return [];
      const { rows } = await db.query<Row>(
        "select * from public.office_notes where referral_id = $1::uuid and office_id = $2 order by created_at, seq",
        [referralId, officeId],
      );
      return rows.map(toNote);
    },
    async listNotesForCase(caseNumber) {
      const { rows } = await db.query<Row>("select * from public.office_notes where case_number = $1 order by created_at, seq", [caseNumber]);
      return rows.map(toNote);
    },

    async listAccounts() {
      const { rows } = await db.query<Row>("select * from public.office_accounts order by created_at");
      return rows.map(toAccount);
    },
    async getAccount(email) {
      const { rows } = await db.query<Row>("select * from public.office_accounts where email = $1", [email.trim().toLowerCase()]);
      return rows[0] ? toAccount(rows[0]) : undefined;
    },
    async addAccount(input, now = new Date()) {
      const { rows } = await db.query<Row>(
        `insert into public.office_accounts (email, office_id, name, invited_by, created_at) values ($1, $2, $3, $4, $5::timestamptz)
         on conflict (email) do nothing returning *`,
        [input.email.trim().toLowerCase(), input.officeId, input.name, input.invitedBy, now.toISOString()],
      );
      return rows[0] ? toAccount(rows[0]) : null;
    },
    async disableAccount(email, now = new Date()) {
      return db.transaction(async (tx) => {
        const { rows } = await tx.query<Row>(
          "update public.office_accounts set disabled_at = $2::timestamptz where email = $1 and disabled_at is null returning email",
          [email.trim().toLowerCase(), now.toISOString()],
        );
        if (!rows[0]) return false;
        await tx.query("delete from public.office_sessions where email = $1", [rows[0].email]);
        return true;
      });
    },
    async createSession(email, tokenHash, expiresAt, now = new Date()) {
      await db.query(
        "insert into public.office_sessions (token_hash, email, created_at, expires_at) values ($1, $2, $3::timestamptz, $4::timestamptz)",
        [tokenHash, email.trim().toLowerCase(), now.toISOString(), expiresAt.toISOString()],
      );
    },
    async getSessionAccount(tokenHash, now = new Date()) {
      const { rows } = await db.query<Row>(
        `select a.* from public.office_sessions s join public.office_accounts a on a.email = s.email
         where s.token_hash = $1 and s.expires_at > $2::timestamptz and a.disabled_at is null`,
        [tokenHash, now.toISOString()],
      );
      return rows[0] ? toAccount(rows[0]) : undefined;
    },
    async deleteSession(tokenHash) {
      await db.query("delete from public.office_sessions where token_hash = $1", [tokenHash]);
    },
  };
}
