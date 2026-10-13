-- CommonGround: undo migration 0008 (the office side).
--   node --env-file=.env.local scripts/db-backup.mjs rollback-0008
-- Deploy a version of the app from before the office side first. One transaction.

begin;

drop table if exists public.office_sessions;
drop table if exists public.office_accounts;
drop table if exists public.office_notes;
drop table if exists public.office_referrals;

delete from public.case_events
where kind in ('office_received', 'office_in_progress', 'office_resolved', 'office_declined', 'office_note') or actor_type = 'office';
delete from public.pipeline_proposals where kind in ('office_note', 'office_resolution');
delete from public.agent_audit where actor_type = 'office';

alter table public.case_events drop constraint case_events_kind_check;
alter table public.case_events add constraint case_events_kind_check check (kind is null or kind in (
  'status', 'ai_reviewed', 'referral_prepared', 'awaiting_approval', 'referral_approved', 'referral_declined',
  'referral_queued', 'follow_up_update'
));
alter table public.case_events drop constraint case_events_actor_type_check;
alter table public.case_events add constraint case_events_actor_type_check check (actor_type in ('system', 'moderator', 'verified_source', 'agent'));
alter table public.pipeline_proposals drop constraint pipeline_proposals_kind_check;
alter table public.pipeline_proposals add constraint pipeline_proposals_kind_check check (kind in ('routing', 'referral', 'follow_up', 'weekly_summary'));
alter table public.agent_audit drop constraint agent_audit_actor_type_check;
alter table public.agent_audit add constraint agent_audit_actor_type_check check (actor_type in ('agent', 'moderator', 'system'));

delete from public.schema_migrations where name = '0008_office_portal.sql';

commit;
