/**
 * Contenido de DEMOSTRACIÓN local (frontend sin backend conectado).
 * Todo registro lleva is_demo = true y la interfaz lo rotula «Demo»:
 * personas, eventos, concursos y proyectos son ficticios y no constituyen
 * anuncios reales de la comunidad. Las fechas se calculan respecto a hoy.
 */
import type {
  Contest, Criterion, EventRow, Judge, Opportunity, OrgMember, Profile, Project, PublicMember, Recognition, Registration, Result, Stage,
} from './types';

const DAY = 86400000;
/** Fecha en hora de Lima (UTC−5) a `days` de hoy. */
export const at = (days: number, hour = 19, minute = 0) => {
  const d = new Date(Date.now() + days * DAY);
  const ymd = new Date(d.getTime() - 5 * 3600000).toISOString().slice(0, 10);
  return new Date(`${ymd}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00-05:00`).toISOString();
};
const now = new Date().toISOString();

const ev = (e: Partial<EventRow> & Pick<EventRow, 'id' | 'slug' | 'title' | 'summary' | 'starts_at'>): EventRow => ({
  description: '',
  line: 'talks',
  kind: 'webinar',
  modality: 'virtual',
  ends_at: null,
  timezone: 'America/Lima',
  venue: null,
  address: null,
  capacity: null,
  waitlist_enabled: false,
  allow_guests: true,
  eligibility: 'publico',
  requirements: null,
  registration_opens_at: null,
  registration_closes_at: null,
  agenda: [],
  resources: [],
  recording_url: null,
  cover_url: null,
  cover_alt: null,
  status: 'published',
  is_demo: true,
  created_by: null,
  created_at: now,
  event_speakers: [],
  ...e,
});

const sp = (event_id: string, i: number, name: string, title: string, bio: string) => ({id: `${event_id}-sp${i}`, event_id, name, title, bio, photo_url: null, position: i});

export const demoEvents: EventRow[] = [
  ev({
    id: 'ev-1',
    slug: 'liderar-equipos-de-distintas-carreras',
    title: 'Liderar equipos de distintas carreras',
    summary: 'Cómo coordinar a ingeniería, diseño, derecho y negocios en un mismo proyecto sin perder a nadie en el camino.',
    description:
      'Un webinar práctico sobre la parte más difícil de cualquier proyecto estudiantil: la gente.\n\nVeremos cómo repartir roles cuando cada integrante habla un "idioma" distinto, cómo acordar entregables y qué hacer cuando el equipo se estanca. Habrá dinámicas en vivo y un espacio de preguntas al final.',
    starts_at: at(6, 19),
    ends_at: at(6, 20, 30),
    capacity: 120,
    waitlist_enabled: true,
    requirements: 'Conexión estable. Ten a mano un proyecto (real o soñado) para las dinámicas.',
    agenda: [
      {time: '19:00', title: 'Bienvenida y dinámica de apertura'},
      {time: '19:15', title: 'El mapa de roles en un equipo multidisciplinario', speaker: 'Valeria Quispe'},
      {time: '19:50', title: 'Casos reales: cuando el equipo se estanca', speaker: 'Diego Ramos'},
      {time: '20:15', title: 'Preguntas y cierre'},
    ],
    event_speakers: [
      sp('ev-1', 0, 'Valeria Quispe', 'Ingeniera industrial · Gestión de proyectos', 'Coordina equipos mixtos de ingeniería y diseño desde hace seis años.'),
      sp('ev-1', 1, 'Diego Ramos', 'Psicólogo organizacional', 'Facilita talleres de colaboración para equipos universitarios.'),
    ],
  }),
  ev({
    id: 'ev-2',
    slug: 'taller-de-oratoria-habla-como-ganas',
    title: 'Taller de oratoria: habla como ganas',
    summary: 'Dos horas presenciales para perder el miedo al micrófono y defender tu idea frente a un jurado.',
    description: 'Taller presencial con ejercicios de voz, estructura de pitch y práctica frente a grupo. Cupos limitados para garantizar que todas las personas practiquen.',
    kind: 'taller',
    modality: 'presencial',
    starts_at: at(13, 16),
    ends_at: at(13, 18),
    venue: 'Auditorio por confirmar',
    address: 'Lima, Perú',
    capacity: 30,
    allow_guests: false,
    eligibility: 'utp',
    requirements: 'Ser estudiante UTP. Trae un pitch de 60 segundos sobre cualquier tema.',
    agenda: [
      {time: '16:00', title: 'Respiración, voz y postura'},
      {time: '16:40', title: 'Estructura de un pitch que convence'},
      {time: '17:20', title: 'Ronda de práctica con feedback'},
    ],
    event_speakers: [sp('ev-2', 0, 'Camila Torres', 'Comunicadora · Coach de oratoria', 'Ha preparado a equipos finalistas de concursos de emprendimiento.')],
  }),
  ev({
    id: 'ev-3',
    slug: 'derecho-y-tecnologia-lo-que-nadie-te-explica',
    title: 'Derecho y tecnología: lo que nadie te explica',
    summary: 'Datos personales, propiedad intelectual y contratos para proyectos estudiantiles que quieren salir al mundo.',
    description: 'Una conferencia para estudiantes de todas las carreras que crean productos, apps o contenido. Sin tecnicismos.',
    kind: 'conferencia',
    modality: 'hibrida',
    starts_at: at(20, 18, 30),
    ends_at: at(20, 20),
    venue: 'Sala de conferencias por confirmar',
    address: 'Lima, Perú',
    capacity: 200,
    eligibility: 'invitadas',
    event_speakers: [sp('ev-3', 0, 'Andrea Villanueva', 'Abogada · Propiedad intelectual', 'Asesora a emprendimientos universitarios en temas legales.')],
  }),
  ev({
    id: 'ev-4',
    slug: 'portafolio-que-abre-puertas',
    title: 'Un portafolio que abre puertas',
    summary: 'Diseñadores, ingenieros y comunicadores muestran cómo presentan su trabajo para conseguir prácticas.',
    line: 'future',
    kind: 'webinar',
    starts_at: at(27, 19),
    ends_at: at(27, 20),
    capacity: 150,
    event_speakers: [sp('ev-4', 0, 'Luis Mendoza', 'Diseñador de producto', 'Revisa portafolios de practicantes cada semestre.')],
  }),
  ev({
    id: 'ev-5',
    slug: 'voluntariado-feria-de-ciencias-escolar',
    title: 'Voluntariado: feria de ciencias escolar',
    summary: 'Acompaña a estudiantes de secundaria en sus proyectos de ciencia. Se necesitan perfiles de todas las carreras.',
    line: 'future',
    kind: 'voluntariado',
    modality: 'presencial',
    starts_at: at(34, 9),
    ends_at: at(34, 13),
    venue: 'Colegio aliado por confirmar',
    address: 'Lima, Perú',
    capacity: 40,
    allow_guests: false,
  }),
  ev({
    id: 'ev-6',
    slug: 'noche-dale-network',
    title: 'Noche Dale Network',
    summary: 'Encuentro presencial para conocer a la comunidad, formar equipos y escuchar proyectos en 3 minutos.',
    line: 'network',
    kind: 'encuentro',
    modality: 'presencial',
    starts_at: at(41, 18),
    ends_at: at(41, 21),
    venue: 'Por confirmar',
    address: 'Lima, Perú',
    capacity: 80,
    waitlist_enabled: true,
    allow_guests: false,
  }),
  ev({
    id: 'ev-7',
    slug: 'finanzas-personales-para-universitarios',
    title: 'Finanzas personales para universitarios',
    summary: 'Presupuesto, ahorro y primeras inversiones explicados por estudiantes de contabilidad y economía.',
    starts_at: at(-12, 19),
    ends_at: at(-12, 20, 30),
    recording_url: null,
    resources: [{label: 'Plantilla de presupuesto (demo)', url: 'https://example.org'}],
  }),
  ev({
    id: 'ev-8',
    slug: 'kickoff-comunidad',
    title: 'Kickoff de la comunidad',
    summary: 'La primera reunión abierta: quiénes somos, qué queremos construir y cómo sumarte.',
    line: 'network',
    kind: 'encuentro',
    modality: 'hibrida',
    starts_at: at(-40, 18),
    ends_at: at(-40, 20),
  }),
];

const stage = (contest_id: string, i: number, name: string, description: string, from: number, to: number, accepts = false): Stage => ({
  id: `${contest_id}-st${i}`, contest_id, position: i, name, description, starts_at: at(from, 9), ends_at: at(to, 23, 59), accepts_submissions: accepts,
});
const crit = (contest_id: string, i: number, name: string, description: string, weight: number): Criterion => ({id: `${contest_id}-rc${i}`, contest_id, position: i, name, description, weight, max_score: 10});

const ct = (c: Partial<Contest> & Pick<Contest, 'id' | 'slug' | 'title' | 'summary'>): Contest => ({
  description: '',
  disciplines: [],
  participation_mode: 'equipo',
  min_team_size: 2,
  max_team_size: 4,
  eligibility: 'utp',
  rules: '',
  bases_url: null,
  prizes: [],
  registration_opens_at: at(-5),
  registration_closes_at: at(20),
  cover_url: null,
  cover_alt: null,
  judges_public: true,
  results_published: false,
  results_published_at: null,
  status: 'published',
  is_demo: true,
  created_by: null,
  created_at: now,
  contest_stages: [],
  rubric_criteria: [],
  ...c,
});

export const demoContests: Contest[] = [
  ct({
    id: 'ct-1',
    slug: 'desafio-impacto-multidisciplinario',
    title: 'Desafío de impacto multidisciplinario',
    summary: 'Equipos de 2 a 4 personas de carreras distintas proponen una solución real a un problema de su distrito.',
    description:
      'El reto insignia de Dale Challenge. Forma un equipo mixto, elige un problema concreto de tu comunidad y propón una solución viable.\n\nNo importa si eres de ingeniería, derecho, diseño o psicología: el jurado valora justamente que la propuesta solo pudo nacer de esa mezcla.',
    disciplines: ['Ingeniería', 'Negocios', 'Diseño', 'Comunicaciones', 'Derecho', 'Psicología'],
    eligibility: 'invitadas',
    rules:
      '1. Equipos de 2 a 4 integrantes; se recomienda al menos dos carreras distintas.\n2. Cada persona solo puede participar en un equipo.\n3. Las entregas se realizan desde la cuenta del equipo antes del cierre de la etapa.\n4. Las entregas fuera de plazo no se aceptan.\n5. El jurado puede solicitar una sustentación en vivo a los finalistas.',
    prizes: [
      {place: '1.er lugar', title: 'Mentoría de 3 meses + reconocimiento', description: 'Acompañamiento para llevar la propuesta a piloto.'},
      {place: '2.º lugar', title: 'Taller privado de pitch', description: 'Sesión de preparación para concursos externos.'},
      {place: 'Mención', title: 'Mejor colaboración entre carreras', description: 'Al equipo con la integración más clara.'},
    ],
    registration_closes_at: at(18),
    contest_stages: [
      stage('ct-1', 0, 'Inscripción de equipos', 'Formación de equipos e invitaciones.', -5, 18),
      stage('ct-1', 1, 'Entrega de propuesta', 'Documento de hasta 8 páginas o enlace.', 0, 25, true),
      stage('ct-1', 2, 'Sustentación de finalistas', 'Pitch de 5 minutos ante el jurado.', 30, 31),
      stage('ct-1', 3, 'Resultados', 'Publicación de ganadores.', 33, 34),
    ],
    rubric_criteria: [
      crit('ct-1', 0, 'Impacto', 'Relevancia del problema y alcance de la solución.', 3),
      crit('ct-1', 1, 'Colaboración interdisciplinaria', 'Aporte real de cada carrera.', 2),
      crit('ct-1', 2, 'Viabilidad', 'Factibilidad técnica, legal y económica.', 2),
      crit('ct-1', 3, 'Presentación', 'Claridad y calidad de la propuesta.', 1),
    ],
  }),
  ct({
    id: 'ct-2',
    slug: 'reto-de-marca-personal',
    title: 'Reto de marca personal en 60 segundos',
    summary: 'Concurso individual: graba un video vertical que cuente quién eres y hacia dónde vas.',
    description: 'Un reto individual para practicar comunicación. Abierto a todas las carreras.',
    disciplines: ['Comunicaciones', 'Marketing', 'Todas las carreras'],
    participation_mode: 'individual',
    min_team_size: 1,
    max_team_size: 1,
    eligibility: 'publico',
    registration_opens_at: at(4),
    registration_closes_at: at(30),
    rules: '1. Video vertical de máximo 60 segundos.\n2. Contenido original.\n3. Una entrega por persona.',
    prizes: [{place: 'Top 3', title: 'Sesión de fotos profesional', description: 'Para tu perfil profesional.'}],
    contest_stages: [stage('ct-2', 0, 'Inscripción', 'Registro individual.', 4, 30), stage('ct-2', 1, 'Entrega del video', 'Enlace al video.', 4, 32, true), stage('ct-2', 2, 'Resultados', 'Publicación.', 38, 39)],
    rubric_criteria: [crit('ct-2', 0, 'Mensaje', 'Claridad de la propuesta.', 2), crit('ct-2', 1, 'Creatividad', 'Originalidad.', 1)],
  }),
  ct({
    id: 'ct-3',
    slug: 'hackathon-de-servicios-publicos',
    title: 'Ideatón de servicios públicos',
    summary: 'Rediseña un trámite público en 48 horas. Inscripciones cerradas: el jurado está evaluando.',
    disciplines: ['Ingeniería de Software', 'Diseño', 'Derecho', 'Administración'],
    participation_mode: 'mixto',
    min_team_size: 1,
    max_team_size: 5,
    registration_opens_at: at(-30),
    registration_closes_at: at(-6),
    contest_stages: [stage('ct-3', 0, 'Inscripción', 'Registro.', -30, -6), stage('ct-3', 1, 'Ideatón', '48 horas de trabajo.', -5, -3, true), stage('ct-3', 2, 'Resultados', 'Publicación.', 4, 5)],
  }),
  ct({
    id: 'ct-4',
    slug: 'concurso-de-ensayo-futuro-del-trabajo',
    title: 'Concurso de ensayo: el futuro del trabajo',
    summary: 'Ensayos individuales sobre cómo cambiará tu profesión en diez años. Resultados publicados.',
    disciplines: ['Todas las carreras'],
    participation_mode: 'individual',
    min_team_size: 1,
    max_team_size: 1,
    eligibility: 'publico',
    registration_opens_at: at(-70),
    registration_closes_at: at(-40),
    results_published: true,
    results_published_at: at(-10),
    status: 'closed',
    contest_stages: [stage('ct-4', 0, 'Inscripción', 'Registro.', -70, -40), stage('ct-4', 1, 'Entrega', 'Ensayo.', -60, -35, true), stage('ct-4', 2, 'Resultados', 'Publicación.', -10, -9)],
  }),
];

export const demoResults: Record<string, Result[]> = {
  'ct-4': [
    {id: 'r1', contest_id: 'ct-4', entry_id: 'e1', display_name: 'Mariana Huamán', rank: 1, award: 'Primer lugar', total_score: 91.25},
    {id: 'r2', contest_id: 'ct-4', entry_id: 'e2', display_name: 'Joaquín Salazar', rank: 2, award: 'Segundo lugar', total_score: 87.5},
    {id: 'r3', contest_id: 'ct-4', entry_id: 'e3', display_name: 'Fiorella Cárdenas', rank: 3, award: 'Mención honrosa', total_score: 84},
  ],
};

export const demoJudges: Record<string, Judge[]> = {
  'ct-1': [
    {contest_id: 'ct-1', user_id: 'j1', display_name: 'Rocío Paredes', bio: 'Gestora de innovación social.'},
    {contest_id: 'ct-1', user_id: 'j2', display_name: 'Martín Chávez', bio: 'Ingeniero y mentor de startups.'},
    {contest_id: 'ct-1', user_id: 'j3', display_name: 'Lucía Fernández', bio: 'Abogada especialista en políticas públicas.'},
  ],
};

const pr = (p: Partial<Project> & Pick<Project, 'id' | 'slug' | 'title' | 'summary'>): Project => ({
  description: '',
  disciplines: [],
  looking_for: [],
  team_text: null,
  cover_url: null,
  cover_alt: null,
  gallery: [],
  links: [],
  status: 'approved',
  moderation_note: null,
  owner_id: null,
  is_demo: true,
  published_at: now,
  created_at: now,
  ...p,
});

export const demoProjects: Project[] = [
  pr({
    id: 'pr-1',
    slug: 'mapa-colaborativo-de-voluntariado',
    title: 'Mapa colaborativo de voluntariado',
    summary: 'Una plataforma que conecta a estudiantes con organizaciones sociales según su carrera y su tiempo libre.',
    description:
      'Nació en una noche de networking: una estudiante de psicología, uno de software y otra de comunicaciones notaron que querían ayudar, pero no sabían dónde.\n\nEl proyecto mapea organizaciones, necesidades y horarios, y sugiere coincidencias por perfil.',
    disciplines: ['Ingeniería de Software', 'Comunicaciones', 'Psicología'],
    looking_for: ['Diseño UX', 'Marketing'],
    team_text: 'Ana (Psicología) · Bruno (Software) · Carla (Comunicaciones)',
    links: [{label: 'Prototipo (demo)', url: 'https://example.org'}],
  }),
  pr({id: 'pr-2', slug: 'guia-legal-para-emprendedores', title: 'Guía legal para emprendedores universitarios', summary: 'Plantillas y explicaciones claras para formalizar un emprendimiento estudiantil.', disciplines: ['Derecho', 'Administración', 'Diseño'], looking_for: ['Ilustración'], team_text: 'Equipo de 4 estudiantes'}),
  pr({id: 'pr-3', slug: 'huerto-urbano-inteligente', title: 'Huerto urbano inteligente', summary: 'Sensores de bajo costo y un manual comunitario para huertos en azoteas.', disciplines: ['Ingeniería Electrónica', 'Arquitectura', 'Marketing'], looking_for: ['Contabilidad', 'Biología']}),
  pr({id: 'pr-4', slug: 'podcast-carreras-sin-filtro', title: 'Podcast «Carreras sin filtro»', summary: 'Conversaciones honestas con estudiantes de últimos ciclos sobre lo que no te cuentan de cada carrera.', disciplines: ['Comunicaciones', 'Psicología'], looking_for: ['Edición de audio']}),
  pr({id: 'pr-5', slug: 'tablero-de-movilidad-segura', title: 'Tablero de movilidad segura', summary: 'Visualización de datos abiertos sobre rutas y horarios seguros para volver a casa.', disciplines: ['Ingeniería de Sistemas', 'Diseño', 'Derecho'], looking_for: ['Ciencia de datos']}),
  pr({id: 'pr-6', slug: 'marca-para-emprendimientos-de-barrio', title: 'Marca para emprendimientos de barrio', summary: 'Estudiantes de diseño y marketing renuevan la identidad de bodegas y talleres locales.', disciplines: ['Diseño', 'Marketing', 'Administración'], looking_for: ['Fotografía']}),
];

const op = (o: Partial<Opportunity> & Pick<Opportunity, 'id' | 'slug' | 'title' | 'category' | 'summary'>): Opportunity => ({
  organization: 'Organización de ejemplo',
  description: '',
  requirements: null,
  apply_url: null,
  deadline: null,
  status: 'published',
  is_demo: true,
  created_by: null,
  created_at: now,
  ...o,
});

export const demoOpportunities: Opportunity[] = [
  op({id: 'op-1', slug: 'mentoria-de-portafolio', title: 'Mentoría de portafolio profesional', category: 'mentoria', summary: 'Seis sesiones uno a uno para ordenar tu portafolio y tu CV.', requirements: 'Estar en los últimos cuatro ciclos de cualquier carrera.', deadline: at(15), description: 'Programa de mentoría con profesionales voluntarios. Cupos limitados.'}),
  op({id: 'op-2', slug: 'practicas-en-comunicacion-social', title: 'Prácticas en comunicación para ONG', category: 'practicas', summary: 'Práctica preprofesional de seis meses en el área de comunicaciones de una ONG.', deadline: at(9)}),
  op({id: 'op-3', slug: 'beca-curso-de-datos', title: 'Beca para curso de análisis de datos', category: 'beca', summary: 'Cobertura total de un curso introductorio de análisis de datos para cualquier carrera.', deadline: at(22)}),
  op({id: 'op-4', slug: 'voluntariado-alfabetizacion-digital', title: 'Voluntariado de alfabetización digital', category: 'voluntariado', summary: 'Enseña herramientas digitales básicas a adultos mayores los sábados.', deadline: at(30)}),
  op({id: 'op-5', slug: 'convocatoria-ponentes-dale-talks', title: 'Convocatoria de ponentes Dale Talks', category: 'convocatoria', organization: 'DALE CON TODO', summary: '¿Tienes algo que enseñar? Propón tu charla para el próximo ciclo.', deadline: at(26)}),
  op({id: 'op-6', slug: 'kit-de-entrevistas', title: 'Kit de preparación para entrevistas', category: 'recurso', organization: 'DALE CON TODO', summary: 'Guía con preguntas frecuentes y ejercicios para tu primera entrevista.'}),
  op({id: 'op-7', slug: 'voluntariado-feria-estudiantil', title: 'Voluntariado en feria estudiantil', category: 'voluntariado', summary: 'Apoyo logístico en una feria de proyectos.', deadline: at(-3)}),
];

const mem = (id: string, full_name: string, career: string, interests: string[], skills: string[], bio: string, open_to_volunteer = false): PublicMember => ({
  id, full_name, username: full_name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '.'), university: 'UTP', career, bio, interests, skills, open_to_volunteer, avatar_url: null,
});

export const demoMembers: PublicMember[] = [
  mem('m1', 'Mariana Huamán', 'Ingeniería Industrial', ['Liderazgo', 'Sostenibilidad'], ['Lean', 'Excel'], 'Me gustan los procesos que ayudan a personas.', true),
  mem('m2', 'Joaquín Salazar', 'Derecho', ['Derecho y tecnología', 'Oratoria'], ['Redacción', 'Debate'], 'Buscando equipo para retos legales y de innovación.'),
  mem('m3', 'Fiorella Cárdenas', 'Diseño', ['Diseño', 'Arte y cultura'], ['Figma', 'Ilustración'], 'Diseño identidades para emprendimientos.', true),
  mem('m4', 'Renzo Gutiérrez', 'Ingeniería de Software', ['Tecnología', 'Datos'], ['React', 'Python'], 'Construyo prototipos rápidos.'),
  mem('m5', 'Daniela Rojas', 'Psicología', ['Salud mental', 'Innovación social'], ['Facilitación', 'Investigación'], 'Me interesa el bienestar en equipos.', true),
  mem('m6', 'Sebastián Ortiz', 'Marketing', ['Marketing digital', 'Emprendimiento'], ['Contenido', 'Ads'], 'Hago que las ideas lleguen a la gente.'),
  mem('m7', 'Alessandra Vega', 'Arquitectura', ['Sostenibilidad', 'Diseño'], ['Revit', 'Maquetas'], 'Ciudades más humanas.'),
  mem('m8', 'Piero Castillo', 'Contabilidad', ['Finanzas', 'Emprendimiento'], ['Costos', 'Power BI'], 'Números claros para proyectos ambiciosos.'),
  mem('m9', 'Nicole Paredes', 'Comunicaciones', ['Oratoria', 'Arte y cultura'], ['Edición de video', 'Locución'], 'Cuento historias.', true),
  mem('m10', 'Gabriel Núñez', 'Administración', ['Liderazgo', 'Emprendimiento'], ['Planeamiento', 'Negociación'], 'Organizo para que las cosas pasen.'),
];

export const demoOrg: OrgMember[] = [
  {id: 'o1', name: 'Andrea Salas', role_title: 'Coordinación general', career: 'Administración', bio: null, photo_url: null, links: [], position: 0, published: true},
  {id: 'o2', name: 'Bruno Quispe', role_title: 'Dale Challenge', career: 'Ingeniería Industrial', bio: null, photo_url: null, links: [], position: 1, published: true},
  {id: 'o3', name: 'Carolina Vidal', role_title: 'Dale Talks', career: 'Comunicaciones', bio: null, photo_url: null, links: [], position: 2, published: true},
  {id: 'o4', name: 'Diego Herrera', role_title: 'Dale Lab', career: 'Ingeniería de Software', bio: null, photo_url: null, links: [], position: 3, published: true},
  {id: 'o5', name: 'Elena Ramos', role_title: 'Dale Network', career: 'Psicología', bio: null, photo_url: null, links: [], position: 4, published: true},
  {id: 'o6', name: 'Franco Linares', role_title: 'Dale Future', career: 'Derecho', bio: null, photo_url: null, links: [], position: 5, published: true},
];

export const demoProfile: Profile = {
  id: 'demo-user',
  full_name: 'Persona Demo',
  username: 'persona.demo',
  university: 'Universidad Tecnológica del Perú',
  career: 'Diseño',
  campus: 'Lima Centro',
  bio: 'Perfil de vista previa. No corresponde a una persona real.',
  interests: ['Diseño', 'Emprendimiento', 'Oratoria'],
  skills: ['Figma', 'Presentaciones', 'Investigación de usuarios'],
  open_to_volunteer: true,
  is_public: false,
  newsletter: false,
  avatar_url: null,
  credential_theme: 'rojo',
  created_at: at(-90),
};

export const demoRegistrations: Registration[] = [
  {id: 'rg1', event_id: 'ev-1', user_id: 'demo-user', guest_name: null, guest_email: null, status: 'confirmed', attended: false, token: 'demo', created_at: at(-2), events: demoEvents[0]},
  {id: 'rg2', event_id: 'ev-6', user_id: 'demo-user', guest_name: null, guest_email: null, status: 'waitlisted', attended: false, token: 'demo', created_at: at(-1), events: demoEvents[5]},
  {id: 'rg3', event_id: 'ev-7', user_id: 'demo-user', guest_name: null, guest_email: null, status: 'confirmed', attended: true, token: 'demo', created_at: at(-20), events: demoEvents[6]},
];

export const demoRecognitions: Recognition[] = [
  {id: 'rc1', user_id: 'demo-user', kind: 'certificado', title: 'Certificado de asistencia · Finanzas personales para universitarios', description: null, holder_name: 'Persona Demo', verify_token: 'demo'.padEnd(64, '0'), public_verification: true, issued_at: at(-10), revoked_at: null},
  {id: 'rc2', user_id: 'demo-user', kind: 'insignia', title: 'Primer reto', description: 'Completó su primera entrega en un Dale Challenge.', holder_name: 'Persona Demo', verify_token: 'demo'.padEnd(64, '1'), public_verification: true, issued_at: at(-30), revoked_at: null},
];

export const demoTeam = {
  name: 'Las Integrales',
  contest: demoContests[0],
  members: [
    {name: 'Persona Demo', career: 'Diseño', status: 'accepted' as const, captain: true},
    {name: 'Renzo Gutiérrez', career: 'Ingeniería de Software', status: 'accepted' as const, captain: false},
    {name: 'Joaquín Salazar', career: 'Derecho', status: 'invited' as const, captain: false},
  ],
};

export const demoAssignments = [
  {id: 'sb1', contest: demoContests[0], stage: 'Entrega de propuesta', team: 'Las Integrales', title: 'Ruta segura escolar', description: 'Sistema de acompañamiento entre vecinos para rutas escolares, con señalética diseñada por estudiantes y marco legal de voluntariado.', link: 'https://example.org', submitted_at: at(-1), scored: 2},
  {id: 'sb2', contest: demoContests[0], stage: 'Entrega de propuesta', team: 'Equipo Norte', title: 'Mercado sin plástico', description: 'Programa de envases retornables para mercados de abastos con incentivos para comerciantes.', link: 'https://example.org', submitted_at: at(-2), scored: 4},
  {id: 'sb3', contest: demoContests[0], stage: 'Entrega de propuesta', team: 'Colectivo 4C', title: 'Biblioteca de herramientas', description: 'Préstamo comunitario de herramientas con registro digital y talleres de uso seguro.', link: null, submitted_at: at(-3), scored: 0},
];

export const demoStats = {
  members: 248,
  public_members: 61,
  applications: 132,
  applications_new: 14,
  events_published: demoEvents.length,
  events_upcoming: 6,
  registrations: 389,
  contests_published: 4,
  entries: 37,
  submissions: 22,
  projects_pending: 3,
  projects_approved: demoProjects.length,
  opportunities_active: 6,
  messages_open: 5,
  registrations_by_month: [
    {month: 'May', count: 34},
    {month: 'Jun', count: 51},
    {month: 'Jul', count: 47},
    {month: 'Ago', count: 72},
    {month: 'Sep', count: 88},
    {month: 'Oct', count: 97},
  ],
  members_by_career: [
    {career: 'Ingeniería', count: 74},
    {career: 'Administración', count: 38},
    {career: 'Diseño', count: 31},
    {career: 'Comunicaciones', count: 27},
    {career: 'Derecho', count: 24},
    {career: 'Psicología', count: 21},
    {career: 'Marketing', count: 19},
    {career: 'Otras', count: 14},
  ],
  top_events: demoEvents.slice(0, 5).map((e, i) => ({title: e.title, count: [104, 30, 142, 66, 28][i]})),
};

export const demoUsers = [
  ...demoMembers.slice(0, 8).map((m, i) => ({id: m.id, email: `${m.username}@demo.local`, full_name: m.full_name, university: 'UTP', career: m.career, roles: (i === 0 ? ['member', 'admin'] : i === 1 ? ['member', 'organizer'] : i === 2 ? ['member', 'judge'] : ['member']) as string[], created_at: at(-i * 9 - 3)})),
];

export const demoApplications = [
  {id: 'ap1', full_name: 'Valentina Ríos', email: 'valentina@demo.local', university: 'UTP', career: 'Marketing', status: 'new', created_at: at(-1)},
  {id: 'ap2', full_name: 'Hugo Medina', email: 'hugo@demo.local', university: 'Universidad invitada', career: 'Economía', status: 'contacted', created_at: at(-3)},
  {id: 'ap3', full_name: 'Paola León', email: 'paola@demo.local', university: 'UTP', career: 'Arquitectura', status: 'new', created_at: at(-4)},
  {id: 'ap4', full_name: 'Kevin Arias', email: 'kevin@demo.local', university: 'UTP', career: 'Ingeniería Civil', status: 'accepted', created_at: at(-8)},
];

export const demoAudit = [
  {id: 1, action: 'update', entity: 'events', title: 'Liderar equipos de distintas carreras', when: at(0, 10, 12)},
  {id: 2, action: 'moderate', entity: 'projects', title: 'Huerto urbano inteligente → publicado', when: at(-1, 17, 40)},
  {id: 3, action: 'insert', entity: 'opportunities', title: 'Beca para curso de análisis de datos', when: at(-2, 9, 5)},
  {id: 4, action: 'update', entity: 'content_sections', title: 'home.hero', when: at(-3, 20, 30)},
  {id: 5, action: 'insert', entity: 'contest_judges', title: 'Rocío Paredes', when: at(-4, 12, 0)},
];
