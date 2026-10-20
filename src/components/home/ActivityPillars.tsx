import {Link} from 'react-router-dom';
import {lines, type LineKey} from '../../content';
import {useReveals} from '../../hooks/useReveals';

/**
 * Las cinco líneas como tarjetas. Portado de Missions.tsx (SELENE): cada
 * tarjeta lleva anillos orbitales; aquí cada anillo es una actividad abierta
 * real de esa línea (hasta 5), leída de la base de datos. Sin actividades,
 * solo queda el núcleo: no se inventan cifras.
 */
export function ActivityPillars({names, counts}: {names: Record<string, string>; counts: Partial<Record<LineKey, number>>}) {
  const ref = useReveals<HTMLElement>();
  return (
    <section ref={ref} id="lineas" aria-labelledby="lineas-title" className="relative bg-noche px-4 py-24 sm:px-6 md:px-[6vw] md:py-36">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between" data-reveal>
        <div>
          <p className="eyebrow">Líneas de participación</p>
          <h2 id="lineas-title" className="mt-4 max-w-[18ch] font-wide text-display text-blanco">
            Para todas las carreras. Sin excepción.
          </h2>
        </div>
        <p className="max-w-xs font-mono text-label text-niebla/55 uppercase">Cada anillo es una actividad abierta ahora mismo.</p>
      </div>

      <ol className="mt-14 grid gap-4 sm:grid-cols-2 md:mt-20 lg:grid-cols-6 lg:gap-5">
        {lines.map((l, i) => {
          const n = counts[l.key];
          const featured = i === 0;
          return (
            <li
              key={l.key}
              data-reveal
              style={{transitionDelay: `${i * 90}ms`}}
              className={`group relative flex flex-col overflow-hidden rounded-[20px] p-6 ring-1 transition-[transform,box-shadow] duration-500 hover:-translate-y-1.5 md:p-8 ${
                i < 2 ? 'lg:col-span-3' : 'lg:col-span-2'
              } ${featured ? 'bg-noche-3 ring-rojo/50 hover:shadow-[0_30px_80px_-30px_rgb(219_53_74/0.5)]' : 'bg-noche-2 ring-blanco/10 hover:ring-blanco/25'}`}
            >
              {/* Orbit rings — one per open activity in this line. */}
              <svg aria-hidden="true" viewBox="0 0 200 200" className="absolute -top-10 -right-10 size-48 text-blanco/12 transition-transform duration-[1.2s] group-hover:rotate-45">
                {Array.from({length: Math.min(5, n ?? 0)}, (_, k) => (
                  <ellipse key={k} cx="100" cy="100" rx={40 + k * 18} ry={18 + k * 8} fill="none" stroke={k === 0 ? '#db354a' : 'currentColor'} strokeOpacity={k === 0 ? 0.6 : 1} transform={`rotate(${-20 + k * 14} 100 100)`} />
                ))}
                <circle cx="100" cy="100" r="9" fill="currentColor" />
                <circle cx="100" cy="100" r="24" fill="none" stroke="#af286c" strokeOpacity="0.5" strokeDasharray="0 6" strokeLinecap="round" strokeWidth="2.5" />
              </svg>

              <span className="font-mono text-label text-rojo">0{i + 1}</span>
              <h3 className="mt-4 font-wide text-[1.25rem] text-blanco">{names[l.key] ?? l.name}</h3>
              <p className="mt-1 font-mono text-[0.625rem] tracking-[0.14em] text-azul uppercase">{l.title}</p>
              <p className="mt-5 text-[0.9375rem] leading-relaxed text-niebla/80">{l.body}</p>
              <p className="mt-6 font-mono text-label text-niebla/55 uppercase" aria-live="polite">
                {n === undefined ? ' ' : n === 0 ? 'Sin actividades abiertas por ahora' : `${n} ${n === 1 ? 'abierta' : 'abiertas'}`}
              </p>
              <Link
                to={l.to}
                className={`mt-6 self-start ${featured ? 'btn btn-primary' : 'btn btn-ghost'}`}
              >
                {l.cta}
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
