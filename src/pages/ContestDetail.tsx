import {useQuery} from '@tanstack/react-query';
import {useEffect, useState, type FormEvent} from 'react';
import {Link, useParams} from 'react-router-dom';
import {Avatar} from '../components/ui/Avatar';
import {DetailHero, StickyAside} from '../components/ui/DetailHero';
import {DemoTag, ErrorState, Loading} from '../components/ui/Feedback';
import {Modal, PreviewSubmitted} from '../components/ui/Modal';
import {Section} from '../components/ui/Page';
import {Timeline} from '../components/ui/Timeline';
import {labels} from '../content';
import {contestState, getContest, getContestJudges, getContestResults} from '../data/api';
import type {Contest} from '../data/types';
import {useSeo} from '../hooks/useSeo';
import {fmtDate, relativeDays} from '../lib/format';
import {scrollToHash} from '../lib/scroll';
import {shareLink} from '../lib/share';
import NotFound from './NotFound';

const STATE: Record<string, [string, string]> = {
  upcoming: ['Próximamente', 'text-azul ring-azul/40'],
  open: ['Inscripciones abiertas', 'text-ok ring-ok/40'],
  evaluation: ['En evaluación', 'text-alerta ring-alerta/40'],
  results: ['Resultados publicados', 'text-blanco ring-rojo/50'],
  closed: ['Cerrado', 'text-gris ring-blanco/15'],
};

export default function ContestDetail() {
  const {slug = ''} = useParams();
  const q = useQuery({queryKey: ['contest', slug], queryFn: () => getContest(slug)});
  const c = q.data;
  const judges = useQuery({queryKey: ['judges', c?.id], queryFn: () => getContestJudges(c!.id), enabled: !!c?.judges_public});
  const results = useQuery({queryKey: ['results', c?.id], queryFn: () => getContestResults(c!.id), enabled: !!c?.results_published});
  useSeo({title: c?.title ?? 'Concurso', description: c?.summary});

  if (q.isLoading) return <div className="pt-40"><Loading label="Cargando concurso" /></div>;
  if (q.isError) return <div className="px-4 pt-40"><ErrorState error={q.error} retry={() => q.refetch()} /></div>;
  if (!c) return <NotFound what="concurso" back="/concursos" />;

  const st = contestState(c);
  const now = Date.now();
  const sections = [
    ['resumen', 'Resumen'],
    ['bases', 'Bases'],
    ['cronograma', 'Cronograma'],
    c.prizes.length ? ['premios', 'Premios'] : null,
    c.rubric_criteria?.length ? ['evaluacion', 'Evaluación'] : null,
    c.judges_public ? ['jurado', 'Jurado'] : null,
    ['resultados', 'Resultados'],
  ].filter(Boolean) as [string, string][];

  return (
    <>
      <DetailHero seed={c.slug} image={c.cover_url} imageAlt={c.cover_alt} back={{to: '/concursos', label: 'Todos los concursos'}}>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`chip ${STATE[st][1]}`}>{STATE[st][0]}</span>
          <span className="chip">{labels.participation[c.participation_mode]}</span>
          <span className="chip">{labels.eligibility[c.eligibility]}</span>
          {c.is_demo && <DemoTag />}
        </div>
        <h1 className="mt-6 max-w-5xl font-wide text-[clamp(2rem,5.2vw,4.8rem)] leading-[0.98] text-blanco">{c.title}</h1>
        <p className="mt-5 max-w-2xl text-lead text-niebla/85">{c.summary}</p>
        <ul className="mt-6 flex flex-wrap gap-2">
          {c.disciplines.map((d) => (
            <li key={d} className="chip bg-noche/50">
              {d}
            </li>
          ))}
        </ul>
      </DetailHero>

      <SectionNav items={sections} />

      <Section className="pb-28">
        <div className="grid gap-12 pt-10 lg:grid-cols-[minmax(0,1fr)_24rem] lg:gap-16">
          <div className="space-y-20">
            <section id="resumen" aria-labelledby="h-resumen" className="scroll-mt-36" data-reveal>
              <h2 id="h-resumen" className="eyebrow">Resumen</h2>
              <p className="prose-dale mt-4 max-w-2xl text-[1.0625rem]">{c.description || c.summary}</p>
              <dl className="mt-8 grid max-w-2xl grid-cols-2 gap-px overflow-hidden rounded-2xl bg-blanco/10 sm:grid-cols-4">
                {[
                  ['Formato', labels.participation[c.participation_mode]],
                  ['Integrantes', c.max_team_size > 1 ? `${c.min_team_size}–${c.max_team_size}` : '1'],
                  ['Etapas', String(c.contest_stages?.length ?? 0)],
                  ['Cierre', c.registration_closes_at ? fmtDate(c.registration_closes_at, {year: undefined, month: 'short'}) : '—'],
                ].map(([k, v]) => (
                  <div key={k} className="bg-noche-2 p-4">
                    <dt className="font-mono text-[0.625rem] tracking-[0.14em] text-niebla/55 uppercase">{k}</dt>
                    <dd className="mt-1 font-wide text-[1.05rem] text-blanco">{v}</dd>
                  </div>
                ))}
              </dl>
            </section>

            <section id="bases" aria-labelledby="h-bases" className="scroll-mt-36" data-reveal>
              <div className="flex flex-wrap items-end justify-between gap-4">
                <h2 id="h-bases" className="eyebrow">Bases y reglamento</h2>
                {c.bases_url ? (
                  <a href={c.bases_url} className="btn btn-ghost btn-sm" download>
                    Descargar bases (PDF)
                  </a>
                ) : (
                  <span className="font-mono text-[0.625rem] tracking-[0.12em] text-niebla/50 uppercase">PDF de bases: pendiente de publicación</span>
                )}
              </div>
              <ol className="mt-5 max-w-2xl space-y-3">
                {(c.rules || 'Las bases se publicarán pronto.').split('\n').filter(Boolean).map((line, i) => (
                  <li key={i} className="flex gap-4 rounded-xl bg-blanco/[0.03] p-4 ring-1 ring-blanco/8">
                    <span className="font-mono text-label text-rojo">{String(i + 1).padStart(2, '0')}</span>
                    <span className="text-body text-niebla/90">{line.replace(/^\d+\.\s*/, '')}</span>
                  </li>
                ))}
              </ol>
            </section>

            <section id="cronograma" aria-labelledby="h-crono" className="scroll-mt-36">
              <h2 id="h-crono" className="eyebrow mb-8" data-reveal>
                Cronograma · hora de Lima
              </h2>
              <Timeline
                items={(c.contest_stages ?? []).map((s) => {
                  const start = new Date(s.starts_at).getTime();
                  const end = new Date(s.ends_at).getTime();
                  return {
                    key: s.id,
                    label: `${fmtDate(s.starts_at, {year: undefined, month: 'short'})} → ${fmtDate(s.ends_at, {year: undefined, month: 'short'})}`,
                    title: (
                      <>
                        {s.name}
                        {s.accepts_submissions && <span className="ml-2 align-middle chip text-azul ring-azul/40">Recibe entregas</span>}
                      </>
                    ),
                    body: s.description,
                    state: now > end ? 'done' : now >= start ? 'current' : 'next',
                  };
                })}
              />
            </section>

            {c.prizes.length > 0 && (
              <section id="premios" aria-labelledby="h-premios" className="scroll-mt-36">
                <h2 id="h-premios" className="eyebrow" data-reveal>
                  Premios
                </h2>
                <ul className="mt-6 grid gap-4 sm:grid-cols-3">
                  {c.prizes.map((p, i) => (
                    <li key={p.place} data-reveal style={{transitionDelay: `${i * 90}ms`}} className={`relative overflow-hidden rounded-2xl p-6 ring-1 ${i === 0 ? 'bg-gradient-to-br from-rojo/30 to-magenta/20 ring-rojo/50 sm:-translate-y-3' : 'bg-noche-2 ring-blanco/10'}`}>
                      <p className="font-wide text-[2.6rem] leading-none text-blanco/15">{String(i + 1).padStart(2, '0')}</p>
                      <p className="mt-3 font-mono text-label text-azul uppercase">{p.place}</p>
                      <p className="mt-2 font-bold text-blanco">{p.title}</p>
                      {p.description && <p className="mt-2 text-[0.875rem] text-niebla/75">{p.description}</p>}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {c.rubric_criteria && c.rubric_criteria.length > 0 && (
              <section id="evaluacion" aria-labelledby="h-eval" className="scroll-mt-36" data-reveal>
                <h2 id="h-eval" className="eyebrow">Cómo se evalúa</h2>
                <RubricBars contest={c} />
              </section>
            )}

            {c.judges_public && (
              <section id="jurado" aria-labelledby="h-jurado" className="scroll-mt-36" data-reveal>
                <h2 id="h-jurado" className="eyebrow">Jurado</h2>
                {(judges.data ?? []).length === 0 ? (
                  <p className="mt-4 text-body">El jurado se anunciará pronto.</p>
                ) : (
                  <ul className="mt-6 grid gap-4 sm:grid-cols-3">
                    {judges.data!.map((j, i) => (
                      <li key={j.user_id} className="rounded-2xl bg-noche-2 p-5 ring-1 ring-blanco/8">
                        <div className="w-16">
                          <Avatar name={j.display_name} index={i} />
                        </div>
                        <p className="mt-4 flex flex-wrap items-center gap-2 font-bold text-blanco">
                          {j.display_name} {c.is_demo && <DemoTag />}
                        </p>
                        {j.bio && <p className="mt-1 text-[0.875rem] text-niebla/70">{j.bio}</p>}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )}

            <section id="resultados" aria-labelledby="h-res" className="scroll-mt-36" data-reveal>
              <h2 id="h-res" className="eyebrow">Resultados</h2>
              {!c.results_published ? (
                <div className="mt-4 rounded-2xl border border-dashed border-blanco/15 p-6 text-body text-niebla/75">
                  Los resultados se publican aquí cuando el jurado termina la evaluación. Las notas individuales nunca se hacen públicas.
                </div>
              ) : (
                <Podium results={results.data ?? []} />
              )}
            </section>
          </div>

          <StickyAside>
            <ParticipateCard contest={c} state={st} />
          </StickyAside>
        </div>
      </Section>
    </>
  );
}

/** Navegación de sección fija con resaltado de la sección visible. */
function SectionNav({items}: {items: [string, string][]}) {
  const [active, setActive] = useState(items[0][0]);
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setActive(e.target.id)),
      {rootMargin: '-40% 0px -55% 0px'},
    );
    items.forEach(([id]) => {
      const el = document.getElementById(id);
      if (el) io.observe(el);
    });
    return () => io.disconnect();
  }, [items]);
  return (
    <nav aria-label="Secciones del concurso" className="sticky top-[4.1rem] z-30 border-y border-blanco/8 bg-noche/90 backdrop-blur-md">
      <ul className="flex gap-1 overflow-x-auto px-4 py-2 sm:px-6 md:px-[6vw]">
        {items.map(([id, label]) => (
          <li key={id}>
            <a
              href={`#${id}`}
              onClick={(e) => {
                e.preventDefault();
                scrollToHash(`#${id}`);
              }}
              aria-current={active === id ? 'true' : undefined}
              className={`block rounded-full px-4 py-2 font-mono text-[0.6875rem] tracking-[0.1em] whitespace-nowrap uppercase transition-colors ${active === id ? 'bg-blanco text-noche' : 'text-niebla/70 hover:text-blanco'}`}
            >
              {label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function RubricBars({contest: c}: {contest: Contest}) {
  const total = c.rubric_criteria!.reduce((s, r) => s + Number(r.weight), 0);
  return (
    <ul className="mt-6 max-w-2xl space-y-5">
      {c.rubric_criteria!.map((r) => {
        const pct = Math.round((Number(r.weight) / total) * 100);
        return (
          <li key={r.id}>
            <div className="flex items-baseline justify-between gap-4">
              <p className="font-bold text-blanco">{r.name}</p>
              <p className="font-wide text-[1.4rem] text-blanco tabular-nums">{pct}%</p>
            </div>
            {r.description && <p className="text-[0.875rem] text-niebla/70">{r.description}</p>}
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-blanco/8">
              <div className="h-full rounded-full bg-gradient-to-r from-rojo via-magenta to-azul" style={{width: `${pct}%`}} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function Podium({results}: {results: {id: string; display_name: string; rank: number | null; award: string | null}[]}) {
  const order = [1, 0, 2].map((i) => results[i]).filter(Boolean);
  return (
    <div className="mt-8">
      <ol className="grid grid-cols-3 items-end gap-3 md:gap-5">
        {order.map((r) => {
          const h = r.rank === 1 ? 'h-56' : r.rank === 2 ? 'h-44' : 'h-36';
          return (
            <li key={r.id} className="text-center">
              <p className="font-bold text-blanco">{r.display_name}</p>
              <p className="mt-1 font-mono text-[0.625rem] tracking-[0.12em] text-azul uppercase">{r.award}</p>
              <div className={`mt-4 grid ${h} place-items-start justify-center rounded-t-2xl pt-4 ${r.rank === 1 ? 'bg-gradient-to-b from-rojo to-magenta' : 'bg-noche-3 ring-1 ring-blanco/10'}`}>
                <span className="font-wide text-[2.6rem] text-blanco">{r.rank}</span>
              </div>
            </li>
          );
        })}
      </ol>
      {results.length > 3 && (
        <ul className="mt-6 divide-y divide-blanco/8">
          {results.slice(3).map((r) => (
            <li key={r.id} className="flex justify-between py-3">
              <span>{r.display_name}</span>
              <span className="font-mono text-label text-niebla/60">#{r.rank}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ParticipateCard({contest: c, state}: {contest: Contest; state: string}) {
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [emails, setEmails] = useState<string[]>([]);
  const [draft, setDraft] = useState('');
  const [shared, setShared] = useState('');
  const team = c.participation_mode !== 'individual';
  const deadline = c.registration_closes_at;

  const addEmail = () => {
    const v = draft.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v) || emails.includes(v) || emails.length >= c.max_team_size - 1) return;
    setEmails([...emails, v]);
    setDraft('');
  };

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = e.currentTarget;
    if (!f.checkValidity()) {
      f.reportValidity();
      return;
    }
    setOpen(false);
    setDone(team ? String(new FormData(f).get('team')) : 'tu inscripción individual');
  };

  return (
    <div className="relative overflow-hidden rounded-[24px] bg-noche-2 p-6 ring-1 ring-rojo/30 md:p-7">
      <svg aria-hidden="true" viewBox="0 0 200 200" className="pointer-events-none absolute -top-16 -right-16 size-48 opacity-60">
        <circle cx="100" cy="100" r="80" fill="none" stroke="#db354a" strokeWidth="2.5" strokeDasharray="0 10" strokeLinecap="round" />
        <circle cx="100" cy="100" r="56" fill="none" stroke="#af286c" strokeWidth="2" strokeDasharray="0 8" strokeLinecap="round" />
      </svg>
      <p className="relative eyebrow">Participa</p>
      {deadline && state === 'open' && <Countdown target={deadline} />}
      <ul className="relative mt-5 space-y-2 text-[0.9375rem] text-niebla/85">
        <li>· {labels.eligibility[c.eligibility]}</li>
        <li>· {team ? `Equipos de ${c.min_team_size} a ${c.max_team_size} personas` : 'Participación individual'}</li>
        <li>· {deadline ? `Inscripción hasta el ${fmtDate(deadline)}` : 'Sin fecha límite de inscripción'}</li>
      </ul>
      <div className="relative mt-7 space-y-3">
        {state === 'open' ? (
          <button type="button" className="btn btn-primary w-full" onClick={() => setOpen(true)}>
            {team ? 'Inscribir a mi equipo' : 'Inscribirme'}
          </button>
        ) : (
          <p className="rounded-xl bg-blanco/5 px-4 py-3 text-[0.875rem] text-niebla/80">
            {state === 'upcoming' && c.registration_opens_at ? `Las inscripciones abren ${relativeDays(c.registration_opens_at)}.` : 'Las inscripciones están cerradas.'}
          </p>
        )}
        <button
          type="button"
          className="btn btn-ghost btn-sm w-full"
          onClick={async () => {
            const r = await shareLink(c.title);
            setShared(r === 'copied' ? 'Enlace copiado' : r === 'shared' ? 'Compartido' : 'No se pudo compartir');
          }}
        >
          Compartir con mi equipo
        </button>
        <p className="min-h-4 text-center font-mono text-[0.625rem] tracking-[0.12em] text-ok uppercase" role="status">
          {shared}
        </p>
        <Link to="/mi-cuenta/equipos" className="block text-center font-mono text-[0.6875rem] tracking-[0.1em] text-azul uppercase hover:text-blanco">
          Ver mis equipos →
        </Link>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={team ? 'Crear equipo e inscribirlo' : 'Inscripción individual'}>
        <form noValidate onSubmit={submit} className="space-y-4">
          {team ? (
            <>
              <label className="block">
                <span className="label">Nombre del equipo</span>
                <input name="team" required minLength={2} maxLength={60} className="field" placeholder="Ej.: Las Integrales" />
              </label>
              <div>
                <span className="label" id="inv-label">
                  Invitar integrantes ({emails.length + 1}/{c.max_team_size})
                </span>
                <div className="flex gap-2">
                  <input
                    type="email"
                    aria-labelledby="inv-label"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addEmail();
                      }
                    }}
                    className="field"
                    placeholder="correo@ejemplo.com"
                    disabled={emails.length >= c.max_team_size - 1}
                  />
                  <button type="button" className="btn btn-ghost" onClick={addEmail} disabled={emails.length >= c.max_team_size - 1}>
                    Añadir
                  </button>
                </div>
                <ul className="mt-3 flex flex-wrap gap-2" aria-live="polite">
                  <li className="chip text-blanco ring-rojo/50">Tú · capitán(a)</li>
                  {emails.map((m) => (
                    <li key={m} className="chip">
                      {m}
                      <button type="button" aria-label={`Quitar ${m}`} onClick={() => setEmails(emails.filter((x) => x !== m))} className="ml-1 text-niebla/60 hover:text-blanco">
                        ✕
                      </button>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-[0.8125rem] text-niebla/60">Cada invitación debe aceptarse desde la cuenta de la persona invitada. Se necesitan al menos {c.min_team_size} integrantes para entregar.</p>
              </div>
            </>
          ) : (
            <p className="text-body">Confirmarás tu participación en «{c.title}». Podrás entregar desde tu cuenta mientras la etapa esté abierta.</p>
          )}
          <label className="flex items-start gap-3 text-[0.875rem] text-niebla/85">
            <input type="checkbox" required className="mt-1 size-4 accent-rojo" />
            <span>He leído y acepto las bases del concurso.</span>
          </label>
          <button type="submit" className="btn btn-primary w-full">
            Confirmar
          </button>
        </form>
      </Modal>
      <PreviewSubmitted
        open={!!done}
        onClose={() => setDone(null)}
        title="Inscripción lista"
        summary={
          <p>
            Así se registraría <strong className="text-blanco">{done}</strong> en «{c.title}»{team && emails.length ? `, con ${emails.length} invitación(es) pendiente(s)` : ''}.
          </p>
        }
      />
    </div>
  );
}

function Countdown({target}: {target: string}) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const s = Math.max(0, Math.floor((new Date(target).getTime() - now) / 1000));
  const parts: [string, number][] = [
    ['Días', Math.floor(s / 86400)],
    ['Hrs', Math.floor((s % 86400) / 3600)],
    ['Min', Math.floor((s % 3600) / 60)],
    ['Seg', s % 60],
  ];
  return (
    <div className="relative mt-4 grid grid-cols-4 gap-2" role="timer" aria-label={`Faltan ${parts[0][1]} días y ${parts[1][1]} horas para el cierre`}>
      {parts.map(([l, v]) => (
        <div key={l} className="brackets py-2 text-center text-blanco/25">
          <span className="block font-wide text-[1.5rem] text-blanco tabular-nums">{String(v).padStart(2, '0')}</span>
          <span className="block font-mono text-[0.5625rem] tracking-[0.14em] text-niebla/60 uppercase">{l}</span>
        </div>
      ))}
    </div>
  );
}
