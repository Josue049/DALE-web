import {useState, type FormEvent} from 'react';
import {useSearchParams} from 'react-router-dom';
import {NoSaveNotice} from '../components/ui/Feedback';
import {PreviewSubmitted} from '../components/ui/Modal';
import {PageHeader, Section} from '../components/ui/Page';
import {useSeo} from '../hooks/useSeo';

const SUBJECTS: Record<string, string> = {
  general: 'Consulta general',
  alianza: 'Quiero proponer una alianza',
  oportunidad: 'Quiero publicar una oportunidad',
  ponente: 'Quiero ser ponente',
  prensa: 'Prensa y medios',
};

const FAQ = [
  ['¿Necesito ser de la UTP para participar?', 'Depende de cada actividad. Algunas son solo para estudiantes UTP, otras admiten universidades invitadas y otras están abiertas al público. Cada evento y concurso lo indica claramente.'],
  ['¿Tiene costo?', 'Las actividades de la comunidad son gratuitas salvo que se indique lo contrario en su página.'],
  ['¿DALE CON TODO es parte oficial de la universidad?', 'No. Somos una comunidad estudiantil independiente nacida entre estudiantes de la UTP.'],
  ['¿Cómo recibo un certificado?', 'Los certificados se emiten solo cuando se confirma tu asistencia o participación, nunca por la simple inscripción. Puedes verificarlos con su código.'],
  ['¿Mi perfil es público?', 'Solo si tú lo activas en tu cuenta. Por defecto, tu perfil es privado.'],
];

export default function Contact() {
  useSeo({title: 'Contacto', description: 'Escríbenos para consultas, alianzas, oportunidades o propuestas de charlas.'});
  const [params] = useSearchParams();
  const [sent, setSent] = useState(false);
  const initial = SUBJECTS[params.get('asunto') ?? ''] ? (params.get('asunto') as string) : 'general';

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!e.currentTarget.checkValidity()) {
      e.currentTarget.reportValidity();
      return;
    }
    setSent(true);
  };

  return (
    <>
      <PageHeader eyebrow="Contacto" tone="azul" title={<>Hablemos.</>} intro="Consultas, alianzas, oportunidades para estudiantes o propuestas de charlas. Respondemos en días hábiles." />
      <Section className="pb-28">
        <div className="grid gap-12 lg:grid-cols-[1fr_1fr] lg:gap-20">
          <form noValidate onSubmit={submit} className="space-y-4 rounded-[28px] bg-noche-2 p-6 ring-1 ring-blanco/10 md:p-10" data-reveal>
            <NoSaveNotice />
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="label">Nombre</span>
                <input name="name" required minLength={2} autoComplete="name" className="field" />
              </label>
              <label className="block">
                <span className="label">Correo</span>
                <input name="email" type="email" required autoComplete="email" className="field" />
              </label>
            </div>
            <label className="block">
              <span className="label">Asunto</span>
              <select name="subject" defaultValue={initial} className="field">
                {Object.entries(SUBJECTS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="label">Mensaje</span>
              <textarea name="message" required minLength={10} maxLength={4000} rows={6} className="field" />
            </label>
            <button type="submit" className="btn btn-primary w-full">
              Enviar mensaje
            </button>
          </form>

          <div data-reveal>
            <p className="eyebrow">Preguntas frecuentes</p>
            <div className="mt-6 divide-y divide-blanco/10 border-y border-blanco/10">
              {FAQ.map(([q, a]) => (
                <details key={q} className="group py-5">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-[1.05rem] font-bold text-blanco [&::-webkit-details-marker]:hidden">
                    {q}
                    <span aria-hidden="true" className="grid size-8 shrink-0 place-items-center rounded-full ring-1 ring-blanco/20 transition-transform group-open:rotate-45">
                      +
                    </span>
                  </summary>
                  <p className="mt-3 max-w-xl text-body text-niebla/80">{a}</p>
                </details>
              ))}
            </div>
          </div>
        </div>
      </Section>
      <PreviewSubmitted open={sent} onClose={() => setSent(false)} title="Mensaje listo" summary={<p>Tu mensaje llegaría a la bandeja del equipo organizador.</p>} />
    </>
  );
}
