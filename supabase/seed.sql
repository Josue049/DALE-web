-- =====================================================================
-- DALE CON TODO — datos de DEMOSTRACIÓN (solo entorno de desarrollo)
-- Todo registro aquí lleva is_demo = true y el rótulo «Demostración».
-- No son anuncios reales de la comunidad. Borrar con:
--   delete from events where is_demo; delete from contests where is_demo;
--   delete from projects where is_demo; delete from opportunities where is_demo;
-- =====================================================================

insert into public.content_sections (key, data) values
('home.hero', jsonb_build_object(
  'kicker', 'Comunidad multidisciplinaria de estudiantes',
  'line1', 'NO IMPORTA QUÉ ESTUDIES.',
  'line2', 'IMPORTA HASTA DÓNDE QUIERES LLEGAR.',
  'tagline', 'APRENDE. CREA. COMPITE. CONECTA.',
  'primaryCta', 'Únete a la comunidad',
  'secondaryCta', 'Ver actividades'
)),
('home.manifesto', jsonb_build_object(
  'eyebrow', 'Manifiesto',
  'heading', 'Ingeniería, derecho, diseño, marketing, psicología. Aquí todas las carreras compiten en la misma cancha.',
  'body', 'DALE CON TODO nació entre estudiantes de la Universidad Tecnológica del Perú que querían algo más que clases: retos reales, gente de otras carreras y un lugar para demostrar de qué son capaces.'
)),
('brand.lines', jsonb_build_object(
  'challenge', 'Dale Challenge', 'talks', 'Dale Talks', 'lab', 'Dale Lab', 'network', 'Dale Network', 'future', 'Dale Future'
)),
('site.contact', jsonb_build_object('email', '', 'instagram', '', 'linkedin', '', 'tiktok', ''))
on conflict (key) do nothing;

insert into public.badges (slug, name, description) values
  ('primer-reto', 'Primer reto', 'Completó su primera entrega en un Dale Challenge.'),
  ('ponente', 'Ponente', 'Compartió conocimiento como ponente en Dale Talks.'),
  ('voluntariado', 'Voluntariado', 'Participó como voluntario en una actividad de la comunidad.')
on conflict (slug) do nothing;

-- ---------- Eventos de demostración ----------
with e as (
  insert into public.events (slug, title, summary, description, line, kind, modality, starts_at, ends_at, capacity, waitlist_enabled, allow_guests, eligibility, requirements, agenda, status, is_demo)
  values (
    'demo-webinar-liderazgo-multidisciplinario',
    'Demostración · Webinar: liderar equipos de distintas carreras',
    'Ejemplo de evento para probar la plataforma: cómo coordinar a personas de ingeniería, diseño y negocios en un mismo proyecto.',
    'Este es un evento de DEMOSTRACIÓN para validar el flujo de inscripción, cupos y lista de espera. No es un anuncio real de la comunidad.' || chr(10) || chr(10) ||
    'Durante la sesión se revisan dinámicas de trabajo entre carreras, roles y acuerdos para proyectos estudiantiles.',
    'talks', 'webinar', 'virtual',
    date_trunc('day', now() at time zone 'America/Lima') at time zone 'America/Lima' + interval '12 days 19 hours',
    date_trunc('day', now() at time zone 'America/Lima') at time zone 'America/Lima' + interval '12 days 20 hours 30 minutes',
    80, true, true, 'publico', 'Conexión estable y ganas de participar.',
    '[{"time":"19:00","title":"Bienvenida y dinámica inicial"},{"time":"19:15","title":"Roles en equipos multidisciplinarios"},{"time":"20:00","title":"Preguntas y cierre"}]',
    'published', true)
  returning id
)
insert into public.event_speakers (event_id, name, title, bio, position)
select id, 'Ponente de demostración', 'Perfil ficticio', 'Este perfil es un marcador de posición para la demo.', 0 from e;

insert into public.events (slug, title, summary, description, line, kind, modality, starts_at, ends_at, venue, address, capacity, waitlist_enabled, allow_guests, eligibility, requirements, status, is_demo)
values (
  'demo-taller-oratoria-presencial',
  'Demostración · Taller presencial de oratoria',
  'Ejemplo de taller presencial con cupos limitados y requisito de pertenecer a la UTP.',
  'Evento de DEMOSTRACIÓN para probar elegibilidad UTP, aforo y modalidad presencial. No es un anuncio real.',
  'talks', 'taller', 'presencial',
  date_trunc('day', now() at time zone 'America/Lima') at time zone 'America/Lima' + interval '20 days 16 hours',
  date_trunc('day', now() at time zone 'America/Lima') at time zone 'America/Lima' + interval '20 days 18 hours',
  'Sede por confirmar (demo)', 'Lima, Perú', 25, false, false, 'utp', 'Ser estudiante UTP con perfil completo.',
  'published', true
), (
  'demo-encuentro-network-pasado',
  'Demostración · Encuentro Dale Network (finalizado)',
  'Ejemplo de evento ya realizado, con material posterior.',
  'Evento de DEMOSTRACIÓN finalizado para mostrar el estado «realizado».',
  'network', 'encuentro', 'hibrida',
  now() - interval '15 days', now() - interval '15 days' + interval '2 hours',
  'Sede por confirmar (demo)', 'Lima, Perú', null, false, false, 'publico', null,
  'published', true
)
on conflict (slug) do nothing;

-- ---------- Concurso de demostración ----------
with c as (
  insert into public.contests (slug, title, summary, description, disciplines, participation_mode, min_team_size, max_team_size, eligibility, rules, prizes, registration_opens_at, registration_closes_at, judges_public, status, is_demo)
  values (
    'demo-desafio-multidisciplinario',
    'Demostración · Desafío multidisciplinario de impacto',
    'Ejemplo de concurso por equipos para probar inscripción, invitaciones, entregas y evaluación.',
    'Concurso de DEMOSTRACIÓN: equipos de 2 a 4 personas de carreras distintas proponen una solución a un problema de su comunidad. No es una convocatoria real.',
    array['Ingeniería', 'Negocios', 'Diseño', 'Comunicaciones', 'Derecho'],
    'equipo', 2, 4, 'invitadas',
    '1. Los equipos deben tener entre 2 y 4 integrantes.' || chr(10) || '2. Se recomienda que participen al menos dos carreras distintas.' || chr(10) || '3. Las entregas fuera de plazo no se aceptan.',
    '[{"place":"Reconocimiento","title":"Mención de demostración","description":"Ejemplo de premio para la demo."}]',
    now() - interval '2 days', now() + interval '25 days', false, 'published', true)
  returning id
), st as (
  insert into public.contest_stages (contest_id, position, name, description, starts_at, ends_at, accepts_submissions)
  select id, 0, 'Inscripción de equipos', 'Formación de equipos e invitaciones.', now() - interval '2 days', now() + interval '25 days', false from c
  union all
  select id, 1, 'Entrega de propuesta', 'Documento o enlace con la propuesta.', now() - interval '1 day', now() + interval '30 days', true from c
  union all
  select id, 2, 'Resultados', 'Publicación de resultados.', now() + interval '35 days', now() + interval '36 days', false from c
  returning contest_id
)
insert into public.rubric_criteria (contest_id, position, name, description, weight, max_score)
select distinct c.id, x.pos, x.name, x.descr, x.w, 10
from c, (values (0, 'Impacto', 'Relevancia del problema y alcance de la solución.', 3.0),
                (1, 'Colaboración interdisciplinaria', 'Aporte real de cada carrera.', 2.0),
                (2, 'Viabilidad', 'Factibilidad técnica y económica.', 2.0),
                (3, 'Presentación', 'Claridad y calidad de la propuesta.', 1.0)) as x(pos, name, descr, w);

-- ---------- Proyecto y oportunidades de demostración ----------
insert into public.projects (slug, title, summary, description, disciplines, looking_for, team_text, links, status, is_demo, published_at)
values (
  'demo-mapa-voluntariado',
  'Demostración · Mapa colaborativo de voluntariado',
  'Proyecto de ejemplo para el escaparate de Dale Lab.',
  'Proyecto de DEMOSTRACIÓN: una idea ficticia para mostrar cómo se publica un proyecto aprobado y cómo se solicitan colaboraciones.',
  array['Ingeniería de Software', 'Comunicaciones', 'Psicología'], array['Diseño UX', 'Marketing'],
  'Equipo de demostración', '[]', 'approved', true, now()
) on conflict (slug) do nothing;

insert into public.opportunities (slug, title, organization, category, summary, description, requirements, apply_url, deadline, status, is_demo)
values
  ('demo-mentoria-portafolio', 'Demostración · Mentoría de portafolio profesional', 'Ejemplo (ficticio)', 'mentoria',
   'Oportunidad de ejemplo para probar el catálogo de Dale Future.', 'Registro de DEMOSTRACIÓN. No es una convocatoria real.',
   'Estar en los últimos ciclos de cualquier carrera.', null, now() + interval '18 days', 'published', true),
  ('demo-voluntariado-feria', 'Demostración · Voluntariado en feria estudiantil', 'Ejemplo (ficticio)', 'voluntariado',
   'Oportunidad caducada de ejemplo.', 'Registro de DEMOSTRACIÓN caducado para mostrar el estado.',
   null, null, now() - interval '3 days', 'published', true)
on conflict (slug) do nothing;
