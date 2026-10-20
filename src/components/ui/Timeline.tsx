import {useEffect, useRef, type ReactNode} from 'react';
import {useReducedMotion} from '../../hooks/useReducedMotion';
import {clamp} from '../../lib/math';
import {onFrame} from '../../lib/scroll';

export type TimelineItem = {key: string; label: ReactNode; title: ReactNode; body?: ReactNode; state?: 'done' | 'current' | 'next'};

/**
 * Línea de tiempo vertical que se entinta con el scroll (la técnica de la
 * trayectoria de SELENE en vertical): una línea de progreso escalada en Y y
 * nodos que se encienden al ser alcanzados, escritos directo en el loop rAF.
 */
export function Timeline({items, tone = '#db354a'}: {items: TimelineItem[]; tone?: string}) {
  const ref = useRef<HTMLOListElement>(null);
  const lineRef = useRef<HTMLSpanElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const nodes = Array.from(root.querySelectorAll<HTMLElement>('[data-node]'));
    let last = -1;
    return onFrame(() => {
      const r = root.getBoundingClientRect();
      const vh = window.innerHeight;
      if (r.bottom < -100 || r.top > vh + 100) return;
      const p = reduced ? 1 : clamp((vh * 0.62 - r.top) / Math.max(1, r.height));
      if (Math.abs(p - last) < 0.0005) return;
      last = p;
      lineRef.current!.style.transform = `scaleY(${p})`;
      const reach = r.top + p * r.height;
      nodes.forEach((n) => {
        const nr = n.getBoundingClientRect();
        n.dataset.on = String(nr.top + nr.height / 2 <= reach + 2);
      });
    });
  }, [reduced, items.length]);

  return (
    <ol ref={ref} className="relative ml-2 space-y-8 pl-9">
      <span aria-hidden="true" className="absolute top-1 bottom-1 left-[5px] w-px bg-blanco/12" />
      <span ref={lineRef} aria-hidden="true" className="absolute top-1 bottom-1 left-[4px] w-[3px] origin-top rounded-full" style={{background: `linear-gradient(${tone}, #af286c)`, transform: 'scaleY(0)'}} />
      {items.map((it) => (
        <li key={it.key} className="relative">
          <span
            data-node
            data-on="false"
            aria-hidden="true"
            className="absolute top-1 -left-9 size-[13px] rounded-full bg-noche ring-2 ring-blanco/30 transition-[background-color,box-shadow,transform] duration-500 data-[on=true]:scale-125 data-[on=true]:bg-rojo data-[on=true]:ring-blanco"
          />
          <p className="font-mono text-label text-azul uppercase">
            {it.label}
            {it.state === 'current' && <span className="ml-2 rounded-full bg-ok/15 px-2 py-0.5 text-ok">En curso</span>}
            {it.state === 'done' && <span className="ml-2 text-niebla/45">· completada</span>}
          </p>
          <p className="mt-1.5 text-[1.05rem] font-bold text-blanco md:text-[1.2rem]">{it.title}</p>
          {it.body && <div className="mt-1 text-[0.9375rem] leading-relaxed text-niebla/75">{it.body}</div>}
        </li>
      ))}
    </ol>
  );
}
