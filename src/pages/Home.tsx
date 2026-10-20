import {useQuery} from '@tanstack/react-query';
import {Link} from 'react-router-dom';
import {ActivityPillars} from '../components/home/ActivityPillars';
import {BrandReveal} from '../components/home/BrandReveal';
import {ExperiencesReel} from '../components/home/ExperiencesReel';
import {JoinCommunity} from '../components/home/JoinCommunity';
import {LineArt} from '../components/home/LineArt';
import {ParticipationPath} from '../components/home/ParticipationPath';
import {Avatar} from '../components/ui/Avatar';
import {ProjectCard} from '../components/ui/Cards';
import {DemoTag} from '../components/ui/Feedback';
import {Section, SectionTitle} from '../components/ui/Page';
import {ScrollWords} from '../components/ui/ScrollWords';
import {heroDefaults, labels, lines, manifestoDefaults} from '../content';
import {contestState, isDemoMode, getContent, listContests, listEvents, listOpportunities, listOrgMembers, listPartners, listProjects, nextRealEvent} from '../data/api';
import {useSeo} from '../hooks/useSeo';
import {dateParts, fmtDate, fmtTime, relativeDays} from '../lib/format';

export default function Home() {
  useSeo({});
  const content = useQuery({queryKey: ['content'], queryFn: getContent});
  const events = useQuery({queryKey: ['events', 'upcoming'], queryFn: () => listEvents({when: 'upcoming'})});
  const contests = useQuery({queryKey: ['contests'], queryFn: () => listContests()});
  const projects = useQuery({queryKey: ['projects'], queryFn: () => listProjects()});
  const opps = useQuery({queryKey: ['opportunities', 'active'], queryFn: () => listOpportunities({state: 'active'})});
  const team = useQuery({queryKey: ['org'], queryFn: () => listOrgMembers()});
  const partners = useQuery({queryKey: ['partners'], queryFn: () => listPartners()});
  const next = useQuery({queryKey: ['next-real-event'], queryFn: nextRealEvent});

  const hero = {...heroDefaults, ...(content.data?.['home.hero'] ?? {})};
  const manifesto = {...manifestoDefaults, ...(content.data?.['home.manifesto'] ?? {})};
  const names = Object.fromEntries(lines.map((l) => [l.key, content.data?.['brand.lines']?.[l.key] ?? l.name]));

  const up = events.data ?? [];
  const openContests = (contests.data ?? []).filter((c) => contestState(c) === 'open');
  const counts = events.data && contests.data && projects.data && opps.data
    ? {
        talks: up.filter((e) => e.line === 'talks').length,
        challenge: openContests.length,
        lab: projects.data.filter((p) => p.looking_for.length).length,
        network: up.filter((e) => e.line === 'network').length,
        future: opps.data.length + up.filter((e) => e.line === 'future').length,
      }
    : {};
  const featured = openContests[0] ?? contests.data?.[0];

  return (
    <>
      <BrandReveal hero={hero} />

      {/* Manifiesto: el texto se enciende con el scroll. */}
      <Section className="relative bg-noche pt-4 pb-28 md:pt-8 md:pb-44" label="Manifiesto">
        <div className="grid gap-10 md:grid-cols-[minmax(0,14rem)_1fr] md:gap-16">
          <p className="eyebrow" data-reveal>
            {manifesto.eyebrow}
          </p>
          <div>
            <ScrollWords text={manifesto.heading} highlight={['carreras', 'misma', 'cancha']} className="font-wide text-[clamp(1.6rem,4.2vw,3.8rem)] leading-[1.04] text-blanco" />
            <p className="mt-10 max-w-2xl text-lead text-niebla/80" data-reveal>
              {manifesto.body}
            </p>
            <div className="mt-8 flex flex-wrap gap-3" data-reveal>
              <Link to="/nosotros" className="btn btn-ghost">
                Conoce la historia
              </Link>
            </div>
          </div>
        </div>
      </Section>

      <ExperiencesReel names={names} images={content.data?.['home.reel']} />
      <ParticipationPath />
      <ActivityPillars names={names} counts={counts} />

      {/* Agenda: lista editorial de próximos eventos. */}
      <Section className="bg-noche py-24 md:py-32" id="agenda" label="Próximos eventos">
        <SectionTitle
          eyebrow="Agenda · hora de Lima"
          title="Lo que viene."
          action={
            <Link to="/eventos" className="btn btn-ghost self-start md:self-auto">
              Todos los eventos
            </Link>
          }
        />
        <ol className="mt-12 border-t border-blanco/10">
          {up.slice(0, 5).map((e, i) => {
            const d = dateParts(e.starts_at);
            return (
              <li key={e.id} data-reveal style={{transitionDelay: `${i * 70}ms`}} className="group relative border-b border-blanco/10">
                <div className="grid grid-cols-[4.5rem_1fr] items-center gap-4 py-6 transition-colors md:grid-cols-[7rem_1fr_auto_auto] md:gap-8 md:py-8">
                  <div className="font-wide leading-none text-blanco">
                    <span className="block text-[2.2rem] md:text-[3rem]">{d.day}</span>
                    <span className="font-mono text-label text-rojo">{d.month}</span>
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-label text-azul uppercase">{names[e.line] ?? e.line}</span>
                      <span className="font-mono text-label text-niebla/50 uppercase">· {labels.eventKind[e.kind]}</span>
                      {e.is_demo && <DemoTag />}
                    </div>
                    <h3 className="mt-2 text-[1.15rem] font-bold text-blanco transition-colors group-hover:text-azul md:text-[1.5rem]">
                      <Link to={`/eventos/${e.slug}`} className="after:absolute after:inset-0">
                        {e.title}
                      </Link>
                    </h3>
                  </div>
                  <p className="col-start-2 font-mono text-label text-niebla/60 uppercase md:col-start-auto">
                    {labels.modality[e.modality]} · {fmtTime(e.starts_at)} h
                  </p>
                  <span aria-hidden="true" className="hidden size-12 place-items-center rounded-full ring-1 ring-blanco/20 transition-all group-hover:bg-rojo group-hover:ring-rojo md:grid">
                    →
                  </span>
                </div>
              </li>
            );
          })}
        </ol>
        {events.isFetched && up.length === 0 && <p className="mt-8 text-body">Aún no hay eventos publicados. Vuelve pronto.</p>}
      </Section>

      {/* Concurso destacado. */}
      {featured && (
        <Section className="bg-noche py-16 md:py-24" label="Concurso destacado">
          <article className="relative grid overflow-hidden rounded-[28px] bg-noche-3 ring-1 ring-rojo/30 md:grid-cols-[1.1fr_1fr]" data-reveal>
            <div className="relative z-10 p-7 md:p-12">
              <div className="flex flex-wrap items-center gap-2">
                <span className="eyebrow">Dale Challenge · destacado</span>
                {featured.is_demo && <DemoTag />}
              </div>
              <h2 className="mt-5 font-wide text-[clamp(1.7rem,3.6vw,3.2rem)] leading-[1.02] text-blanco">{featured.title}</h2>
              <p className="mt-5 max-w-xl text-lead text-niebla/80">{featured.summary}</p>
              <dl className="mt-8 grid grid-cols-2 gap-6 border-t border-blanco/10 pt-6 sm:grid-cols-3">
                <div>
                  <dt className="font-mono text-label text-niebla/55 uppercase">Formato</dt>
                  <dd className="mt-1 font-bold text-blanco">{labels.participation[featured.participation_mode]}</dd>
                </div>
                <div>
                  <dt className="font-mono text-label text-niebla/55 uppercase">Equipos</dt>
                  <dd className="mt-1 font-bold text-blanco">
                    {featured.min_team_size}–{featured.max_team_size} personas
                  </dd>
                </div>
                {featured.registration_closes_at && (
                  <div>
                    <dt className="font-mono text-label text-niebla/55 uppercase">Cierre</dt>
                    <dd className="mt-1 font-bold text-blanco">
                      {fmtDate(featured.registration_closes_at, {year: undefined})} <span className="font-normal text-niebla/60">({relativeDays(featured.registration_closes_at)})</span>
                    </dd>
                  </div>
                )}
              </dl>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link to={`/concursos/${featured.slug}`} className="btn btn-primary">
                  Ver bases e inscribirme
                </Link>
                <Link to="/concursos" className="btn btn-ghost">
                  Todos los concursos
                </Link>
              </div>
            </div>
            <div className="relative min-h-64 md:min-h-full">
              <LineArt line="challenge" className="absolute inset-0 size-full" />
              <div className="absolute inset-0 bg-gradient-to-r from-noche-3 via-noche-3/30 to-transparent max-md:bg-gradient-to-t" />
            </div>
          </article>
        </Section>
      )}

      {/* Proyectos. */}
      <Section className="bg-noche py-24 md:py-32" label="Proyectos">
        <SectionTitle
          eyebrow="Dale Lab"
          title="Proyectos que solo nacen entre carreras."
          action={
            <Link to="/proyectos" className="btn btn-ghost self-start md:self-auto">
              Ver escaparate
            </Link>
          }
        />
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
          {(projects.data ?? []).slice(0, 3).map((p, i) => (
            <div key={p.id} data-reveal style={{transitionDelay: `${i * 90}ms`}}>
              <ProjectCard project={p} />
            </div>
          ))}
        </div>
      </Section>

      {/* Equipo y aliados. */}
      <Section className="bg-noche py-24 md:py-32" label="Equipo">
        <SectionTitle
          eyebrow="Equipo"
          title="Quienes lo hacen posible."
          action={
            <Link to="/nosotros#equipo" className="btn btn-ghost self-start md:self-auto">
              Conoce al equipo
            </Link>
          }
        />
        <ul className="mt-12 grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 lg:grid-cols-6">
          {(team.data ?? []).map((m, i) => (
            <li key={m.id} data-reveal style={{transitionDelay: `${i * 60}ms`}}>
              <Avatar name={m.name} index={i} />
              <p className="mt-4 flex flex-wrap items-center gap-2 font-bold text-blanco">
                {m.name} {isDemoMode && <DemoTag />}
              </p>
              <p className="font-mono text-[0.625rem] tracking-[0.12em] text-azul uppercase">{m.role_title}</p>
              {m.career && <p className="mt-1 text-[0.8125rem] text-niebla/60">{m.career}</p>}
            </li>
          ))}
        </ul>

        <div className="mt-20 rounded-[24px] border border-dashed border-blanco/15 p-8 text-center md:p-12" data-reveal>
          <p className="eyebrow">Aliados</p>
          {(partners.data ?? []).length > 0 ? (
            <ul className="mt-6 flex flex-wrap items-center justify-center gap-10">
              {partners.data!.map((p) => (
                <li key={p.id}>{p.logo_url ? <img src={p.logo_url} alt={p.name} className="h-10 w-auto opacity-80" loading="lazy" /> : p.name}</li>
              ))}
            </ul>
          ) : (
            <>
              <p className="mx-auto mt-4 max-w-xl font-wide text-[1.2rem] leading-tight text-blanco md:text-[1.5rem]">Este espacio espera a sus primeros aliados.</p>
              <p className="mx-auto mt-3 max-w-lg text-body text-niebla/70">No mostramos logos sin un acuerdo real. ¿Tu organización quiere impulsar a estudiantes de todas las carreras?</p>
              <Link to="/contacto?asunto=alianza" className="btn btn-light mt-6">
                Proponer una alianza
              </Link>
            </>
          )}
        </div>
      </Section>

      <JoinCommunity nextEvent={next.data ?? null} />
    </>
  );
}
