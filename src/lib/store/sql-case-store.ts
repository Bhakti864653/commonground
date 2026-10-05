import { casePrefix } from "@/lib/case-number/format-case-number";
import {
  CaseSchema,
  ReferralDraftSchema,
  type AgentSuggestion,
  type Case,
  type ModerationAction,
} from "@/lib/schema/report";
import type { SqlClient } from "@/lib/db/sql-client";
import type { CaseRepository } from "./case-repository";
import { prepareNewCase } from "./new-case";

/**
 * The Postgres implementation of CaseRepository (tables: db/migrations/0001_init.sql). It must
 * behave exactly like the in-memory store — case-repository-contract.test.ts runs the same tests
 * against both. Every multi-step write runs in one transaction and locks the case row first
 * (`for update`), so two servers changing the same case at once can't interleave.
 */

type Row = Record<string, unknown>;
type Clock = () => Date;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const defaultClock: Clock = () => new Date();

/** timestamptz → the ISO string the rest of the app uses; null → undefined. */
function iso(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined;
  return (value instanceof Date ? value : new Date(String(value))).toISOString();
}
/** SQL null → undefined, which is how optional fields are absent everywhere else. */
const opt = <T>(value: T | null | undefined): T | undefined => (value === null ? undefined : value);
const json = (value: unknown) => (value === undefined || value === null ? null : JSON.stringify(value));

function groupByCase(rows: Row[]): Map<string, Row[]> {
  const groups = new Map<string, Row[]>();
  for (const row of rows) {
    const key = String(row.case_id);
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }
  return groups;
}

/** Loads full cases (with their timeline and private records) matching `where`, newest first. */
async function loadCases(db: SqlClient, where: string, params: unknown[]): Promise<Case[]> {
  const { rows } = await db.query<Row>(
    `select * from public.cases where ${where} order by created_at desc, case_number asc`,
    params,
  );
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);
  const child = (table: string) =>
    db.query<Row>(`select * from public.${table} where case_id = any($1::uuid[]) order by seq`, [ids]);
  const [events, suggestions, actions, notes, flags] = await Promise.all([
    child("case_events"),
    child("agent_suggestions"),
    child("moderation_actions"),
    child("admin_notes"),
    child("inaccuracy_flags"),
  ]).then((results) => results.map((r) => groupByCase(r.rows)));

  return rows.map((r) => {
    const id = String(r.id);
    return CaseSchema.parse({
      id,
      type: r.type,
      publicCaseNumber: r.case_number,
      communityId: r.community_id,
      categoryId: r.category_id,
      description: r.description,
      approximateArea: r.approximate_area,
      createdAt: iso(r.created_at),
      status: r.status,
      statusHistory: (events.get(id) ?? []).map((e) => ({
        id: String(e.id),
        status: e.status,
        occurredAt: iso(e.occurred_at),
        actorType: e.actor_type,
        kind: opt(e.kind),
        contactId: opt(e.contact_id),
        note: opt(e.note),
        noteEs: opt(e.note_es),
        notes: opt(e.notes),
      })),
      sourceType: r.source_type,
      verificationState: r.verification_state,
      verifiedSource: opt(r.verified_source),
      image: opt(r.image),
      consent: r.consent,
      adminNotes: (notes.get(id) ?? []).map((n) => ({
        id: String(n.id),
        authorId: n.author_id,
        createdAt: iso(n.created_at),
        note: n.note,
      })),
      inaccuracyFlags: (flags.get(id) ?? []).map((f) => ({
        id: String(f.id),
        note: opt(f.note),
        occurredAt: iso(f.occurred_at),
        reviewedAt: iso(f.reviewed_at),
      })),
      moderationActions: (actions.get(id) ?? []).map((a) => ({
        id: String(a.id),
        actorId: a.actor_id,
        actorEmail: opt(a.actor_email),
        action: a.action,
        occurredAt: iso(a.occurred_at),
        detail: opt(a.detail),
      })),
      agentSuggestions: (suggestions.get(id) ?? []).map(toSuggestion),
      isDuplicateOf: opt(r.is_duplicate_of),
      deletedAt: iso(r.deleted_at),
      removal: opt(r.removal),
      managementToken: r.management_token,
    });
  });
}

function toSuggestion(s: Row): AgentSuggestion {
  return {
    id: String(s.id),
    kind: s.kind as AgentSuggestion["kind"],
    suggestedValue: String(s.suggested_value),
    reasoning: String(s.reasoning),
    createdAt: iso(s.created_at)!,
    status: s.status as AgentSuggestion["status"],
    reviewedAt: iso(s.reviewed_at),
    referral: opt(s.referral) as AgentSuggestion["referral"],
  };
}

type LockedCase = { id: string; status: string; removal: unknown };

/** The (not deleted) case's id, locked until the transaction ends; null if there is none. */
async function lockCase(tx: SqlClient, caseNumber: string): Promise<LockedCase | null> {
  const { rows } = await tx.query<LockedCase>(
    "select id, status, removal from public.cases where case_number = $1 and deleted_at is null for update",
    [caseNumber],
  );
  return rows[0] ?? null;
}

async function recordAction(
  tx: SqlClient,
  caseId: string,
  action: ModerationAction["action"],
  actorId: string,
  detail: string | undefined,
  at: Date,
) {
  await tx.query(
    "insert into public.moderation_actions (case_id, actor_id, action, occurred_at, detail) values ($1, $2, $3, $4::timestamptz, $5)",
    [caseId, actorId, action, at.toISOString(), detail ?? null],
  );
}

export function createSqlCaseRepository(db: SqlClient): CaseRepository {
  const getCaseByCaseNumber = async (caseNumber: string) =>
    (await loadCases(db, "case_number = $1 and deleted_at is null", [caseNumber]))[0];
  const listCasesForCommunity = (communityId: string) =>
    loadCases(db, "community_id = $1 and deleted_at is null and removal is null", [communityId]);

  return {
    async createCase(input, now = defaultClock) {
      const createdAt = now();
      const prepared = prepareNewCase(input, createdAt);
      const { rows } = await db.query<{ case_number: string }>(
        `select case_number from public.create_case(
           $1, $2, $3, $4, $5, $6::jsonb, $7::timestamptz, $8, $9, $10::jsonb, $11::jsonb, $12)`,
        [
          prepared.communityId,
          casePrefix(prepared.communityId),
          prepared.type,
          prepared.categoryId,
          prepared.description,
          json(prepared.approximateArea),
          prepared.createdAt,
          prepared.verificationState,
          prepared.sourceType,
          json(prepared.image),
          json(prepared.consent),
          prepared.managementToken,
        ],
      );
      const created = await getCaseByCaseNumber(rows[0].case_number);
      if (!created) throw new Error("create_case returned a case that can't be read back");
      return created;
    },

    getCaseByCaseNumber,
    listCasesForCommunity,
    listAllCasesForAdmin: () => loadCases(db, "deleted_at is null", []),
    async listOpenCasesForCommunity(communityId, excludeCaseNumber) {
      return (await listCasesForCommunity(communityId)).filter(
        (c) => c.publicCaseNumber !== excludeCaseNumber && !c.isDuplicateOf,
      );
    },

    async deleteCase(caseNumber, managementToken, now = defaultClock) {
      const { rows } = await db.query(
        `update public.cases set deleted_at = $3::timestamptz
         where case_number = $1 and management_token = $2 and deleted_at is null returning id`,
        [caseNumber, managementToken, now().toISOString()],
      );
      return rows.length > 0;
    },

    flagInaccuracy: (caseNumber, note, now = defaultClock) =>
      db.transaction(async (tx) => {
        const found = await lockCase(tx, caseNumber);
        if (!found || found.removal) return false;
        await tx.query(
          "insert into public.inaccuracy_flags (case_id, note, occurred_at) values ($1, $2, $3::timestamptz)",
          [found.id, note?.trim() || null, now().toISOString()],
        );
        return true;
      }),

    async markInaccuracyFlagReviewed(caseNumber, flagId, now = defaultClock) {
      if (!UUID.test(flagId)) return false;
      const { rows } = await db.query(
        `update public.inaccuracy_flags f set reviewed_at = $3::timestamptz
         from public.cases c
         where f.id = $2::uuid and f.case_id = c.id and c.case_number = $1 and c.deleted_at is null
         returning f.id`,
        [caseNumber, flagId, now().toISOString()],
      );
      return rows.length > 0;
    },

    changeCaseStatus: (caseNumber, status, actorId, note, now = defaultClock) =>
      db.transaction(async (tx) => {
        const found = await lockCase(tx, caseNumber);
        if (!found) return false;
        const at = now();
        await tx.query("update public.cases set status = $2 where id = $1", [found.id, status]);
        await tx.query(
          `insert into public.case_events (case_id, occurred_at, status, actor_type, note)
           values ($1, $2::timestamptz, $3, 'moderator', $4)`,
          [found.id, at.toISOString(), status, note ?? null],
        );
        await recordAction(tx, found.id, "status_change", actorId, note ?? status, at);
        return true;
      }),

    async setVerificationState(caseNumber, verificationState, actorId, verifiedSource, now = defaultClock) {
      if (verificationState === "officially_verified" && !verifiedSource) return false;
      return db.transaction(async (tx) => {
        const found = await lockCase(tx, caseNumber);
        if (!found) return false;
        const verified = verificationState === "officially_verified";
        await tx.query("update public.cases set verification_state = $2, verified_source = $3::jsonb where id = $1", [
          found.id,
          verificationState,
          verified ? json(verifiedSource) : null,
        ]);
        await recordAction(tx, found.id, verified ? "mark_verified" : "mark_unverified", actorId, verificationState, now());
        return true;
      });
    },

    markDuplicate: (caseNumber, duplicateOfCaseNumber, actorId, now = defaultClock) =>
      db.transaction(async (tx) => {
        if (caseNumber === duplicateOfCaseNumber) return false;
        const found = await lockCase(tx, caseNumber);
        const original = await tx.query(
          "select id from public.cases where case_number = $1 and deleted_at is null",
          [duplicateOfCaseNumber],
        );
        if (!found || original.rows.length === 0) return false;
        await tx.query("update public.cases set is_duplicate_of = $2 where id = $1", [found.id, duplicateOfCaseNumber]);
        await recordAction(tx, found.id, "mark_duplicate", actorId, duplicateOfCaseNumber, now());
        return true;
      }),

    async addAdminNote(caseNumber, note, actorId, now = defaultClock) {
      if (!note.trim()) return false;
      return db.transaction(async (tx) => {
        const found = await lockCase(tx, caseNumber);
        if (!found) return false;
        const at = now();
        await tx.query(
          "insert into public.admin_notes (case_id, author_id, note, created_at) values ($1, $2, $3, $4::timestamptz)",
          [found.id, actorId, note.trim(), at.toISOString()],
        );
        await recordAction(tx, found.id, "add_note", actorId, undefined, at);
        return true;
      });
    },

    removeCaseContent: (caseNumber, reason, actorId, privateNote, now = defaultClock) =>
      db.transaction(async (tx) => {
        const found = await lockCase(tx, caseNumber);
        if (!found || found.removal) return false;
        const at = now();
        await tx.query("update public.cases set removal = $2::jsonb where id = $1", [
          found.id,
          json({ reason, removedAt: at.toISOString() }),
        ]);
        const note = privateNote?.trim();
        await recordAction(tx, found.id, "remove_content", actorId, note ? `${reason}: ${note}` : reason, at);
        return true;
      }),

    restoreCaseContent: (caseNumber, actorId, now = defaultClock) =>
      db.transaction(async (tx) => {
        const found = await lockCase(tx, caseNumber);
        if (!found || !found.removal) return false;
        await tx.query("update public.cases set removal = null where id = $1", [found.id]);
        await recordAction(tx, found.id, "restore_content", actorId, undefined, now());
        return true;
      }),

    addAgentSuggestions: (caseNumber, suggestions, now = defaultClock) =>
      db.transaction(async (tx) => {
        const found = await lockCase(tx, caseNumber);
        if (!found) return false;
        const kinds = [...new Set(suggestions.map((s) => s.kind))];
        await tx.query(
          "delete from public.agent_suggestions where case_id = $1 and status = 'pending' and kind = any($2::text[])",
          [found.id, kinds],
        );
        const at = now().toISOString();
        for (const s of suggestions) {
          await tx.query(
            `insert into public.agent_suggestions (case_id, kind, suggested_value, reasoning, created_at)
             values ($1, $2, $3, $4, $5::timestamptz)`,
            [found.id, s.kind, s.suggestedValue, s.reasoning, at],
          );
        }
        return true;
      }),

    async setAgentSuggestionStatus(caseNumber, suggestionId, status, now = defaultClock) {
      if (!UUID.test(suggestionId)) return false;
      const { rows } = await db.query(
        `update public.agent_suggestions s set status = $3, reviewed_at = $4::timestamptz
         from public.cases c
         where s.id = $2::uuid and s.case_id = c.id and c.case_number = $1 and c.deleted_at is null
           and s.status = 'pending'
         returning s.id`,
        [caseNumber, suggestionId, status, now().toISOString()],
      );
      return rows.length > 0;
    },

    async addTimelineEvent(caseNumber, event, now = defaultClock) {
      const { rows } = await db.query(
        `insert into public.case_events (case_id, occurred_at, status, actor_type, kind, contact_id)
         select id, $2::timestamptz, status, $3, $4, $5 from public.cases
         where case_number = $1 and deleted_at is null
         returning id`,
        [caseNumber, now().toISOString(), event.actorType, event.kind, event.contactId ?? null],
      );
      return rows.length > 0;
    },

    async addReferralSuggestion(caseNumber, referral, reasoning, now = defaultClock) {
      const parsed = ReferralDraftSchema.safeParse(referral);
      if (!parsed.success) return null;
      return db.transaction(async (tx) => {
        const found = await lockCase(tx, caseNumber);
        if (!found) return null;
        await tx.query(
          "delete from public.agent_suggestions where case_id = $1 and status = 'pending' and kind = 'referral'",
          [found.id],
        );
        const { rows } = await tx.query<Row>(
          `insert into public.agent_suggestions (case_id, kind, suggested_value, reasoning, created_at, referral)
           values ($1, 'referral', $2, $3, $4::timestamptz, $5::jsonb) returning *`,
          [found.id, parsed.data.contactId, reasoning, now().toISOString(), json(parsed.data)],
        );
        return toSuggestion(rows[0]);
      });
    },

    approveReferral: (caseNumber, suggestionId, message, actorId, now = defaultClock) =>
      db.transaction(async (tx) => {
        const target = await lockPendingReferral(tx, caseNumber, suggestionId);
        if (!target) return false;
        const at = now();
        await tx.query(
          `update public.agent_suggestions
           set status = 'approved', reviewed_at = $2::timestamptz, referral = jsonb_set(referral, '{message}', to_jsonb($3::text))
           where id = $1`,
          [suggestionId, at.toISOString(), message],
        );
        await tx.query("update public.cases set status = 'referred' where id = $1", [target.caseId]);
        await tx.query(
          `insert into public.case_events (case_id, occurred_at, status, actor_type, kind, contact_id)
           values ($1, $2::timestamptz, 'referred', 'moderator', 'referral_approved', $3)`,
          [target.caseId, at.toISOString(), target.contactId],
        );
        await recordAction(tx, target.caseId, "approve_referral", actorId, target.contactId, at);
        return true;
      }),

    rejectReferral: (caseNumber, suggestionId, actorId, now = defaultClock) =>
      db.transaction(async (tx) => {
        const target = await lockPendingReferral(tx, caseNumber, suggestionId);
        if (!target) return false;
        const at = now();
        await tx.query("update public.agent_suggestions set status = 'rejected', reviewed_at = $2::timestamptz where id = $1", [
          suggestionId,
          at.toISOString(),
        ]);
        await tx.query(
          `insert into public.case_events (case_id, occurred_at, status, actor_type, kind, contact_id)
           values ($1, $2::timestamptz, $3, 'moderator', 'referral_declined', $4)`,
          [target.caseId, at.toISOString(), target.status, target.contactId],
        );
        await recordAction(tx, target.caseId, "reject_referral", actorId, target.contactId, at);
        return true;
      }),
  };
}

/** A pending referral on a live (not deleted, not removed) case, locked; null otherwise. */
async function lockPendingReferral(tx: SqlClient, caseNumber: string, suggestionId: string) {
  if (!UUID.test(suggestionId)) return null;
  const found = await lockCase(tx, caseNumber);
  if (!found || found.removal) return null;
  const { rows } = await tx.query<{ contact_id: string }>(
    `select referral->>'contactId' as contact_id from public.agent_suggestions
     where id = $1::uuid and case_id = $2 and kind = 'referral' and status = 'pending' and referral is not null
     for update`,
    [suggestionId, found.id],
  );
  if (rows.length === 0) return null;
  return { caseId: found.id, status: found.status, contactId: rows[0].contact_id };
}
