import {useEffect, useRef} from 'react';
import {Link} from 'react-router-dom';
import {lines} from '../../content';
import {useReducedMotion} from '../../hooks/useReducedMotion';
import {clamp, pinProgress, range} from '../../lib/math';
import {onFrame} from '../../lib/scroll';
import {LineArt} from './LineArt';

/**
 * Las cinco experiencias, como un carrete. Portado de MissionLog.tsx
 * (SELENE): la sección se fija y el carrete se desliza de lado con el
 * scroll; la tarjeta más cercana a la línea focal se enfatiza, las demás se
 * atenúan, y cada imagen deriva contra su marco. 260svh en lugar de 340.
 * Con reduced motion el carrete es un desplazamiento horizontal nativo.
 */

export function ExperiencesReel({names, images = {}}: {names: Record<string, string>; images?: Record<string, string>}) {
  const rootRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLOListElement>(null);
  const cardRefs = useRef<HTMLLIElement[]>([]);
  const imgRefs = useRef<HTMLDivElement[]>([]);
  const barRef = useRef<HTMLSpanElement>(null);
  const countRef = useRef<HTMLSpanElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) return;
    let lastP = -1;
    let lastW = 0;
    return onFrame(() => {
      const root = rootRef.current;
      const track = trackRef.current;
      if (!root || !track) return;
      const {p, rect, vh} = pinProgress(root);
      if (rect.bottom < 0 || rect.top > vh) return;
      const vw = window.innerWidth;
      if (Math.abs(p - lastP) < 0.00005 && vw === lastW) return;
      lastP = p;
      lastW = vw;

      const k = range(p, 0.04, 0.96);
      // offsetLeft is the untransformed layout position, so this is stable
      // while the track itself is being translated.
      const travel = Math.max(0, track.offsetLeft + track.scrollWidth - vw * 0.94);
      track.style.transform = `translate3d(${-k * travel}px, 0, 0)`;

      const focus = vw < 768 ? 0.5 : 0.62; // focus line right of centre on desktop
      let nearest = 0;
      let best = Infinity;
      cardRefs.current.forEach((card, i) => {
        const r = card.getBoundingClientRect();
        const off = (r.left + r.width / 2 - vw * focus) / vw;
        const a = clamp(Math.abs(off) * 1.6);
        card.style.opacity = String(1 - a * 0.55);
        card.style.transform = `scale(${1 - a * 0.07})`;
        imgRefs.current[i].style.transform = `translate3d(${off * -60}px, 0, 0) scale(1.15)`;
        if (Math.abs(off) < best) {
          best = Math.abs(off);
          nearest = i;
        }
      });
      barRef.current!.style.transform = `scaleX(${k})`;
      countRef.current!.textContent = `0${nearest + 1}`;
    });
  }, [reduced]);

  return (
    <section
      ref={rootRef}
      id="experiencias"
      aria-labelledby="exp-title"
      className={`relative bg-noche ${reduced ? '' : 'h-[230svh] md:h-[260svh]'}`}
    >
      <div className={`${reduced ? 'py-24' : 'sticky top-0 h-screen-s'} flex flex-col justify-center overflow-hidden pt-24 md:flex-row md:items-center md:justify-start md:pt-0`}>
        <div className="relative z-10 shrink-0 px-4 sm:px-6 md:flex md:w-[34vw] md:flex-col md:justify-center md:self-stretch md:bg-noche md:pr-10 md:pl-[6vw]">
          {/* Fade edge: the reel slides under the copy column instead of over it. */}
          <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-full hidden w-[6vw] bg-gradient-to-r from-noche to-transparent md:block" />
          <p className="eyebrow">Cinco formas de darlo todo</p>
          <h2 id="exp-title" className="mt-4 font-wide text-display text-blanco">
            Elige cómo quieres crecer.
          </h2>
          <p className="mt-5 max-w-[26rem] text-body text-niebla/75 max-md:hidden">
            Compite, aprende, crea, conecta y proyéctate. Cada línea tiene actividades reales, con inscripción y seguimiento desde tu cuenta.
          </p>
          <div className="mt-8 flex items-center gap-4 font-mono text-label text-niebla/60 uppercase max-md:hidden" aria-hidden="true">
            <span>
              <span ref={countRef} className="text-blanco">
                01
              </span>{' '}
              / 0{lines.length}
            </span>
            <span className="relative h-px w-32 bg-blanco/15">
              <span ref={barRef} className="absolute inset-0 origin-left bg-rojo" style={{transform: 'scaleX(0)'}} />
            </span>
          </div>
        </div>

        <ol
          ref={trackRef}
          className={`mt-8 flex gap-4 pl-4 sm:pl-6 md:mt-0 md:gap-7 md:pl-0 ${reduced ? 'snap-x overflow-x-auto pr-4 pb-4' : 'will-change-transform'}`}
        >
          {lines.map((line, i) => (
            <li
              key={line.key}
              ref={(el) => {
                if (el) cardRefs.current[i] = el;
              }}
              className="w-[64vw] shrink-0 origin-bottom snap-start sm:w-[44vw] md:w-[clamp(16rem,23vw,22rem)]"
            >
              <Link to={line.to} className="group block rounded-[14px] focus-visible:outline-offset-4">
                <figure>
                  <div className="relative aspect-[3/4] overflow-hidden rounded-[14px] bg-noche-2 ring-1 ring-blanco/10 transition-shadow group-hover:ring-rojo/60">
                    <div
                      ref={(el) => {
                        if (el) imgRefs.current[i] = el;
                      }}
                      className="absolute inset-0 will-change-transform"
                      style={{transform: 'scale(1.15)'}}
                    >
                      {images[line.key] ? (
                        <img src={images[line.key]} alt="" loading="lazy" decoding="async" className="size-full object-cover" />
                      ) : (
                        <LineArt line={line.key} className="size-full" />
                      )}
                    </div>
                    <span className="absolute top-3 left-3 rounded-full bg-noche/75 px-2.5 py-1 font-mono text-[0.625rem] tracking-[0.14em] text-blanco uppercase backdrop-blur">
                      {line.tag}
                    </span>
                  </div>
                  <figcaption className="mt-4 flex gap-4">
                    <span className="font-mono text-label text-rojo">0{i + 1}</span>
                    <span>
                      <span className="block font-wide text-[1rem] text-blanco">{names[line.key] ?? line.name}</span>
                      <span className="mt-1 block font-mono text-[0.625rem] tracking-[0.14em] text-azul uppercase">{line.title}</span>
                      <span className="mt-2 block text-[0.875rem] leading-relaxed text-niebla/70">{line.body}</span>
                      <span className="mt-3 inline-block font-mono text-[0.6875rem] tracking-[0.12em] text-blanco uppercase underline decoration-rojo underline-offset-4 group-hover:decoration-2">
                        {line.cta} →
                      </span>
                    </span>
                  </figcaption>
                </figure>
              </Link>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
