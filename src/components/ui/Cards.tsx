import {Link} from 'react-router-dom';
import {labels, lines} from '../../content';
import {contestState} from '../../data/api';
import type {Availability, Contest, EventRow, Opportunity, Project} from '../../data/types';
import {dateParts, fmtDate, fmtTime, relativeDays} from '../../lib/format';
import {DemoTag} from './Feedback';
import {GenArt} from './GenArt';

export function eventPhase(e: EventRow): {label: string; tone: string} {
  const now = Date.now();
  const start = new Date(e.starts_at).getTime();
  const end = e.ends_at ? new Date(e.ends_at).getTime() : start + 2 * 3600000;
  if (e.status === 'cancelled') return {label: 'Cancelado', tone: 'text-[#ff8a98] ring-rojo/50'};
  if (now > end) return {label: 'Realizado', tone: 'text-gris ring-blanco/15'};
  if (now >= start) return {label: 'En curso', tone: 'text-ok ring-ok/40'};
  return {label: 'Próximo', tone: 'text-azul ring-azul/40'};
}

export function seatsLabel(e: EventRow, a?: Availability): string | null {
  if (!e.capacity) return 'Cupos sin límite';
  if (!a) return `${e.capacity} cupos`;
  const left = Math.max(0, e.capacity - a.confirmed);
  if (left === 0) return e.waitlist_enabled ? 'Cupos agotados · lista de espera' : 'Cupos agotados';
  return `${left} de ${e.capacity} cupos libres`;
}

export function EventCard({event: e, availability}: {event: EventRow; availability?: Availability}) {
  const d = dateParts(e.starts_at);
  const phase = eventPhase(e);
  return (
    <article className="group relative flex h-full flex-col rounded-[20px] bg-noche-2 p-5 ring-1 ring-blanco/8 transition-[box-shadow,transform] duration-300 hover:-translate-y-1 hover:ring-blanco/25 md:p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-baseline gap-2 font-wide text-blanco">
          <span className="text-[2.4rem] leading-none">{d.day}</span>
          <span className="font-mono text-label text-niebla/70">
            {d.month} · {d.weekday}
          </span>
        </div>
        <span className={`chip ${phase.tone}`}>{phase.label}</span>
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <span className="chip">{labels.eventKind[e.kind] ?? e.kind}</span>
        <span className="chip">{labels.modality[e.modality]}</span>
        {e.is_demo && <DemoTag />}
      </div>
      <h3 className="mt-4 text-[1.125rem] leading-snug font-bold text-blanco">
        <Link to={`/eventos/${e.slug}`} className="after:absolute after:inset-0 after:rounded-[20px]">
          {e.title}
        </Link>
      </h3>
      <p className="mt-2 line-clamp-3 text-[0.9rem] leading-relaxed text-niebla/75">{e.summary}</p>
      <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-5 font-mono text-[0.6875rem] tracking-[0.08em] text-niebla/60 uppercase">
        <span>{fmtTime(e.starts_at)} h Lima</span>
        <span>{seatsLabel(e, availability)}</span>
      </div>
    </article>
  );
}

const contestStateLabel: Record<string, {label: string; tone: string}> = {
  upcoming: {label: 'Próximamente', tone: 'text-azul ring-azul/40'},
  open: {label: 'Inscripciones abiertas', tone: 'text-ok ring-ok/40'},
  evaluation: {label: 'En evaluación', tone: 'text-alerta ring-alerta/40'},
  results: {label: 'Resultados publicados', tone: 'text-blanco ring-rojo/50'},
  closed: {label: 'Cerrado', tone: 'text-gris ring-blanco/15'},
};

export function ContestCard({contest: c}: {contest: Contest}) {
  const st = contestStateLabel[contestState(c)];
  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-[20px] bg-noche-2 ring-1 ring-blanco/8 transition-[box-shadow,transform] duration-300 hover:-translate-y-1 hover:ring-rojo/50">
      <div className="relative aspect-[16/8] overflow-hidden">
        {c.cover_url ? (
          <img src={c.cover_url} alt={c.cover_alt ?? ''} loading="lazy" className="size-full object-cover transition-transform duration-700 group-hover:scale-105" />
        ) : (
          <GenArt seed={c.slug} className="size-full transition-transform duration-700 group-hover:scale-105" />
        )}
        <span className={`chip absolute top-3 left-3 bg-noche/80 backdrop-blur ${st.tone}`}>{st.label}</span>
      </div>
      <div className="flex flex-1 flex-col p-5 md:p-6">
        <div className="flex flex-wrap gap-2">
          <span className="chip">{labels.participation[c.participation_mode]}</span>
          <span className="chip">{labels.eligibility[c.eligibility]}</span>
          {c.is_demo && <DemoTag />}
        </div>
        <h3 className="mt-4 text-[1.125rem] leading-snug font-bold text-blanco">
          <Link to={`/concursos/${c.slug}`} className="after:absolute after:inset-0">
            {c.title}
          </Link>
        </h3>
        <p className="mt-2 line-clamp-3 text-[0.9rem] leading-relaxed text-niebla/75">{c.summary}</p>
        <p className="mt-auto pt-5 font-mono text-[0.6875rem] tracking-[0.08em] text-niebla/60 uppercase">
          {c.registration_closes_at ? `Inscripciones hasta el ${fmtDate(c.registration_closes_at, {year: undefined})} (${relativeDays(c.registration_closes_at)})` : 'Inscripción sin fecha límite'}
        </p>
      </div>
    </article>
  );
}

export function ProjectCard({project: p}: {project: Project}) {
  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-[20px] bg-noche-2 ring-1 ring-blanco/8 transition-[box-shadow,transform] duration-300 hover:-translate-y-1 hover:ring-azul/50">
      <div className="relative aspect-[16/9] overflow-hidden">
        {p.cover_url ? (
          <img src={p.cover_url} alt={p.cover_alt ?? ''} loading="lazy" className="size-full object-cover" />
        ) : (
          <GenArt seed={p.slug} className="size-full transition-transform duration-700 group-hover:scale-105" />
        )}
      </div>
      <div className="flex flex-1 flex-col p-5 md:p-6">
        <div className="flex flex-wrap gap-2">
          {p.disciplines.slice(0, 3).map((d) => (
            <span key={d} className="chip">
              {d}
            </span>
          ))}
          {p.is_demo && <DemoTag />}
        </div>
        <h3 className="mt-4 text-[1.125rem] leading-snug font-bold text-blanco">
          <Link to={`/proyectos/${p.slug}`} className="after:absolute after:inset-0">
            {p.title}
          </Link>
        </h3>
        <p className="mt-2 line-clamp-3 text-[0.9rem] leading-relaxed text-niebla/75">{p.summary}</p>
        {p.looking_for.length > 0 && <p className="mt-auto pt-5 font-mono text-[0.6875rem] tracking-[0.08em] text-azul uppercase">Busca: {p.looking_for.join(' · ')}</p>}
      </div>
    </article>
  );
}

export function OpportunityCard({opportunity: o}: {opportunity: Opportunity}) {
  const expired = !!o.deadline && new Date(o.deadline).getTime() < Date.now();
  return (
    <article className={`group relative flex h-full flex-col rounded-[20px] bg-noche-2 p-5 ring-1 ring-blanco/8 transition-[box-shadow,transform] duration-300 hover:-translate-y-1 hover:ring-blanco/25 md:p-6 ${expired ? 'opacity-70' : ''}`}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="chip text-azul ring-azul/40">{labels.opportunity[o.category]}</span>
        <span className={`chip ${expired ? 'text-gris' : 'text-ok ring-ok/40'}`}>{expired ? 'Caducada' : 'Activa'}</span>
        {o.is_demo && <DemoTag />}
      </div>
      <h3 className="mt-4 text-[1.125rem] leading-snug font-bold text-blanco">
        <Link to={`/oportunidades/${o.slug}`} className="after:absolute after:inset-0 after:rounded-[20px]">
          {o.title}
        </Link>
      </h3>
      {o.organization && <p className="mt-1 font-mono text-[0.6875rem] tracking-[0.08em] text-niebla/60 uppercase">{o.organization}</p>}
      <p className="mt-3 line-clamp-3 text-[0.9rem] leading-relaxed text-niebla/75">{o.summary}</p>
      <p className="mt-auto pt-5 font-mono text-[0.6875rem] tracking-[0.08em] text-niebla/60 uppercase">
        {o.deadline ? `${expired ? 'Cerró' : 'Vence'} el ${fmtDate(o.deadline)}` : 'Sin fecha de cierre'}
      </p>
    </article>
  );
}

export function lineName(key: string, names: Record<string, string> = {}) {
  return names[key] ?? lines.find((l) => l.key === key)?.name ?? key;
}
