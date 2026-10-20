import {useQuery} from '@tanstack/react-query';
import {useMemo, useState} from 'react';
import {Link} from 'react-router-dom';
import {EventCard} from '../components/ui/Cards';
import {DemoTag, EmptyState, ErrorState, Loading} from '../components/ui/Feedback';
import {FilterBar, SearchInput, Segmented, SelectFilter, useFilters} from '../components/ui/Filters';
import {PageHeader, Section} from '../components/ui/Page';
import {labels, lines} from '../content';
import {getAvailability, listEvents} from '../data/api';
import type {EventRow} from '../data/types';
import {useSeo} from '../hooks/useSeo';

const TZ = 'America/Lima';
const limaKey = (iso: string) => new Intl.DateTimeFormat('en-CA', {timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit'}).format(new Date(iso));

export default function Events() {
  useSeo({title: 'Eventos', description: 'Webinars, talleres, conferencias, encuentros y voluntariados de DALE CON TODO. Horarios en hora de Lima.'});
  const {values, set, reset, active} = useFilters(['q', 'when', 'modality', 'kind', 'line'] as const);
  const [view, setView] = useState<'lista' | 'calendario'>('lista');
  const when = (values.when || 'upcoming') as 'upcoming' | 'past' | 'all';

  const q = useQuery({queryKey: ['events', when], queryFn: () => listEvents({when})});
  const filtered = useMemo(
    () => (q.data ?? []).filter((e) => (!values.modality || e.modality === values.modality) && (!values.kind || e.kind === values.kind) && (!values.line || e.line === values.line) && (!values.q || `${e.title} ${e.summary}`.toLowerCase().includes(values.q.toLowerCase()))),
    [q.data, values],
  );
  const avail = useQuery({queryKey: ['availability', filtered.map((e) => e.id).join()], queryFn: () => getAvailability(filtered.map((e) => e.id)), enabled: filtered.length > 0});

  const [lead, ...rest] = filtered;

  return (
    <>
      <PageHeader
        eyebrow="Dale Talks · Agenda"
        title={
          <>
            Aprende de quienes <span className="text-gradient-brand">ya lo hicieron.</span>
          </>
        }
        intro="Webinars, talleres, conferencias, encuentros y voluntariados para todas las carreras. Todos los horarios están en hora de Lima."
        tone="azul"
      />
      <Section className="pb-28">
        <FilterBar count={filtered.length} onReset={active ? reset : undefined}>
          <Segmented label="Momento" value={when} onChange={(v) => set('when', v === 'upcoming' ? '' : v)} options={[['upcoming', 'Próximos'], ['past', 'Realizados'], ['all', 'Todos']]} />
          <SearchInput value={values.q} onChange={(v) => set('q', v)} placeholder="Buscar eventos" label="Buscar eventos" />
          <SelectFilter label="Modalidad" value={values.modality} onChange={(v) => set('modality', v)} options={Object.entries(labels.modality)} />
          <SelectFilter label="Tipo" value={values.kind} onChange={(v) => set('kind', v)} options={Object.entries(labels.eventKind)} />
          <SelectFilter label="Línea" value={values.line} onChange={(v) => set('line', v)} options={lines.map((l) => [l.key, l.name])} />
          <Segmented label="Vista" value={view} onChange={setView} options={[['lista', 'Lista'], ['calendario', 'Calendario']]} />
        </FilterBar>

        <div className="mt-10">
          {q.isLoading && <Loading label="Cargando eventos" />}
          {q.isError && <ErrorState error={q.error} retry={() => q.refetch()} />}
          {q.isSuccess && filtered.length === 0 && (
            <EmptyState
              title="No hay eventos con estos filtros"
              body="Prueba con otra modalidad o revisa los eventos realizados."
              action={
                <button type="button" className="btn btn-ghost" onClick={reset}>
                  Ver todos
                </button>
              }
            />
          )}
          {filtered.length > 0 && view === 'calendario' && <MonthCalendar events={filtered} />}
          {filtered.length > 0 && view === 'lista' && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 lg:gap-5">
              {lead && (
                <div className="md:col-span-2 lg:row-span-2" data-reveal>
                  <FeaturedEvent event={lead} />
                </div>
              )}
              {rest.map((e, i) => (
                <div key={e.id} data-reveal style={{transitionDelay: `${(i % 6) * 60}ms`}}>
                  <EventCard event={e} availability={avail.data?.[e.id]} />
                </div>
              ))}
            </div>
          )}
        </div>
      </Section>
    </>
  );
}

/** Primer evento de la lista con composición editorial ampliada. */
function FeaturedEvent({event: e}: {event: EventRow}) {
  const d = new Date(e.starts_at);
  const day = new Intl.DateTimeFormat('es-PE', {timeZone: TZ, day: '2-digit'}).format(d);
  const month = new Intl.DateTimeFormat('es-PE', {timeZone: TZ, month: 'long'}).format(d);
  const time = new Intl.DateTimeFormat('es-PE', {timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false}).format(d);
  return (
    <article className="group relative flex h-full min-h-[24rem] flex-col justify-between overflow-hidden rounded-[24px] bg-noche-3 p-7 ring-1 ring-azul/30 md:p-10">
      <svg aria-hidden="true" viewBox="0 0 400 400" className="pointer-events-none absolute -right-24 -bottom-24 size-[30rem] opacity-70 transition-transform duration-[1.4s] group-hover:rotate-12">
        {[180, 150, 120, 90].map((r, i) => (
          <circle key={r} cx="200" cy="200" r={r} fill="none" stroke={i % 2 ? '#af286c' : '#74b1e0'} strokeWidth={2.6 - i * 0.4} strokeDasharray={`0 ${10 + i * 2}`} strokeLinecap="round" />
        ))}
      </svg>
      <div className="relative flex flex-wrap items-center gap-2">
        <span className="chip text-azul ring-azul/40">Siguiente en agenda</span>
        <span className="chip">{labels.eventKind[e.kind]}</span>
        <span className="chip">{labels.modality[e.modality]}</span>
        {e.is_demo && <DemoTag />}
      </div>
      <div className="relative mt-10">
        <p className="font-wide leading-[0.85] text-blanco">
          <span className="block text-[clamp(4.5rem,11vw,9rem)]">{day}</span>
          <span className="block text-[clamp(1.2rem,2.4vw,2rem)] text-rojo">{month} · {time} h</span>
        </p>
        <h2 className="mt-6 max-w-2xl text-[clamp(1.4rem,2.6vw,2.2rem)] leading-tight font-extrabold text-blanco">
          <Link to={`/eventos/${e.slug}`} className="after:absolute after:inset-0">
            {e.title}
          </Link>
        </h2>
        <p className="mt-3 max-w-xl text-body text-niebla/80">{e.summary}</p>
        <span className="mt-6 inline-flex items-center gap-3 font-mono text-label text-blanco uppercase">
          Ver detalle e inscribirme <span className="grid size-10 place-items-center rounded-full bg-rojo transition-transform group-hover:translate-x-1">→</span>
        </span>
      </div>
    </article>
  );
}

function MonthCalendar({events}: {events: EventRow[]}) {
  const first = events[0] ? new Date(events[0].starts_at) : new Date();
  const [cursor, setCursor] = useState(() => new Date(first.getFullYear(), first.getMonth(), 1));
  const byDay = useMemo(() => {
    const m = new Map<string, EventRow[]>();
    events.forEach((e) => m.set(limaKey(e.starts_at), [...(m.get(limaKey(e.starts_at)) ?? []), e]));
    return m;
  }, [events]);
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const offset = (new Date(year, month, 1).getDay() + 6) % 7; // lunes primero
  const days = new Date(year, month + 1, 0).getDate();
  const cells = Array.from({length: Math.ceil((offset + days) / 7) * 7}, (_, i) => i - offset + 1);
  const title = new Intl.DateTimeFormat('es-PE', {month: 'long', year: 'numeric'}).format(cursor);
  const today = limaKey(new Date().toISOString());

  return (
    <div className="rounded-[24px] bg-noche-2 p-4 ring-1 ring-blanco/8 md:p-8" data-reveal>
      <div className="flex items-center justify-between">
        <h2 className="font-wide text-[1.4rem] text-blanco capitalize md:text-[2rem]" aria-live="polite">
          {title}
        </h2>
        <div className="flex gap-2">
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setCursor(new Date(year, month - 1, 1))} aria-label="Mes anterior">
            ←
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setCursor(new Date(year, month + 1, 1))} aria-label="Mes siguiente">
            →
          </button>
        </div>
      </div>
      <div className="mt-6 grid grid-cols-7 gap-1 md:gap-2" role="grid" aria-label={`Calendario de ${title}`}>
        {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((d) => (
          <div key={d} role="columnheader" className="pb-2 text-center font-mono text-[0.625rem] tracking-[0.14em] text-gris uppercase">
            {d}
          </div>
        ))}
        {cells.map((n, i) => {
          const valid = n >= 1 && n <= days;
          const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(n).padStart(2, '0')}`;
          const list = valid ? (byDay.get(key) ?? []) : [];
          return (
            <div key={i} role="gridcell" className={`min-h-16 rounded-xl p-1.5 md:min-h-28 md:p-2.5 ${valid ? 'bg-blanco/[0.03] ring-1 ring-blanco/6' : ''} ${key === today ? 'ring-azul/60' : ''}`}>
              {valid && <span className={`font-mono text-[0.6875rem] ${list.length ? 'text-blanco' : 'text-niebla/40'}`}>{n}</span>}
              <ul className="mt-1 space-y-1">
                {list.map((e) => (
                  <li key={e.id}>
                    <Link to={`/eventos/${e.slug}`} className="block truncate rounded-md bg-rojo/85 px-1.5 py-1 text-[0.625rem] leading-tight font-semibold text-blanco hover:bg-rojo md:text-[0.75rem]" title={e.title}>
                      <span className="hidden md:inline">{e.title}</span>
                      <span className="md:hidden" aria-label={e.title}>
                        ●
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
