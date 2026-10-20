import {useQuery} from '@tanstack/react-query';
import {useState} from 'react';
import {Link, useParams} from 'react-router-dom';
import {OpportunityCard} from '../components/ui/Cards';
import {DetailHero, StickyAside} from '../components/ui/DetailHero';
import {DemoTag, ErrorState, Loading} from '../components/ui/Feedback';
import {Modal} from '../components/ui/Modal';
import {Section, SectionTitle} from '../components/ui/Page';
import {labels} from '../content';
import {getOpportunity, listOpportunities} from '../data/api';
import {useSeo} from '../hooks/useSeo';
import {fmtDate, relativeDays} from '../lib/format';
import NotFound from './NotFound';

export default function OpportunityDetail() {
  const {slug = ''} = useParams();
  const q = useQuery({queryKey: ['opportunity', slug], queryFn: () => getOpportunity(slug)});
  const all = useQuery({queryKey: ['opportunities', 'all'], queryFn: () => listOpportunities()});
  const o = q.data;
  const [demoInfo, setDemoInfo] = useState(false);
  useSeo({title: o?.title ?? 'Oportunidad', description: o?.summary});

  if (q.isLoading) return <div className="pt-40"><Loading /></div>;
  if (q.isError) return <div className="px-4 pt-40"><ErrorState error={q.error} /></div>;
  if (!o) return <NotFound what="oportunidad" back="/oportunidades" />;

  const expired = !!o.deadline && new Date(o.deadline).getTime() < Date.now();
  const more = (all.data ?? []).filter((x) => x.id !== o.id && x.category === o.category).slice(0, 3);

  return (
    <>
      <DetailHero seed={o.slug} back={{to: '/oportunidades', label: 'Todas las oportunidades'}}>
        <div className="flex flex-wrap items-center gap-2">
          <span className="chip text-azul ring-azul/40">{labels.opportunity[o.category]}</span>
          <span className={`chip ${expired ? 'text-gris' : 'text-ok ring-ok/40'}`}>{expired ? 'Caducada' : 'Activa'}</span>
          {o.is_demo && <DemoTag />}
        </div>
        <h1 className="mt-6 max-w-4xl font-wide text-[clamp(1.9rem,4.6vw,4.2rem)] leading-[1] text-blanco">{o.title}</h1>
        {o.organization && <p className="mt-4 font-mono text-label text-niebla/70 uppercase">{o.organization}</p>}
      </DetailHero>
      <Section className="pb-24">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-16">
          <div className="space-y-10" data-reveal>
            <p className="max-w-2xl text-lead text-niebla/90">{o.summary}</p>
            {o.description && <p className="prose-dale max-w-2xl">{o.description}</p>}
            {o.requirements && (
              <div className="max-w-2xl rounded-2xl bg-blanco/[0.03] p-5 ring-1 ring-blanco/10">
                <p className="font-mono text-label text-azul uppercase">Requisitos</p>
                <p className="mt-2 text-body text-niebla/85">{o.requirements}</p>
              </div>
            )}
          </div>
          <StickyAside>
            <div className="rounded-[24px] bg-noche-2 p-6 ring-1 ring-azul/30 md:p-7">
              <p className="eyebrow">Fecha límite</p>
              <p className="mt-3 font-wide text-[1.6rem] leading-tight text-blanco">{o.deadline ? fmtDate(o.deadline) : 'Sin fecha de cierre'}</p>
              {o.deadline && <p className="mt-1 text-[0.875rem] text-niebla/70">{expired ? 'Cerró' : 'Cierra'} {relativeDays(o.deadline)}</p>}
              {expired ? (
                <p className="mt-6 rounded-xl bg-blanco/5 px-4 py-3 text-[0.875rem]">Esta oportunidad ya no recibe postulaciones.</p>
              ) : o.apply_url ? (
                <a href={o.apply_url} target="_blank" rel="noreferrer" className="btn btn-primary mt-6 w-full">
                  Postular ↗
                </a>
              ) : (
                <button type="button" className="btn btn-primary mt-6 w-full" onClick={() => setDemoInfo(true)}>
                  Postular
                </button>
              )}
              <Link to="/contacto" className="mt-3 block text-center font-mono text-[0.6875rem] tracking-[0.1em] text-azul uppercase hover:text-blanco">
                ¿Dudas? Contáctanos
              </Link>
            </div>
          </StickyAside>
        </div>
      </Section>
      {more.length > 0 && (
        <Section className="pb-28">
          <SectionTitle eyebrow="Similares" title={`Más ${labels.opportunity[o.category].toLowerCase()}.`} />
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {more.map((x) => (
              <div key={x.id} data-reveal>
                <OpportunityCard opportunity={x} />
              </div>
            ))}
          </div>
        </Section>
      )}
      <Modal open={demoInfo} onClose={() => setDemoInfo(false)} title="Postulación externa">
        <p className="text-body">En una oportunidad real, este botón lleva al formulario o enlace oficial de la organización. Esta es una oportunidad de demostración, así que no hay enlace.</p>
        <button type="button" className="btn btn-light mt-6 w-full" onClick={() => setDemoInfo(false)}>
          Entendido
        </button>
      </Modal>
    </>
  );
}
