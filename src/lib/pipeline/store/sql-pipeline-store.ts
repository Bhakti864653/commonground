import type { SqlClient } from "@/lib/db/sql-client";
import {
  AuditEntrySchema,
  CasePipelineStateSchema,
  OutboxItemSchema,
  ProposalSchema,
  type AuditEntry,
  type CasePipelineState,
  type OutboxItem,
  type Proposal,
} from "../types";
import type { PipelineRepository } from "./pipeline-repository";

/** The Postgres PipelineRepository (tables: db/migrations/0007_agentic_pipeline.sql). */

type Row = Record<string, unknown>;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function iso(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined;
  return (value instanceof Date ? value : new Date(String(value))).toISOString();
}
const opt = <T>(value: T | null | undefined): T | undefined => (value === null ? undefined : value);
const json = (value: unknown) => (value === undefined || value === null ? null : JSON.stringify(value));

function toState(r: Row): CasePipelineState {
  return CasePipelineStateSchema.parse({
    caseNumber: r.case_number,
    communityId: r.community_id,
    officeId: opt(r.office_id),
    priority: opt(r.priority),
    routedAt: iso(r.routed_at),
    title: opt(r.title),
    emergency: r.emergency,
    referralQueuedAt: iso(r.referral_queued_at),
    lastFollowUpAt: iso(r.last_follow_up_at),
    lastProgressAt: iso(r.last_progress_at),
  });
}

function toProposal(r: Row): Proposal {
  return ProposalSchema.parse({
    id: String(r.id),
    kind: r.kind,
    caseNumber: opt(r.case_number),
    communityId: r.community_id,
    status: r.status,
    createdAt: iso(r.created_at),
    reviewedAt: iso(r.reviewed_at),
    reviewedBy: opt(r.reviewed_by),
    payload: r.payload,
    critique: opt(r.critique),
    failureNote: opt(r.failure_note),
  });
}

function toOutbox(r: Row): OutboxItem {
  return OutboxItemSchema.parse({
    id: String(r.id),
    caseNumber: opt(r.case_number),
    communityId: r.community_id,
    officeId: r.office_id,
    kind: r.kind,
    toLabel: r.to_label,
    toAddress: r.to_address,
    subject: r.subject,
    bodyEs: r.body_es,
    translation: opt(r.translation),
    status: r.status,
    createdAt: iso(r.created_at),
    approvedBy: r.approved_by,
  });
}

function toAudit(r: Row): AuditEntry {
  return AuditEntrySchema.parse({
    id: String(r.id),
    caseNumber: opt(r.case_number),
    communityId: r.community_id,
    occurredAt: iso(r.occurred_at),
    actorType: r.actor_type,
    actor: r.actor,
    action: r.action,
    summary: r.summary,
  });
}

export function createSqlPipelineRepository(db: SqlClient): PipelineRepository {
  const getState = async (caseNumber: string) => {
    const { rows } = await db.query<Row>("select * from public.pipeline_case_state where case_number = $1", [caseNumber]);
    return rows[0] ? toState(rows[0]) : undefined;
  };

  return {
    getState,
    async listStates() {
      const { rows } = await db.query<Row>("select * from public.pipeline_case_state order by case_number");
      return rows.map(toState);
    },
    async upsertState(caseNumber, communityId, patch) {
      return db.transaction(async (tx) => {
        const { rows } = await tx.query<Row>(
          "select * from public.pipeline_case_state where case_number = $1 for update",
          [caseNumber],
        );
        const current = rows[0] ? toState(rows[0]) : { caseNumber, communityId, emergency: false };
        const s = CasePipelineStateSchema.parse({ ...current, ...patch, caseNumber, communityId: current.communityId });
        const result = await tx.query<Row>(
          `insert into public.pipeline_case_state
             (case_number, community_id, office_id, priority, routed_at, title, emergency, referral_queued_at, last_follow_up_at, last_progress_at)
           values ($1, $2, $3, $4, $5::timestamptz, $6, $7, $8::timestamptz, $9::timestamptz, $10::timestamptz)
           on conflict (case_number) do update set
             office_id = excluded.office_id, priority = excluded.priority, routed_at = excluded.routed_at,
             title = excluded.title, emergency = excluded.emergency, referral_queued_at = excluded.referral_queued_at,
             last_follow_up_at = excluded.last_follow_up_at, last_progress_at = excluded.last_progress_at
           returning *`,
          [
            s.caseNumber,
            s.communityId,
            s.officeId ?? null,
            s.priority ?? null,
            s.routedAt ?? null,
            s.title ?? null,
            s.emergency,
            s.referralQueuedAt ?? null,
            s.lastFollowUpAt ?? null,
            s.lastProgressAt ?? null,
          ],
        );
        return toState(result.rows[0]);
      });
    },

    async addProposal(proposal, now = new Date()) {
      ProposalSchema.parse({ ...proposal, id: "check", status: "pending", createdAt: now.toISOString() });
      return db.transaction(async (tx) => {
        if (proposal.kind === "weekly_summary") {
          await tx.query(
            "delete from public.pipeline_proposals where status = 'pending' and kind = 'weekly_summary' and community_id = $1",
            [proposal.communityId],
          );
        } else {
          await tx.query(
            "delete from public.pipeline_proposals where status = 'pending' and kind = $1 and case_number = $2",
            [proposal.kind, proposal.caseNumber ?? null],
          );
        }
        const { rows } = await tx.query<Row>(
          `insert into public.pipeline_proposals (kind, case_number, community_id, status, created_at, payload, critique, failure_note)
           values ($1, $2, $3, 'pending', $4::timestamptz, $5::jsonb, $6::jsonb, $7) returning *`,
          [
            proposal.kind,
            proposal.caseNumber ?? null,
            proposal.communityId,
            now.toISOString(),
            json(proposal.payload),
            json(proposal.critique),
            proposal.failureNote ?? null,
          ],
        );
        return toProposal(rows[0]);
      });
    },
    async getProposal(id) {
      if (!UUID.test(id)) return undefined;
      const { rows } = await db.query<Row>("select * from public.pipeline_proposals where id = $1::uuid", [id]);
      return rows[0] ? toProposal(rows[0]) : undefined;
    },
    async listProposals(filter = {}) {
      const where: string[] = [];
      const params: unknown[] = [];
      const add = (column: string, value: unknown) => {
        if (value === undefined) return;
        params.push(value);
        where.push(`${column} = $${params.length}`);
      };
      add("case_number", filter.caseNumber);
      add("kind", filter.kind);
      add("status", filter.status);
      add("community_id", filter.communityId);
      const { rows } = await db.query<Row>(
        `select * from public.pipeline_proposals ${where.length ? `where ${where.join(" and ")}` : ""} order by created_at desc, seq desc`,
        params,
      );
      return rows.map(toProposal);
    },
    async reviewProposal(id, status, reviewedBy, payload, now = new Date()) {
      if (!UUID.test(id)) return null;
      return db.transaction(async (tx) => {
        const { rows } = await tx.query<Row>(
          "select * from public.pipeline_proposals where id = $1::uuid and status = 'pending' for update",
          [id],
        );
        if (!rows[0]) return null;
        const current = toProposal(rows[0]);
        const next = ProposalSchema.parse({ ...current, status, reviewedBy, reviewedAt: now.toISOString(), payload: payload ?? current.payload });
        const updated = await tx.query<Row>(
          `update public.pipeline_proposals set status = $2, reviewed_by = $3, reviewed_at = $4::timestamptz, payload = $5::jsonb
           where id = $1::uuid returning *`,
          [id, status, reviewedBy, now.toISOString(), json(next.payload)],
        );
        return toProposal(updated.rows[0]);
      });
    },

    async addOutboxItem(item, now = new Date()) {
      OutboxItemSchema.parse({ ...item, id: "check", status: "dry_run", createdAt: now.toISOString() });
      const { rows } = await db.query<Row>(
        `insert into public.pipeline_outbox
           (case_number, community_id, office_id, kind, to_label, to_address, subject, body_es, translation, created_at, approved_by)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10::timestamptz, $11) returning *`,
        [
          item.caseNumber ?? null,
          item.communityId,
          item.officeId,
          item.kind,
          item.toLabel,
          item.toAddress,
          item.subject,
          item.bodyEs,
          json(item.translation),
          now.toISOString(),
          item.approvedBy,
        ],
      );
      return toOutbox(rows[0]);
    },
    async listOutbox(filter = {}) {
      const { rows } = filter.caseNumber
        ? await db.query<Row>("select * from public.pipeline_outbox where case_number = $1 order by created_at desc, seq desc", [filter.caseNumber])
        : await db.query<Row>("select * from public.pipeline_outbox order by created_at desc, seq desc");
      return rows.map(toOutbox);
    },

    async addAudit(entry, now = new Date()) {
      AuditEntrySchema.parse({ ...entry, id: "check", occurredAt: now.toISOString() });
      const { rows } = await db.query<Row>(
        `insert into public.agent_audit (case_number, community_id, occurred_at, actor_type, actor, action, summary)
         values ($1, $2, $3::timestamptz, $4, $5, $6, $7) returning *`,
        [entry.caseNumber ?? null, entry.communityId, now.toISOString(), entry.actorType, entry.actor, entry.action, entry.summary],
      );
      return toAudit(rows[0]);
    },
    async listAudit(filter = {}) {
      const params: unknown[] = [];
      let where = "";
      if (filter.caseNumber) {
        params.push(filter.caseNumber);
        where = "where case_number = $1";
      }
      const limit = filter.limit ? ` limit ${Math.max(1, Math.floor(filter.limit))}` : "";
      const { rows } = await db.query<Row>(`select * from public.agent_audit ${where} order by occurred_at desc, seq desc${limit}`, params);
      return rows.map(toAudit);
    },
  };
}
