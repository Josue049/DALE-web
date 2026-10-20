import {beforeAll, describe, expect, it} from 'vitest';
import {createDb, errorOf, type Db} from './harness';

let db: Db;
let admin: string, organizer: string, otherOrganizer: string, judge: string, ana: string, beto: string, carla: string, dani: string;

const q = async <T = Record<string, unknown>>(sql: string, params: unknown[] = []) => (await db.query<T>(sql, params)).rows;
const one = async <T = Record<string, unknown>>(sql: string, params: unknown[] = []) => (await q<T>(sql, params))[0];

beforeAll(async () => {
  db = await createDb();
  admin = await db.createUser('admin@dale.test', 'Admin Uno');
  organizer = await db.createUser('org@dale.test', 'Orga Nizadora');
  otherOrganizer = await db.createUser('org2@dale.test', 'Otra Orga');
  judge = await db.createUser('jurado@dale.test', 'Jurado Justo');
  ana = await db.createUser('ana@dale.test', 'Ana Pérez');
  beto = await db.createUser('beto@dale.test', 'Beto Ruiz');
  carla = await db.createUser('carla@dale.test', 'Carla Díaz');
  dani = await db.createUser('dani@dale.test', 'Dani Rojas');
  // Primer admin: se asigna con acceso privilegiado (script make-admin), nunca desde el cliente.
  await db.query(`insert into user_roles (user_id, role) values ($1, 'admin'), ($2, 'organizer'), ($3, 'organizer')`, [admin, organizer, otherOrganizer]);
  for (const [u, uni, career] of [
    [ana, 'Universidad Tecnológica del Perú', 'Ingeniería Industrial'],
    [beto, 'UTP', 'Derecho'],
    [carla, 'UTP', 'Diseño Gráfico'],
    [dani, 'Universidad Invitada', 'Marketing'],
  ]) {
    await db.query(`update profiles set university = $2, career = $3 where id = $1`, [u, uni, career]);
  }
});

describe('auth, perfiles y roles', () => {
  it('el alta crea perfil y SOLO el rol miembro', async () => {
    const u = await db.createUser('nuevo@dale.test', 'Nuevo Miembro');
    const p = await one<{full_name: string}>(`select full_name from profiles where id = $1`, [u]);
    expect(p.full_name).toBe('Nuevo Miembro');
    const roles = await q<{role: string}>(`select role from user_roles where user_id = $1`, [u]);
    expect(roles.map((r) => r.role)).toEqual(['member']);
  });

  it('un miembro no puede auto-asignarse roles', async () => {
    const err = await db.as(ana, () => errorOf(db.query(`insert into user_roles (user_id, role) values ($1, 'admin')`, [ana])));
    expect(err).toMatch(/row-level security|permission denied/);
    const err2 = await db.as(ana, () => errorOf(db.query(`select admin_set_role($1, 'admin', true)`, [ana])));
    expect(err2).toMatch(/Solo administración/);
  });

  it('cada persona ve solo su perfil; el directorio muestra solo perfiles opt-in', async () => {
    const seen = await db.as(ana, () => q(`select id from profiles`));
    expect(seen).toHaveLength(1);
    await db.as(beto, () => db.query(`update profiles set is_public = true, bio = 'Derecho y tecnología' where id = $1`, [beto]));
    const dir = await db.as(null, () => q<{full_name: string}>(`select * from search_members(null, null, 24, 0)`));
    expect(dir.map((d) => d.full_name)).toEqual(['Beto Ruiz']);
    const consent = await one<{public_consent_at: string | null}>(`select public_consent_at from profiles where id = $1`, [beto]);
    expect(consent.public_consent_at).not.toBeNull();
  });

  it('admin lista usuarios y asigna roles; un miembro no', async () => {
    const list = await db.as(admin, () => q<{email: string}>(`select * from admin_list_users(null, 50, 0)`));
    expect(list.length).toBeGreaterThanOrEqual(8);
    expect(await db.as(ana, () => errorOf(db.query(`select * from admin_list_users(null, 50, 0)`)))).toMatch(/No autorizado/);
  });
});

describe('Dale Talks: eventos e inscripciones', () => {
  let eventId: string;

  it('staff crea un evento en borrador invisible al público y lo publica', async () => {
    const ev = await db.as(organizer, () =>
      one<{id: string}>(
        `insert into events (slug, title, starts_at, capacity, waitlist_enabled, allow_guests, created_by)
         values ('webinar-prueba', 'Webinar de prueba', now() + interval '5 days', 2, true, true, $1) returning id`,
        [organizer],
      ),
    );
    eventId = ev.id;
    expect(await db.as(null, () => q(`select id from events where id = $1`, [eventId]))).toHaveLength(0);
    await db.as(organizer, () => db.query(`update events set status = 'published' where id = $1`, [eventId]));
    expect(await db.as(null, () => q(`select id from events where id = $1`, [eventId]))).toHaveLength(1);
  });

  it('un miembro no puede crear eventos y otro organizador no edita eventos ajenos', async () => {
    const err = await db.as(ana, () => errorOf(db.query(`insert into events (slug, title, starts_at, created_by) values ('x-y', 'Hack', now(), $1)`, [ana])));
    expect(err).toMatch(/row-level security/);
    const res = await db.as(otherOrganizer, () => db.query(`update events set title = 'Secuestrado' where id = $1`, [eventId]));
    expect(res.affectedRows).toBe(0);
  });

  it('inscripción con cupo, deduplicación y lista de espera', async () => {
    const r1 = await db.as(ana, () => one<{r: {status: string; duplicate: boolean}}>(`select register_for_event($1) as r`, [eventId]));
    expect(r1.r.status).toBe('confirmed');
    const dup = await db.as(ana, () => one<{r: {status: string; duplicate: boolean}}>(`select register_for_event($1) as r`, [eventId]));
    expect(dup.r.duplicate).toBe(true);
    const r2 = await db.as(null, () => one<{r: {status: string; token: string}}>(`select register_for_event($1, 'Invitada Externa', 'Invitada@Mail.com') as r`, [eventId]));
    expect(r2.r.status).toBe('confirmed');
    const r3 = await db.as(beto, () => one<{r: {status: string}}>(`select register_for_event($1) as r`, [eventId]));
    expect(r3.r.status).toBe('waitlisted');
    const n = await one<{n: number}>(`select count(*)::int as n from event_registrations where event_id = $1`, [eventId]);
    expect(n.n).toBe(3);

    // El invitado consulta su comprobante con el token, y lo cancela: Beto sube de la lista de espera.
    const info = await db.as(null, () => one<{status: string; event_title: string}>(`select * from get_registration_by_token($1)`, [r2.r.token]));
    expect(info.event_title).toBe('Webinar de prueba');
    await db.as(null, () => db.query(`select cancel_registration_by_token($1)`, [r2.r.token]));
    const beto2 = await one<{status: string}>(`select status from event_registrations where event_id = $1 and user_id = $2`, [eventId, beto]);
    expect(beto2.status).toBe('confirmed');
  });

  it('sin lista de espera se rechaza el sobrecupo; el público ve solo agregados', async () => {
    await db.as(organizer, () => db.query(`update events set waitlist_enabled = false where id = $1`, [eventId]));
    expect(await db.as(carla, () => errorOf(db.query(`select register_for_event($1)`, [eventId])))).toMatch(/Cupos agotados/);
    const av = await db.as(null, () => one<{confirmed: number; capacity: number}>(`select * from event_availability(array[$1]::uuid[])`, [eventId]));
    expect(av).toMatchObject({confirmed: 2, capacity: 2});
    expect(await db.as(null, () => q(`select * from event_registrations`))).toHaveLength(0);
    expect(await db.as(carla, () => q(`select * from event_registrations`))).toHaveLength(0);
  });

  it('el enlace privado solo lo ven inscritos confirmados y staff', async () => {
    await db.as(organizer, () => db.query(`insert into event_access (event_id, online_url) values ($1, 'https://meet.example/abc')`, [eventId]));
    expect(await db.as(ana, () => q(`select online_url from event_access where event_id = $1`, [eventId]))).toHaveLength(1);
    expect(await db.as(carla, () => q(`select online_url from event_access where event_id = $1`, [eventId]))).toHaveLength(0);
    expect(await db.as(null, () => q(`select online_url from event_access where event_id = $1`, [eventId]))).toHaveLength(0);
  });

  it('elegibilidad UTP y cierre por fecha', async () => {
    const utp = await one<{id: string}>(`select id from events where slug = 'demo-taller-oratoria-presencial'`);
    expect(await db.as(dani, () => errorOf(db.query(`select register_for_event($1)`, [utp.id])))).toMatch(/exclusivo para estudiantes UTP/);
    expect(await db.as(null, () => errorOf(db.query(`select register_for_event($1, 'X Y', 'x@y.com')`, [utp.id])))).toMatch(/requiere iniciar sesión/);
    const ok = await db.as(carla, () => one<{r: {status: string}}>(`select register_for_event($1) as r`, [utp.id]));
    expect(ok.r.status).toBe('confirmed');
    const past = await one<{id: string}>(`select id from events where slug = 'demo-encuentro-network-pasado'`);
    expect(await db.as(ana, () => errorOf(db.query(`select register_for_event($1)`, [past.id])))).toMatch(/cerradas/);
  });

  it('certificados solo para asistencia marcada, verificables con token opaco', async () => {
    await db.as(organizer, () => db.query(`update event_registrations set attended = true where event_id = $1 and user_id = $2`, [eventId, ana]));
    const n = await db.as(admin, () => one<{n: number}>(`select issue_event_certificates($1) as n`, [eventId]));
    expect(n.n).toBe(1); // Beto está inscrito pero no asistió: no recibe certificado.
    const mine = await db.as(ana, () => q<{verify_token: string}>(`select verify_token from recognitions`));
    expect(mine).toHaveLength(1);
    expect(await db.as(beto, () => q(`select * from recognitions`))).toHaveLength(0);
    const v = await db.as(null, () => one<{holder: string; revoked: boolean}>(`select * from verify_recognition($1)`, [mine[0].verify_token]));
    expect(v).toMatchObject({holder: 'Ana Pérez', revoked: false});
    await db.as(ana, () => db.query(`update recognitions set public_verification = false`));
    const v2 = await db.as(null, () => one<{holder: string}>(`select * from verify_recognition($1)`, [mine[0].verify_token]));
    expect(v2.holder).toBe('Ana P.');
    expect(await db.as(ana, () => errorOf(db.query(`update recognitions set title = 'Falso'`)))).toMatch(/visibilidad/);
    expect(await db.as(organizer, () => errorOf(db.query(`select issue_event_certificates($1)`, [eventId])))).toMatch(/Solo administración/);
  });
});

describe('Dale Challenge: equipos, entregas, jurado y resultados', () => {
  let contestId: string, teamId: string, entryId: string, stageId: string, closedStageId: string, submissionId: string;

  beforeAll(async () => {
    const c = await one<{id: string}>(`select id from contests where slug = 'demo-desafio-multidisciplinario'`);
    contestId = c.id;
    stageId = (await one<{id: string}>(`select id from contest_stages where contest_id = $1 and accepts_submissions`, [contestId])).id;
    closedStageId = (await one<{id: string}>(`select id from contest_stages where contest_id = $1 and position = 2`, [contestId])).id;
  });

  it('crear equipo inscribe al equipo; no se permite participar dos veces', async () => {
    teamId = await db.as(ana, async () => (await one<{id: string}>(`select create_team($1, 'Las Integrales') as id`, [contestId])).id);
    entryId = (await one<{id: string}>(`select id from contest_entries where team_id = $1`, [teamId])).id;
    expect(await db.as(ana, () => errorOf(db.query(`select create_team($1, 'Otro')`, [contestId])))).toMatch(/Ya participas/);
    expect(await db.as(ana, () => errorOf(db.query(`select register_contest_individual($1)`, [contestId])))).toMatch(/solo admite equipos/);
  });

  it('invitaciones: solo capitana invita, se acepta y se respeta el máximo', async () => {
    expect(await db.as(beto, () => errorOf(db.query(`select invite_to_team($1, 'carla@dale.test')`, [teamId])))).toMatch(/capitana/);
    await db.as(ana, () => db.query(`select invite_to_team($1, 'beto@dale.test')`, [teamId]));
    expect(await db.as(ana, () => errorOf(db.query(`select invite_to_team($1, 'nadie@dale.test')`, [teamId])))).toMatch(/No existe una cuenta/);
    await db.as(beto, () => db.query(`select respond_team_invite($1, true)`, [teamId]));
    const members = await db.as(beto, () => q<{status: string}>(`select status from team_members where team_id = $1`, [teamId]));
    expect(members.every((m) => m.status === 'accepted')).toBe(true);
    // Beto ya está en un equipo: no puede crear otro en el mismo concurso.
    expect(await db.as(beto, () => errorOf(db.query(`select create_team($1, 'Duplicado')`, [contestId])))).toMatch(/Ya participas/);
  });

  it('entregas solo dentro de plazo y en etapas que las aceptan', async () => {
    submissionId = await db.as(beto, async () =>
      (await one<{id: string}>(`select upsert_submission($1, $2, 'Propuesta Integral', 'Descripción', 'https://example.org/propuesta', null) as id`, [entryId, stageId])).id,
    );
    // Re-entrega: actualiza, no duplica.
    await db.as(ana, () => db.query(`select upsert_submission($1, $2, 'Propuesta Integral v2', 'Desc', 'https://example.org/v2', null)`, [entryId, stageId]));
    const subs = await q<{title: string}>(`select title from submissions where entry_id = $1`, [entryId]);
    expect(subs).toEqual([{title: 'Propuesta Integral v2'}]);
    expect(await db.as(ana, () => errorOf(db.query(`select upsert_submission($1, $2, 'Tarde', '', 'https://x.org', null)`, [entryId, closedStageId])))).toMatch(/no recibe entregas/);
    await db.query(`update contest_stages set ends_at = now() - interval '1 minute', starts_at = now() - interval '2 days' where id = $1`, [stageId]);
    expect(await db.as(ana, () => errorOf(db.query(`select upsert_submission($1, $2, 'Tarde', '', 'https://x.org', null)`, [entryId, stageId])))).toMatch(/fuera de plazo/);
    expect(await db.as(carla, () => errorOf(db.query(`select upsert_submission($1, $2, 'Ajena', '', 'https://x.org', null)`, [entryId, stageId])))).toMatch(/No participas/);
    expect(await db.as(carla, () => q(`select * from submissions`))).toHaveLength(0);
  });

  it('el jurado solo ve y puntúa sus asignaciones; valida máximos', async () => {
    await db.query(`update contests set created_by = $1 where id = $2`, [organizer, contestId]);
    expect(await db.as(judge, () => q(`select * from judge_assignments()`))).toHaveLength(0);
    await db.as(organizer, () => db.query(`select admin_assign_judge($1, 'jurado@dale.test', 'Jurado Justo', null)`, [contestId]));
    const assigned = await db.as(judge, () => q<{submission_id: string; total_criteria: number}>(`select * from judge_assignments()`));
    expect(assigned).toHaveLength(1);
    expect(assigned[0].total_criteria).toBe(4);
    const crit = await q<{id: string; max_score: number}>(`select id, max_score from rubric_criteria where contest_id = $1 order by position`, [contestId]);
    expect(await db.as(judge, () => errorOf(db.query(`insert into scores (submission_id, criterion_id, score) values ($1, $2, 11)`, [submissionId, crit[0].id])))).toMatch(/supera el máximo/);
    for (const [i, c] of crit.entries()) {
      await db.as(judge, () => db.query(`insert into scores (submission_id, criterion_id, score) values ($1, $2, $3)`, [submissionId, c.id, 8 + (i % 2)]));
    }
    expect(await db.as(ana, () => errorOf(db.query(`insert into scores (submission_id, criterion_id, score, judge_id) values ($1, $2, 10, $3)`, [submissionId, crit[0].id, ana])))).toMatch(/row-level security/);
    expect(await db.as(ana, () => q(`select * from scores`))).toHaveLength(0);
    // Los jurados no son públicos mientras el concurso no lo decida.
    expect(await db.as(null, () => q(`select * from contest_judges`))).toHaveLength(0);
  });

  it('resultados: ocultos hasta publicarse; luego públicos y evaluación cerrada', async () => {
    const n = await db.as(organizer, () => one<{n: number}>(`select compute_contest_results($1) as n`, [contestId]));
    expect(n.n).toBe(1);
    expect(await db.as(null, () => q(`select * from contest_results`))).toHaveLength(0);
    expect(await db.as(otherOrganizer, () => errorOf(db.query(`select set_contest_results_published($1, true)`, [contestId])))).toMatch(/No autorizado/);
    await db.as(organizer, () => db.query(`select set_contest_results_published($1, true)`, [contestId]));
    const pub = await db.as(null, () => q<{display_name: string; rank: number}>(`select display_name, rank from contest_results`));
    expect(pub).toEqual([{display_name: 'Las Integrales', rank: 1}]);
    const crit = await one<{id: string}>(`select id from rubric_criteria where contest_id = $1 limit 1`, [contestId]);
    expect(await db.as(judge, () => errorOf(db.query(`update scores set score = 1 where criterion_id = $1`, [crit.id])))).toMatch(/evaluación está cerrada/);
    expect(await db.as(null, () => q(`select * from scores`))).toHaveLength(0);
  });
});

describe('Dale Lab: proyectos y moderación', () => {
  let projectId: string;

  it('la propuesta de un miembro entra pendiente aunque intente auto-aprobarse', async () => {
    const p = await db.as(carla, () =>
      one<{id: string; status: string}>(`insert into projects (slug, title, status) values ('app-de-carla', 'App de Carla', 'approved') returning id, status`),
    );
    projectId = p.id;
    expect(p.status).toBe('pending');
    expect(await db.as(null, () => q(`select id from projects where id = $1`, [projectId]))).toHaveLength(0);
    expect(await db.as(carla, () => q(`select id from projects where id = $1`, [projectId]))).toHaveLength(1);
  });

  it('staff solicita cambios, aprueba y publica; editar vuelve a moderación', async () => {
    await db.as(organizer, () => db.query(`update projects set status = 'changes_requested', moderation_note = 'Agrega objetivos' where id = $1`, [projectId]));
    await db.as(organizer, () => db.query(`update projects set status = 'approved' where id = $1`, [projectId]));
    const pub = await db.as(null, () => one<{published_at: string | null}>(`select published_at from projects where id = $1`, [projectId]));
    expect(pub.published_at).not.toBeNull();
    const audit = await q(`select * from audit_log where entity = 'projects' and entity_id = $1`, [projectId]);
    expect(audit.length).toBe(2);
    // Solicitud de colaboración de otra persona.
    await db.as(dani, () => db.query(`insert into project_collab_requests (project_id, message) values ($1, 'Me encantaría ayudar con marketing')`, [projectId]));
    expect(await db.as(carla, () => q(`select * from project_collab_requests where project_id = $1`, [projectId]))).toHaveLength(1);
    expect(await db.as(beto, () => q(`select * from project_collab_requests where project_id = $1`, [projectId]))).toHaveLength(0);
    // La dueña edita: el proyecto vuelve a la cola.
    await db.as(carla, () => db.query(`update projects set summary = 'Nuevo resumen' where id = $1`, [projectId]));
    expect(await db.as(null, () => q(`select id from projects where id = $1`, [projectId]))).toHaveLength(0);
  });
});

describe('Dale Future, contenido y formularios públicos', () => {
  it('CRUD de oportunidades restringido a staff', async () => {
    const o = await db.as(organizer, () =>
      one<{id: string}>(`insert into opportunities (slug, title, category, status, created_by) values ('beca-x', 'Beca X', 'beca', 'published', $1) returning id`, [organizer]),
    );
    expect(await db.as(null, () => q(`select id from opportunities where id = $1`, [o.id]))).toHaveLength(1);
    await db.as(organizer, () => db.query(`update opportunities set title = 'Beca X 2026' where id = $1`, [o.id]));
    expect(await db.as(ana, () => errorOf(db.query(`insert into opportunities (slug, title, created_by) values ('z-z', 'Zeta', $1)`, [ana])))).toMatch(/row-level security/);
    const del = await db.as(ana, () => db.query(`delete from opportunities where id = $1`, [o.id]));
    expect(del.affectedRows).toBe(0);
    await db.as(organizer, () => db.query(`delete from opportunities where id = $1`, [o.id]));
    expect(await q(`select id from opportunities where id = $1`, [o.id])).toHaveLength(0);
  });

  it('solo admin edita la portada; los cambios quedan auditados', async () => {
    const res = await db.as(organizer, () => db.query(`update content_sections set data = '{}' where key = 'home.hero'`));
    expect(res.affectedRows).toBe(0);
    await db.as(admin, () => db.query(`update content_sections set data = data || '{"kicker":"Nuevo kicker"}' where key = 'home.hero'`));
    const hero = await db.as(null, () => one<{data: {kicker: string}}>(`select data from content_sections where key = 'home.hero'`));
    expect(hero.data.kicker).toBe('Nuevo kicker');
    const log = await db.as(admin, () => q(`select * from audit_log where entity = 'content_sections'`));
    expect(log.length).toBeGreaterThan(0);
    expect(await db.as(organizer, () => q(`select * from audit_log`))).toHaveLength(0);
  });

  it('membresía: requiere consentimiento y deduplica por correo', async () => {
    expect(
      await db.as(null, () =>
        errorOf(db.query(`select submit_membership_application('Eva', 'eva@mail.com', 'UTP', 'Contabilidad', null, '{}', '{}', null, false, false)`)),
      ),
    ).toMatch(/tratamiento de datos/);
    const r1 = await db.as(null, () => one<{r: string}>(`select submit_membership_application('Eva', 'eva@mail.com', 'UTP', 'Contabilidad', null, '{talks}', '{}', 'Hola', true, true) as r`));
    const r2 = await db.as(null, () => one<{r: string}>(`select submit_membership_application('Eva L', 'EVA@mail.com', 'UTP', 'Contabilidad', null, '{talks,lab}', '{}', 'Hola', true, true) as r`));
    expect([r1.r, r2.r]).toEqual(['created', 'updated']);
    expect(await db.as(null, () => q(`select * from membership_applications`))).toHaveLength(0);
    expect(await db.as(organizer, () => q(`select * from membership_applications`))).toHaveLength(1);
  });

  it('contacto: alta anónima, lectura solo staff', async () => {
    await db.as(null, () => db.query(`insert into contact_messages (name, email, subject, message) values ('Luis', 'luis@mail.com', 'Consulta', 'Quisiera saber más de la comunidad')`));
    expect(await db.as(ana, () => q(`select * from contact_messages`))).toHaveLength(0);
    expect(await db.as(admin, () => q(`select * from contact_messages`))).toHaveLength(1);
  });

  it('estadísticas de admin desde la base de datos', async () => {
    const s = await db.as(admin, () => one<{s: Record<string, unknown>}>(`select admin_stats() as s`));
    expect(s.s.members).toBeGreaterThanOrEqual(9);
    expect(s.s.registrations).toBeGreaterThanOrEqual(2);
    expect(await db.as(ana, () => errorOf(db.query(`select admin_stats()`)))).toMatch(/No autorizado/);
  });
});
