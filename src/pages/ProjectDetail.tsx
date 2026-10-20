import {useQuery} from '@tanstack/react-query';
import {useState, type FormEvent} from 'react';
import {useParams} from 'react-router-dom';
import {ProjectCard} from '../components/ui/Cards';
import {DetailHero, StickyAside} from '../components/ui/DetailHero';
import {DemoTag, ErrorState, Loading} from '../components/ui/Feedback';
import {GenArt} from '../components/ui/GenArt';
import {Modal, PreviewSubmitted} from '../components/ui/Modal';
import {Section, SectionTitle} from '../components/ui/Page';
import {getProject, listProjects} from '../data/api';
import {useSeo} from '../hooks/useSeo';
import NotFound from './NotFound';

export default function ProjectDetail() {
  const {slug = ''} = useParams();
  const q = useQuery({queryKey: ['project', slug], queryFn: () => getProject(slug)});
  const all = useQuery({queryKey: ['projects'], queryFn: () => listProjects()});
  const p = q.data;
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(false);
  useSeo({title: p?.title ?? 'Proyecto', description: p?.summary});

  if (q.isLoading) return <div className="pt-40"><Loading label="Cargando proyecto" /></div>;
  if (q.isError) return <div className="px-4 pt-40"><ErrorState error={q.error} /></div>;
  if (!p) return <NotFound what="proyecto" back="/proyectos" />;

  const more = (all.data ?? []).filter((x) => x.id !== p.id).slice(0, 3);
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!e.currentTarget.checkValidity()) {
      e.currentTarget.reportValidity();
      return;
    }
    setOpen(false);
    setSent(true);
  };

  return (
    <>
      <DetailHero seed={p.slug} image={p.cover_url} imageAlt={p.cover_alt} back={{to: '/proyectos', label: 'Escaparate Dale Lab'}}>
        <div className="flex flex-wrap items-center gap-2">
          <span className="chip text-ok ring-ok/40">Publicado</span>
          {p.disciplines.map((d) => (
            <span key={d} className="chip bg-noche/40">
              {d}
            </span>
          ))}
          {p.is_demo && <DemoTag />}
        </div>
        <h1 className="mt-6 max-w-5xl font-wide text-[clamp(2rem,5vw,4.6rem)] leading-[0.98] text-blanco">{p.title}</h1>
        <p className="mt-5 max-w-2xl text-lead text-niebla/85">{p.summary}</p>
      </DetailHero>

      <Section className="pb-24">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-16">
          <div className="space-y-14">
            <section data-reveal>
              <h2 className="eyebrow">La idea</h2>
              <p className="prose-dale mt-4 max-w-2xl text-[1.0625rem]">{p.description || p.summary}</p>
            </section>
            <section data-reveal>
              <h2 className="eyebrow">Galería</h2>
              <div className="mt-5 grid grid-cols-6 gap-3">
                {(p.gallery.length ? p.gallery.map((g) => g.url) : [0, 1, 2]).map((g, i) => (
                  <figure key={i} className={`overflow-hidden rounded-2xl ring-1 ring-blanco/10 ${i === 0 ? 'col-span-6 aspect-[16/7]' : 'col-span-3 aspect-[4/3]'}`}>
                    {typeof g === 'string' ? <img src={g} alt="" loading="lazy" className="size-full object-cover" /> : <GenArt seed={`${p.slug}-${g}`} className="size-full" />}
                  </figure>
                ))}
              </div>
              {!p.gallery.length && <p className="mt-2 font-mono text-[0.625rem] tracking-[0.12em] text-niebla/45 uppercase">Ilustraciones generativas hasta que el equipo suba sus imágenes.</p>}
            </section>
            {p.links.length > 0 && (
              <section data-reveal>
                <h2 className="eyebrow">Enlaces</h2>
                <ul className="mt-4 flex flex-wrap gap-3">
                  {p.links.map((l) => (
                    <li key={l.url}>
                      <a href={l.url} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">
                        {l.label} ↗
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
          <StickyAside>
            <div className="rounded-[24px] bg-noche-2 p-6 ring-1 ring-magenta/40 md:p-7">
              <p className="eyebrow">Equipo</p>
              <p className="mt-3 text-body text-blanco">{p.team_text ?? 'Equipo multidisciplinario'}</p>
              {p.looking_for.length > 0 && (
                <>
                  <p className="mt-6 eyebrow">Buscan</p>
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {p.looking_for.map((l) => (
                      <li key={l} className="chip text-blanco ring-rojo/50">
                        {l}
                      </li>
                    ))}
                  </ul>
                </>
              )}
              <button type="button" className="btn btn-primary mt-7 w-full" onClick={() => setOpen(true)}>
                Quiero colaborar
              </button>
            </div>
          </StickyAside>
        </div>
      </Section>

      {more.length > 0 && (
        <Section className="pb-28">
          <SectionTitle eyebrow="Más de Dale Lab" title="Otros proyectos." />
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {more.map((x) => (
              <div key={x.id} data-reveal>
                <ProjectCard project={x} />
              </div>
            ))}
          </div>
        </Section>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Solicitud de colaboración">
        <form noValidate onSubmit={submit} className="space-y-3">
          <label className="block">
            <span className="label">¿Qué puedes aportar?</span>
            <textarea required minLength={10} maxLength={1000} rows={4} className="field" placeholder="Cuéntales tu carrera, habilidades y disponibilidad." />
          </label>
          <button type="submit" className="btn btn-primary w-full">
            Enviar solicitud
          </button>
        </form>
      </Modal>
      <PreviewSubmitted open={sent} onClose={() => setSent(false)} title="Solicitud lista" summary={<p>El equipo de «{p.title}» vería tu mensaje y podría aceptarte desde su cuenta.</p>} />
    </>
  );
}
