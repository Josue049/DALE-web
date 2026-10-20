import {useQuery} from '@tanstack/react-query';
import {useEffect, useRef} from 'react';
import {Link} from 'react-router-dom';
import {Logo} from '../components/layout/Chrome';
import {Avatar} from '../components/ui/Avatar';
import {DemoTag} from '../components/ui/Feedback';
import {PageHeader, Section, SectionTitle} from '../components/ui/Page';
import {ScrollWords} from '../components/ui/ScrollWords';
import {about, lines, path, site} from '../content';
import {isDemoMode, listOrgMembers} from '../data/api';
import {useReducedMotion} from '../hooks/useReducedMotion';
import {useSeo} from '../hooks/useSeo';
import {clamp} from '../lib/math';
import {onFrame} from '../lib/scroll';

export default function About() {
  useSeo({title: 'Nosotros', description: 'Historia, misión, visión y valores de DALE CON TODO, la comunidad multidisciplinaria nacida entre estudiantes de la UTP.'});
  const team = useQuery({queryKey: ['org'], queryFn: () => listOrgMembers()});

  return (
    <>
      <PageHeader
        eyebrow="Nosotros"
        title={
          <>
            Nacimos para que <span className="text-gradient-brand">ninguna carrera</span> se quede fuera.
          </>
        }
        intro={about.story}
      />

      {/* Misión y visión: dos bloques editoriales, el texto se enciende con el scroll. */}
      <Section className="py-20 md:py-32" label="Misión y visión">
        <div className="grid gap-16 md:grid-cols-2 md:gap-20">
          <div>
            <p className="eyebrow" data-reveal>
              Misión
            </p>
            <ScrollWords text={about.mission} highlight={['todas', 'carreras', 'reales']} className="mt-5 font-wide text-[clamp(1.4rem,2.8vw,2.4rem)] leading-[1.08] text-blanco" />
          </div>
          <div>
            <p className="eyebrow" data-reveal>
              Visión
            </p>
            <ScrollWords text={about.vision} highlight={['referencia', 'cruce']} className="mt-5 font-wide text-[clamp(1.4rem,2.8vw,2.4rem)] leading-[1.08] text-blanco" />
          </div>
        </div>
      </Section>

      <StackedValues />

      {/* Las cinco líneas como índice editorial. */}
      <Section className="py-24 md:py-32" label="Líneas">
        <SectionTitle eyebrow="Qué hacemos" title="Cinco líneas, una misma cancha." />
        <ol className="mt-12 border-t border-blanco/10">
          {lines.map((l, i) => (
            <li key={l.key} className="group border-b border-blanco/10" data-reveal style={{transitionDelay: `${i * 60}ms`}}>
              <Link to={l.to} className="grid grid-cols-[3rem_1fr_auto] items-center gap-4 py-6 md:grid-cols-[5rem_18rem_1fr_auto] md:py-8">
                <span className="font-mono text-label text-rojo">0{i + 1}</span>
                <span className="font-wide text-[1.2rem] text-blanco transition-colors group-hover:text-azul md:text-[1.6rem]">{l.name}</span>
                <span className="col-span-3 row-start-2 text-body text-niebla/75 md:col-span-1 md:row-start-auto">{l.body}</span>
                <span aria-hidden="true" className="col-start-3 row-start-1 grid size-11 place-items-center rounded-full ring-1 ring-blanco/20 transition-all group-hover:bg-rojo group-hover:ring-rojo md:col-start-auto md:row-start-auto">
                  →
                </span>
              </Link>
            </li>
          ))}
        </ol>
      </Section>

      <Section className="py-24 md:py-32" id="equipo" label="Equipo">
        <SectionTitle eyebrow="Equipo" title="Las personas detrás." />
        <ul className="mt-12 grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
          {(team.data ?? []).map((m, i) => (
            <li key={m.id} data-reveal style={{transitionDelay: `${(i % 4) * 60}ms`}}>
              <Avatar name={m.name} index={i} src={m.photo_url} />
              <p className="mt-4 flex flex-wrap items-center gap-2 text-[1.05rem] font-bold text-blanco">
                {m.name} {isDemoMode && <DemoTag />}
              </p>
              <p className="font-mono text-[0.625rem] tracking-[0.12em] text-azul uppercase">{m.role_title}</p>
              {m.career && <p className="mt-1 text-[0.875rem] text-niebla/65">{m.career}</p>}
            </li>
          ))}
        </ul>
        {team.isSuccess && team.data.length === 0 && <p className="mt-8 text-body">Pronto presentaremos al equipo organizador.</p>}
      </Section>

      <Section className="py-24 md:py-32" label="Cómo participar">
        <SectionTitle eyebrow={path.eyebrow} title={path.heading} />
        <ol className="mt-12 grid gap-4 md:grid-cols-4">
          {path.steps.map((s, i) => (
            <li key={s.title} data-reveal style={{transitionDelay: `${i * 90}ms`}} className="relative rounded-[20px] bg-noche-2 p-6 ring-1 ring-blanco/8">
              <span className="font-wide text-[3rem] leading-none text-blanco/10">{i + 1}</span>
              <p className="mt-3 font-wide text-[1.2rem] text-blanco">{s.title}</p>
              <p className="mt-2 text-[0.9rem] leading-relaxed text-niebla/75">{s.body}</p>
            </li>
          ))}
        </ol>
        <div className="mt-10 flex flex-wrap gap-3" data-reveal>
          <Link to="/unete" className="btn btn-primary">
            Unirme a la comunidad
          </Link>
          <Link to="/registro" className="btn btn-ghost">
            Crear cuenta
          </Link>
        </div>
      </Section>

      <Section className="pb-28" id="estado" label="Sobre esta versión">
        <div className="grid gap-8 rounded-[28px] bg-tinta p-7 ring-1 ring-blanco/10 md:grid-cols-[14rem_1fr] md:p-12" data-reveal>
          <Logo className="w-48 rounded-xl" />
          <div>
            <p className="eyebrow">Transparencia</p>
            <h2 className="mt-3 font-wide text-title text-blanco">Independientes y honestos con la información.</h2>
            <p className="mt-4 max-w-2xl text-body text-niebla/80">{site.disclaimer}</p>
            {isDemoMode && (
              <p className="mt-4 max-w-2xl rounded-xl bg-alerta/10 px-4 py-3 text-[0.9rem] text-alerta ring-1 ring-alerta/30">
                Estás viendo la <strong>vista previa del frontend</strong>. Los eventos, concursos, proyectos, personas y cifras marcados «Demo» son ficticios y sirven para mostrar la experiencia. Los formularios se validan pero no envían ni guardan datos.
              </p>
            )}
          </div>
        </div>
      </Section>
    </>
  );
}

/**
 * Valores como tarjetas apiladas: cada una se fija (sticky) y, cuando la
 * siguiente la cubre, se reduce y oscurece — escala/opacidad por progreso,
 * escrito en el loop rAF compartido.
 */
function StackedValues() {
  const rootRef = useRef<HTMLElement>(null);
  const cardRefs = useRef<HTMLDivElement[]>([]);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) return;
    return onFrame(() => {
      const root = rootRef.current;
      if (!root) return;
      const r = root.getBoundingClientRect();
      if (r.bottom < 0 || r.top > innerHeight) return;
      cardRefs.current.forEach((card, i) => {
        const next = cardRefs.current[i + 1];
        if (!next) return;
        const nr = next.getBoundingClientRect();
        const cr = card.getBoundingClientRect();
        // 0 → la siguiente aún está lejos; 1 → ya cubre a esta.
        const k = clamp((cr.bottom - nr.top) / cr.height);
        card.style.transform = `scale(${1 - k * 0.06})`;
        card.style.filter = k > 0.01 ? `brightness(${1 - k * 0.45})` : '';
      });
    });
  }, [reduced]);

  const tones = ['from-rojo/35 to-magenta/10 ring-rojo/40', 'from-azul/30 to-noche-3 ring-azul/40', 'from-magenta/35 to-rojo/10 ring-magenta/40', 'from-noche-3 to-azul/20 ring-blanco/20'];

  return (
    <section ref={rootRef} aria-labelledby="valores" className="px-4 py-20 sm:px-6 md:px-[6vw] md:py-28">
      <p className="eyebrow">Valores</p>
      <h2 id="valores" className="mt-3 font-wide text-[clamp(1.5rem,3vw,2.6rem)] text-blanco">
        Lo que no negociamos.
      </h2>
      <div className="mt-12 space-y-6">
        {about.values.map((v, i) => (
          <div
            key={v.name}
            ref={(el) => {
              if (el) cardRefs.current[i] = el;
            }}
            className={`sticky origin-top rounded-[28px] bg-gradient-to-br p-8 ring-1 will-change-transform md:p-14 ${tones[i % tones.length]} bg-noche-2`}
            style={{top: `${6.5 + i * 1.25}rem`}}
          >
            <div className="grid gap-6 md:grid-cols-[8rem_1fr] md:items-end">
              <span className="font-wide text-[4rem] leading-none text-blanco/20 md:text-[6.5rem]">0{i + 1}</span>
              <div>
                <h3 className="font-wide text-[clamp(1.6rem,4vw,3.4rem)] leading-[1] text-blanco">{v.name}</h3>
                <p className="mt-4 max-w-xl text-lead text-niebla/85">{v.body}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
