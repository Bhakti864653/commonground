-- CommonGround: undo migration 0007 (the agentic pipeline).
--
-- Run only if 0007 must be taken back out, e.g.:
--   node --env-file=.env.local scripts/db-backup.mjs rollback-0007
-- It removes the four pipeline tables (and everything in them), the two public timeline kinds
-- 0007 added, and 0007's entry in schema_migrations — leaving the database as it was before.
-- Deploy a version of the app from before the pipeline first, or the app will look for these
-- tables. One transaction: all of it happens, or none of it.

begin;

drop table if exists public.pipeline_case_state;
drop table if exists public.pipeline_proposals;
drop table if exists public.pipeline_outbox;
drop table if exists public.agent_audit;

delete from public.case_events where kind in ('referral_queued', 'follow_up_update');

alter table public.case_events drop constraint case_events_kind_check;
alter table public.case_events add constraint case_events_kind_check check (kind is null or kind in (
  'status', 'ai_reviewed', 'referral_prepared', 'awaiting_approval', 'referral_approved', 'referral_declined'
));

delete from public.schema_migrations where name = '0007_agentic_pipeline.sql';

commit;
