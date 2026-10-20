import {useRef, useState, type FormEvent} from 'react';
import {Link} from 'react-router-dom';
import {NoSaveNotice, StatusMessage} from '../components/ui/Feedback';
import {PreviewSubmitted} from '../components/ui/Modal';
import {PageHeader, Section} from '../components/ui/Page';
import {careers, interestsCatalog, lines} from '../content';
import {useSeo} from '../hooks/useSeo';

const STEPS = ['Tus datos', 'Lo que te mueve', 'Confirmación'];

export default function Join() {
  useSeo({title: 'Únete', description: 'Únete a DALE CON TODO: la comunidad multidisciplinaria para estudiantes de todas las carreras.'});
  const [step, setStep] = useState(0);
  const [chosenLines, setChosenLines] = useState<string[]>([]);
  const [interests, setInterests] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const toggle = (list: string[], set: (v: string[]) => void, v: string) => set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  /** Valida solo los campos visibles del paso actual. */
  const validStep = () => {
    const fields = formRef.current?.querySelectorAll<HTMLInputElement>(`[data-step="${step}"] :is(input, select, textarea)`) ?? [];
    for (const f of fields) {
      if (!f.checkValidity()) {
        f.reportValidity();
        return false;
      }
    }
    if (step === 1 && chosenLines.length === 0) {
      setError('Elige al menos una línea de participación.');
      return false;
    }
    setError('');
    return true;
  };

  const next = () => validStep() && setStep((s) => Math.min(s + 1, STEPS.length - 1));
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (step < STEPS.length - 1) return next();
    if (validStep()) setDone(true);
  };

  return (
    <>
      <PageHeader
        eyebrow="Únete"
        title={
          <>
            No importa qué estudies. <span className="text-gradient-brand">Súmate.</span>
          </>
        }
        intro="Cuéntanos quién eres y qué te mueve. Te escribiremos cuando abra una actividad para ti. Para inscribirte a eventos y concursos, crea también tu cuenta."
      />
      <Section className="pb-28">
        <div className="grid gap-12 lg:grid-cols-[18rem_1fr] lg:gap-20">
          {/* Progreso por pasos. */}
          <ol className="flex gap-3 lg:flex-col lg:gap-0" aria-label="Pasos del formulario">
            {STEPS.map((s, i) => (
              <li key={s} className="flex flex-1 items-center gap-3 lg:relative lg:flex-none lg:pb-10" aria-current={i === step ? 'step' : undefined}>
                {i < STEPS.length - 1 && <span aria-hidden="true" className={`absolute top-10 bottom-0 left-[19px] hidden w-px lg:block ${i < step ? 'bg-rojo' : 'bg-blanco/12'}`} />}
                <span className={`relative grid size-10 shrink-0 place-items-center rounded-full font-mono text-[0.75rem] transition-colors ${i < step ? 'bg-rojo text-blanco' : i === step ? 'bg-blanco text-noche' : 'text-niebla/60 ring-1 ring-blanco/20'}`}>
                  {i < step ? '✓' : i + 1}
                </span>
                <span className={`hidden font-mono text-label uppercase sm:inline ${i === step ? 'text-blanco' : 'text-niebla/55'}`}>{s}</span>
              </li>
            ))}
          </ol>

          <form ref={formRef} noValidate onSubmit={submit} className="rounded-[28px] bg-noche-2 p-6 ring-1 ring-blanco/10 md:p-10">
            <NoSaveNotice />
            <fieldset data-step="0" hidden={step !== 0} className="mt-6 grid gap-4 sm:grid-cols-2">
              <legend className="mb-2 font-wide text-title text-blanco sm:col-span-2">Tus datos</legend>
              <label className="block sm:col-span-2">
                <span className="label">Nombre completo</span>
                <input name="full_name" required minLength={2} maxLength={120} autoComplete="name" className="field" />
              </label>
              <label className="block">
                <span className="label">Correo</span>
                <input name="email" type="email" required autoComplete="email" className="field" />
              </label>
              <label className="block">
                <span className="label">Universidad</span>
                <input name="university" required defaultValue="UTP" className="field" />
              </label>
              <label className="block">
                <span className="label">Carrera</span>
                <select name="career" required defaultValue="" className="field">
                  <option value="" disabled>
                    Elige tu carrera
                  </option>
                  {careers.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="label">Sede (opcional)</span>
                <input name="campus" className="field" placeholder="Ej.: Lima Centro" />
              </label>
            </fieldset>

            <fieldset data-step="1" hidden={step !== 1} className="mt-6">
              <legend className="mb-2 font-wide text-title text-blanco">Lo que te mueve</legend>
              <p className="label mt-4">Líneas que te interesan</p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {lines.map((l) => {
                  const on = chosenLines.includes(l.key);
                  return (
                    <button key={l.key} type="button" aria-pressed={on} onClick={() => toggle(chosenLines, setChosenLines, l.key)} className={`rounded-2xl p-4 text-left ring-1 transition-all ${on ? 'bg-rojo/15 ring-rojo' : 'ring-blanco/12 hover:ring-blanco/30'}`}>
                      <span className="flex items-center justify-between">
                        <span className="font-wide text-[0.95rem] text-blanco">{l.name}</span>
                        <span aria-hidden="true" className={`grid size-5 place-items-center rounded-full text-[0.7rem] ${on ? 'bg-rojo text-blanco' : 'ring-1 ring-blanco/30'}`}>
                          {on ? '✓' : ''}
                        </span>
                      </span>
                      <span className="mt-1 block font-mono text-[0.625rem] tracking-[0.12em] text-azul uppercase">{l.title}</span>
                    </button>
                  );
                })}
              </div>
              <p className="label mt-8">Intereses (opcional)</p>
              <div className="flex flex-wrap gap-2">
                {interestsCatalog.map((i) => {
                  const on = interests.includes(i);
                  return (
                    <button key={i} type="button" aria-pressed={on} onClick={() => toggle(interests, setInterests, i)} className={`chip transition-colors ${on ? 'bg-blanco text-noche ring-blanco' : 'hover:text-blanco'}`}>
                      {i}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <fieldset data-step="2" hidden={step !== 2} className="mt-6 space-y-4">
              <legend className="mb-2 font-wide text-title text-blanco">Confirmación</legend>
              <label className="block">
                <span className="label">¿Por qué quieres unirte? (opcional)</span>
                <textarea name="motivation" maxLength={1200} rows={4} className="field" />
              </label>
              <label className="flex items-start gap-3 text-[0.9rem] text-niebla/85">
                <input name="consent_data" type="checkbox" required className="mt-1 size-4 accent-rojo" />
                <span>
                  Acepto el tratamiento de mis datos según la <Link to="/privacidad" className="underline underline-offset-2">política de privacidad</Link>.
                </span>
              </label>
              <label className="flex items-start gap-3 text-[0.9rem] text-niebla/85">
                <input name="consent_contact" type="checkbox" className="mt-1 size-4 accent-rojo" />
                <span>Quiero recibir correos sobre actividades (opcional).</span>
              </label>
            </fieldset>

            <div className="mt-4 min-h-6">{error && <StatusMessage kind="error">{error}</StatusMessage>}</div>
            <div className="mt-4 flex flex-wrap justify-between gap-3">
              <button type="button" className="btn btn-ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
                ← Atrás
              </button>
              <button type="submit" className="btn btn-primary">
                {step < STEPS.length - 1 ? 'Continuar →' : 'Enviar solicitud'}
              </button>
            </div>
          </form>
        </div>
      </Section>
      <PreviewSubmitted
        open={done}
        onClose={() => setDone(false)}
        title="¡Así te recibiríamos!"
        summary={<p>Tu solicitud con {chosenLines.length} línea(s) y {interests.length} interés(es) quedaría registrada, y la organización te contactaría.</p>}
      />
    </>
  );
}
