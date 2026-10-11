-- CommonGround: remove the hand-written referrals to the Alcaldía from the demonstration cases.
--
-- CommonGround now runs as an independent student demo, not affiliated with the Alcaldía, and
-- AI-prepared referrals are paused (src/data/communities/santiago-veraguas.ts). The demonstration
-- cases no longer show a referral (src/lib/store/demo-seed.ts), so this removes the ones migration
-- 0004 added to databases seeded before that change.
--
-- Data only, no schema change. Touches only demonstration cases (source_type = 'demonstration')
-- in Santiago de Veraguas — never a resident's case. Safe on a fresh database and when run twice.

delete from public.case_events
where kind in ('referral_prepared', 'awaiting_approval', 'referral_approved', 'referral_declined')
  and case_id in (
    select id from public.cases where source_type = 'demonstration' and community_id = 'santiago-veraguas'
  );

delete from public.moderation_actions
where action in ('approve_referral', 'reject_referral')
  and actor_id = 'demo-seed'
  and case_id in (
    select id from public.cases where source_type = 'demonstration' and community_id = 'santiago-veraguas'
  );

delete from public.agent_suggestions
where kind = 'referral'
  and case_id in (
    select id from public.cases where source_type = 'demonstration' and community_id = 'santiago-veraguas'
  );

-- A demonstration case marked "referred" by its referral goes back to its last remaining status.
update public.cases c
set status = (
  select e.status from public.case_events e
  where e.case_id = c.id
  order by e.occurred_at desc, e.seq desc
  limit 1
)
where c.source_type = 'demonstration'
  and c.community_id = 'santiago-veraguas'
  and c.status = 'referred';
