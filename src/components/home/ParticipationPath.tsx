import {useEffect, useRef, useState} from 'react';
import {Link} from 'react-router-dom';
import {path as content} from '../../content';
import {useReducedMotion} from '../../hooks/useReducedMotion';
import {clamp, easeOutCubic, pinProgress, range} from '../../lib/math';
import {onFrame} from '../../lib/scroll';

/**
 * Descubre → Participa → Conecta → Crea, dibujado con el scroll. Portado de
 * Trajectory.tsx (SELENE): la sección se fija mientras los cuatro tramos se
 * entintan uno tras otro (pathLength = 1 + strokeDashoffset) y un marcador
 * recorre el tramo en curso con getPointAtLength. Sin kilómetros: el
 * indicador es el avance real de la ruta. 240svh en lugar de 380.
 */

const WINDOW = [0.06, 0.9] as const;

type Geometry = {view: string; nodes: {x: number; y: number}[]; legs: string[]; label: (i: number) => {x: number; y: number; anchor: 'start' | 'middle' | 'end'}};

const WIDE: Geometry = (() => {
  const n = [
    {x: 170, y: 410},
    {x: 470, y: 190},
    {x: 790, y: 400},
    {x: 1060, y: 180},
  ];
  return {
    view: '0 0 1200 600',
    nodes: n,
    legs: [
      // Descubre: una vuelta exploratoria alrededor del primer nodo.
      `M${n[0].x} ${n[0].y - 70} a70 70 0 1 1 -0.1 0`,
      `M${n[0].x} ${n[0].y - 70} C 220 260, 330 170, ${n[1].x} ${n[1].y}`,
      `M${n[1].x} ${n[1].y} C 600 200, 640 420, ${n[2].x} ${n[2].y}`,
      `M${n[2].x} ${n[2].y} C 900 390, 940 160, ${n[3].x} ${n[3].y}`,
    ],
    label: (i) => ({x: n[i].x, y: n[i].y + (i % 2 ? -44 : 112), anchor: 'middle'}),
  };
})();

const TALL: Geometry = (() => {
  const n = [
    {x: 150, y: 140},
    {x: 450, y: 360},
    {x: 150, y: 580},
    {x: 450, y: 800},
  ];
  return {
    view: '0 0 600 900',
    nodes: n,
    legs: [
      `M${n[0].x} ${n[0].y - 56} a56 56 0 1 1 -0.1 0`,
      `M${n[0].x} ${n[0].y - 56} C 330 70, 470 200, ${n[1].x} ${n[1].y}`,
      `M${n[1].x} ${n[1].y} C 430 480, 170 460, ${n[2].x} ${n[2].y}`,
      `M${n[2].x} ${n[2].y} C 170 700, 430 680, ${n[3].x} ${n[3].y}`,
    ],
    label: (i) => (i % 2 ? {x: n[i].x - 30, y: n[i].y + 8, anchor: 'end'} : {x: n[i].x + 84, y: n[i].y + 8, anchor: 'start'}),
  };
})();

function useIsNarrow() {
  const [narrow, setNarrow] = useState(() => typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const on = () => setNarrow(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return narrow;
}

export function ParticipationPath() {
  const rootRef = useRef<HTMLElement>(null);
  const legRefs = useRef<SVGPathElement[]>([]);
  const nodeRefs = useRef<SVGCircleElement[]>([]);
  const markerRef = useRef<SVGGElement>(null);
  const pctRef = useRef<HTMLSpanElement>(null);
  const [step, setStep] = useState(0);
  const narrow = useIsNarrow();
  const reduced = useReducedMotion();
  const geo = narrow ? TALL : WIDE;

  useEffect(() => {
    let lastP = -1;
    let current = -1;
    return onFrame(() => {
      const root = rootRef.current;
      if (!root) return;
      const {p: raw, rect, vh} = pinProgress(root);
      if (rect.bottom < 0 || rect.top > vh) return;
      const p = reduced ? 1 : raw;
      if (Math.abs(p - lastP) < 0.00005) return;
      lastP = p;

      const legs = legRefs.current;
      const u = range(p, ...WINDOW) * legs.length;
      const s = clamp(Math.floor(u), 0, legs.length - 1);
      if (s !== current) {
        current = s;
        setStep(s);
      }
      legs.forEach((leg, i) => {
        const k = easeOutCubic(clamp(u - i));
        leg.style.strokeDashoffset = String(1 - k);
        nodeRefs.current[i]?.setAttribute('data-on', String(k > 0.98 || (i === 0 && u > 0.02)));
        if (i === s) {
          const pt = leg.getPointAtLength(leg.getTotalLength() * k);
          markerRef.current!.setAttribute('transform', `translate(${pt.x} ${pt.y})`);
        }
      });
      pctRef.current!.textContent = `${Math.round(range(p, ...WINDOW) * 100)}%`;
    });
  }, [geo, reduced]);

  const current = content.steps[step];

  return (
    <section ref={rootRef} id="ruta" aria-labelledby="ruta-title" className={`relative bg-noche ${reduced ? '' : 'h-[220svh] md:h-[240svh]'}`}>
      <div className={`${reduced ? 'py-24' : 'sticky top-0 h-screen-s'} flex flex-col overflow-hidden px-4 pt-28 pb-8 sm:px-6 md:px-[6vw] md:pt-28`}>
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="eyebrow">{content.eyebrow}</p>
            <h2 id="ruta-title" className="mt-3 max-w-[22ch] font-wide text-display text-blanco">
              {content.heading}
            </h2>
          </div>
          <p className="font-mono text-label text-niebla/60 uppercase" aria-hidden="true">
            Ruta recorrida <span ref={pctRef} className="text-blanco tabular-nums">0%</span>
          </p>
        </div>

        <div className="relative flex min-h-0 flex-1 items-center justify-center">
          <svg viewBox={geo.view} className="h-auto max-h-full w-full" role="img" aria-label="Ruta de participación en cuatro pasos: descubre, participa, conecta y crea.">
            <defs>
              <radialGradient id="node-glow">
                <stop offset="0.5" stopColor="#db354a" stopOpacity="0.45" />
                <stop offset="1" stopColor="#db354a" stopOpacity="0" />
              </radialGradient>
            </defs>

            {/* Faint dotted field, echo of the logo's rings. */}
            <g fill="#f5f7fb">
              {Array.from({length: 60}, (_, i) => (
                <circle key={i} cx={(i * 173) % (narrow ? 600 : 1200)} cy={(i * 97) % (narrow ? 900 : 600)} r={i % 7 === 0 ? 1.6 : 0.8} opacity={0.08 + ((i * 37) % 30) / 100} />
              ))}
            </g>

            {/* Ghost of the full route, then the inked legs over it. */}
            {geo.legs.map((d, i) => (
              <path key={`g${i}`} d={d} fill="none" stroke="#fff" strokeOpacity="0.1" strokeWidth="2" strokeDasharray="3 7" />
            ))}
            {geo.legs.map((d, i) => (
              <path
                key={`${narrow}-${i}`}
                ref={(el) => {
                  if (el) legRefs.current[i] = el;
                }}
                d={d}
                pathLength={1}
                fill="none"
                stroke={i % 2 ? '#74b1e0' : '#db354a'}
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeDasharray="1 1"
                strokeDashoffset="1"
              />
            ))}

            {geo.nodes.map((n, i) => {
              const l = geo.label(i);
              return (
                <g key={i}>
                  <circle cx={n.x} cy={n.y} r="46" fill="url(#node-glow)" />
                  <circle
                    ref={(el) => {
                      if (el) nodeRefs.current[i] = el;
                    }}
                    cx={n.x}
                    cy={n.y}
                    r="13"
                    data-on="false"
                    className="fill-noche stroke-blanco/40 transition-[fill,stroke] duration-500 data-[on=true]:fill-rojo data-[on=true]:stroke-blanco"
                    strokeWidth="3"
                  />
                  <text x={l.x} y={l.y} textAnchor={l.anchor} fontFamily="Archivo, sans-serif" fontWeight="900" fontSize={narrow ? 30 : 26} fill="#f5f7fb" letterSpacing="1">
                    {content.steps[i].title.toUpperCase()}
                  </text>
                  <text x={l.x} y={l.y + (narrow ? 30 : 26)} textAnchor={l.anchor} fontFamily="IBM Plex Mono, monospace" fontSize={narrow ? 16 : 13} letterSpacing="2" fill="#8a94b2">
                    0{i + 1}
                  </text>
                </g>
              );
            })}

            <g ref={markerRef} transform={`translate(${geo.nodes[0].x} ${geo.nodes[0].y - 70})`}>
              <circle r="16" fill="#74b1e0" opacity="0.25" />
              <circle r="7" fill="#fff" />
            </g>
          </svg>
        </div>

        {/* Current step. */}
        <div className="grid gap-4 border-t border-blanco/10 pt-5 md:grid-cols-[auto_1fr_auto] md:items-end md:gap-10">
          <p className="font-mono text-label text-rojo uppercase">
            {current.tag} · {step + 1}/{content.steps.length}
          </p>
          <div key={step} className="animate-leg-in" aria-live="polite">
            <h3 className="font-wide text-[1.15rem] text-blanco md:text-[1.4rem]">{current.title}</h3>
            <p className="mt-1.5 max-w-[40rem] text-body text-niebla/75">{current.body}</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex gap-1.5" aria-hidden="true">
              {content.steps.map((_, i) => (
                <span key={i} className={`h-1 w-8 rounded-full transition-colors duration-500 ${i <= step ? 'bg-rojo' : 'bg-blanco/15'}`} />
              ))}
            </div>
            <Link to="/registro" className="btn btn-ghost btn-sm">
              Crear cuenta
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
