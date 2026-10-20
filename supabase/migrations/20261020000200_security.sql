-- =====================================================================
-- DALE CON TODO — funciones auxiliares, triggers de integridad y RLS
-- =====================================================================

-- ---------- Funciones de autorización -------------------------------
create or replace function public.has_role(r public.app_role) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = auth.uid() and role = r)
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select public.has_role('admin')
$$;

-- Staff = administrador u organizador.
create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = auth.uid() and role in ('admin', 'organizer'))
$$;

-- El organizador solo gestiona lo que creó; el admin, todo.
create or replace function public.can_manage(owner uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_admin() or (public.has_role('organizer') and owner = auth.uid())
$$;

create or replace function public.can_manage_event(e uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.events where id = e and public.can_manage(created_by))
$$;

create or replace function public.can_manage_contest(c uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.contests where id = c and public.can_manage(created_by))
$$;

create or replace function public.is_judge_of(c uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.contest_judges where contest_id = c and user_id = auth.uid())
$$;

-- ¿El usuario actual participa (individual o como miembro aceptado) en la inscripción?
create or replace function public.is_entry_member(en uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.contest_entries ce
    where ce.id = en and (
      ce.user_id = auth.uid()
      or exists (select 1 from public.team_members tm where tm.team_id = ce.team_id and tm.user_id = auth.uid() and tm.status = 'accepted')
    )
  )
$$;

create or replace function public.is_team_member(t uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.team_members where team_id = t and user_id = auth.uid() and status in ('accepted', 'invited'))
    or exists (select 1 from public.teams where id = t and captain_id = auth.uid())
$$;

create or replace function public.contest_is_public(c uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.contests where id = c and status in ('published', 'closed'))
$$;

create or replace function public.event_is_public(e uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.events where id = e and status in ('published', 'cancelled'))
$$;

-- ---------- Alta de usuario: perfil + rol miembro -------------------
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(left(new.raw_user_meta_data ->> 'full_name', 120), ''))
  on conflict (id) do nothing;
  -- El registro público SOLO crea miembros. Roles superiores los asigna un admin.
  insert into public.user_roles (user_id, role) values (new.id, 'member') on conflict do nothing;
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- Auditoría genérica --------------------------------------
create or replace function public.audit_trigger() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  rec jsonb;
begin
  rec := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  insert into public.audit_log (actor_id, action, entity, entity_id, details)
  values (
    auth.uid(),
    lower(tg_op),
    tg_table_name,
    coalesce(rec ->> 'id', rec ->> 'key', rec ->> 'user_id'),
    case when tg_op = 'UPDATE' then jsonb_build_object('title', coalesce(rec ->> 'title', rec ->> 'name', rec ->> 'key'), 'status', rec ->> 'status')
         else jsonb_build_object('title', coalesce(rec ->> 'title', rec ->> 'name', rec ->> 'key', rec ->> 'role')) end
  );
  return null;
end $$;

do $$
declare t text;
begin
  foreach t in array array['events', 'event_access', 'contests', 'contest_stages', 'rubric_criteria', 'contest_judges', 'contest_results',
                           'opportunities', 'org_members', 'partners', 'content_sections', 'user_roles', 'recognitions', 'media_assets', 'badges']
  loop
    execute format('create trigger %I after insert or update or delete on public.%I for each row execute function public.audit_trigger()', t || '_audit', t);
  end loop;
end $$;

create or replace function public.audit_project_moderation() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status is distinct from old.status then
    insert into public.audit_log (actor_id, action, entity, entity_id, details)
    values (auth.uid(), 'moderate', 'projects', new.id::text, jsonb_build_object('title', new.title, 'from', old.status, 'to', new.status));
  end if;
  return null;
end $$;
create trigger projects_moderation_audit after update on public.projects for each row execute function public.audit_project_moderation();

-- ---------- Integridad: proyectos (moderación) ----------------------
create or replace function public.guard_project() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.is_staff() then
    if new.status = 'approved' and (tg_op = 'INSERT' or old.status is distinct from 'approved') then
      new.published_at := coalesce(new.published_at, now());
    end if;
    return new;
  end if;
  -- Miembros: toda propuesta o edición vuelve a la cola de moderación.
  if tg_op = 'INSERT' then
    new.owner_id := auth.uid();
    new.is_demo := false;
  else
    new.owner_id := old.owner_id;
    new.is_demo := old.is_demo;
  end if;
  new.status := 'pending';
  new.moderation_note := case when tg_op = 'UPDATE' then old.moderation_note else null end;
  new.published_at := null;
  return new;
end $$;
create trigger projects_guard before insert or update on public.projects for each row execute function public.guard_project();

-- ---------- Integridad: entregas dentro de plazo --------------------
create or replace function public.guard_submission() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  st public.contest_stages;
  en public.contest_entries;
begin
  select * into st from public.contest_stages where id = new.stage_id;
  select * into en from public.contest_entries where id = new.entry_id;
  if st.contest_id <> en.contest_id then
    raise exception 'La etapa no pertenece al concurso de la inscripción' using errcode = '22023';
  end if;
  if public.can_manage_contest(st.contest_id) then
    return new;
  end if;
  if not st.accepts_submissions then
    raise exception 'Esta etapa no recibe entregas' using errcode = 'P0001';
  end if;
  if now() < st.starts_at or now() > st.ends_at then
    raise exception 'La entrega está fuera de plazo' using errcode = 'P0001';
  end if;
  if en.status <> 'active' then
    raise exception 'La inscripción no está activa' using errcode = 'P0001';
  end if;
  if tg_op = 'UPDATE' then
    new.entry_id := old.entry_id;
    new.stage_id := old.stage_id;
    new.submitted_at := old.submitted_at;
  end if;
  new.updated_at := now();
  return new;
end $$;
create trigger submissions_guard before insert or update on public.submissions for each row execute function public.guard_submission();

-- ---------- Integridad: puntuaciones --------------------------------
create or replace function public.guard_score() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  crit public.rubric_criteria;
  sub_contest uuid;
  published boolean;
begin
  select * into crit from public.rubric_criteria where id = new.criterion_id;
  select ce.contest_id into sub_contest
    from public.submissions s join public.contest_entries ce on ce.id = s.entry_id
    where s.id = new.submission_id;
  if crit.contest_id is distinct from sub_contest then
    raise exception 'El criterio no pertenece al concurso de la entrega' using errcode = '22023';
  end if;
  if new.score > crit.max_score then
    raise exception 'La puntuación supera el máximo del criterio (%)', crit.max_score using errcode = '22023';
  end if;
  select results_published into published from public.contests where id = sub_contest;
  if published then
    raise exception 'Los resultados ya fueron publicados; la evaluación está cerrada' using errcode = 'P0001';
  end if;
  if tg_op = 'UPDATE' then
    new.judge_id := old.judge_id;
    new.submission_id := old.submission_id;
    new.criterion_id := old.criterion_id;
  end if;
  return new;
end $$;
create trigger scores_guard before insert or update on public.scores for each row execute function public.guard_score();

-- ---------- Perfil: el consentimiento público queda fechado ---------
create or replace function public.guard_profile() returns trigger
language plpgsql as $$
begin
  if new.is_public and (tg_op = 'INSERT' or not old.is_public) then
    new.public_consent_at := now();
  elsif not new.is_public then
    new.public_consent_at := null;
  end if;
  return new;
end $$;
create trigger profiles_guard before insert or update on public.profiles for each row execute function public.guard_profile();

-- =====================================================================
-- Row Level Security
-- =====================================================================
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.content_sections enable row level security;
alter table public.org_members enable row level security;
alter table public.partners enable row level security;
alter table public.media_assets enable row level security;
alter table public.events enable row level security;
alter table public.event_access enable row level security;
alter table public.event_speakers enable row level security;
alter table public.event_registrations enable row level security;
alter table public.saved_events enable row level security;
alter table public.contests enable row level security;
alter table public.contest_stages enable row level security;
alter table public.rubric_criteria enable row level security;
alter table public.contest_judges enable row level security;
alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.contest_entries enable row level security;
alter table public.submissions enable row level security;
alter table public.scores enable row level security;
alter table public.contest_results enable row level security;
alter table public.projects enable row level security;
alter table public.project_collab_requests enable row level security;
alter table public.opportunities enable row level security;
alter table public.badges enable row level security;
alter table public.recognitions enable row level security;
alter table public.membership_applications enable row level security;
alter table public.contact_messages enable row level security;
alter table public.audit_log enable row level security;

-- Perfiles: cada quien el suyo; staff todos. El directorio público usa la RPC search_members.
create policy profiles_select on public.profiles for select using (id = auth.uid() or public.is_staff());
create policy profiles_update on public.profiles for update using (id = auth.uid() or public.is_admin()) with check (id = auth.uid() or public.is_admin());

create policy roles_select on public.user_roles for select using (user_id = auth.uid() or public.is_admin());
create policy roles_admin on public.user_roles for all using (public.is_admin()) with check (public.is_admin());

-- Contenido institucional: lectura pública; escritura admin.
create policy content_read on public.content_sections for select using (true);
create policy content_write on public.content_sections for all using (public.is_admin()) with check (public.is_admin());

create policy org_read on public.org_members for select using (published or public.is_staff());
create policy org_write on public.org_members for all using (public.is_admin()) with check (public.is_admin());

create policy partners_read on public.partners for select using (published or public.is_staff());
create policy partners_write on public.partners for all using (public.is_admin()) with check (public.is_admin());

create policy media_read on public.media_assets for select using (true);
create policy media_write on public.media_assets for all using (public.is_staff()) with check (public.is_staff());

-- Eventos
create policy events_read on public.events for select using (status in ('published', 'cancelled') or public.can_manage(created_by));
create policy events_insert on public.events for insert with check (public.is_staff() and created_by = auth.uid());
create policy events_update on public.events for update using (public.can_manage(created_by)) with check (public.can_manage(created_by));
create policy events_delete on public.events for delete using (public.can_manage(created_by));

create policy event_access_read on public.event_access for select using (
  public.can_manage_event(event_id)
  or exists (select 1 from public.event_registrations r where r.event_id = event_access.event_id and r.user_id = auth.uid() and r.status = 'confirmed')
);
create policy event_access_write on public.event_access for all using (public.can_manage_event(event_id)) with check (public.can_manage_event(event_id));

create policy speakers_read on public.event_speakers for select using (public.event_is_public(event_id) or public.can_manage_event(event_id));
create policy speakers_write on public.event_speakers for all using (public.can_manage_event(event_id)) with check (public.can_manage_event(event_id));

-- Inscripciones: alta y cancelación solo vía RPC (register_for_event / cancel_*).
create policy reg_read on public.event_registrations for select using (user_id = auth.uid() or public.can_manage_event(event_id));
create policy reg_staff_update on public.event_registrations for update using (public.can_manage_event(event_id)) with check (public.can_manage_event(event_id));

create policy saved_own on public.saved_events for all using (user_id = auth.uid()) with check (user_id = auth.uid() and public.event_is_public(event_id));

-- Concursos
create policy contests_read on public.contests for select using (status in ('published', 'closed') or public.can_manage(created_by) or public.is_judge_of(id));
create policy contests_insert on public.contests for insert with check (public.is_staff() and created_by = auth.uid());
create policy contests_update on public.contests for update using (public.can_manage(created_by)) with check (public.can_manage(created_by));
create policy contests_delete on public.contests for delete using (public.can_manage(created_by));

create policy stages_read on public.contest_stages for select using (public.contest_is_public(contest_id) or public.can_manage_contest(contest_id));
create policy stages_write on public.contest_stages for all using (public.can_manage_contest(contest_id)) with check (public.can_manage_contest(contest_id));

create policy rubric_read on public.rubric_criteria for select using (public.contest_is_public(contest_id) or public.can_manage_contest(contest_id) or public.is_judge_of(contest_id));
create policy rubric_write on public.rubric_criteria for all using (public.can_manage_contest(contest_id)) with check (public.can_manage_contest(contest_id));

-- Jurados: públicos solo si el concurso lo decide.
create policy judges_read on public.contest_judges for select using (
  user_id = auth.uid()
  or public.can_manage_contest(contest_id)
  or exists (select 1 from public.contests c where c.id = contest_id and c.judges_public and c.status in ('published', 'closed'))
);
create policy judges_write on public.contest_judges for all using (public.can_manage_contest(contest_id)) with check (public.can_manage_contest(contest_id));

-- Equipos: alta/invitaciones vía RPC; lectura para sus integrantes, staff y jurados del concurso.
create policy teams_read on public.teams for select using (public.is_team_member(id) or public.can_manage_contest(contest_id) or public.is_judge_of(contest_id));
create policy teams_captain_update on public.teams for update using (captain_id = auth.uid()) with check (captain_id = auth.uid());
create policy team_members_read on public.team_members for select using (user_id = auth.uid() or public.is_team_member(team_id) or public.can_manage_contest(contest_id));

create policy entries_read on public.contest_entries for select using (public.is_entry_member(id) or public.can_manage_contest(contest_id) or public.is_judge_of(contest_id));
create policy entries_staff on public.contest_entries for update using (public.can_manage_contest(contest_id)) with check (public.can_manage_contest(contest_id));

-- Entregas: integrantes (dentro de plazo, validado por trigger), staff y jurados asignados.
create policy submissions_read on public.submissions for select using (
  public.is_entry_member(entry_id)
  or exists (select 1 from public.contest_entries ce where ce.id = entry_id and (public.can_manage_contest(ce.contest_id) or public.is_judge_of(ce.contest_id)))
);
create policy submissions_insert on public.submissions for insert with check (public.is_entry_member(entry_id) and submitted_by = auth.uid());
create policy submissions_update on public.submissions for update using (public.is_entry_member(entry_id)) with check (public.is_entry_member(entry_id));

-- Puntuaciones: cada jurado las suyas sobre concursos asignados; staff lee.
create policy scores_judge on public.scores for all using (
  judge_id = auth.uid()
  and exists (select 1 from public.submissions s join public.contest_entries ce on ce.id = s.entry_id where s.id = submission_id and public.is_judge_of(ce.contest_id))
) with check (
  judge_id = auth.uid()
  and exists (select 1 from public.submissions s join public.contest_entries ce on ce.id = s.entry_id where s.id = submission_id and public.is_judge_of(ce.contest_id))
);
create policy scores_staff_read on public.scores for select using (
  exists (select 1 from public.submissions s join public.contest_entries ce on ce.id = s.entry_id where s.id = submission_id and public.can_manage_contest(ce.contest_id))
);

-- Resultados: públicos SOLO tras la publicación.
create policy results_read on public.contest_results for select using (
  exists (select 1 from public.contests c where c.id = contest_id and c.results_published and c.status in ('published', 'closed'))
  or public.can_manage_contest(contest_id)
);
create policy results_write on public.contest_results for all using (public.can_manage_contest(contest_id)) with check (public.can_manage_contest(contest_id));

-- Proyectos: aprobados públicos; propietario ve los suyos; staff modera.
create policy projects_read on public.projects for select using (status = 'approved' or owner_id = auth.uid() or public.is_staff());
create policy projects_insert on public.projects for insert with check (auth.uid() is not null);
create policy projects_update on public.projects for update using (owner_id = auth.uid() or public.is_staff()) with check (owner_id = auth.uid() or public.is_staff());
create policy projects_delete on public.projects for delete using (public.is_staff() or (owner_id = auth.uid() and status <> 'approved'));

create policy collab_read on public.project_collab_requests for select using (
  user_id = auth.uid() or public.is_staff() or exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid())
);
create policy collab_insert on public.project_collab_requests for insert with check (
  user_id = auth.uid() and status = 'pending'
  and exists (select 1 from public.projects p where p.id = project_id and p.status = 'approved' and p.owner_id is distinct from auth.uid())
);
create policy collab_owner_update on public.project_collab_requests for update using (
  public.is_staff() or exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid())
) with check (
  public.is_staff() or exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid())
);
create policy collab_delete_own on public.project_collab_requests for delete using (user_id = auth.uid());

-- Oportunidades
create policy opp_read on public.opportunities for select using (status = 'published' or public.can_manage(created_by));
create policy opp_insert on public.opportunities for insert with check (public.is_staff() and created_by = auth.uid());
create policy opp_update on public.opportunities for update using (public.can_manage(created_by)) with check (public.can_manage(created_by));
create policy opp_delete on public.opportunities for delete using (public.can_manage(created_by));

-- Reconocimientos: la persona ve los suyos; la verificación pública usa verify_recognition().
create policy badges_read on public.badges for select using (true);
create policy badges_write on public.badges for all using (public.is_admin()) with check (public.is_admin());
create policy recognitions_read on public.recognitions for select using (user_id = auth.uid() or public.is_staff());
create policy recognitions_write on public.recognitions for all using (public.is_admin()) with check (public.is_admin());
create policy recognitions_owner_visibility on public.recognitions for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Formularios: alta pública (contacto) o vía RPC (membresía). Lectura staff.
create policy applications_staff on public.membership_applications for select using (public.is_staff());
create policy applications_staff_update on public.membership_applications for update using (public.is_staff()) with check (public.is_staff());
create policy contact_insert on public.contact_messages for insert with check (handled = false);
create policy contact_staff on public.contact_messages for select using (public.is_staff());
create policy contact_staff_update on public.contact_messages for update using (public.is_staff()) with check (public.is_staff());

create policy audit_admin on public.audit_log for select using (public.is_admin());

-- Impide que la persona dueña cambie algo distinto de la visibilidad de su reconocimiento.
create or replace function public.guard_recognition_owner() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.is_admin() then return new; end if;
  if (to_jsonb(new) - 'public_verification') is distinct from (to_jsonb(old) - 'public_verification') then
    raise exception 'Solo puedes cambiar la visibilidad de tu reconocimiento' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger recognitions_owner_guard before update on public.recognitions for each row execute function public.guard_recognition_owner();

-- ---------- Privilegios base ----------------------------------------
-- En Supabase estos grants existen por defecto; se declaran para entornos limpios.
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to anon, authenticated;
grant usage, select on all sequences in schema public to anon, authenticated;
-- Columnas que el miembro nunca debe tocar directamente.
revoke update on public.event_registrations from anon, authenticated;
grant update (attended, status) on public.event_registrations to authenticated;
revoke insert, update, delete on public.audit_log from anon, authenticated;
revoke insert, update, delete on public.user_roles from anon;
