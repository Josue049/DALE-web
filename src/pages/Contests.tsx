import {useQuery} from '@tanstack/react-query';
import {useMemo} from 'react';
import {ContestCard} from '../components/ui/Cards';
import {EmptyState, ErrorState, Loading} from '../components/ui/Feedback';
import {FilterBar, SearchInput, Segmented, SelectFilter, useFilters} from '../components/ui/Filters';
import {PageHeader, Section} from '../components/ui/Page';
import {labels} from '../content';
import {contestState, listContests} from '../data/api';
import {useSeo} from '../hooks/useSeo';

export default function Contests() {
  useSeo({title: 'Concursos', description: 'Dale Challenge: concursos y retos individuales o por equipos para estudiantes de todas las carreras, con bases, cronograma, jurado y premios.'});
  const {values, set, reset, active} = useFilters(['q', 'state', 'mode', 'discipline'] as const);
  const q = useQuery({queryKey: ['contests'], queryFn: () => listContests()});

  const disciplines = useMemo(() => [...new Set((q.data ?? []).flatMap((c) => c.disciplines))].sort(), [q.data]);
  const filtered = useMemo(
    () =>
      (q.data ?? []).filter((c) => {
        const st = contestState(c);
        if (values.state === 'open' && st !== 'open') return false;
        if (values.state === 'upcoming' && st !== 'upcoming') return false;
        if (values.state === 'closed' && !['evaluation', 'results', 'closed'].includes(st)) return false;
        if (values.mode && c.participation_mode !== values.mode && c.participation_mode !== 'mixto') return false;
        if (values.discipline && !c.disciplines.includes(values.discipline)) return false;
        if (values.q && !`${c.title} ${c.summary} ${c.disciplines.join(' ')}`.toLowerCase().includes(values.q.toLowerCase())) return false;
        return true;
      }),
    [q.data, values],
  );
  const open = (q.data ?? []).filter((c) => contestState(c) === 'open').length;

  return (
    <>
      <PageHeader
        eyebrow="Dale Challenge"
        title={
          <>
            Compite con <span className="text-gradient-brand">todo lo que sabes.</span>
          </>
        }
        intro="Retos con bases claras, cronograma, jurado y premios. Individuales o por equipos de carreras distintas, según cada concurso."
        aside={
          q.data && (
            <div className="flex gap-8 lg:flex-col lg:gap-5 lg:text-right">
              <Stat n={open} label="Con inscripción abierta" />
              <Stat n={q.data.length} label="Concursos publicados" />
            </div>
          )
        }
      />
      <Section className="pb-28">
        <FilterBar count={filtered.length} onReset={active ? reset : undefined}>
          <Segmented
            label="Estado"
            value={values.state as '' | 'open' | 'upcoming' | 'closed'}
            onChange={(v) => set('state', v)}
            options={[['', 'Todos'], ['open', 'Abiertos'], ['upcoming', 'Próximos'], ['closed', 'Cerrados']]}
          />
          <SearchInput value={values.q} onChange={(v) => set('q', v)} placeholder="Buscar concursos" label="Buscar concursos" />
          <SelectFilter label="Participación" value={values.mode} onChange={(v) => set('mode', v)} options={[['individual', 'Individual'], ['equipo', 'Por equipos']]} />
          <SelectFilter label="Disciplina" value={values.discipline} onChange={(v) => set('discipline', v)} options={disciplines.map((d) => [d, d])} />
        </FilterBar>
        <div className="mt-10">
          {q.isLoading && <Loading label="Cargando concursos" />}
          {q.isError && <ErrorState error={q.error} retry={() => q.refetch()} />}
          {q.isSuccess && filtered.length === 0 && (
            <EmptyState title="Ningún concurso coincide" body="Cambia los filtros o vuelve pronto: publicamos retos nuevos cada ciclo." action={<button type="button" className="btn btn-ghost" onClick={reset}>Ver todos</button>} />
          )}
          <div className="grid gap-4 md:grid-cols-2 lg:gap-5">
            {filtered.map((c, i) => (
              <div key={c.id} data-reveal style={{transitionDelay: `${(i % 4) * 80}ms`}}>
                <ContestCard contest={c} />
              </div>
            ))}
          </div>
        </div>
        <p className="mt-10 font-mono text-[0.6875rem] tracking-[0.08em] text-niebla/50 uppercase">
          Formatos: {Object.values(labels.participation).join(' · ')}. La elegibilidad (UTP, universidades invitadas o público) se define en cada concurso.
        </p>
      </Section>
    </>
  );
}

function Stat({n, label}: {n: number; label: string}) {
  return (
    <div>
      <p className="font-wide text-[3rem] leading-none text-blanco md:text-[4rem]">{String(n).padStart(2, '0')}</p>
      <p className="mt-1 font-mono text-label text-niebla/60 uppercase">{label}</p>
    </div>
  );
}
