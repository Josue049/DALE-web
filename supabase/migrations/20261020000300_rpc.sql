-- =====================================================================
-- DALE CON TODO — operaciones atómicas (RPC) con control de permisos
-- Todas son SECURITY DEFINER y validan explícitamente quién llama.
-- =====================================================================

-- ---------- Eventos -------------------------------------------------
-- Disponibilidad pública agregada: nunca expone datos de asistentes.
create or replace function public.event_availability(p_ids uuid[])
returns table (event_id uuid, confirmed int, capacity int, waitlisted int)
language sql stable security definer set search_path = public as $$
  select e.id,
         (select count(*)::int from public.event_registrations r where r.event_id = e.id and r.status = 'confirmed'),
         e.capacity,
         (select count(*)::int from public.event_registrations r where r.event_id = e.id and r.status = 'waitlisted')
  from public.events e
  where e.id = any (p_ids) and e.status in ('published', 'cancelled')
$$;

create or replace function public.is_utp(u text) returns boolean
language sql immutable as $$
  select coalesce(u ~* '(^|[^a-z])utp([^a-z]|$)' or u ~* 'tecnol[oó]gica del per[uú]', false)
$$;

create or replace function public.register_for_event(p_event uuid, p_guest_name text default null, p_guest_email text default null)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  ev public.events;
  uid uuid := auth.uid();
  prof public.profiles;
  existing public.event_registrations;
  taken int;
  new_status public.registration_status;
  reg public.event_registrations;
begin
  -- Bloquea la fila del evento: serializa inscripciones concurrentes y evita sobrecupo.
  select * into ev from public.events where id = p_event for update;
  if not found or ev.status <> 'published' then
    raise exception 'El evento no está disponible para inscripción' using errcode = 'P0001';
  end if;
  if ev.registration_opens_at is not null and now() < ev.registration_opens_at then
    raise exception 'Las inscripciones aún no abren' using errcode = 'P0001';
  end if;
  if now() >= coalesce(ev.registration_closes_at, ev.ends_at, ev.starts_at) then
    raise exception 'Las inscripciones están cerradas' using errcode = 'P0001';
  end if;

  if uid is null then
    if not ev.allow_guests then
      raise exception 'Este evento requiere iniciar sesión para inscribirse' using errcode = 'P0001';
    end if;
    if ev.eligibility <> 'publico' then
      raise exception 'Este evento no admite invitados externos' using errcode = 'P0001';
    end if;
    p_guest_email := lower(trim(p_guest_email));
    p_guest_name := trim(p_guest_name);
    if p_guest_email is null or p_guest_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' or coalesce(char_length(p_guest_name), 0) < 2 then
      raise exception 'Nombre y correo válidos son obligatorios' using errcode = '22023';
    end if;
    select * into existing from public.event_registrations where event_id = p_event and lower(guest_email) = p_guest_email;
  else
    select * into prof from public.profiles where id = uid;
    if ev.eligibility = 'utp' and not public.is_utp(prof.university) then
      raise exception 'Este evento es exclusivo para estudiantes UTP (actualiza tu universidad en tu perfil)' using errcode = 'P0001';
    end if;
    if ev.eligibility = 'invitadas' and coalesce(trim(prof.university), '') = '' then
      raise exception 'Completa tu universidad en el perfil para inscribirte' using errcode = 'P0001';
    end if;
    select * into existing from public.event_registrations where event_id = p_event and user_id = uid;
  end if;

  if found and existing.status <> 'cancelled' then
    -- Deduplicación: devuelve la inscripción existente sin crear otra.
    return jsonb_build_object('id', existing.id, 'status', existing.status, 'token', existing.token, 'duplicate', true);
  end if;

  select count(*) into taken from public.event_registrations where event_id = p_event and status = 'confirmed';
  if ev.capacity is null or taken < ev.capacity then
    new_status := 'confirmed';
  elsif ev.waitlist_enabled then
    new_status := 'waitlisted';
  else
    raise exception 'Cupos agotados' using errcode = 'P0001';
  end if;

  if existing.id is not null then
    update public.event_registrations set status = new_status, cancelled_at = null, created_at = now()
      where id = existing.id returning * into reg;
  else
    insert into public.event_registrations (event_id, user_id, guest_name, guest_email, status)
    values (p_event, uid, case when uid is null then p_guest_name end, case when uid is null then p_guest_email end, new_status)
    returning * into reg;
  end if;

  return jsonb_build_object('id', reg.id, 'status', reg.status, 'token', reg.token, 'duplicate', false);
end $$;

-- Promueve en orden de llegada a la lista de espera cuando se libera un cupo.
create or replace function public.promote_waitlist(p_event uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  ev public.events;
  taken int;
begin
  select * into ev from public.events where id = p_event for update;
  if ev.capacity is null then return; end if;
  select count(*) into taken from public.event_registrations where event_id = p_event and status = 'confirmed';
  update public.event_registrations set status = 'confirmed'
  where id in (
    select id from public.event_registrations
    where event_id = p_event and status = 'waitlisted'
    order by created_at
    limit greatest(ev.capacity - taken, 0)
  );
end $$;

create or replace function public.cancel_event_registration(p_registration uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  reg public.event_registrations;
begin
  select * into reg from public.event_registrations where id = p_registration;
  if not found or (reg.user_id is distinct from auth.uid() and not public.can_manage_event(reg.event_id)) then
    raise exception 'Inscripción no encontrada' using errcode = 'P0002';
  end if;
  update public.event_registrations set status = 'cancelled', cancelled_at = now() where id = p_registration;
  perform public.promote_waitlist(reg.event_id);
end $$;

-- Consulta/cancelación segura para invitados con el token opaco del comprobante.
create or replace function public.get_registration_by_token(p_token text)
returns table (status public.registration_status, guest_name text, event_title text, event_slug text, starts_at timestamptz, modality public.modality)
language sql stable security definer set search_path = public as $$
  select r.status, r.guest_name, e.title, e.slug, e.starts_at, e.modality
  from public.event_registrations r join public.events e on e.id = r.event_id
  where r.token = p_token and length(p_token) = 64
$$;

create or replace function public.cancel_registration_by_token(p_token text) returns void
language plpgsql security definer set search_path = public as $$
declare
  reg public.event_registrations;
begin
  select * into reg from public.event_registrations where token = p_token and length(p_token) = 64;
  if not found then raise exception 'Comprobante no válido' using errcode = 'P0002'; end if;
  update public.event_registrations set status = 'cancelled', cancelled_at = now() where id = reg.id;
  perform public.promote_waitlist(reg.event_id);
end $$;

-- ---------- Concursos: inscripción, equipos y entregas --------------
create or replace function public.assert_contest_open(c public.contests) returns void
language plpgsql stable as $$
begin
  if c.status <> 'published' then
    raise exception 'El concurso no acepta inscripciones' using errcode = 'P0001';
  end if;
  if c.registration_opens_at is not null and now() < c.registration_opens_at then
    raise exception 'Las inscripciones aún no abren' using errcode = 'P0001';
  end if;
  if c.registration_closes_at is not null and now() >= c.registration_closes_at then
    raise exception 'Las inscripciones del concurso están cerradas' using errcode = 'P0001';
  end if;
end $$;

create or replace function public.assert_contest_eligible(c public.contests, u uuid) returns void
language plpgsql stable security definer set search_path = public as $$
declare
  prof public.profiles;
begin
  select * into prof from public.profiles where id = u;
  if c.eligibility = 'utp' and not public.is_utp(prof.university) then
    raise exception 'Concurso exclusivo para estudiantes UTP (actualiza tu universidad en tu perfil)' using errcode = 'P0001';
  end if;
  if c.eligibility = 'invitadas' and coalesce(trim(prof.university), '') = '' then
    raise exception 'Completa tu universidad en el perfil para participar' using errcode = 'P0001';
  end if;
end $$;

create or replace function public.user_in_contest(c uuid, u uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.contest_entries where contest_id = c and user_id = u and status = 'active')
      or exists (select 1 from public.team_members where contest_id = c and user_id = u and status = 'accepted')
$$;

create or replace function public.register_contest_individual(p_contest uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  c public.contests;
  uid uuid := auth.uid();
  entry_id uuid;
begin
  if uid is null then raise exception 'Inicia sesión para inscribirte' using errcode = '42501'; end if;
  select * into c from public.contests where id = p_contest for update;
  if not found then raise exception 'Concurso no encontrado' using errcode = 'P0002'; end if;
  perform public.assert_contest_open(c);
  if c.participation_mode = 'equipo' then
    raise exception 'Este concurso solo admite equipos' using errcode = 'P0001';
  end if;
  perform public.assert_contest_eligible(c, uid);
  if public.user_in_contest(p_contest, uid) then
    raise exception 'Ya estás inscrito en este concurso' using errcode = '23505';
  end if;
  insert into public.contest_entries (contest_id, user_id) values (p_contest, uid)
  on conflict (contest_id, user_id) where user_id is not null do update set status = 'active'
  returning id into entry_id;
  return entry_id;
end $$;

-- Crear equipo = inscribir el equipo en el concurso, con la persona capitana aceptada.
create or replace function public.create_team(p_contest uuid, p_name text) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  c public.contests;
  uid uuid := auth.uid();
  t_id uuid;
begin
  if uid is null then raise exception 'Inicia sesión para crear un equipo' using errcode = '42501'; end if;
  select * into c from public.contests where id = p_contest for update;
  if not found then raise exception 'Concurso no encontrado' using errcode = 'P0002'; end if;
  perform public.assert_contest_open(c);
  if c.participation_mode = 'individual' then
    raise exception 'Este concurso es individual' using errcode = 'P0001';
  end if;
  perform public.assert_contest_eligible(c, uid);
  if public.user_in_contest(p_contest, uid) then
    raise exception 'Ya participas en este concurso' using errcode = '23505';
  end if;
  insert into public.teams (contest_id, name, captain_id) values (p_contest, trim(p_name), uid) returning id into t_id;
  insert into public.team_members (team_id, contest_id, user_id, status, invited_by, responded_at)
    values (t_id, p_contest, uid, 'accepted', uid, now());
  insert into public.contest_entries (contest_id, team_id) values (p_contest, t_id);
  return t_id;
end $$;

create or replace function public.invite_to_team(p_team uuid, p_email text) returns void
language plpgsql security definer set search_path = public as $$
declare
  t public.teams;
  c public.contests;
  invitee uuid;
  occupied int;
begin
  select * into t from public.teams where id = p_team for update;
  if not found or t.captain_id <> auth.uid() then
    raise exception 'Solo la persona capitana puede invitar' using errcode = '42501';
  end if;
  select * into c from public.contests where id = t.contest_id;
  perform public.assert_contest_open(c);
  select id into invitee from auth.users where lower(email) = lower(trim(p_email));
  if invitee is null then
    raise exception 'No existe una cuenta con ese correo. Pídele que se registre primero.' using errcode = 'P0002';
  end if;
  if public.user_in_contest(t.contest_id, invitee) then
    raise exception 'Esa persona ya participa en este concurso' using errcode = '23505';
  end if;
  select count(*) into occupied from public.team_members where team_id = p_team and status in ('accepted', 'invited');
  if occupied >= c.max_team_size then
    raise exception 'El equipo ya alcanzó el tamaño máximo (%)', c.max_team_size using errcode = 'P0001';
  end if;
  insert into public.team_members (team_id, contest_id, user_id, status, invited_by)
  values (p_team, t.contest_id, invitee, 'invited', auth.uid())
  on conflict (team_id, user_id) do update set status = 'invited', invited_by = auth.uid(), responded_at = null
    where public.team_members.status = 'declined';
end $$;

create or replace function public.respond_team_invite(p_team uuid, p_accept boolean) returns void
language plpgsql security definer set search_path = public as $$
declare
  t public.teams;
  c public.contests;
  m public.team_members;
  accepted_count int;
begin
  select * into t from public.teams where id = p_team for update;
  select * into m from public.team_members where team_id = p_team and user_id = auth.uid();
  if not found or m.status <> 'invited' then
    raise exception 'No tienes una invitación pendiente para este equipo' using errcode = 'P0002';
  end if;
  if not p_accept then
    update public.team_members set status = 'declined', responded_at = now() where team_id = p_team and user_id = auth.uid();
    return;
  end if;
  select * into c from public.contests where id = t.contest_id;
  perform public.assert_contest_open(c);
  perform public.assert_contest_eligible(c, auth.uid());
  if public.user_in_contest(t.contest_id, auth.uid()) then
    raise exception 'Ya participas en este concurso con otra inscripción' using errcode = '23505';
  end if;
  select count(*) into accepted_count from public.team_members where team_id = p_team and status = 'accepted';
  if accepted_count >= c.max_team_size then
    raise exception 'El equipo ya está completo' using errcode = 'P0001';
  end if;
  update public.team_members set status = 'accepted', responded_at = now() where team_id = p_team and user_id = auth.uid();
end $$;

create or replace function public.leave_team(p_team uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  t public.teams;
begin
  select * into t from public.teams where id = p_team for update;
  if not found then raise exception 'Equipo no encontrado' using errcode = 'P0002'; end if;
  if t.captain_id = auth.uid() then
    raise exception 'La persona capitana no puede abandonar el equipo; retira la inscripción' using errcode = 'P0001';
  end if;
  delete from public.team_members where team_id = p_team and user_id = auth.uid();
end $$;

create or replace function public.withdraw_contest_entry(p_entry uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  en public.contest_entries;
  t public.teams;
  c public.contests;
begin
  select * into en from public.contest_entries where id = p_entry for update;
  if not found then raise exception 'Inscripción no encontrada' using errcode = 'P0002'; end if;
  if en.team_id is not null then
    select * into t from public.teams where id = en.team_id;
    if t.captain_id <> auth.uid() then raise exception 'Solo la persona capitana puede retirar al equipo' using errcode = '42501'; end if;
  elsif en.user_id <> auth.uid() then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  select * into c from public.contests where id = en.contest_id;
  if c.results_published then raise exception 'El concurso ya publicó resultados' using errcode = 'P0001'; end if;
  if en.team_id is not null then
    delete from public.teams where id = en.team_id; -- en cascada: integrantes, inscripción y entregas
  else
    update public.contest_entries set status = 'withdrawn' where id = p_entry;
  end if;
end $$;

-- Entrega/actualización atómica. El trigger guard_submission valida plazo y etapa.
create or replace function public.upsert_submission(p_entry uuid, p_stage uuid, p_title text, p_description text, p_link_url text, p_file_path text)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  en public.contest_entries;
  c public.contests;
  members int;
  sid uuid;
begin
  select * into en from public.contest_entries where id = p_entry for update;
  if not found or not public.is_entry_member(p_entry) then
    raise exception 'No participas en esta inscripción' using errcode = '42501';
  end if;
  select * into c from public.contests where id = en.contest_id;
  if en.team_id is not null then
    select count(*) into members from public.team_members where team_id = en.team_id and status = 'accepted';
    if members < c.min_team_size then
      raise exception 'El equipo necesita al menos % integrantes aceptados para entregar', c.min_team_size using errcode = 'P0001';
    end if;
  end if;
  if p_file_path is not null and split_part(p_file_path, '/', 1) <> p_entry::text then
    raise exception 'Ruta de archivo inválida' using errcode = '22023';
  end if;
  insert into public.submissions (entry_id, stage_id, title, description, link_url, file_path, submitted_by)
  values (p_entry, p_stage, trim(p_title), coalesce(p_description, ''), nullif(trim(p_link_url), ''), nullif(p_file_path, ''), auth.uid())
  on conflict (entry_id, stage_id) do update
    set title = excluded.title, description = excluded.description, link_url = excluded.link_url,
        file_path = coalesce(excluded.file_path, public.submissions.file_path), submitted_by = excluded.submitted_by
  returning id into sid;
  return sid;
end $$;

-- ---------- Jurado --------------------------------------------------
create or replace function public.judge_assignments()
returns table (
  submission_id uuid, contest_id uuid, contest_title text, contest_slug text, stage_name text,
  entry_label text, title text, description text, link_url text, file_path text, submitted_at timestamptz,
  scored_criteria int, total_criteria int, results_published boolean
)
language sql stable security definer set search_path = public as $$
  select s.id, c.id, c.title, c.slug, st.name,
         coalesce(t.name, 'Participación individual #' || left(ce.id::text, 6)),
         s.title, s.description, s.link_url, s.file_path, s.submitted_at,
         (select count(*)::int from public.scores sc where sc.submission_id = s.id and sc.judge_id = auth.uid()),
         (select count(*)::int from public.rubric_criteria rc where rc.contest_id = c.id),
         c.results_published
  from public.contest_judges j
  join public.contests c on c.id = j.contest_id
  join public.contest_entries ce on ce.contest_id = c.id and ce.status = 'active'
  join public.submissions s on s.entry_id = ce.id
  join public.contest_stages st on st.id = s.stage_id
  left join public.teams t on t.id = ce.team_id
  where j.user_id = auth.uid()
  order by c.title, s.submitted_at
$$;

-- ---------- Resultados ----------------------------------------------
create or replace function public.compute_contest_results(p_contest uuid) returns int
language plpgsql security definer set search_path = public as $$
declare
  n int;
begin
  if not public.can_manage_contest(p_contest) then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  delete from public.contest_results where contest_id = p_contest and award is null;
  with per_judge as (
    -- Puntaje ponderado normalizado (0–100) por jurado y entrega.
    select ce.id as entry_id, sc.judge_id,
           sum(sc.score / rc.max_score * rc.weight) / nullif(sum(rc.weight), 0) * 100 as pct
    from public.scores sc
    join public.rubric_criteria rc on rc.id = sc.criterion_id
    join public.submissions s on s.id = sc.submission_id
    join public.contest_entries ce on ce.id = s.entry_id
    where ce.contest_id = p_contest and ce.status = 'active'
    group by ce.id, sc.judge_id
  ), totals as (
    select entry_id, avg(pct) as total from per_judge group by entry_id
  ), ranked as (
    select t.entry_id, round(t.total::numeric, 3) as total, rank() over (order by t.total desc) as rnk,
           coalesce(tm.name, nullif(p.full_name, ''), 'Participante') as label
    from totals t
    join public.contest_entries ce on ce.id = t.entry_id
    left join public.teams tm on tm.id = ce.team_id
    left join public.profiles p on p.id = ce.user_id
  )
  insert into public.contest_results (contest_id, entry_id, display_name, rank, total_score)
  select p_contest, entry_id, label, rnk, total from ranked
  on conflict (contest_id, entry_id) do update set rank = excluded.rank, total_score = excluded.total_score, display_name = excluded.display_name;
  get diagnostics n = row_count;
  return n;
end $$;

create or replace function public.set_contest_results_published(p_contest uuid, p_published boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.can_manage_contest(p_contest) then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  update public.contests
     set results_published = p_published,
         results_published_at = case when p_published then now() else null end
   where id = p_contest;
end $$;

-- ---------- Membresía y comunidad -----------------------------------
create or replace function public.submit_membership_application(
  p_full_name text, p_email text, p_university text, p_career text, p_campus text,
  p_lines public.activity_line[], p_interests text[], p_motivation text, p_consent_data boolean, p_consent_contact boolean
) returns text
language plpgsql security definer set search_path = public as $$
declare
  existing uuid;
begin
  if not coalesce(p_consent_data, false) then
    raise exception 'Debes aceptar el tratamiento de datos para continuar' using errcode = '22023';
  end if;
  select id into existing from public.membership_applications where lower(email) = lower(trim(p_email));
  if existing is not null then
    update public.membership_applications
       set full_name = trim(p_full_name), university = trim(p_university), career = trim(p_career), campus = nullif(trim(p_campus), ''),
           lines = coalesce(p_lines, '{}'), interests = coalesce(p_interests, '{}'), motivation = p_motivation,
           consent_contact = coalesce(p_consent_contact, false), user_id = coalesce(user_id, auth.uid())
     where id = existing;
    return 'updated';
  end if;
  insert into public.membership_applications (full_name, email, university, career, campus, lines, interests, motivation, consent_data, consent_contact, user_id)
  values (trim(p_full_name), lower(trim(p_email)), trim(p_university), trim(p_career), nullif(trim(p_campus), ''),
          coalesce(p_lines, '{}'), coalesce(p_interests, '{}'), p_motivation, true, coalesce(p_consent_contact, false), auth.uid());
  return 'created';
end $$;

-- Directorio opt-in: solo columnas no sensibles de perfiles públicos.
create or replace function public.search_members(p_query text default null, p_career text default null, p_limit int default 24, p_offset int default 0)
returns table (id uuid, full_name text, username text, university text, career text, bio text, interests text[], skills text[], open_to_volunteer boolean, avatar_url text)
language sql stable security definer set search_path = public as $$
  select p.id, p.full_name, p.username, p.university, p.career, p.bio, p.interests, p.skills, p.open_to_volunteer, p.avatar_url
  from public.profiles p
  where p.is_public
    and (p_query is null or p.full_name ilike '%' || p_query || '%' or p.career ilike '%' || p_query || '%'
         or exists (select 1 from unnest(p.skills || p.interests) s where s ilike '%' || p_query || '%'))
    and (p_career is null or p.career ilike '%' || p_career || '%')
  order by p.public_consent_at desc nulls last
  limit least(greatest(p_limit, 1), 60) offset greatest(p_offset, 0)
$$;

-- ---------- Reconocimientos -----------------------------------------
create or replace function public.verify_recognition(p_token text)
returns table (title text, kind public.recognition_kind, holder text, issued_at timestamptz, event_title text, contest_title text, revoked boolean)
language sql stable security definer set search_path = public as $$
  select r.title, r.kind,
         case when r.public_verification then r.holder_name
              else split_part(r.holder_name, ' ', 1) || ' ' || left(split_part(r.holder_name, ' ', 2), 1) || '.' end,
         r.issued_at, e.title, c.title, r.revoked_at is not null
  from public.recognitions r
  left join public.events e on e.id = r.event_id
  left join public.contests c on c.id = r.contest_id
  where r.verify_token = p_token and length(p_token) = 64
$$;

-- Certificados de asistencia: SOLO para asistencia marcada, nunca por simple registro.
create or replace function public.issue_event_certificates(p_event uuid) returns int
language plpgsql security definer set search_path = public as $$
declare
  ev public.events;
  n int;
begin
  if not public.is_admin() then raise exception 'Solo administración emite certificados' using errcode = '42501'; end if;
  select * into ev from public.events where id = p_event;
  insert into public.recognitions (user_id, kind, title, holder_name, event_id, issued_by)
  select r.user_id, 'certificado', 'Certificado de asistencia · ' || ev.title, coalesce(nullif(p.full_name, ''), 'Participante'), ev.id, auth.uid()
  from public.event_registrations r
  join public.profiles p on p.id = r.user_id
  where r.event_id = p_event and r.attended and r.status = 'confirmed' and r.user_id is not null
  on conflict do nothing;
  get diagnostics n = row_count;
  return n;
end $$;

create or replace function public.issue_recognition(p_user uuid, p_kind public.recognition_kind, p_title text, p_description text, p_badge uuid, p_event uuid, p_contest uuid)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  rid uuid;
  holder text;
begin
  if not public.is_admin() then raise exception 'Solo administración emite reconocimientos' using errcode = '42501'; end if;
  select coalesce(nullif(full_name, ''), 'Participante') into holder from public.profiles where id = p_user;
  if holder is null then raise exception 'Usuario no encontrado' using errcode = 'P0002'; end if;
  insert into public.recognitions (user_id, kind, title, description, holder_name, badge_id, event_id, contest_id, issued_by)
  values (p_user, p_kind, p_title, p_description, holder, p_badge, p_event, p_contest, auth.uid())
  returning id into rid;
  return rid;
end $$;

-- ---------- Administración ------------------------------------------
create or replace function public.admin_list_users(p_query text default null, p_limit int default 25, p_offset int default 0)
returns table (id uuid, email text, full_name text, university text, career text, roles public.app_role[], created_at timestamptz, total bigint)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_staff() then raise exception 'No autorizado' using errcode = '42501'; end if;
  return query
  select u.id, u.email::text, p.full_name, p.university, p.career,
         coalesce((select array_agg(r.role order by r.role) from public.user_roles r where r.user_id = u.id), '{}'),
         u.created_at, count(*) over ()
  from auth.users u
  left join public.profiles p on p.id = u.id
  where p_query is null or u.email ilike '%' || p_query || '%' or p.full_name ilike '%' || p_query || '%'
  order by u.created_at desc
  limit least(greatest(p_limit, 1), 100) offset greatest(p_offset, 0);
end $$;

create or replace function public.admin_set_role(p_user uuid, p_role public.app_role, p_grant boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Solo administración gestiona roles' using errcode = '42501'; end if;
  if p_role = 'member' and not p_grant then raise exception 'El rol miembro es permanente' using errcode = 'P0001'; end if;
  if p_user = auth.uid() and p_role = 'admin' and not p_grant then
    raise exception 'No puedes retirarte el rol de administración a ti mismo' using errcode = 'P0001';
  end if;
  if p_grant then
    insert into public.user_roles (user_id, role, granted_by) values (p_user, p_role, auth.uid()) on conflict do nothing;
  else
    delete from public.user_roles where user_id = p_user and role = p_role;
  end if;
end $$;

create or replace function public.admin_assign_judge(p_contest uuid, p_email text, p_display_name text, p_bio text) returns void
language plpgsql security definer set search_path = public as $$
declare
  uid uuid;
begin
  if not public.can_manage_contest(p_contest) then raise exception 'No autorizado' using errcode = '42501'; end if;
  select id into uid from auth.users where lower(email) = lower(trim(p_email));
  if uid is null then raise exception 'No existe una cuenta con ese correo' using errcode = 'P0002'; end if;
  insert into public.user_roles (user_id, role, granted_by) values (uid, 'judge', auth.uid()) on conflict do nothing;
  insert into public.contest_judges (contest_id, user_id, display_name, bio)
  values (p_contest, uid, trim(p_display_name), p_bio)
  on conflict (contest_id, user_id) do update set display_name = excluded.display_name, bio = excluded.bio;
end $$;

create or replace function public.admin_stats() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  result jsonb;
begin
  if not public.is_staff() then raise exception 'No autorizado' using errcode = '42501'; end if;
  select jsonb_build_object(
    'members', (select count(*) from public.profiles),
    'public_members', (select count(*) from public.profiles where is_public),
    'applications', (select count(*) from public.membership_applications),
    'applications_new', (select count(*) from public.membership_applications where status = 'new'),
    'events_published', (select count(*) from public.events where status = 'published'),
    'events_upcoming', (select count(*) from public.events where status = 'published' and starts_at > now()),
    'registrations', (select count(*) from public.event_registrations where status <> 'cancelled'),
    'contests_published', (select count(*) from public.contests where status in ('published', 'closed')),
    'entries', (select count(*) from public.contest_entries where status = 'active'),
    'submissions', (select count(*) from public.submissions),
    'projects_pending', (select count(*) from public.projects where status = 'pending'),
    'projects_approved', (select count(*) from public.projects where status = 'approved'),
    'opportunities_active', (select count(*) from public.opportunities where status = 'published' and (deadline is null or deadline > now())),
    'messages_open', (select count(*) from public.contact_messages where not handled),
    'registrations_by_month', coalesce((
      select jsonb_agg(jsonb_build_object('month', m, 'count', n) order by m)
      from (
        select to_char(date_trunc('month', created_at at time zone 'America/Lima'), 'YYYY-MM') as m, count(*) as n
        from public.event_registrations
        where status <> 'cancelled' and created_at > now() - interval '6 months'
        group by 1
      ) s
    ), '[]'::jsonb),
    'members_by_career', coalesce((
      select jsonb_agg(jsonb_build_object('career', career, 'count', n) order by n desc)
      from (
        select coalesce(nullif(trim(career), ''), 'Sin especificar') as career, count(*) as n
        from public.profiles group by 1 order by 2 desc limit 8
      ) s
    ), '[]'::jsonb),
    'top_events', coalesce((
      select jsonb_agg(jsonb_build_object('title', title, 'count', n) order by n desc)
      from (
        select e.title, count(r.id) as n
        from public.events e left join public.event_registrations r on r.event_id = e.id and r.status <> 'cancelled'
        where e.status = 'published' group by e.id, e.title order by 2 desc limit 5
      ) s
    ), '[]'::jsonb)
  ) into result;
  return result;
end $$;

-- Las RPC se exponen a clientes; las auxiliares internas no.
revoke execute on function public.promote_waitlist(uuid) from public, anon, authenticated;
revoke execute on function public.assert_contest_open(public.contests) from public, anon, authenticated;
revoke execute on function public.assert_contest_eligible(public.contests, uuid) from public, anon, authenticated;
revoke execute on function public.user_in_contest(uuid, uuid) from public, anon, authenticated;
