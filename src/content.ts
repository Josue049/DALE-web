/**
 * Textos estables de marca (equivalente a `content.ts` de SELENE).
 * Eventos, concursos, proyectos, equipo y aliados NO viven aquí: se leen de
 * Supabase. Los textos de portada tienen aquí su valor por defecto y el
 * panel admin puede sobrescribirlos (tabla content_sections).
 */

export const site = {
  name: 'DALE CON TODO',
  url: (import.meta.env.VITE_SITE_URL || 'https://daleconto.do').replace(/\/$/, ''),
  description:
    'Comunidad multidisciplinaria nacida entre estudiantes de la UTP: concursos, webinars, proyectos entre carreras, voluntariado y networking. Aprende. Crea. Compite. Conecta.',
  timezone: 'America/Lima',
  logo: {
    src: '/brand/logo-1264.webp',
    srcSmall: '/brand/logo-760.webp',
    width: 1264,
    height: 843,
    alt: 'DALE CON TODO — logotipo con letras blancas tridimensionales y anillos rojo, magenta y azul',
  },
  disclaimer:
    'DALE CON TODO es una comunidad estudiantil independiente nacida entre estudiantes de la UTP. No es un órgano oficial de la Universidad Tecnológica del Perú.',
};

export const nav = [
  {label: 'Eventos', to: '/eventos'},
  {label: 'Concursos', to: '/concursos'},
  {label: 'Proyectos', to: '/proyectos'},
  {label: 'Comunidad', to: '/comunidad'},
  {label: 'Oportunidades', to: '/oportunidades'},
  {label: 'Nosotros', to: '/nosotros'},
];

export const heroDefaults = {
  kicker: 'Comunidad multidisciplinaria de estudiantes',
  line1: 'NO IMPORTA QUÉ ESTUDIES.',
  line2: 'IMPORTA HASTA DÓNDE QUIERES LLEGAR.',
  tagline: 'APRENDE. CREA. COMPITE. CONECTA.',
  primaryCta: 'Únete a la comunidad',
  secondaryCta: 'Ver actividades',
};

export const manifestoDefaults = {
  eyebrow: 'Manifiesto',
  heading: 'Ingeniería, derecho, diseño, marketing, psicología. Aquí todas las carreras compiten en la misma cancha.',
  body: 'DALE CON TODO nació entre estudiantes de la Universidad Tecnológica del Perú que querían algo más que clases: retos reales, gente de otras carreras y un lugar para demostrar de qué son capaces.',
};

export type LineKey = 'challenge' | 'talks' | 'lab' | 'network' | 'future';

/** Las cinco líneas de participación. Los nombres se pueden renombrar desde admin (brand.lines). */
export const lines: {key: LineKey; name: string; tag: string; title: string; body: string; to: string; cta: string}[] = [
  {key: 'challenge', name: 'Dale Challenge', tag: 'Compite', title: 'Concursos y retos', body: 'Retos con bases claras, jurados y premios. Individuales o en equipos de carreras distintas.', to: '/concursos', cta: 'Ver concursos'},
  {key: 'talks', name: 'Dale Talks', tag: 'Aprende', title: 'Webinars y conferencias', body: 'Sesiones en vivo, talleres y grabaciones con gente que ya recorrió el camino.', to: '/eventos', cta: 'Ver eventos'},
  {key: 'lab', name: 'Dale Lab', tag: 'Crea', title: 'Proyectos entre carreras', body: 'Propón un proyecto, súmate a uno y construye con perfiles que no tienes en tu salón.', to: '/proyectos', cta: 'Ver proyectos'},
  {key: 'network', name: 'Dale Network', tag: 'Conecta', title: 'Comunidad y networking', body: 'Encuentros, perfiles voluntariamente públicos y una credencial de la comunidad.', to: '/comunidad', cta: 'Conocer la comunidad'},
  {key: 'future', name: 'Dale Future', tag: 'Proyecta', title: 'Oportunidades', body: 'Convocatorias, mentorías, voluntariado y recursos para tu desarrollo profesional.', to: '/oportunidades', cta: 'Ver oportunidades'},
];

/** Ruta de participación: sustituye las cuatro fases de la trayectoria lunar. */
export const path = {
  eyebrow: 'Cómo participar',
  heading: 'De curiosidad a proyecto, en cuatro pasos.',
  steps: [
    {tag: 'Paso 1', title: 'Descubre', body: 'Explora eventos, concursos y oportunidades abiertos a tu carrera. Todo lo público se ve sin cuenta.'},
    {tag: 'Paso 2', title: 'Participa', body: 'Inscríbete a un webinar o a un reto. Tus inscripciones quedan en tu agenda personal.'},
    {tag: 'Paso 3', title: 'Conecta', body: 'Arma equipo con gente de otras carreras y, si quieres, activa tu perfil público.'},
    {tag: 'Paso 4', title: 'Crea', body: 'Propón un proyecto en Dale Lab, entrégalo y construye tu portafolio con reconocimientos reales.'},
  ],
};

export const about = {
  mission: 'Abrir a estudiantes de todas las carreras espacios reales para aprender, competir, crear y conectar, sin que su especialidad sea una barrera.',
  vision: 'Ser la comunidad estudiantil multidisciplinaria de referencia en el Perú, donde los proyectos nacen del cruce entre carreras.',
  values: [
    {name: 'Todas las carreras', body: 'Ninguna especialidad vale más que otra. Los mejores equipos mezclan perfiles.'},
    {name: 'Ambición', body: 'Apuntamos alto: retos exigentes, calidad y constancia.'},
    {name: 'Honestidad', body: 'Información clara: bases, plazos, cupos y resultados verificables.'},
    {name: 'Comunidad', body: 'Compartimos lo que sabemos y celebramos los logros de los demás.'},
  ],
  story:
    'DALE CON TODO nació entre estudiantes de la Universidad Tecnológica del Perú que buscaban un espacio donde ingeniería, administración, marketing, derecho, comunicaciones, psicología, arquitectura, diseño, contabilidad y otras carreras pudieran trabajar juntas. Es una comunidad estudiantil independiente: no afirmamos ser un órgano oficial de la universidad.',
};

export const careers = [
  'Ingeniería de Sistemas', 'Ingeniería de Software', 'Ingeniería Industrial', 'Ingeniería Civil', 'Ingeniería Mecánica',
  'Ingeniería Electrónica', 'Administración', 'Marketing', 'Derecho', 'Comunicaciones', 'Psicología', 'Arquitectura',
  'Diseño', 'Contabilidad', 'Economía', 'Negocios Internacionales', 'Otra',
];

export const interestsCatalog = [
  'Liderazgo', 'Emprendimiento', 'Tecnología', 'Diseño', 'Oratoria', 'Marketing digital', 'Finanzas', 'Derecho y tecnología',
  'Sostenibilidad', 'Investigación', 'Voluntariado', 'Arte y cultura', 'Datos', 'Salud mental', 'Innovación social',
];

export const labels = {
  modality: {virtual: 'Virtual', presencial: 'Presencial', hibrida: 'Híbrida'} as Record<string, string>,
  eligibility: {utp: 'Solo estudiantes UTP', invitadas: 'UTP y universidades invitadas', publico: 'Abierto al público'} as Record<string, string>,
  participation: {individual: 'Individual', equipo: 'Por equipos', mixto: 'Individual o en equipo'} as Record<string, string>,
  eventKind: {webinar: 'Webinar', conferencia: 'Conferencia', taller: 'Taller', encuentro: 'Encuentro', voluntariado: 'Voluntariado', otro: 'Actividad'} as Record<string, string>,
  opportunity: {convocatoria: 'Convocatoria', mentoria: 'Mentoría', voluntariado: 'Voluntariado', practicas: 'Prácticas', beca: 'Beca', recurso: 'Recurso'} as Record<string, string>,
  registration: {confirmed: 'Confirmada', waitlisted: 'En lista de espera', cancelled: 'Cancelada'} as Record<string, string>,
  moderation: {pending: 'En revisión', approved: 'Publicado', rejected: 'Rechazado', changes_requested: 'Cambios solicitados'} as Record<string, string>,
  role: {member: 'Miembro', organizer: 'Organizador', judge: 'Jurado', admin: 'Administrador'} as Record<string, string>,
};
