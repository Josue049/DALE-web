import {useQuery} from '@tanstack/react-query';
import {Link} from 'react-router-dom';
import {OpportunityCard} from '../components/ui/Cards';
import {EmptyState, ErrorState, Loading} from '../components/ui/Feedback';
import {FilterBar, SearchInput, Segmented, useFilters} from '../components/ui/Filters';
import {PageHeader, Section} from '../components/ui/Page';
import {labels} from '../content';
import {listOpportunities} from '../data/api';
import {useSeo} from '../hooks/useSeo';

const ICON: Record<string, string> = {convocatoria: '◎', mentoria: '◐', voluntariado: '✦', practicas: '▲', beca: '◆', recurso: '▤'};

export default function Opportunities() {
  useSeo({title: 'Oportunidades', description: 'Dale Future: convocatorias, mentorías, prácticas, becas, voluntariado y recursos para tu desarrollo profesional.'});
  const {values, set, reset, active} = useFilters(['q', 'category', 'state'] as const);
  const state = (values.state || 'active') as 'active' | 'expired' | 'all';
  const q = useQuery({queryKey: ['opportunities', 'all'], queryFn: () => listOpportunities()});
  const now = Date.now();
  const all = q.data ?? [];
  const filtered = all.filter((o) => {
    const expired = !!o.deadline && new Date(o.deadline).getTime() < now;
    if (state === 'active' && expired) return false;
    if (state === 'expired' && !expired) return false;
    if (values.category && o.category !== values.category) return false;
    if (values.q && !`${o.title} ${o.summary} ${o.organization ?? ''}`.toLowerCase().includes(values.q.toLowerCase())) return false;
    return true;
  });
  const closingSoon = all.filter((o) => o.deadline && new Date(o.deadline).getTime() > now && new Date(o.deadline).getTime() - now < 10 * 86400000);

  return (
    <>
      <PageHeader
        eyebrow="Dale Future"
        tone="azul"
        title={
          <>
            Tu siguiente paso <span className="text-gradient-brand">empieza aquí.</span>
          </>
        }
        intro="Convocatorias, mentorías, prácticas, becas, voluntariado y recursos. Solo publicamos oportunidades con información verificable."
      />
      <Section className="pb-28">
        {/* Categorías como accesos rápidos. */}
        <ul className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6" data-reveal>
          {Object.entries(labels.opportunity).map(([k, l]) => {
            const n = all.filter((o) => o.category === k).length;
            const on = values.category === k;
            return (
              <li key={k}>
                <button
                  type="button"
                  aria-pressed={on}
                  onClick={() => set('category', on ? '' : k)}
                  className={`group w-full rounded-2xl p-4 text-left ring-1 transition-all ${on ? 'bg-blanco text-noche ring-blanco' : 'bg-noche-2 ring-blanco/10 hover:ring-azul/50'}`}
                >
                  <span aria-hidden="true" className={`text-[1.4rem] ${on ? 'text-rojo' : 'text-azul'}`}>
                    {ICON[k]}
                  </span>
                  <span className={`mt-3 block font-wide text-[0.95rem] ${on ? 'text-noche' : 'text-blanco'}`}>{l}</span>
                  <span className={`font-mono text-[0.625rem] tracking-[0.12em] uppercase ${on ? 'text-noche/60' : 'text-niebla/55'}`}>{n} publicadas</span>
                </button>
              </li>
            );
          })}
        </ul>

        <FilterBar count={filtered.length} onReset={active ? reset : undefined}>
          <Segmented label="Vigencia" value={state} onChange={(v) => set('state', v === 'active' ? '' : v)} options={[['active', 'Activas'], ['expired', 'Caducadas'], ['all', 'Todas']]} />
          <SearchInput value={values.q} onChange={(v) => set('q', v)} placeholder="Buscar oportunidades" label="Buscar oportunidades" />
        </FilterBar>

        {closingSoon.length > 0 && state === 'active' && !values.category && (
          <div className="mt-8 flex flex-wrap items-center gap-3 rounded-2xl bg-rojo/10 px-5 py-4 ring-1 ring-rojo/30" data-reveal>
            <span className="font-mono text-label text-rojo uppercase">Cierran pronto</span>
            {closingSoon.map((o) => (
              <Link key={o.id} to={`/oportunidades/${o.slug}`} className="text-[0.9rem] text-blanco underline decoration-rojo underline-offset-4">
                {o.title}
              </Link>
            ))}
          </div>
        )}

        <div className="mt-10">
          {q.isLoading && <Loading label="Cargando oportunidades" />}
          {q.isError && <ErrorState error={q.error} retry={() => q.refetch()} />}
          {q.isSuccess && filtered.length === 0 && <EmptyState title="Sin oportunidades con estos filtros" body="Prueba con otra categoría o revisa las caducadas." />}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 lg:gap-5">
            {filtered.map((o, i) => (
              <div key={o.id} data-reveal style={{transitionDelay: `${(i % 3) * 70}ms`}}>
                <OpportunityCard opportunity={o} />
              </div>
            ))}
          </div>
        </div>
        <p className="mt-12 max-w-2xl text-[0.875rem] text-niebla/55">
          ¿Tu organización tiene una oportunidad para estudiantes? <Link to="/contacto?asunto=oportunidad" className="text-blanco underline underline-offset-4">Escríbenos</Link>: la revisamos antes de publicarla.
        </p>
      </Section>
    </>
  );
}
