import type { SqlClient } from "@/lib/db/sql-client";
import { DEMO_CASE_SEEDS, DEMO_COMMUNITY_ID } from "@/lib/store/demo-seed";
import { buildDemoCase } from "@/lib/store/demo-history";
import { publicCaseUrl } from "@/lib/site-url";
import { DEMO_PIPELINE_RECORDS, materializeDemoPipeline } from "./demo-pipeline-records";
import { BACKFILL_OFFICE_REFERRALS_SQL } from "@/lib/office/store/sql-office-store";

/**
 * "Reset demo" on Postgres, in ONE transaction (all or nothing). Selects only cases that are
 * demonstration data in the demo community AND carry one of the eight fixed demo descriptions
 * (first one per description), locks them, and rebuilds exactly those rows: the case itself
 * (status, duplicate mark, removal, verification, dates), its timeline, moderation history,
 * notes, flags, old-style suggestions, and its pipeline state, proposals, outbox and audit log.
 * Every DELETE is limited to those case ids/numbers, so no other case can be touched.
 */
export async function resetDemoCasesSql(db: SqlClient, now: Date = new Date()): Promise<string[]> {
  return db.transaction(async (tx) => {
    const { rows } = await tx.query<{ id: string; case_number: string; description: string; management_token: string }>(
      `select id, case_number, description, management_token from public.cases
       where source_type = 'demonstration' and community_id = $1 and deleted_at is null and description = any($2::text[])
       order by created_at, case_number
       for update`,
      [DEMO_COMMUNITY_ID, DEMO_CASE_SEEDS.map((s) => s.description)],
    );
    const byDescription = new Map<string, (typeof rows)[number]>();
    for (const r of rows) if (!byDescription.has(r.description)) byDescription.set(r.description, r);
    const targets = [...byDescription.values()];
    if (targets.length === 0) return [];
    const ids = targets.map((t) => t.id);
    const numbers = targets.map((t) => t.case_number);

    // Office side first (its notes go with it): it points at outbox rows deleted below.
    await tx.query("delete from public.office_referrals where case_number = any($1::text[])", [numbers]);
    for (const table of ["pipeline_proposals", "pipeline_outbox", "agent_audit", "pipeline_case_state"]) {
      await tx.query(`delete from public.${table} where case_number = any($1::text[])`, [numbers]);
    }
    for (const table of ["case_events", "moderation_actions", "admin_notes", "inaccuracy_flags", "agent_suggestions"]) {
      await tx.query(`delete from public.${table} where case_id = any($1::uuid[])`, [ids]);
    }

    const rebuilt = targets.map((t) => {
      const seed = DEMO_CASE_SEEDS.find((s) => s.description === t.description)!;
      return buildDemoCase(seed, { id: t.id, publicCaseNumber: t.case_number, managementToken: t.management_token }, now);
    });

    for (const c of rebuilt) {
      await tx.query(
        `update public.cases set created_at = $2::timestamptz, status = $3, verification_state = 'demonstration_data',
           verified_source = null, is_duplicate_of = null, removal = null, image = null, consent = $4::jsonb
         where id = $1`,
        [c.id, c.createdAt, c.status, JSON.stringify(c.consent)],
      );
      // Inserted in time order, so the timeline's insertion order (seq) is its time order.
      for (const e of c.statusHistory) {
        await tx.query(
          `insert into public.case_events (case_id, occurred_at, status, actor_type, kind, contact_id, note, note_es, notes)
           values ($1, $2::timestamptz, $3, $4, $5, $6, $7, $8, $9::jsonb)`,
          [c.id, e.occurredAt, e.status, e.actorType, e.kind ?? null, e.contactId ?? null, e.note ?? null, e.noteEs ?? null, e.notes ? JSON.stringify(e.notes) : null],
        );
      }
      for (const a of c.moderationActions) {
        await tx.query(
          `insert into public.moderation_actions (case_id, actor_id, action, occurred_at, detail) values ($1, $2, $3, $4::timestamptz, $5)`,
          [c.id, a.actorId, a.action, a.occurredAt, a.detail ?? null],
        );
      }
      for (const s of c.agentSuggestions) {
        await tx.query(
          `insert into public.agent_suggestions (case_id, kind, suggested_value, reasoning, status, created_at, reviewed_at, referral)
           values ($1, $2, $3, $4, $5, $6::timestamptz, $7::timestamptz, $8::jsonb)`,
          [c.id, s.kind, s.suggestedValue, s.reasoning, s.status, s.createdAt, s.reviewedAt ?? null, s.referral ? JSON.stringify(s.referral) : null],
        );
      }
    }

    const numberOf = (description: string) => rebuilt.find((c) => c.description === description)?.publicCaseNumber ?? "";
    for (const record of DEMO_PIPELINE_RECORDS) {
      const c = rebuilt.find((x) => x.description === record.description);
      if (!c) continue;
      const p = materializeDemoPipeline(record, {
        caseNumber: c.publicCaseNumber,
        communityId: c.communityId,
        createdAt: c.createdAt,
        caseUrl: publicCaseUrl(c.publicCaseNumber),
        duplicateNumbers: record.duplicateDescriptions.map(numberOf),
      });
      const s = p.state;
      await tx.query(
        `insert into public.pipeline_case_state
           (case_number, community_id, office_id, priority, routed_at, title, emergency, referral_queued_at, last_follow_up_at, last_progress_at)
         values ($1, $2, $3, $4, $5::timestamptz, $6, $7, $8::timestamptz, $9::timestamptz, $10::timestamptz)`,
        [s.caseNumber, s.communityId, s.officeId ?? null, s.priority ?? null, s.routedAt ?? null, s.title ?? null, s.emergency, s.referralQueuedAt ?? null, s.lastFollowUpAt ?? null, s.lastProgressAt ?? null],
      );
      for (const pr of p.proposals) {
        await tx.query(
          `insert into public.pipeline_proposals (kind, case_number, community_id, status, created_at, reviewed_at, reviewed_by, payload, critique)
           values ($1, $2, $3, $4, $5::timestamptz, $6::timestamptz, $7, $8::jsonb, $9::jsonb)`,
          [pr.kind, pr.caseNumber, pr.communityId, pr.status, pr.createdAt, pr.reviewedAt ?? null, pr.reviewedBy ?? null, JSON.stringify(pr.payload), pr.critique ? JSON.stringify(pr.critique) : null],
        );
      }
      for (const o of p.outbox) {
        await tx.query(
          `insert into public.pipeline_outbox (case_number, community_id, office_id, kind, to_label, to_address, subject, body_es, created_at, approved_by)
           values ($1, $2, $3, $4, $5, $6, $7, $8, $9::timestamptz, $10)`,
          [o.caseNumber, o.communityId, o.officeId, o.kind, o.toLabel, o.toAddress, o.subject, o.bodyEs, o.createdAt, o.approvedBy],
        );
      }
      for (const a of [...p.audit].sort((x, y) => x.occurredAt.localeCompare(y.occurredAt))) {
        await tx.query(
          `insert into public.agent_audit (case_number, community_id, occurred_at, actor_type, actor, action, summary)
           values ($1, $2, $3::timestamptz, $4, $5, $6, $7)`,
          [a.caseNumber, a.communityId, a.occurredAt, a.actorType, a.actor, a.action, a.summary],
        );
      }
    }
    // The example referrals arrive in their simulated offices' inboxes again — only these cases.
    await tx.query(`${BACKFILL_OFFICE_REFERRALS_SQL} and o.case_number = any($1::text[])`, [numbers]);
    return numbers;
  });
}
