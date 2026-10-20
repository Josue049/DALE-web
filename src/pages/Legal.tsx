import {Link} from 'react-router-dom';
import {PageHeader, Section} from '../components/ui/Page';
import {useSeo} from '../hooks/useSeo';

const DOCS = {
  privacidad: {
    title: 'Política de privacidad',
    intro: 'Cómo tratamos tus datos personales. Borrador de referencia: debe ser revisado por la organización antes de su publicación definitiva.',
    sections: [
      ['Qué datos recogemos', 'Nombre, correo, universidad, carrera y, de forma opcional, sede, intereses, habilidades y foto de perfil. En inscripciones guardamos el estado de tu participación.'],
      ['Para qué los usamos', 'Gestionar tu cuenta, tus inscripciones a eventos y concursos, emitir reconocimientos cuando corresponda y, solo si lo autorizas, enviarte información de actividades.'],
      ['Perfil público', 'Tu perfil es privado por defecto. Solo aparece en el directorio de la comunidad si activas esa opción, y puedes desactivarla cuando quieras.'],
      ['Con quién se comparten', 'No vendemos ni cedemos tus datos. Los jurados solo ven las entregas que tienen asignadas; los ponentes no reciben listas de asistentes.'],
      ['Tus derechos', 'Puedes acceder, rectificar o eliminar tus datos y retirar tu consentimiento escribiéndonos desde la página de contacto, conforme a la Ley N.º 29733 de Protección de Datos Personales del Perú.'],
    ],
  },
  terminos: {
    title: 'Términos de uso',
    intro: 'Reglas básicas para participar en la comunidad. Borrador de referencia sujeto a revisión.',
    sections: [
      ['La comunidad', 'DALE CON TODO es una comunidad estudiantil independiente. No es un órgano oficial de la Universidad Tecnológica del Perú.'],
      ['Tu cuenta', 'Eres responsable de la veracidad de tus datos y de mantener segura tu contraseña.'],
      ['Concursos', 'Cada concurso se rige por sus propias bases. Las entregas fuera de plazo no se aceptan y los resultados se publican solo tras la evaluación del jurado.'],
      ['Contenido', 'Lo que publiques (proyectos, entregas) debe ser propio o contar con permiso. Los proyectos pasan por moderación antes de publicarse.'],
      ['Convivencia', 'Respeto entre todas las carreras y personas. Podemos suspender cuentas que incumplan estas normas.'],
    ],
  },
} as const;

export default function Legal({kind}: {kind: keyof typeof DOCS}) {
  const doc = DOCS[kind];
  useSeo({title: doc.title, description: doc.intro});
  return (
    <>
      <PageHeader eyebrow="Legal" title={doc.title} intro={doc.intro} tone="azul" />
      <Section className="pb-28">
        <div className="grid gap-10 lg:grid-cols-[16rem_1fr] lg:gap-20">
          <nav aria-label="Índice" className="lg:sticky lg:top-28 lg:self-start">
            <ol className="space-y-2 font-mono text-label uppercase">
              {doc.sections.map(([h], i) => (
                <li key={h}>
                  <a href={`#s${i}`} className="text-niebla/60 hover:text-blanco">
                    0{i + 1} · {h}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
          <div className="max-w-2xl space-y-10">
            {doc.sections.map(([h, b], i) => (
              <section key={h} id={`s${i}`} className="scroll-mt-28" data-reveal>
                <h2 className="font-wide text-[1.3rem] text-blanco">
                  <span className="mr-3 font-mono text-label text-rojo">0{i + 1}</span>
                  {h}
                </h2>
                <p className="mt-3 text-body text-niebla/85">{b}</p>
              </section>
            ))}
            <p className="text-[0.875rem] text-niebla/55">
              ¿Dudas? <Link to="/contacto" className="text-blanco underline underline-offset-4">Escríbenos</Link>.
            </p>
          </div>
        </div>
      </Section>
    </>
  );
}
