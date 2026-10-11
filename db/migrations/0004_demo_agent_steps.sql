-- CommonGround: the AI agent's steps on the demonstration cases (for the "Agente IA" page).
--
-- GENERATED from src/lib/store/demo-seed.ts by src/lib/store/demo-seed-sql.ts — don't edit by
-- hand. Regenerate with: npx vitest run src/lib/store/__tests__/db-sql.test.ts -u
--
-- Data only, no schema change. Touches only demonstration cases (source_type = 'demonstration'),
-- found by their fixed text, and skips any that already show agent activity — so it is safe on a
-- database seeded before the agent existed, on a fresh one, and when run twice.

do $$
declare
  v_id uuid;
  v_created timestamptz;
  v_event uuid;
  v_added int := 0;
begin
  -- report · road-infrastructure · centro
  v_id := null;
  select id into v_id from public.cases
  where source_type = 'demonstration' and community_id = 'santiago-veraguas'
    and description = 'Hay un poste de luz dañado frente a la escuela primaria del centro, no enciende desde hace una semana.'
  order by created_at limit 1;
  if v_id is not null and not exists (
    select 1 from public.case_events where case_id = v_id and actor_type = 'agent'
  ) then
    select created_at into v_created from public.cases where id = v_id;
    insert into public.case_events (case_id, occurred_at, status, actor_type, kind, contact_id)
    values (v_id, v_created + interval '3 minutes', 'received', 'agent', 'ai_reviewed', null);
    for v_event in select id from public.case_events where case_id = v_id order by occurred_at, seq loop
      update public.case_events set seq = default where id = v_event;
    end loop;
    v_added := v_added + 1;
  end if;

  -- report · road-infrastructure · centro
  v_id := null;
  select id into v_id from public.cases
  where source_type = 'demonstration' and community_id = 'santiago-veraguas'
    and description = 'Hay un poste de luz dañado cerca de la escuela primaria del centro, no enciende desde hace varios días.'
  order by created_at limit 1;
  if v_id is not null and not exists (
    select 1 from public.case_events where case_id = v_id and actor_type = 'agent'
  ) then
    select created_at into v_created from public.cases where id = v_id;
    insert into public.case_events (case_id, occurred_at, status, actor_type, kind, contact_id)
    values (v_id, v_created + interval '3 minutes', 'received', 'agent', 'ai_reviewed', null);
    for v_event in select id from public.case_events where case_id = v_id order by occurred_at, seq loop
      update public.case_events set seq = default where id = v_event;
    end loop;
    v_added := v_added + 1;
  end if;

  -- report · flooding-drainage · norte
  v_id := null;
  select id into v_id from public.cases
  where source_type = 'demonstration' and community_id = 'santiago-veraguas'
    and description = 'La alcantarilla en la calle principal del área norte está bloqueada y el agua se acumula cada vez que llueve.'
  order by created_at limit 1;
  if v_id is not null and not exists (
    select 1 from public.case_events where case_id = v_id and actor_type = 'agent'
  ) then
    select created_at into v_created from public.cases where id = v_id;
    insert into public.case_events (case_id, occurred_at, status, actor_type, kind, contact_id)
    values (v_id, v_created + interval '3 minutes', 'received', 'agent', 'ai_reviewed', null);
    for v_event in select id from public.case_events where case_id = v_id order by occurred_at, seq loop
      update public.case_events set seq = default where id = v_event;
    end loop;
    v_added := v_added + 1;
  end if;

  -- report · flooding-drainage · norte
  v_id := null;
  select id into v_id from public.cases
  where source_type = 'demonstration' and community_id = 'santiago-veraguas'
    and description = 'El drenaje de la avenida norte sigue tapado, se forma un charco grande después de cada lluvia.'
  order by created_at limit 1;
  if v_id is not null and not exists (
    select 1 from public.case_events where case_id = v_id and actor_type = 'agent'
  ) then
    select created_at into v_created from public.cases where id = v_id;
    insert into public.case_events (case_id, occurred_at, status, actor_type, kind, contact_id)
    values (v_id, v_created + interval '3 minutes', 'received', 'agent', 'ai_reviewed', null);
    for v_event in select id from public.case_events where case_id = v_id order by occurred_at, seq loop
      update public.case_events set seq = default where id = v_event;
    end loop;
    v_added := v_added + 1;
  end if;

  -- report · flooding-drainage · norte
  v_id := null;
  select id into v_id from public.cases
  where source_type = 'demonstration' and community_id = 'santiago-veraguas'
    and description = 'Inundación recurrente en el área norte por el mismo drenaje bloqueado, ya pasó tres veces este mes.'
  order by created_at limit 1;
  if v_id is not null and not exists (
    select 1 from public.case_events where case_id = v_id and actor_type = 'agent'
  ) then
    select created_at into v_created from public.cases where id = v_id;
    insert into public.case_events (case_id, occurred_at, status, actor_type, kind, contact_id)
    values (v_id, v_created + interval '3 minutes', 'received', 'agent', 'ai_reviewed', null);
    for v_event in select id from public.case_events where case_id = v_id order by occurred_at, seq loop
      update public.case_events set seq = default where id = v_event;
    end loop;
    v_added := v_added + 1;
  end if;

  -- report · garbage-sanitation · sur
  v_id := null;
  select id into v_id from public.cases
  where source_type = 'demonstration' and community_id = 'santiago-veraguas'
    and description = 'Acumulación de basura sin recoger en el área sur desde hace dos semanas.'
  order by created_at limit 1;
  if v_id is not null and not exists (
    select 1 from public.case_events where case_id = v_id and actor_type = 'agent'
  ) then
    select created_at into v_created from public.cases where id = v_id;
    insert into public.case_events (case_id, occurred_at, status, actor_type, kind, contact_id)
    values (v_id, v_created + interval '3 minutes', 'received', 'agent', 'ai_reviewed', null);
    for v_event in select id from public.case_events where case_id = v_id order by occurred_at, seq loop
      update public.case_events set seq = default where id = v_event;
    end loop;
    v_added := v_added + 1;
  end if;

  -- proposal · other · este
  v_id := null;
  select id into v_id from public.cases
  where source_type = 'demonstration' and community_id = 'santiago-veraguas'
    and description = 'Propongo instalar más luminarias solares en el parque del área este.'
  order by created_at limit 1;
  if v_id is not null and not exists (
    select 1 from public.case_events where case_id = v_id and actor_type = 'agent'
  ) then
    select created_at into v_created from public.cases where id = v_id;
    insert into public.case_events (case_id, occurred_at, status, actor_type, kind, contact_id)
    values (v_id, v_created + interval '3 minutes', 'received', 'agent', 'ai_reviewed', null);
    for v_event in select id from public.case_events where case_id = v_id order by occurred_at, seq loop
      update public.case_events set seq = default where id = v_event;
    end loop;
    v_added := v_added + 1;
  end if;

  raise notice 'Added agent steps to % demonstration cases.', v_added;
end
$$;
