import {useMemo, useState, type FormEvent} from 'react';
import {Link} from 'react-router-dom';
import {useAuth} from '../auth/AuthProvider';
import {DemoTag} from '../components/ui/Feedback';
import {PreviewSubmitted} from '../components/ui/Modal';
import {demoAssignments} from '../data/demo';
import {useSeo} from '../hooks/useSeo';
import {fmtDate, fmtTime} from '../lib/format';

/**
 * Área privada del jurado: solo ve las entregas que tiene asignadas, puntúa
 * por rúbrica (con el total ponderado calculado en vivo) y deja comentarios.
 * Vista previa con entregas ficticias.
 */
export default function Judge() {
  useSeo({title: 'Área de jurado', noindex: true});
  const {demo} = useAuth();
  const [selectedId, setSelectedId] = useState(demoAssignments[0].id);
  const [scores, setScores] = useState<Record<string, Record<string, number>>>({});
  const [saved, setSaved] = useState(false);
  const sel = demoAssignments.find((a) => a.id === selectedId)!;
  const criteria = sel.contest.rubric_criteria ?? [];
  const mine = scores[sel.id] ?? {};

  const total = useMemo(() => {
    const w = criteria.reduce((s, c) => s + c.weight, 0);
    const got = criteria.reduce((s, c) => s + ((mine[c.id] ?? 0) / c.max_score) * c.weight, 0);
    return w ? Math.round((got / w) * 1000) / 10 : 0;
  }, [criteria, mine]);
  const scored = (id: string) => Object.keys(scores[id] ?? {}).length;

  const save = (e: FormEvent) => {
    e.preventDefault();
    setSaved(true);
  };

  const C = 2 * Math.PI * 52;

  return (
    <div className="px-4 pt-28 pb-24 sm:px-6 md:px-[4vw] md:pt-32">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Área de jurado</p>
          <h1 className="mt-2 font-wide text-[clamp(1.7rem,3.4vw,2.8rem)] leading-[1] text-blanco">Tus evaluaciones</h1>
        </div>
        {demo && <p className="rounded-full bg-alerta/10 px-4 py-2 font-mono text-[0.6875rem] tracking-[0.08em] text-alerta ring-1 ring-alerta/30">Vista previa · entregas ficticias</p>}
      </div>

      <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-[22rem_minmax(0,1fr)]">
        <aside aria-label="Entregas asignadas" className="space-y-3 lg:sticky lg:top-28 lg:self-start">
          <p className="font-mono text-label text-niebla/60 uppercase">
            {demoAssignments.length} entregas asignadas · {sel.contest.title}
          </p>
          {demoAssignments.map((a) => {
            const done = Math.max(a.scored, scored(a.id));
            const on = a.id === selectedId;
            return (
              <button
                key={a.id}
                type="button"
                aria-current={on ? 'true' : undefined}
                onClick={() => setSelectedId(a.id)}
                className={`w-full rounded-[18px] p-4 text-left ring-1 transition-all ${on ? 'bg-noche-3 ring-rojo/60' : 'bg-noche-2 ring-blanco/8 hover:ring-blanco/25'}`}
              >
                <p className="font-bold text-blanco">{a.title}</p>
                <p className="mt-0.5 font-mono text-[0.625rem] tracking-[0.1em] text-azul uppercase">{a.team}</p>
                <div className="mt-3 flex items-center gap-3">
                  <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-blanco/10">
                    <span className="block h-full rounded-full bg-gradient-to-r from-rojo to-magenta" style={{width: `${(done / criteria.length) * 100}%`}} />
                  </span>
                  <span className="font-mono text-[0.625rem] text-niebla/60">
                    {done}/{criteria.length}
                  </span>
                </div>
              </button>
            );
          })}
        </aside>

        <section aria-labelledby="entrega" className="min-w-0 rounded-[24px] bg-noche-2 p-6 ring-1 ring-blanco/8 md:p-8">
          <div className="flex flex-wrap items-center gap-2">
            <span className="chip">{sel.stage}</span>
            <DemoTag />
          </div>
          <h2 id="entrega" className="mt-4 font-wide text-[clamp(1.4rem,2.6vw,2rem)] leading-tight text-blanco">
            {sel.title}
          </h2>
          <p className="mt-1 font-mono text-[0.6875rem] tracking-[0.1em] text-niebla/60 uppercase">
            {sel.team} · entregado el {fmtDate(sel.submitted_at, {month: 'short'})} a las {fmtTime(sel.submitted_at)} h
          </p>
          <p className="mt-5 max-w-2xl text-body text-niebla/85">{sel.description}</p>
          <div className="mt-5 flex flex-wrap gap-3">
            {sel.link ? (
              <a href={sel.link} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">
                Abrir enlace ↗
              </a>
            ) : (
              <span className="chip">Sin enlace</span>
            )}
            <Link to={`/concursos/${sel.contest.slug}#evaluacion`} className="btn btn-ghost btn-sm">
              Ver rúbrica pública
            </Link>
          </div>

          <form onSubmit={save} className="mt-10 grid gap-8 border-t border-blanco/10 pt-8 xl:grid-cols-[minmax(0,1fr)_14rem]">
            <div className="space-y-7">
              {criteria.map((c) => {
                const v = mine[c.id] ?? 0;
                return (
                  <div key={c.id}>
                    <div className="flex items-baseline justify-between gap-4">
                      <label htmlFor={`c-${c.id}`} className="font-bold text-blanco">
                        {c.name} <span className="font-mono text-[0.625rem] tracking-[0.1em] text-niebla/50 uppercase">· peso {c.weight}</span>
                      </label>
                      <output htmlFor={`c-${c.id}`} className="font-wide text-[1.5rem] text-blanco tabular-nums">
                        {v}
                        <span className="text-[0.9rem] text-niebla/50">/{c.max_score}</span>
                      </output>
                    </div>
                    {c.description && <p className="text-[0.8125rem] text-niebla/60">{c.description}</p>}
                    <input
                      id={`c-${c.id}`}
                      type="range"
                      min={0}
                      max={c.max_score}
                      step={0.5}
                      value={v}
                      onChange={(e) => setScores({...scores, [sel.id]: {...mine, [c.id]: Number(e.target.value)}})}
                      className="mt-3 w-full accent-rojo"
                    />
                  </div>
                );
              })}
              <label className="block">
                <span className="label">Comentario privado para la organización</span>
                <textarea rows={3} maxLength={2000} className="field" />
              </label>
            </div>
            <div className="flex flex-col items-center gap-5 xl:sticky xl:top-32 xl:self-start">
              <div className="relative">
              <svg viewBox="0 0 120 120" className="size-40 -rotate-90" role="img" aria-label={`Total ponderado ${total} sobre 100`}>
                <circle cx="60" cy="60" r="52" fill="none" stroke="rgb(245 247 251 / 0.08)" strokeWidth="8" />
                <circle cx="60" cy="60" r="52" fill="none" stroke="url(#jg)" strokeWidth="8" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - total / 100)} className="transition-[stroke-dashoffset] duration-500" />
                <defs>
                  <linearGradient id="jg">
                    <stop offset="0" stopColor="#db354a" />
                    <stop offset="1" stopColor="#74b1e0" />
                  </linearGradient>
                </defs>
              </svg>
              <p className="absolute inset-0 grid place-content-center text-center font-wide text-[2rem] leading-none text-blanco" aria-hidden="true">
                {total}
                <span className="mt-1 block font-mono text-[0.625rem] font-normal tracking-[0.12em] text-niebla/60">/ 100</span>
              </p>
              </div>
              <button type="submit" className="btn btn-primary w-full">
                Guardar evaluación
              </button>
              <p className="text-center text-[0.75rem] text-niebla/50">Las notas nunca son públicas. Al publicarse resultados, la evaluación se cierra.</p>
            </div>
          </form>
        </section>
      </div>
      <PreviewSubmitted open={saved} onClose={() => setSaved(false)} title="Evaluación lista" summary={<p>Tu puntaje de {total}/100 para «{sel.title}» quedaría guardado y solo lo vería la organización.</p>} />
    </div>
  );
}
