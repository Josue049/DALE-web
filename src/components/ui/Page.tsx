import {useEffect, useRef, type ReactNode} from 'react';
import {useReducedMotion} from '../../hooks/useReducedMotion';
import {useReveals} from '../../hooks/useReveals';
import {clamp, easeOutCubic, lerp} from '../../lib/math';
import {onFrame} from '../../lib/scroll';

type Tone = 'rojo' | 'azul' | 'magenta';
const TONES: Record<Tone, [string, string, string]> = {
  rojo: ['#db354a', '#af286c', '#74b1e0'],
  magenta: ['#af286c', '#db354a', '#74b1e0'],
  azul: ['#74b1e0', '#af286c', '#db354a'],
};

/**
 * Cabecera de las rutas internas: versión compacta de la portada. Tres
 * planos (anillos, arcos y titular) se separan con el scroll en el mismo
 * loop rAF de SELENE, así cada página abre con profundidad propia.
 */
export function PageHeader({
  eyebrow,
  title,
  intro,
  children,
  tone = 'rojo',
  aside,
}: {
  eyebrow: string;
  title: ReactNode;
  intro?: ReactNode;
  children?: ReactNode;
  tone?: Tone;
  aside?: ReactNode;
}) {
  const rootRef = useRef<HTMLElement>(null);
  const ringsRef = useRef<SVGSVGElement>(null);
  const arcsRef = useRef<SVGSVGElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const [a, b, c] = TONES[tone];

  useEffect(() => {
    if (reduced) return;
    let last = -1;
    return onFrame(() => {
      const root = rootRef.current;
      if (!root) return;
      const rect = root.getBoundingClientRect();
      if (rect.bottom < 0) return;
      const p = clamp(-rect.top / Math.max(1, rect.height));
      if (Math.abs(p - last) < 0.0005) return;
      last = p;
      const e = easeOutCubic(p);
      ringsRef.current!.style.transform = `translate3d(0, ${p * 18}vh, 0) rotate(${p * 40}deg) scale(${lerp(1, 1.25, e)})`;
      arcsRef.current!.style.transform = `translate3d(0, ${p * -10}vh, 0) rotate(${p * -25}deg) scale(${lerp(1, 1.5, e)})`;
      arcsRef.current!.style.opacity = String(1 - p);
      textRef.current!.style.transform = `translate3d(0, ${p * 8}vh, 0)`;
      textRef.current!.style.opacity = String(1 - clamp(p * 1.4));
    });
  }, [reduced]);

  return (
    <header ref={rootRef} className="relative overflow-hidden px-4 pt-32 pb-14 sm:px-6 md:px-[6vw] md:pt-44 md:pb-20">
      <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(70%_80%_at_85%_10%,#1f2a5a_0%,transparent_60%)]" />
      <div aria-hidden="true" className="grain absolute inset-0 opacity-50 mix-blend-soft-light" />
      <svg ref={ringsRef} aria-hidden="true" viewBox="0 0 400 400" className="pointer-events-none absolute -top-28 -right-32 size-[28rem] will-change-transform md:-top-48 md:-right-24 md:size-[46rem]">
        {[188, 160, 132, 104].map((r, k) => (
          <circle key={r} cx="200" cy="200" r={r} fill="none" stroke={k % 2 ? b : a} strokeOpacity={0.6 - k * 0.1} strokeWidth={3 - k * 0.45} strokeDasharray={`0 ${11 + k * 2}`} strokeLinecap="round" />
        ))}
        <circle cx="200" cy="200" r="70" fill="none" stroke={c} strokeOpacity="0.35" />
      </svg>
      <svg ref={arcsRef} aria-hidden="true" viewBox="0 0 400 400" className="pointer-events-none absolute -top-10 -right-10 size-[22rem] will-change-transform md:-top-24 md:right-[4vw] md:size-[34rem]">
        <path d="M40 260 A170 170 0 0 1 300 60" fill="none" stroke={a} strokeWidth="5" strokeLinecap="round" />
        <path d="M80 330 A190 190 0 0 0 380 180" fill="none" stroke={c} strokeWidth="3" strokeLinecap="round" />
        <circle cx="300" cy="60" r="6" fill="#f5f7fb" />
      </svg>
      <div ref={textRef} className="relative grid gap-10 will-change-transform lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div className="max-w-4xl">
          <p className="eyebrow">{eyebrow}</p>
          <h1 className="mt-4 font-wide text-display text-blanco">{title}</h1>
          {intro && <div className="mt-5 max-w-2xl text-lead text-niebla/85">{intro}</div>}
          {children && <div className="mt-8">{children}</div>}
        </div>
        {aside}
      </div>
    </header>
  );
}

export function Section({children, className = '', id, label}: {children: ReactNode; className?: string; id?: string; label?: string}) {
  const ref = useReveals<HTMLElement>();
  return (
    <section ref={ref} id={id} aria-label={label} className={`px-4 sm:px-6 md:px-[6vw] ${className}`}>
      {children}
    </section>
  );
}

/** Encabezado de sección editorial reutilizable. */
export function SectionTitle({eyebrow, title, action, id}: {eyebrow: string; title: ReactNode; action?: ReactNode; id?: string}) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between" data-reveal>
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h2 id={id} className="mt-3 max-w-[22ch] font-wide text-[clamp(1.5rem,3vw,2.6rem)] leading-[1.02] text-blanco">
          {title}
        </h2>
      </div>
      {action}
    </div>
  );
}
