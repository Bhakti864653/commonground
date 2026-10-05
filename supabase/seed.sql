-- CommonGround: demonstration cases for the Santiago de Veraguas pilot.
--
-- GENERATED from src/lib/store/demo-seed.ts by src/lib/store/demo-seed-sql.ts — don't edit by
-- hand. Regenerate with: npx vitest run src/lib/store/__tests__/supabase-sql.test.ts -u
--
-- Run once, after supabase/migrations/0001_init.sql: SQL Editor → New query → paste → Run.
-- Safe to run again: if demonstration cases already exist, it does nothing. Dates are relative
-- to when it runs ("9 days ago"), and from then on they age like any real case.
-- Cases are numbered by create_case, the same function real submissions use, so the counter
-- continues correctly after them.

do $$
declare
  v_id uuid;
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

  -- 2. report · road-infrastructure · centro
  select c.id into v_id from public.create_case(
    'santiago-veraguas', 'SV', 'report', 'road-infrastructure',
    'Hay un poste de luz dañado cerca de la escuela primaria del centro, no enciende desde hace varios días.',
    '{"kind":"neighborhood","areaId":"centro","label":"Central area","labels":{"pt":"Área central","fr":"Zone centrale","zh":"中心区","hi":"केंद्रीय इलाका","it":"Zona centrale"},"labelEs":"Área central"}'::jsonb,
    now() - interval '6 days', 'demonstration_data', 'demonstration', null,
    jsonb_build_object('consentVersion', '2026-09-19.v1', 'consentedAt', now() - interval '6 days', 'language', 'es'),
    gen_random_uuid()::text
  ) c;

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

  -- 4. report · flooding-drainage · norte
  select c.id into v_id from public.create_case(
    'santiago-veraguas', 'SV', 'report', 'flooding-drainage',
    'El drenaje de la avenida norte sigue tapado, se forma un charco grande después de cada lluvia.',
    '{"kind":"neighborhood","areaId":"norte","label":"Northern area","labels":{"pt":"Área norte","fr":"Zone nord","zh":"北区","hi":"उत्तरी इलाका","it":"Zona nord"},"labelEs":"Área norte"}'::jsonb,
    now() - interval '8 days', 'demonstration_data', 'demonstration', null,
    jsonb_build_object('consentVersion', '2026-09-19.v1', 'consentedAt', now() - interval '8 days', 'language', 'es'),
    gen_random_uuid()::text
  ) c;

  -- 5. report · flooding-drainage · norte
  select c.id into v_id from public.create_case(
    'santiago-veraguas', 'SV', 'report', 'flooding-drainage',
    'Inundación recurrente en el área norte por el mismo drenaje bloqueado, ya pasó tres veces este mes.',
    '{"kind":"neighborhood","areaId":"norte","label":"Northern area","labels":{"pt":"Área norte","fr":"Zone nord","zh":"北区","hi":"उत्तरी इलाका","it":"Zona nord"},"labelEs":"Área norte"}'::jsonb,
    now() - interval '2 days', 'demonstration_data', 'demonstration', null,
    jsonb_build_object('consentVersion', '2026-09-19.v1', 'consentedAt', now() - interval '2 days', 'language', 'es'),
    gen_random_uuid()::text
  ) c;

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
