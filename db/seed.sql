-- CommonGround: demonstration cases for the Santiago de Veraguas pilot.
--
-- GENERATED from src/lib/store/demo-seed.ts by src/lib/store/demo-seed-sql.ts — don't edit by
-- hand. Regenerate with: npx vitest run src/lib/store/__tests__/db-sql.test.ts -u
--
-- Applied by "npm run db:seed", after "npm run db:migrate".
-- Safe to run again: if demonstration cases already exist, it does nothing. Dates are relative
-- to when it runs ("9 days ago"), and from then on they age like any real case.
-- Cases are numbered by create_case, the same function real submissions use, so the counter
-- continues correctly after them.

do $$
declare
  v_id uuid;
  v_created timestamptz;
  v_event uuid;
begin
  if exists (select 1 from public.cases where source_type = 'demonstration') then
    raise notice 'Demonstration cases already exist - nothing to do.';
    return;
  end if;

  -- 1. report · road-infrastructure · centro
  select c.id into v_id from public.create_case(
    'santiago-veraguas', 'SV', 'report', 'road-infrastructure',
    'Hay un poste de luz dañado frente a la escuela primaria del centro, no enciende desde hace una semana.',
    '{"kind":"neighborhood","areaId":"centro","label":"Central area","labels":{"pt":"Área central","fr":"Zone centrale","zh":"中心区","hi":"केंद्रीय इलाका","it":"Zona centrale"},"labelEs":"Área central"}'::jsonb,
    now() - interval '9 days', 'demonstration_data', 'demonstration', null,
    jsonb_build_object('consentVersion', '2026-09-19.v1', 'consentedAt', now() - interval '9 days', 'language', 'es'),
    gen_random_uuid()::text
  ) c;
  select created_at into v_created from public.cases where id = v_id;
  insert into public.case_events (case_id, occurred_at, status, actor_type, kind, contact_id)
  values (v_id, v_created + interval '3 minutes', 'received', 'agent', 'ai_reviewed', null);
  for v_event in select id from public.case_events where case_id = v_id order by occurred_at, seq loop
    update public.case_events set seq = default where id = v_event;
  end loop;

  -- 2. report · road-infrastructure · centro
  select c.id into v_id from public.create_case(
    'santiago-veraguas', 'SV', 'report', 'road-infrastructure',
    'Hay un poste de luz dañado cerca de la escuela primaria del centro, no enciende desde hace varios días.',
    '{"kind":"neighborhood","areaId":"centro","label":"Central area","labels":{"pt":"Área central","fr":"Zone centrale","zh":"中心区","hi":"केंद्रीय इलाका","it":"Zona centrale"},"labelEs":"Área central"}'::jsonb,
    now() - interval '6 days', 'demonstration_data', 'demonstration', null,
    jsonb_build_object('consentVersion', '2026-09-19.v1', 'consentedAt', now() - interval '6 days', 'language', 'es'),
    gen_random_uuid()::text
  ) c;
  select created_at into v_created from public.cases where id = v_id;
  insert into public.case_events (case_id, occurred_at, status, actor_type, kind, contact_id)
  values (v_id, v_created + interval '3 minutes', 'received', 'agent', 'ai_reviewed', null);
  for v_event in select id from public.case_events where case_id = v_id order by occurred_at, seq loop
    update public.case_events set seq = default where id = v_event;
  end loop;

  -- 3. report · flooding-drainage · norte
  select c.id into v_id from public.create_case(
    'santiago-veraguas', 'SV', 'report', 'flooding-drainage',
    'La alcantarilla en la calle principal del área norte está bloqueada y el agua se acumula cada vez que llueve.',
    '{"kind":"neighborhood","areaId":"norte","label":"Northern area","labels":{"pt":"Área norte","fr":"Zone nord","zh":"北区","hi":"उत्तरी इलाका","it":"Zona nord"},"labelEs":"Área norte"}'::jsonb,
    now() - interval '14 days', 'demonstration_data', 'demonstration', null,
    jsonb_build_object('consentVersion', '2026-09-19.v1', 'consentedAt', now() - interval '14 days', 'language', 'es'),
    gen_random_uuid()::text
  ) c;
  insert into public.case_events (case_id, occurred_at, status, actor_type, note, note_es, notes)
  values (v_id, now() - interval '12 days', 'under_review', 'moderator', null, null, null);
  insert into public.moderation_actions (case_id, actor_id, action, occurred_at, detail)
  values (v_id, 'demo-seed', 'status_change', now() - interval '12 days', 'under_review');
  update public.cases set status = 'under_review' where id = v_id;
  select created_at into v_created from public.cases where id = v_id;
  insert into public.case_events (case_id, occurred_at, status, actor_type, kind, contact_id)
  values (v_id, v_created + interval '3 minutes', 'received', 'agent', 'ai_reviewed', null);
  for v_event in select id from public.case_events where case_id = v_id order by occurred_at, seq loop
    update public.case_events set seq = default where id = v_event;
  end loop;

  -- 4. report · flooding-drainage · norte
  select c.id into v_id from public.create_case(
    'santiago-veraguas', 'SV', 'report', 'flooding-drainage',
    'El drenaje de la avenida norte sigue tapado, se forma un charco grande después de cada lluvia.',
    '{"kind":"neighborhood","areaId":"norte","label":"Northern area","labels":{"pt":"Área norte","fr":"Zone nord","zh":"北区","hi":"उत्तरी इलाका","it":"Zona nord"},"labelEs":"Área norte"}'::jsonb,
    now() - interval '8 days', 'demonstration_data', 'demonstration', null,
    jsonb_build_object('consentVersion', '2026-09-19.v1', 'consentedAt', now() - interval '8 days', 'language', 'es'),
    gen_random_uuid()::text
  ) c;
  select created_at into v_created from public.cases where id = v_id;
  insert into public.case_events (case_id, occurred_at, status, actor_type, kind, contact_id)
  values (v_id, v_created + interval '3 minutes', 'received', 'agent', 'ai_reviewed', null);
  for v_event in select id from public.case_events where case_id = v_id order by occurred_at, seq loop
    update public.case_events set seq = default where id = v_event;
  end loop;

  -- 5. report · flooding-drainage · norte
  select c.id into v_id from public.create_case(
    'santiago-veraguas', 'SV', 'report', 'flooding-drainage',
    'Inundación recurrente en el área norte por el mismo drenaje bloqueado, ya pasó tres veces este mes.',
    '{"kind":"neighborhood","areaId":"norte","label":"Northern area","labels":{"pt":"Área norte","fr":"Zone nord","zh":"北区","hi":"उत्तरी इलाका","it":"Zona nord"},"labelEs":"Área norte"}'::jsonb,
    now() - interval '2 days', 'demonstration_data', 'demonstration', null,
    jsonb_build_object('consentVersion', '2026-09-19.v1', 'consentedAt', now() - interval '2 days', 'language', 'es'),
    gen_random_uuid()::text
  ) c;
  select created_at into v_created from public.cases where id = v_id;
  insert into public.case_events (case_id, occurred_at, status, actor_type, kind, contact_id)
  values (v_id, v_created + interval '3 minutes', 'received', 'agent', 'ai_reviewed', null);
  for v_event in select id from public.case_events where case_id = v_id order by occurred_at, seq loop
    update public.case_events set seq = default where id = v_event;
  end loop;

  -- 6. report · garbage-sanitation · sur
  select c.id into v_id from public.create_case(
    'santiago-veraguas', 'SV', 'report', 'garbage-sanitation',
    'Acumulación de basura sin recoger en el área sur desde hace dos semanas.',
    '{"kind":"neighborhood","areaId":"sur","label":"Southern area","labels":{"pt":"Área sul","fr":"Zone sud","zh":"南区","hi":"दक्षिणी इलाका","it":"Zona sud"},"labelEs":"Área sur"}'::jsonb,
    now() - interval '11 days', 'demonstration_data', 'demonstration', null,
    jsonb_build_object('consentVersion', '2026-09-19.v1', 'consentedAt', now() - interval '11 days', 'language', 'es'),
    gen_random_uuid()::text
  ) c;
  insert into public.case_events (case_id, occurred_at, status, actor_type, note, note_es, notes)
  values (v_id, now() - interval '7 days', 'in_progress', 'moderator', 'A community moderator updated this case''s status.', 'Un moderador de la comunidad actualizó el estado de este caso.', '{"pt":"Um moderador da comunidade atualizou o status deste caso.","fr":"Un modérateur de la communauté a mis à jour l’état de ce dossier.","zh":"一位社区版主更新了此案件的状态。","hi":"एक सामुदायिक मॉडरेटर ने इस मामले की स्थिति अपडेट की।","it":"Un moderatore della comunità ha aggiornato lo stato di questo caso."}'::jsonb);
  insert into public.moderation_actions (case_id, actor_id, action, occurred_at, detail)
  values (v_id, 'demo-seed', 'status_change', now() - interval '7 days', 'in_progress');
  update public.cases set status = 'in_progress' where id = v_id;
  select created_at into v_created from public.cases where id = v_id;
  insert into public.case_events (case_id, occurred_at, status, actor_type, kind, contact_id)
  values (v_id, v_created + interval '3 minutes', 'received', 'agent', 'ai_reviewed', null);
  for v_event in select id from public.case_events where case_id = v_id order by occurred_at, seq loop
    update public.case_events set seq = default where id = v_event;
  end loop;

  -- 7. proposal · other · este
  select c.id into v_id from public.create_case(
    'santiago-veraguas', 'SV', 'proposal', 'other',
    'Propongo instalar más luminarias solares en el parque del área este.',
    '{"kind":"neighborhood","areaId":"este","label":"Eastern area","labels":{"pt":"Área leste","fr":"Zone est","zh":"东区","hi":"पूर्वी इलाका","it":"Zona est"},"labelEs":"Área este"}'::jsonb,
    now() - interval '4 days', 'demonstration_data', 'demonstration', null,
    jsonb_build_object('consentVersion', '2026-09-19.v1', 'consentedAt', now() - interval '4 days', 'language', 'es'),
    gen_random_uuid()::text
  ) c;
  insert into public.case_events (case_id, occurred_at, status, actor_type, note, note_es, notes)
  values (v_id, now() - interval '2 days', 'under_review', 'moderator', null, null, null);
  insert into public.moderation_actions (case_id, actor_id, action, occurred_at, detail)
  values (v_id, 'demo-seed', 'status_change', now() - interval '2 days', 'under_review');
  update public.cases set status = 'under_review' where id = v_id;
  select created_at into v_created from public.cases where id = v_id;
  insert into public.case_events (case_id, occurred_at, status, actor_type, kind, contact_id)
  values (v_id, v_created + interval '3 minutes', 'received', 'agent', 'ai_reviewed', null);
  for v_event in select id from public.case_events where case_id = v_id order by occurred_at, seq loop
    update public.case_events set seq = default where id = v_event;
  end loop;

  -- 8. report · road-infrastructure · oeste
  select c.id into v_id from public.create_case(
    'santiago-veraguas', 'SV', 'report', 'road-infrastructure',
    'Bache grande en la vía principal del área oeste, ya provocó un accidente menor.',
    '{"kind":"neighborhood","areaId":"oeste","label":"Western area","labels":{"pt":"Área oeste","fr":"Zone ouest","zh":"西区","hi":"पश्चिमी इलाका","it":"Zona ovest"},"labelEs":"Área oeste"}'::jsonb,
    now() - interval '25 days', 'demonstration_data', 'demonstration', null,
    jsonb_build_object('consentVersion', '2026-09-19.v1', 'consentedAt', now() - interval '25 days', 'language', 'es'),
    gen_random_uuid()::text
  ) c;
  insert into public.case_events (case_id, occurred_at, status, actor_type, note, note_es, notes)
  values (v_id, now() - interval '23 days', 'closed', 'moderator', null, null, null);
  insert into public.moderation_actions (case_id, actor_id, action, occurred_at, detail)
  values (v_id, 'demo-seed', 'status_change', now() - interval '23 days', 'closed');
  update public.cases set status = 'closed' where id = v_id;

  raise notice 'Added 8 demonstration cases.';
end
$$;

-- The demonstration cases' example history in the agentic pipeline (routing, referrals in the
-- dry-run outbox, follow-ups). Also safe to run again: it skips cases that already have it.
do $$
declare
  v_case text;
  v_case_id uuid;
  v_created timestamptz;
  v_url text;
  v_dups text[];
  v_event uuid;
  v_added int := 0;
begin
  -- report · road-infrastructure · centro
  v_case := null;
  select case_number, id, created_at into v_case, v_case_id, v_created from public.cases
  where source_type = 'demonstration' and community_id = 'santiago-veraguas'
    and description = 'Hay un poste de luz dañado frente a la escuela primaria del centro, no enciende desde hace una semana.' and deleted_at is null
  order by created_at limit 1;
  if v_case is not null and not exists (select 1 from public.pipeline_case_state where case_number = v_case) then
    v_url := 'https://commonground-psi.vercel.app/cases/' || v_case;
    v_dups := array[]::text[];
    insert into public.pipeline_case_state (case_number, community_id, office_id, priority, routed_at, emergency, referral_queued_at, last_follow_up_at, last_progress_at)
    values (v_case, 'santiago-veraguas', 'lighting', 'high', v_created + interval '86400 seconds', false, v_created + interval '172800 seconds', null, v_created + interval '172800 seconds');
    insert into public.pipeline_proposals (kind, case_number, community_id, status, created_at, reviewed_at, reviewed_by, payload, critique)
    values ('routing', v_case, 'santiago-veraguas', 'approved', v_created + interval '120 seconds', v_created + interval '86400 seconds', 'demo-seed',
      (replace(replace('{"officeId":"lighting","reason":"A broken streetlight belongs to street lighting, even though it was filed under roads.","priority":"high","priorityReason":"A dark streetlight in front of a school is a safety risk for children at night.","confidence":0.88,"alternativeOfficeIds":[],"needsModeratorDecision":false,"possibleDuplicates":[],"injectionSuspected":false,"source":"example"}', '{CASE}', v_case), '{URL}', v_url))::jsonb,
      '{"verdict":"ok","issues":[],"source":"example"}'::jsonb);
    insert into public.pipeline_proposals (kind, case_number, community_id, status, created_at, reviewed_at, reviewed_by, payload, critique)
    values ('referral', v_case, 'santiago-veraguas', 'approved', v_created + interval '86460 seconds', v_created + interval '172800 seconds', 'demo-seed',
      (replace(replace('{"officeId":"lighting","messageEs":"Estimado equipo de Alumbrado público y electricidad (oficina de ejemplo):\n\nLes escribimos desde CommonGround, un proyecto comunitario independiente (demo estudiantil). Un residente reportó el caso {CASE} (Vía o infraestructura pública dañada, Área central): Hay un poste de luz dañado frente a la escuela primaria del centro, no enciende desde hace una semana.\n\nEl caso lleva 1 días abierto. ¿Podrían indicarnos si su oficina puede revisarlo o quién lo atiende?\n\nCaso público: {URL}\n\nMuchas gracias.\nEquipo de moderación de CommonGround","facts":{"daysOpen":1,"residentCount":1,"caseUrl":"{URL}"},"source":"example"}', '{CASE}', v_case), '{URL}', v_url))::jsonb,
      '{"verdict":"ok","issues":[],"source":"example"}'::jsonb);
    insert into public.pipeline_outbox (case_number, community_id, office_id, kind, to_label, to_address, subject, body_es, created_at, approved_by)
    values (v_case, 'santiago-veraguas', 'lighting', 'referral', 'Alumbrado público y electricidad (oficina de ejemplo)', 'alumbrado@example.invalid', ((replace(replace('"Caso {CASE} – CommonGround"', '{CASE}', v_case), '{URL}', v_url))::jsonb #>> '{}'),
      ((replace(replace('"Estimado equipo de Alumbrado público y electricidad (oficina de ejemplo):\n\nLes escribimos desde CommonGround, un proyecto comunitario independiente (demo estudiantil). Un residente reportó el caso {CASE} (Vía o infraestructura pública dañada, Área central): Hay un poste de luz dañado frente a la escuela primaria del centro, no enciende desde hace una semana.\n\nEl caso lleva 1 días abierto. ¿Podrían indicarnos si su oficina puede revisarlo o quién lo atiende?\n\nCaso público: {URL}\n\nMuchas gracias.\nEquipo de moderación de CommonGround"', '{CASE}', v_case), '{URL}', v_url))::jsonb #>> '{}'), v_created + interval '172800 seconds', 'demo-seed');
    insert into public.agent_audit (case_number, community_id, occurred_at, actor_type, actor, action, summary)
    values (v_case, 'santiago-veraguas', v_created + interval '120 seconds', 'agent', 'Routing Agent (example data, written by hand for the demo)', 'routing_proposed', 'Suggested Street lighting and electricity (example office), priority high (confidence 88%). A broken streetlight belongs to street lighting, even though it was filed under roads.');
    insert into public.agent_audit (case_number, community_id, occurred_at, actor_type, actor, action, summary)
    values (v_case, 'santiago-veraguas', v_created + interval '180 seconds', 'agent', 'Critic Agent (example data, written by hand for the demo)', 'critique', 'Checked the routing suggestion: no problems found.');
    insert into public.agent_audit (case_number, community_id, occurred_at, actor_type, actor, action, summary)
    values (v_case, 'santiago-veraguas', v_created + interval '86400 seconds', 'moderator', 'demo-seed', 'routing_approved', 'Approved routing to Street lighting and electricity (example office), priority high.');
    insert into public.agent_audit (case_number, community_id, occurred_at, actor_type, actor, action, summary)
    values (v_case, 'santiago-veraguas', v_created + interval '86460 seconds', 'agent', 'Referral Agent (example data, written by hand for the demo)', 'referral_drafted', 'Drafted a referral in Spanish to Street lighting and electricity (example office).');
    insert into public.agent_audit (case_number, community_id, occurred_at, actor_type, actor, action, summary)
    values (v_case, 'santiago-veraguas', v_created + interval '86520 seconds', 'agent', 'Critic Agent (example data, written by hand for the demo)', 'critique', 'Checked the referral: case number, link and facts present; no personal data.');
    insert into public.agent_audit (case_number, community_id, occurred_at, actor_type, actor, action, summary)
    values (v_case, 'santiago-veraguas', v_created + interval '172800 seconds', 'moderator', 'demo-seed', 'referral_approved', 'Approved the referral. Added to the outbox as "Ready to send – demo mode (not sent)".');
    insert into public.case_events (case_id, occurred_at, status, actor_type, kind, note, note_es, notes)
    values (v_case_id, v_created + interval '172800 seconds',
      coalesce((select status from public.case_events where case_id = v_case_id and coalesce(kind, 'status') = 'status' and occurred_at <= v_created + interval '172800 seconds' order by occurred_at desc, seq desc limit 1), 'received'),
      'moderator', 'referral_queued', null, null, null);
    for v_event in select id from public.case_events where case_id = v_case_id order by occurred_at, seq loop
      update public.case_events set seq = default where id = v_event;
    end loop;
    v_added := v_added + 1;
  end if;

  -- report · road-infrastructure · centro
  v_case := null;
  select case_number, id, created_at into v_case, v_case_id, v_created from public.cases
  where source_type = 'demonstration' and community_id = 'santiago-veraguas'
    and description = 'Hay un poste de luz dañado cerca de la escuela primaria del centro, no enciende desde hace varios días.' and deleted_at is null
  order by created_at limit 1;
  if v_case is not null and not exists (select 1 from public.pipeline_case_state where case_number = v_case) then
    v_url := 'https://commonground-psi.vercel.app/cases/' || v_case;
    v_dups := array[(select case_number from public.cases where source_type = 'demonstration' and description = 'Hay un poste de luz dañado frente a la escuela primaria del centro, no enciende desde hace una semana.' and deleted_at is null order by created_at limit 1)]::text[];
    insert into public.pipeline_case_state (case_number, community_id, office_id, priority, routed_at, emergency, referral_queued_at, last_follow_up_at, last_progress_at)
    values (v_case, 'santiago-veraguas', null, null, null, false, null, null, v_created + interval '0 seconds');
    insert into public.pipeline_proposals (kind, case_number, community_id, status, created_at, reviewed_at, reviewed_by, payload, critique)
    values ('routing', v_case, 'santiago-veraguas', 'pending', v_created + interval '120 seconds', null, null,
      (replace(replace(replace('{"officeId":"lighting","reason":"A streetlight that doesn''t turn on is a street-lighting problem.","priority":"high","priorityReason":"Same dark streetlight near the school as an earlier report.","confidence":0.84,"alternativeOfficeIds":[],"needsModeratorDecision":false,"possibleDuplicates":[{"caseNumber":"{DUP0}","score":0.67}],"injectionSuspected":false,"source":"example"}', '{CASE}', v_case), '{URL}', v_url), '{DUP0}', coalesce(v_dups[1], '')))::jsonb,
      '{"verdict":"concerns","issues":[{"type":"missing_info","note":"This looks like the same streetlight as an earlier case — consider merging instead of routing it twice."}],"source":"example"}'::jsonb);
    insert into public.agent_audit (case_number, community_id, occurred_at, actor_type, actor, action, summary)
    values (v_case, 'santiago-veraguas', v_created + interval '120 seconds', 'agent', 'Routing Agent (example data, written by hand for the demo)', 'routing_proposed', 'Suggested Street lighting and electricity (example office), priority high (confidence 84%). A streetlight that doesn''t turn on is a street-lighting problem.');
    insert into public.agent_audit (case_number, community_id, occurred_at, actor_type, actor, action, summary)
    values (v_case, 'santiago-veraguas', v_created + interval '180 seconds', 'agent', 'Critic Agent (example data, written by hand for the demo)', 'critique', 'Concern: This looks like the same streetlight as an earlier case — consider merging instead of routing it twice.');
    v_added := v_added + 1;
  end if;

  -- report · flooding-drainage · norte
  v_case := null;
  select case_number, id, created_at into v_case, v_case_id, v_created from public.cases
  where source_type = 'demonstration' and community_id = 'santiago-veraguas'
    and description = 'La alcantarilla en la calle principal del área norte está bloqueada y el agua se acumula cada vez que llueve.' and deleted_at is null
  order by created_at limit 1;
  if v_case is not null and not exists (select 1 from public.pipeline_case_state where case_number = v_case) then
    v_url := 'https://commonground-psi.vercel.app/cases/' || v_case;
    v_dups := array[]::text[];
    insert into public.pipeline_case_state (case_number, community_id, office_id, priority, routed_at, emergency, referral_queued_at, last_follow_up_at, last_progress_at)
    values (v_case, 'santiago-veraguas', 'drainage', 'high', v_created + interval '86400 seconds', false, v_created + interval '172800 seconds', v_created + interval '1123200 seconds', v_created + interval '172800 seconds');
    insert into public.pipeline_proposals (kind, case_number, community_id, status, created_at, reviewed_at, reviewed_by, payload, critique)
    values ('routing', v_case, 'santiago-veraguas', 'approved', v_created + interval '120 seconds', v_created + interval '86400 seconds', 'demo-seed',
      (replace(replace('{"officeId":"drainage","reason":"A blocked storm drain is a drainage problem.","priority":"high","priorityReason":"Water collects every time it rains on a main street — recurring and affecting many people.","confidence":0.92,"alternativeOfficeIds":[],"needsModeratorDecision":false,"possibleDuplicates":[],"injectionSuspected":false,"source":"example"}', '{CASE}', v_case), '{URL}', v_url))::jsonb,
      '{"verdict":"ok","issues":[],"source":"example"}'::jsonb);
    insert into public.pipeline_proposals (kind, case_number, community_id, status, created_at, reviewed_at, reviewed_by, payload, critique)
    values ('referral', v_case, 'santiago-veraguas', 'approved', v_created + interval '86460 seconds', v_created + interval '172800 seconds', 'demo-seed',
      (replace(replace('{"officeId":"drainage","messageEs":"Estimado equipo de Drenaje e inundaciones (oficina de ejemplo):\n\nLes escribimos desde CommonGround, un proyecto comunitario independiente (demo estudiantil). Un residente reportó el caso {CASE} (Inundación o drenaje bloqueado, Área norte): La alcantarilla en la calle principal del área norte está bloqueada y el agua se acumula cada vez que llueve.\n\nEl caso lleva 1 días abierto. ¿Podrían indicarnos si su oficina puede revisarlo o quién lo atiende?\n\nCaso público: {URL}\n\nMuchas gracias.\nEquipo de moderación de CommonGround","facts":{"daysOpen":1,"residentCount":1,"caseUrl":"{URL}"},"source":"example"}', '{CASE}', v_case), '{URL}', v_url))::jsonb,
      '{"verdict":"ok","issues":[],"source":"example"}'::jsonb);
    insert into public.pipeline_proposals (kind, case_number, community_id, status, created_at, reviewed_at, reviewed_by, payload, critique)
    values ('follow_up', v_case, 'santiago-veraguas', 'pending', v_created + interval '1123200 seconds', null, null,
      (replace(replace('{"daysWithoutProgress":11,"thresholdDays":4,"priority":"high","reminderEs":"Estimado equipo de Drenaje e inundaciones (oficina de ejemplo):\n\nLes escribimos de nuevo sobre el caso {CASE}, que sigue abierto y sin novedades desde hace 11 días. ¿Podrían indicarnos si ya fue revisado o quién lo atiende?\n\nCaso público: {URL}\n\nMuchas gracias.\nEquipo de moderación de CommonGround","publicUpdate":{"es":"Moderación de CommonGround revisó este caso: sigue abierto y se preparó un recordatorio para la oficina responsable. El envío está en pausa en esta demo.","en":"CommonGround''s moderators checked on this case: it is still open, and a reminder for the responsible office was prepared. Sending is paused in this demo.","pt":"A moderação do CommonGround verificou este caso: ele continua aberto e foi preparado um lembrete para o órgão responsável. O envio está pausado nesta demo.","fr":"Les modérateurs de CommonGround ont vérifié ce dossier : il est toujours ouvert et un rappel a été préparé pour le service responsable. L’envoi est en pause dans cette démo.","zh":"CommonGround 版主检查了此案件：案件仍未解决，已为负责部门准备了提醒。本演示中发送功能已暂停。","hi":"CommonGround के मॉडरेटरों ने इस मामले की जाँच की: यह अभी भी खुला है, और ज़िम्मेदार दफ़्तर के लिए एक रिमाइंडर तैयार किया गया। इस डेमो में भेजना रुका हुआ है।","it":"I moderatori di CommonGround hanno controllato questo caso: è ancora aperto ed è stato preparato un promemoria per l’ufficio competente. L’invio è in pausa in questa demo."},"escalateTo":"urgent","escalateReason":"No progress for 11 days, more than twice the 4-day limit for high cases.","source":"example"}', '{CASE}', v_case), '{URL}', v_url))::jsonb,
      '{"verdict":"ok","issues":[],"source":"example"}'::jsonb);
    insert into public.pipeline_outbox (case_number, community_id, office_id, kind, to_label, to_address, subject, body_es, created_at, approved_by)
    values (v_case, 'santiago-veraguas', 'drainage', 'referral', 'Drenaje e inundaciones (oficina de ejemplo)', 'drenaje@example.invalid', ((replace(replace('"Caso {CASE} – CommonGround"', '{CASE}', v_case), '{URL}', v_url))::jsonb #>> '{}'),
      ((replace(replace('"Estimado equipo de Drenaje e inundaciones (oficina de ejemplo):\n\nLes escribimos desde CommonGround, un proyecto comunitario independiente (demo estudiantil). Un residente reportó el caso {CASE} (Inundación o drenaje bloqueado, Área norte): La alcantarilla en la calle principal del área norte está bloqueada y el agua se acumula cada vez que llueve.\n\nEl caso lleva 1 días abierto. ¿Podrían indicarnos si su oficina puede revisarlo o quién lo atiende?\n\nCaso público: {URL}\n\nMuchas gracias.\nEquipo de moderación de CommonGround"', '{CASE}', v_case), '{URL}', v_url))::jsonb #>> '{}'), v_created + interval '172800 seconds', 'demo-seed');
    insert into public.agent_audit (case_number, community_id, occurred_at, actor_type, actor, action, summary)
    values (v_case, 'santiago-veraguas', v_created + interval '120 seconds', 'agent', 'Routing Agent (example data, written by hand for the demo)', 'routing_proposed', 'Suggested Drainage and flooding (example office), priority high (confidence 92%). A blocked storm drain is a drainage problem.');
    insert into public.agent_audit (case_number, community_id, occurred_at, actor_type, actor, action, summary)
    values (v_case, 'santiago-veraguas', v_created + interval '180 seconds', 'agent', 'Critic Agent (example data, written by hand for the demo)', 'critique', 'Checked the routing suggestion: no problems found.');
    insert into public.agent_audit (case_number, community_id, occurred_at, actor_type, actor, action, summary)
    values (v_case, 'santiago-veraguas', v_created + interval '86400 seconds', 'moderator', 'demo-seed', 'routing_approved', 'Approved routing to Drainage and flooding (example office), priority high.');
    insert into public.agent_audit (case_number, community_id, occurred_at, actor_type, actor, action, summary)
    values (v_case, 'santiago-veraguas', v_created + interval '86460 seconds', 'agent', 'Referral Agent (example data, written by hand for the demo)', 'referral_drafted', 'Drafted a referral in Spanish to Drainage and flooding (example office).');
    insert into public.agent_audit (case_number, community_id, occurred_at, actor_type, actor, action, summary)
    values (v_case, 'santiago-veraguas', v_created + interval '86520 seconds', 'agent', 'Critic Agent (example data, written by hand for the demo)', 'critique', 'Checked the referral: case number, link and facts present; no personal data.');
    insert into public.agent_audit (case_number, community_id, occurred_at, actor_type, actor, action, summary)
    values (v_case, 'santiago-veraguas', v_created + interval '172800 seconds', 'moderator', 'demo-seed', 'referral_approved', 'Approved the referral. Added to the outbox as "Ready to send – demo mode (not sent)".');
    insert into public.agent_audit (case_number, community_id, occurred_at, actor_type, actor, action, summary)
    values (v_case, 'santiago-veraguas', v_created + interval '1123200 seconds', 'agent', 'Follow-up Agent (example data, written by hand for the demo)', 'follow_up_flagged', 'No progress for 11 days (limit 4 for high). Drafted a reminder and a public update; suggests escalating to urgent.');
    insert into public.case_events (case_id, occurred_at, status, actor_type, kind, note, note_es, notes)
    values (v_case_id, v_created + interval '172800 seconds',
      coalesce((select status from public.case_events where case_id = v_case_id and coalesce(kind, 'status') = 'status' and occurred_at <= v_created + interval '172800 seconds' order by occurred_at desc, seq desc limit 1), 'received'),
      'moderator', 'referral_queued', null, null, null);
    for v_event in select id from public.case_events where case_id = v_case_id order by occurred_at, seq loop
      update public.case_events set seq = default where id = v_event;
    end loop;
    v_added := v_added + 1;
  end if;

  -- report · flooding-drainage · norte
  v_case := null;
  select case_number, id, created_at into v_case, v_case_id, v_created from public.cases
  where source_type = 'demonstration' and community_id = 'santiago-veraguas'
    and description = 'El drenaje de la avenida norte sigue tapado, se forma un charco grande después de cada lluvia.' and deleted_at is null
  order by created_at limit 1;
  if v_case is not null and not exists (select 1 from public.pipeline_case_state where case_number = v_case) then
    v_url := 'https://commonground-psi.vercel.app/cases/' || v_case;
    v_dups := array[(select case_number from public.cases where source_type = 'demonstration' and description = 'La alcantarilla en la calle principal del área norte está bloqueada y el agua se acumula cada vez que llueve.' and deleted_at is null order by created_at limit 1)]::text[];
    insert into public.pipeline_case_state (case_number, community_id, office_id, priority, routed_at, emergency, referral_queued_at, last_follow_up_at, last_progress_at)
    values (v_case, 'santiago-veraguas', 'drainage', 'medium', v_created + interval '432000 seconds', false, null, null, v_created + interval '432000 seconds');
    insert into public.pipeline_proposals (kind, case_number, community_id, status, created_at, reviewed_at, reviewed_by, payload, critique)
    values ('routing', v_case, 'santiago-veraguas', 'approved', v_created + interval '120 seconds', v_created + interval '432000 seconds', 'demo-seed',
      (replace(replace(replace('{"officeId":"drainage","reason":"A blocked drain on the avenue is a drainage problem.","priority":"medium","priorityReason":"A recurring puddle after rain: a real problem, no sign of immediate danger.","confidence":0.9,"alternativeOfficeIds":[],"needsModeratorDecision":false,"possibleDuplicates":[{"caseNumber":"{DUP0}","score":0.31}],"injectionSuspected":false,"source":"example"}', '{CASE}', v_case), '{URL}', v_url), '{DUP0}', coalesce(v_dups[1], '')))::jsonb,
      '{"verdict":"ok","issues":[],"source":"example"}'::jsonb);
    insert into public.pipeline_proposals (kind, case_number, community_id, status, created_at, reviewed_at, reviewed_by, payload, critique)
    values ('referral', v_case, 'santiago-veraguas', 'pending', v_created + interval '432060 seconds', null, null,
      (replace(replace(replace('{"officeId":"drainage","messageEs":"Estimado equipo de Drenaje e inundaciones (oficina de ejemplo):\n\nLes escribimos desde CommonGround, un proyecto comunitario independiente (demo estudiantil). Un residente reportó el caso {CASE} (Inundación o drenaje bloqueado, Área norte): El drenaje de la avenida norte sigue tapado, se forma un charco grande después de cada lluvia.\n\nEl caso lleva 5 días abierto. ¿Podrían indicarnos si su oficina puede revisarlo o quién lo atiende?\n\nCaso público: {URL}\n\nMuchas gracias.\nEquipo de moderación de CommonGround","facts":{"daysOpen":5,"residentCount":1,"caseUrl":"{URL}"},"source":"example"}', '{CASE}', v_case), '{URL}', v_url), '{DUP0}', coalesce(v_dups[1], '')))::jsonb,
      '{"verdict":"ok","issues":[],"source":"example"}'::jsonb);
    insert into public.agent_audit (case_number, community_id, occurred_at, actor_type, actor, action, summary)
    values (v_case, 'santiago-veraguas', v_created + interval '120 seconds', 'agent', 'Routing Agent (example data, written by hand for the demo)', 'routing_proposed', 'Suggested Drainage and flooding (example office), priority medium (confidence 90%). A blocked drain on the avenue is a drainage problem.');
    insert into public.agent_audit (case_number, community_id, occurred_at, actor_type, actor, action, summary)
    values (v_case, 'santiago-veraguas', v_created + interval '180 seconds', 'agent', 'Critic Agent (example data, written by hand for the demo)', 'critique', 'Checked the routing suggestion: no problems found.');
    insert into public.agent_audit (case_number, community_id, occurred_at, actor_type, actor, action, summary)
    values (v_case, 'santiago-veraguas', v_created + interval '432000 seconds', 'moderator', 'demo-seed', 'routing_approved', 'Approved routing to Drainage and flooding (example office), priority medium.');
    insert into public.agent_audit (case_number, community_id, occurred_at, actor_type, actor, action, summary)
    values (v_case, 'santiago-veraguas', v_created + interval '432060 seconds', 'agent', 'Referral Agent (example data, written by hand for the demo)', 'referral_drafted', 'Drafted a referral in Spanish to Drainage and flooding (example office).');
    insert into public.agent_audit (case_number, community_id, occurred_at, actor_type, actor, action, summary)
    values (v_case, 'santiago-veraguas', v_created + interval '432120 seconds', 'agent', 'Critic Agent (example data, written by hand for the demo)', 'critique', 'Checked the referral: case number, link and facts present; no personal data.');
    v_added := v_added + 1;
  end if;

  -- report · flooding-drainage · norte
  v_case := null;
  select case_number, id, created_at into v_case, v_case_id, v_created from public.cases
  where source_type = 'demonstration' and community_id = 'santiago-veraguas'
    and description = 'Inundación recurrente en el área norte por el mismo drenaje bloqueado, ya pasó tres veces este mes.' and deleted_at is null
  order by created_at limit 1;
  if v_case is not null and not exists (select 1 from public.pipeline_case_state where case_number = v_case) then
    v_url := 'https://commonground-psi.vercel.app/cases/' || v_case;
    v_dups := array[(select case_number from public.cases where source_type = 'demonstration' and description = 'La alcantarilla en la calle principal del área norte está bloqueada y el agua se acumula cada vez que llueve.' and deleted_at is null order by created_at limit 1), (select case_number from public.cases where source_type = 'demonstration' and description = 'El drenaje de la avenida norte sigue tapado, se forma un charco grande después de cada lluvia.' and deleted_at is null order by created_at limit 1)]::text[];
    insert into public.pipeline_case_state (case_number, community_id, office_id, priority, routed_at, emergency, referral_queued_at, last_follow_up_at, last_progress_at)
    values (v_case, 'santiago-veraguas', null, null, null, false, null, null, v_created + interval '0 seconds');
    insert into public.pipeline_proposals (kind, case_number, community_id, status, created_at, reviewed_at, reviewed_by, payload, critique)
    values ('routing', v_case, 'santiago-veraguas', 'pending', v_created + interval '120 seconds', null, null,
      (replace(replace(replace(replace('{"officeId":"drainage","reason":"Flooding caused by a blocked drain is a drainage problem.","priority":"high","priorityReason":"Recurring flooding, three times this month, from the same blocked drain.","confidence":0.9,"alternativeOfficeIds":[],"needsModeratorDecision":false,"possibleDuplicates":[{"caseNumber":"{DUP0}","score":0.38},{"caseNumber":"{DUP1}","score":0.33}],"injectionSuspected":false,"source":"example"}', '{CASE}', v_case), '{URL}', v_url), '{DUP0}', coalesce(v_dups[1], '')), '{DUP1}', coalesce(v_dups[2], '')))::jsonb,
      '{"verdict":"ok","issues":[],"source":"example"}'::jsonb);
    insert into public.agent_audit (case_number, community_id, occurred_at, actor_type, actor, action, summary)
    values (v_case, 'santiago-veraguas', v_created + interval '120 seconds', 'agent', 'Routing Agent (example data, written by hand for the demo)', 'routing_proposed', 'Suggested Drainage and flooding (example office), priority high (confidence 90%). Flooding caused by a blocked drain is a drainage problem.');
    insert into public.agent_audit (case_number, community_id, occurred_at, actor_type, actor, action, summary)
    values (v_case, 'santiago-veraguas', v_created + interval '180 seconds', 'agent', 'Critic Agent (example data, written by hand for the demo)', 'critique', 'Checked the routing suggestion: no problems found.');
    v_added := v_added + 1;
  end if;

  -- report · garbage-sanitation · sur
  v_case := null;
  select case_number, id, created_at into v_case, v_case_id, v_created from public.cases
  where source_type = 'demonstration' and community_id = 'santiago-veraguas'
    and description = 'Acumulación de basura sin recoger en el área sur desde hace dos semanas.' and deleted_at is null
  order by created_at limit 1;
  if v_case is not null and not exists (select 1 from public.pipeline_case_state where case_number = v_case) then
    v_url := 'https://commonground-psi.vercel.app/cases/' || v_case;
    v_dups := array[]::text[];
    insert into public.pipeline_case_state (case_number, community_id, office_id, priority, routed_at, emergency, referral_queued_at, last_follow_up_at, last_progress_at)
    values (v_case, 'santiago-veraguas', 'sanitation', 'medium', v_created + interval '86400 seconds', false, v_created + interval '172800 seconds', v_created + interval '777600 seconds', v_created + interval '777600 seconds');
    insert into public.pipeline_proposals (kind, case_number, community_id, status, created_at, reviewed_at, reviewed_by, payload, critique)
    values ('routing', v_case, 'santiago-veraguas', 'approved', v_created + interval '120 seconds', v_created + interval '86400 seconds', 'demo-seed',
      (replace(replace('{"officeId":"sanitation","reason":"Uncollected garbage is a sanitation problem.","priority":"medium","priorityReason":"Garbage left for two weeks: a growing health nuisance, no immediate danger.","confidence":0.95,"alternativeOfficeIds":[],"needsModeratorDecision":false,"possibleDuplicates":[],"injectionSuspected":false,"source":"example"}', '{CASE}', v_case), '{URL}', v_url))::jsonb,
      '{"verdict":"ok","issues":[],"source":"example"}'::jsonb);
    insert into public.pipeline_proposals (kind, case_number, community_id, status, created_at, reviewed_at, reviewed_by, payload, critique)
    values ('referral', v_case, 'santiago-veraguas', 'approved', v_created + interval '86460 seconds', v_created + interval '172800 seconds', 'demo-seed',
      (replace(replace('{"officeId":"sanitation","messageEs":"Estimado equipo de Aseo y recolección de basura (oficina de ejemplo):\n\nLes escribimos desde CommonGround, un proyecto comunitario independiente (demo estudiantil). Un residente reportó el caso {CASE} (Basura y saneamiento, Área sur): Acumulación de basura sin recoger en el área sur desde hace dos semanas.\n\nEl caso lleva 1 días abierto. ¿Podrían indicarnos si su oficina puede revisarlo o quién lo atiende?\n\nCaso público: {URL}\n\nMuchas gracias.\nEquipo de moderación de CommonGround","facts":{"daysOpen":1,"residentCount":1,"caseUrl":"{URL}"},"source":"example"}', '{CASE}', v_case), '{URL}', v_url))::jsonb,
      '{"verdict":"ok","issues":[],"source":"example"}'::jsonb);
    insert into public.pipeline_proposals (kind, case_number, community_id, status, created_at, reviewed_at, reviewed_by, payload, critique)
    values ('follow_up', v_case, 'santiago-veraguas', 'approved', v_created + interval '777600 seconds', v_created + interval '777600 seconds', 'demo-seed',
      (replace(replace('{"daysWithoutProgress":7,"thresholdDays":7,"priority":"medium","reminderEs":"Estimado equipo de Aseo y recolección de basura (oficina de ejemplo):\n\nLes escribimos de nuevo sobre el caso {CASE}, que sigue abierto y sin novedades desde hace 7 días. ¿Podrían indicarnos si ya fue revisado o quién lo atiende?\n\nCaso público: {URL}\n\nMuchas gracias.\nEquipo de moderación de CommonGround","publicUpdate":{"es":"Moderación de CommonGround revisó este caso: sigue abierto y se preparó un recordatorio para la oficina responsable. El envío está en pausa en esta demo.","en":"CommonGround''s moderators checked on this case: it is still open, and a reminder for the responsible office was prepared. Sending is paused in this demo.","pt":"A moderação do CommonGround verificou este caso: ele continua aberto e foi preparado um lembrete para o órgão responsável. O envio está pausado nesta demo.","fr":"Les modérateurs de CommonGround ont vérifié ce dossier : il est toujours ouvert et un rappel a été préparé pour le service responsable. L’envoi est en pause dans cette démo.","zh":"CommonGround 版主检查了此案件：案件仍未解决，已为负责部门准备了提醒。本演示中发送功能已暂停。","hi":"CommonGround के मॉडरेटरों ने इस मामले की जाँच की: यह अभी भी खुला है, और ज़िम्मेदार दफ़्तर के लिए एक रिमाइंडर तैयार किया गया। इस डेमो में भेजना रुका हुआ है।","it":"I moderatori di CommonGround hanno controllato questo caso: è ancora aperto ed è stato preparato un promemoria per l’ufficio competente. L’invio è in pausa in questa demo."},"escalateTo":null,"source":"example"}', '{CASE}', v_case), '{URL}', v_url))::jsonb,
      '{"verdict":"ok","issues":[],"source":"example"}'::jsonb);
    insert into public.pipeline_outbox (case_number, community_id, office_id, kind, to_label, to_address, subject, body_es, created_at, approved_by)
    values (v_case, 'santiago-veraguas', 'sanitation', 'referral', 'Aseo y recolección de basura (oficina de ejemplo)', 'aseo@example.invalid', ((replace(replace('"Caso {CASE} – CommonGround"', '{CASE}', v_case), '{URL}', v_url))::jsonb #>> '{}'),
      ((replace(replace('"Estimado equipo de Aseo y recolección de basura (oficina de ejemplo):\n\nLes escribimos desde CommonGround, un proyecto comunitario independiente (demo estudiantil). Un residente reportó el caso {CASE} (Basura y saneamiento, Área sur): Acumulación de basura sin recoger en el área sur desde hace dos semanas.\n\nEl caso lleva 1 días abierto. ¿Podrían indicarnos si su oficina puede revisarlo o quién lo atiende?\n\nCaso público: {URL}\n\nMuchas gracias.\nEquipo de moderación de CommonGround"', '{CASE}', v_case), '{URL}', v_url))::jsonb #>> '{}'), v_created + interval '172800 seconds', 'demo-seed');
    insert into public.pipeline_outbox (case_number, community_id, office_id, kind, to_label, to_address, subject, body_es, created_at, approved_by)
    values (v_case, 'santiago-veraguas', 'sanitation', 'follow_up', 'Aseo y recolección de basura (oficina de ejemplo)', 'aseo@example.invalid', ((replace(replace('"Recordatorio: caso {CASE} – CommonGround"', '{CASE}', v_case), '{URL}', v_url))::jsonb #>> '{}'),
      ((replace(replace('"Estimado equipo de Aseo y recolección de basura (oficina de ejemplo):\n\nLes escribimos de nuevo sobre el caso {CASE}, que sigue abierto y sin novedades desde hace 7 días. ¿Podrían indicarnos si ya fue revisado o quién lo atiende?\n\nCaso público: {URL}\n\nMuchas gracias.\nEquipo de moderación de CommonGround"', '{CASE}', v_case), '{URL}', v_url))::jsonb #>> '{}'), v_created + interval '777600 seconds', 'demo-seed');
    insert into public.agent_audit (case_number, community_id, occurred_at, actor_type, actor, action, summary)
    values (v_case, 'santiago-veraguas', v_created + interval '120 seconds', 'agent', 'Routing Agent (example data, written by hand for the demo)', 'routing_proposed', 'Suggested Sanitation and garbage collection (example office), priority medium (confidence 95%). Uncollected garbage is a sanitation problem.');
    insert into public.agent_audit (case_number, community_id, occurred_at, actor_type, actor, action, summary)
    values (v_case, 'santiago-veraguas', v_created + interval '180 seconds', 'agent', 'Critic Agent (example data, written by hand for the demo)', 'critique', 'Checked the routing suggestion: no problems found.');
    insert into public.agent_audit (case_number, community_id, occurred_at, actor_type, actor, action, summary)
    values (v_case, 'santiago-veraguas', v_created + interval '86400 seconds', 'moderator', 'demo-seed', 'routing_approved', 'Approved routing to Sanitation and garbage collection (example office), priority medium.');
    insert into public.agent_audit (case_number, community_id, occurred_at, actor_type, actor, action, summary)
    values (v_case, 'santiago-veraguas', v_created + interval '86460 seconds', 'agent', 'Referral Agent (example data, written by hand for the demo)', 'referral_drafted', 'Drafted a referral in Spanish to Sanitation and garbage collection (example office).');
    insert into public.agent_audit (case_number, community_id, occurred_at, actor_type, actor, action, summary)
    values (v_case, 'santiago-veraguas', v_created + interval '86520 seconds', 'agent', 'Critic Agent (example data, written by hand for the demo)', 'critique', 'Checked the referral: case number, link and facts present; no personal data.');
    insert into public.agent_audit (case_number, community_id, occurred_at, actor_type, actor, action, summary)
    values (v_case, 'santiago-veraguas', v_created + interval '172800 seconds', 'moderator', 'demo-seed', 'referral_approved', 'Approved the referral. Added to the outbox as "Ready to send – demo mode (not sent)".');
    insert into public.agent_audit (case_number, community_id, occurred_at, actor_type, actor, action, summary)
    values (v_case, 'santiago-veraguas', v_created + interval '777600 seconds', 'agent', 'Follow-up Agent (example data, written by hand for the demo)', 'follow_up_flagged', 'No progress for 7 days (limit 7 for medium). Drafted a reminder and a public update.');
    insert into public.agent_audit (case_number, community_id, occurred_at, actor_type, actor, action, summary)
    values (v_case, 'santiago-veraguas', v_created + interval '777600 seconds', 'moderator', 'demo-seed', 'follow_up_approved', 'Approved the follow-up: reminder added to the outbox (not sent) and the public update published.');
    insert into public.case_events (case_id, occurred_at, status, actor_type, kind, note, note_es, notes)
    values (v_case_id, v_created + interval '172800 seconds',
      coalesce((select status from public.case_events where case_id = v_case_id and coalesce(kind, 'status') = 'status' and occurred_at <= v_created + interval '172800 seconds' order by occurred_at desc, seq desc limit 1), 'received'),
      'moderator', 'referral_queued', null, null, null);
    insert into public.case_events (case_id, occurred_at, status, actor_type, kind, note, note_es, notes)
    values (v_case_id, v_created + interval '777600 seconds',
      coalesce((select status from public.case_events where case_id = v_case_id and coalesce(kind, 'status') = 'status' and occurred_at <= v_created + interval '777600 seconds' order by occurred_at desc, seq desc limit 1), 'received'),
      'moderator', 'follow_up_update', 'CommonGround''s moderators checked on this case: it is still open, and a reminder for the responsible office was prepared. Sending is paused in this demo.', 'Moderación de CommonGround revisó este caso: sigue abierto y se preparó un recordatorio para la oficina responsable. El envío está en pausa en esta demo.', '{"pt":"A moderação do CommonGround verificou este caso: ele continua aberto e foi preparado um lembrete para o órgão responsável. O envio está pausado nesta demo.","fr":"Les modérateurs de CommonGround ont vérifié ce dossier : il est toujours ouvert et un rappel a été préparé pour le service responsable. L’envoi est en pause dans cette démo.","zh":"CommonGround 版主检查了此案件：案件仍未解决，已为负责部门准备了提醒。本演示中发送功能已暂停。","hi":"CommonGround के मॉडरेटरों ने इस मामले की जाँच की: यह अभी भी खुला है, और ज़िम्मेदार दफ़्तर के लिए एक रिमाइंडर तैयार किया गया। इस डेमो में भेजना रुका हुआ है।","it":"I moderatori di CommonGround hanno controllato questo caso: è ancora aperto ed è stato preparato un promemoria per l’ufficio competente. L’invio è in pausa in questa demo."}'::jsonb);
    for v_event in select id from public.case_events where case_id = v_case_id order by occurred_at, seq loop
      update public.case_events set seq = default where id = v_event;
    end loop;
    v_added := v_added + 1;
  end if;

  -- proposal · other · este
  v_case := null;
  select case_number, id, created_at into v_case, v_case_id, v_created from public.cases
  where source_type = 'demonstration' and community_id = 'santiago-veraguas'
    and description = 'Propongo instalar más luminarias solares en el parque del área este.' and deleted_at is null
  order by created_at limit 1;
  if v_case is not null and not exists (select 1 from public.pipeline_case_state where case_number = v_case) then
    v_url := 'https://commonground-psi.vercel.app/cases/' || v_case;
    v_dups := array[]::text[];
    insert into public.pipeline_case_state (case_number, community_id, office_id, priority, routed_at, emergency, referral_queued_at, last_follow_up_at, last_progress_at)
    values (v_case, 'santiago-veraguas', null, null, null, false, null, null, v_created + interval '0 seconds');
    insert into public.pipeline_proposals (kind, case_number, community_id, status, created_at, reviewed_at, reviewed_by, payload, critique)
    values ('routing', v_case, 'santiago-veraguas', 'pending', v_created + interval '120 seconds', null, null,
      (replace(replace('{"officeId":"lighting","reason":"Solar lamps are street lighting, but they would go in a park.","priority":"low","priorityReason":"A proposal for an improvement, not a current problem.","confidence":0.52,"alternativeOfficeIds":["parks"],"needsModeratorDecision":true,"possibleDuplicates":[],"injectionSuspected":false,"source":"example"}', '{CASE}', v_case), '{URL}', v_url))::jsonb,
      '{"verdict":"concerns","issues":[{"type":"missing_info","note":"Two offices could reasonably handle this (lighting for the lamps, parks for the place). A moderator should choose."}],"source":"example"}'::jsonb);
    insert into public.agent_audit (case_number, community_id, occurred_at, actor_type, actor, action, summary)
    values (v_case, 'santiago-veraguas', v_created + interval '120 seconds', 'agent', 'Routing Agent (example data, written by hand for the demo)', 'routing_proposed', 'Suggested Street lighting and electricity (example office), priority low (confidence 52%). Solar lamps are street lighting, but they would go in a park.');
    insert into public.agent_audit (case_number, community_id, occurred_at, actor_type, actor, action, summary)
    values (v_case, 'santiago-veraguas', v_created + interval '180 seconds', 'agent', 'Critic Agent (example data, written by hand for the demo)', 'critique', 'Concern: Two offices could reasonably handle this (lighting for the lamps, parks for the place). A moderator should choose.');
    v_added := v_added + 1;
  end if;

  -- report · road-infrastructure · oeste
  v_case := null;
  select case_number, id, created_at into v_case, v_case_id, v_created from public.cases
  where source_type = 'demonstration' and community_id = 'santiago-veraguas'
    and description = 'Bache grande en la vía principal del área oeste, ya provocó un accidente menor.' and deleted_at is null
  order by created_at limit 1;
  if v_case is not null and not exists (select 1 from public.pipeline_case_state where case_number = v_case) then
    v_url := 'https://commonground-psi.vercel.app/cases/' || v_case;
    v_dups := array[]::text[];
    insert into public.pipeline_case_state (case_number, community_id, office_id, priority, routed_at, emergency, referral_queued_at, last_follow_up_at, last_progress_at)
    values (v_case, 'santiago-veraguas', 'public-works', 'high', v_created + interval '86400 seconds', false, v_created + interval '172800 seconds', null, v_created + interval '172800 seconds');
    insert into public.pipeline_proposals (kind, case_number, community_id, status, created_at, reviewed_at, reviewed_by, payload, critique)
    values ('routing', v_case, 'santiago-veraguas', 'approved', v_created + interval '120 seconds', v_created + interval '86400 seconds', 'demo-seed',
      (replace(replace('{"officeId":"public-works","reason":"A pothole on a main road is a public-works problem.","priority":"high","priorityReason":"The pothole already caused a minor accident on a main road.","confidence":0.94,"alternativeOfficeIds":[],"needsModeratorDecision":false,"possibleDuplicates":[],"injectionSuspected":false,"source":"example"}', '{CASE}', v_case), '{URL}', v_url))::jsonb,
      '{"verdict":"ok","issues":[],"source":"example"}'::jsonb);
    insert into public.pipeline_proposals (kind, case_number, community_id, status, created_at, reviewed_at, reviewed_by, payload, critique)
    values ('referral', v_case, 'santiago-veraguas', 'approved', v_created + interval '86460 seconds', v_created + interval '172800 seconds', 'demo-seed',
      (replace(replace('{"officeId":"public-works","messageEs":"Estimado equipo de Obras públicas y vías (oficina de ejemplo):\n\nLes escribimos desde CommonGround, un proyecto comunitario independiente (demo estudiantil). Un residente reportó el caso {CASE} (Vía o infraestructura pública dañada, Área oeste): Bache grande en la vía principal del área oeste, ya provocó un accidente menor.\n\nEl caso lleva 1 días abierto. ¿Podrían indicarnos si su oficina puede revisarlo o quién lo atiende?\n\nCaso público: {URL}\n\nMuchas gracias.\nEquipo de moderación de CommonGround","facts":{"daysOpen":1,"residentCount":1,"caseUrl":"{URL}"},"source":"example"}', '{CASE}', v_case), '{URL}', v_url))::jsonb,
      '{"verdict":"ok","issues":[],"source":"example"}'::jsonb);
    insert into public.pipeline_outbox (case_number, community_id, office_id, kind, to_label, to_address, subject, body_es, created_at, approved_by)
    values (v_case, 'santiago-veraguas', 'public-works', 'referral', 'Obras públicas y vías (oficina de ejemplo)', 'obras-publicas@example.invalid', ((replace(replace('"Caso {CASE} – CommonGround"', '{CASE}', v_case), '{URL}', v_url))::jsonb #>> '{}'),
      ((replace(replace('"Estimado equipo de Obras públicas y vías (oficina de ejemplo):\n\nLes escribimos desde CommonGround, un proyecto comunitario independiente (demo estudiantil). Un residente reportó el caso {CASE} (Vía o infraestructura pública dañada, Área oeste): Bache grande en la vía principal del área oeste, ya provocó un accidente menor.\n\nEl caso lleva 1 días abierto. ¿Podrían indicarnos si su oficina puede revisarlo o quién lo atiende?\n\nCaso público: {URL}\n\nMuchas gracias.\nEquipo de moderación de CommonGround"', '{CASE}', v_case), '{URL}', v_url))::jsonb #>> '{}'), v_created + interval '172800 seconds', 'demo-seed');
    insert into public.agent_audit (case_number, community_id, occurred_at, actor_type, actor, action, summary)
    values (v_case, 'santiago-veraguas', v_created + interval '120 seconds', 'agent', 'Routing Agent (example data, written by hand for the demo)', 'routing_proposed', 'Suggested Public works and roads (example office), priority high (confidence 94%). A pothole on a main road is a public-works problem.');
    insert into public.agent_audit (case_number, community_id, occurred_at, actor_type, actor, action, summary)
    values (v_case, 'santiago-veraguas', v_created + interval '180 seconds', 'agent', 'Critic Agent (example data, written by hand for the demo)', 'critique', 'Checked the routing suggestion: no problems found.');
    insert into public.agent_audit (case_number, community_id, occurred_at, actor_type, actor, action, summary)
    values (v_case, 'santiago-veraguas', v_created + interval '86400 seconds', 'moderator', 'demo-seed', 'routing_approved', 'Approved routing to Public works and roads (example office), priority high.');
    insert into public.agent_audit (case_number, community_id, occurred_at, actor_type, actor, action, summary)
    values (v_case, 'santiago-veraguas', v_created + interval '86460 seconds', 'agent', 'Referral Agent (example data, written by hand for the demo)', 'referral_drafted', 'Drafted a referral in Spanish to Public works and roads (example office).');
    insert into public.agent_audit (case_number, community_id, occurred_at, actor_type, actor, action, summary)
    values (v_case, 'santiago-veraguas', v_created + interval '86520 seconds', 'agent', 'Critic Agent (example data, written by hand for the demo)', 'critique', 'Checked the referral: case number, link and facts present; no personal data.');
    insert into public.agent_audit (case_number, community_id, occurred_at, actor_type, actor, action, summary)
    values (v_case, 'santiago-veraguas', v_created + interval '172800 seconds', 'moderator', 'demo-seed', 'referral_approved', 'Approved the referral. Added to the outbox as "Ready to send – demo mode (not sent)".');
    insert into public.case_events (case_id, occurred_at, status, actor_type, kind, note, note_es, notes)
    values (v_case_id, v_created + interval '172800 seconds',
      coalesce((select status from public.case_events where case_id = v_case_id and coalesce(kind, 'status') = 'status' and occurred_at <= v_created + interval '172800 seconds' order by occurred_at desc, seq desc limit 1), 'received'),
      'moderator', 'referral_queued', null, null, null);
    for v_event in select id from public.case_events where case_id = v_case_id order by occurred_at, seq loop
      update public.case_events set seq = default where id = v_event;
    end loop;
    v_added := v_added + 1;
  end if;

  raise notice 'Added example pipeline history to % demonstration cases.', v_added;
end
$$;

-- The office side: each approved example referral arrives in its (simulated) office's inbox.
insert into public.office_referrals (case_number, community_id, office_id, status, is_demo, created_at, status_changed_at, outbox_id)
select o.case_number, o.community_id, o.office_id, 'new', c.source_type = 'demonstration', o.created_at, o.created_at, o.id
from public.pipeline_outbox o
join public.cases c on c.case_number = o.case_number
where o.kind = 'referral' and c.deleted_at is null and c.status <> 'closed'
  and not exists (select 1 from public.office_referrals r where r.outbox_id = o.id);
