import {useEffect, useRef, type MouseEvent} from 'react';
import {Link} from 'react-router-dom';
import {heroDefaults, lines, site} from '../../content';
import {useFitText} from '../../hooks/useFitText';
import {useReducedMotion} from '../../hooks/useReducedMotion';
import {easeInOutCubic, easeOutCubic, lerp, pinProgress, range} from '../../lib/math';
import {onFrame, scrollToHash} from '../../lib/scroll';

/**
 * La portada. Portada de Earthrise.tsx (SELENE): seis capas apiladas y
 * pinned; un solo rango de scroll mueve cada una a su ritmo. En lugar de la
 * Tierra subiendo, se revela el universo del logo:
 *
 *   0.00 – 0.12  identidad: logo enfocado, CTAs y menú operativos
 *   0.04 – 0.46  las capas se separan: anillos y arcos se abren en
 *                profundidad, los arcos delanteros pasan junto a la cámara
 *   0.22 – 0.50  «NO IMPORTA QUÉ ESTUDIES» se resuelve (tracking se cierra)
 *   0.50 – 0.78  cambia a «IMPORTA HASTA DÓNDE QUIERES LLEGAR»
 *   0.80 – 1.00  todo sube y un faldón azul noche cubre el cuadro: ahí
 *                continúa la página (Experiencias)
 *
 * Todas las capas se dimensionan con --w (el ancho del logo), así que
 * quedan registradas en cualquier viewport, como el crop único de SELENE.
 * Alturas reinterpretadas para una web operativa: 300svh (escritorio) /
 * 250svh (móvil), no 440.
 */

type LayerName = 'ground' | 'arcsBack' | 'rings' | 'logo' | 'arcsFront' | 'particles';

type Mote = {a: number; d: number; r: number; s: number; c: string; o: number};

/** Parte un titular en `n` filas equilibradas por número de caracteres. */
function rows(text: string, n: number): string[] {
  const words = text.trim().split(/\s+/);
  if (n <= 1 || words.length <= 1) return [text];
  const target = text.length / n;
  const out: string[] = [];
  let cur = '';
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (cur && next.length > target * 1.08 && out.length < n - 1) {
      out.push(cur);
      cur = w;
    } else cur = next;
  }
  out.push(cur);
  return out;
}

function FitRow({text, max, className = ''}: {text: string; max: number; className?: string}) {
  const ref = useFitText<HTMLSpanElement>(max);
  return (
    <span className="block w-full">
      <span ref={ref} className={`inline-block whitespace-nowrap ${className}`}>
        {text}
      </span>
    </span>
  );
}

/** Titular en filas ajustadas por medición; variante móvil y escritorio. */
function Headline({text, mobileRows, desktopRows, accent}: {text: string; mobileRows: number; desktopRows: number; accent?: boolean}) {
  const tone = accent ? 'text-blanco [text-shadow:0_0.035em_0_#c3c9da,0_0.075em_0_#db354a,0_0.25em_0.6em_rgb(5_8_20/0.55)]' : 'text-blanco [text-shadow:0_0.035em_0_#c3c9da,0_0.075em_0_#af286c,0_0.25em_0.6em_rgb(5_8_20/0.55)]';
  return (
    <>
      <span className="block md:hidden">
        {rows(text, mobileRows).map((r, i) => (
          <FitRow key={`m${i}`} text={r} max={120} className={`font-wide leading-[0.98] ${tone}`} />
        ))}
      </span>
      <span className="hidden md:block">
        {rows(text, desktopRows).map((r, i) => (
          <FitRow key={`d${i}`} text={r} max={170} className={`font-wide leading-[0.98] ${tone}`} />
        ))}
      </span>
    </>
  );
}

export function BrandReveal({hero = heroDefaults}: {hero?: typeof heroDefaults}) {
  const rootRef = useRef<HTMLElement>(null);
  const layerRefs = useRef<Partial<Record<LayerName, HTMLDivElement>>>({});
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const introRef = useRef<HTMLDivElement>(null);
  const line1Ref = useRef<HTMLDivElement>(null);
  const line2Ref = useRef<HTMLDivElement>(null);
  const hudRef = useRef<HTMLDivElement>(null);
  const chapterRef = useRef<HTMLSpanElement>(null);
  const chapterLabelRef = useRef<HTMLParagraphElement>(null);
  const barRef = useRef<HTMLSpanElement>(null);
  const apronRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const reducedRef = useRef(reduced);
  reducedRef.current = reduced;

  // Particle canvas size.
  useEffect(() => {
    const c = canvasRef.current!;
    const sync = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      c.width = Math.round(c.clientWidth * dpr);
      c.height = Math.round(c.clientHeight * dpr);
    };
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(c);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    let seed = 7;
    const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const palette = ['#f5f7fb', '#f5f7fb', '#74b1e0', '#db354a', '#af286c'];
    const small = window.innerWidth < 768;
    const motes: Mote[] = Array.from({length: small ? 70 : 130}, () => ({
      a: rand() * Math.PI * 2,
      d: 0.12 + rand() * 0.9,
      r: 0.5 + rand() * 1.8,
      s: 0.2 + rand(),
      c: palette[Math.floor(rand() * palette.length)],
      o: 0.25 + rand() * 0.6,
    }));
    let lastP = -1;
    let lastTime = 0;

    const set = (name: LayerName, y: number, scale = 1, opacity = 1, rotate = 0) => {
      const el = layerRefs.current[name];
      if (!el) return;
      el.style.transform = `translate3d(0, ${y}vh, 0) scale(${scale})${rotate ? ` rotate(${rotate}deg)` : ''}`;
      el.style.opacity = String(opacity);
    };

    return onFrame((time) => {
      const dt = lastTime ? Math.min(0.1, (time - lastTime) / 1000) : 1 / 60;
      lastTime = time;
      const root = rootRef.current;
      if (!root) return;
      const {p: rawP, rect, vh} = pinProgress(root);
      if (rect.bottom < 0 || rect.top > vh) return;
      const p = reducedRef.current ? 0 : rawP;

      // Particles drift every frame while visible and fly outward with the scroll.
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      const fade = 1 - range(p, 0.82, 0.98);
      if (fade > 0.001) {
        const dpr = canvas.width / Math.max(1, w);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, w, h);
        const reach = Math.max(w, h) * 0.62;
        const zoom = 1 + easeInOutCubic(range(p, 0.02, 0.8)) * 1.6;
        for (const m of motes) {
          if (!reducedRef.current) m.a += 0.02 * m.s * dt;
          const dist = m.d * zoom;
          const x = w / 2 + Math.cos(m.a) * dist * reach;
          const y = h / 2 + Math.sin(m.a) * dist * reach * 0.72;
          if (x < -10 || x > w + 10 || y < -10 || y > h + 10) continue;
          ctx.globalAlpha = m.o * fade;
          ctx.fillStyle = m.c;
          ctx.beginPath();
          ctx.arc(x, y, m.r * (0.8 + zoom * 0.45), 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }

      if (Math.abs(p - lastP) < 0.00005) return;
      lastP = p;

      const exit = easeInOutCubic(range(p, 0.8, 1));
      const open = easeOutCubic(range(p, 0.04, 0.46));

      // Far → near, each faster than the one behind it.
      set('ground', -exit * 6, lerp(1.08, 1, open));
      set('arcsBack', -exit * 18, lerp(1, 1.32, open), lerp(1, 0.55, open), lerp(0, -10, open));
      set('rings', -exit * 26, lerp(1, 1.4, open), lerp(1, 0.4, open), lerp(0, 22, open));
      const recede = easeOutCubic(range(p, 0.1, 0.4));
      set('logo', lerp(0, -16, recede) - exit * 30, lerp(1, 0.58, recede), 1 - range(p, 0.26, 0.42));
      const pass = easeOutCubic(range(p, 0.02, 0.4));
      set('arcsFront', -exit * 40, lerp(1, 2.6, pass), 1 - range(p, 0.22, 0.42));

      // Intro UI (kicker, CTAs) yields early but stays operable at the top.
      const intro = introRef.current!;
      const introO = 1 - range(p, 0.04, 0.14);
      intro.style.opacity = String(introO);
      intro.style.transform = `translate3d(0, ${-range(p, 0, 0.14) * 5}vh, 0)`;
      intro.style.visibility = introO < 0.02 ? 'hidden' : 'visible';

      // Headlines resolve (tracking closes in), then hand over.
      const in1 = easeOutCubic(range(p, 0.24, 0.38));
      const out1 = range(p, 0.46, 0.54);
      const l1 = line1Ref.current!;
      l1.style.opacity = String(in1 * (1 - out1));
      l1.style.letterSpacing = `${lerp(0.18, 0, in1)}em`;
      l1.style.transform = `translate3d(0, ${lerp(4, 0, in1) - out1 * 8}vh, 0) scale(${lerp(0.94, 1, in1)})`;
      l1.style.filter = in1 < 0.99 ? `blur(${(1 - in1) * 8}px)` : '';

      const in2 = easeOutCubic(range(p, 0.5, 0.64));
      const l2 = line2Ref.current!;
      l2.style.opacity = String(in2 * (1 - range(p, 0.9, 1)));
      l2.style.letterSpacing = `${lerp(0.14, 0, in2)}em`;
      l2.style.transform = `translate3d(0, ${lerp(5, 0, in2) - exit * 22}vh, 0) scale(${lerp(0.94, 1, in2)})`;
      l2.style.filter = in2 < 0.99 ? `blur(${(1 - in2) * 8}px)` : '';

      // Exit apron climbs and swallows the frame.
      apronRef.current!.style.transform = `translate3d(0, ${lerp(100, 0, exit)}%, 0)`;

      // Editorial HUD: chapter counter as a function of the same progress.
      hudRef.current!.style.opacity = String(range(p, 0.02, 0.1) * (1 - range(p, 0.84, 0.94)));
      const chapter = p < 0.22 ? 0 : p < 0.5 ? 1 : 2;
      chapterRef.current!.textContent = `0${chapter + 1}`;
      chapterLabelRef.current!.textContent = ['Identidad', 'Todas las carreras', 'Tu ambición'][chapter];
      barRef.current!.style.transform = `scaleX(${p})`;
    });
  }, []);

  const layerRef = (name: LayerName) => (el: HTMLDivElement | null) => {
    if (el) layerRefs.current[name] = el;
  };

  const skip = (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    scrollToHash('#experiencias');
  };

  const height = reduced ? undefined : `var(--stage-h)`;

  return (
    <section
      id="top"
      ref={rootRef}
      aria-labelledby="hero-title"
      className="relative [--stage-h:250svh] md:[--stage-h:300svh]"
      style={{height}}
    >
      <div
        className={`${reduced ? 'relative min-h-screen-s' : 'sticky top-0 h-screen-s'} overflow-hidden bg-noche [--w:min(90vw,560px)] md:[--w:min(52vw,100svh,880px)]`}
      >
        {/* 1 · Fondo azul nocturno con grano. */}
        <div ref={layerRef('ground')} aria-hidden="true" className="absolute inset-[-6%] will-change-transform">
          <div className="absolute inset-0 bg-[radial-gradient(60%_55%_at_50%_48%,#1f2a5a_0%,#141c3d_45%,#0b1127_100%)]" />
          <div className="grain absolute inset-0 opacity-70 mix-blend-soft-light" />
        </div>

        {/* 2 · Arcos luminosos posteriores (eco del contorno del logo). */}
        <div ref={layerRef('arcsBack')} aria-hidden="true" className="absolute top-1/2 left-1/2 size-0 will-change-transform">
          <svg viewBox="-200 -200 400 400" className="absolute top-1/2 left-1/2 h-auto w-[calc(var(--w)*3.4)] -translate-x-1/2 -translate-y-1/2 overflow-visible">
            <defs>
              <linearGradient id="arc-red" x1="0" x2="1">
                <stop offset="0" stopColor="#db354a" />
                <stop offset="1" stopColor="#af286c" />
              </linearGradient>
              <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3.5" />
              </filter>
            </defs>
            <g filter="url(#glow)" opacity="0.75">
              <path d="M-150 30 A152 152 0 0 1 150 30" fill="none" stroke="url(#arc-red)" strokeWidth="6" />
              <path d="M-128 60 A140 140 0 0 0 128 60" fill="none" stroke="#74b1e0" strokeWidth="4" strokeOpacity="0.7" />
            </g>
            <path d="M-150 30 A152 152 0 0 1 150 30" fill="none" stroke="url(#arc-red)" strokeWidth="2.2" />
            <path d="M-128 60 A140 140 0 0 0 128 60" fill="none" stroke="#74b1e0" strokeWidth="1.3" strokeOpacity="0.8" />
            <path d="M-178 -10 A180 180 0 0 1 60 -170" fill="none" stroke="#af286c" strokeWidth="1" strokeOpacity="0.45" />
            <path d="M178 10 A180 180 0 0 1 -40 176" fill="none" stroke="#db354a" strokeWidth="1" strokeOpacity="0.35" />
          </svg>
        </div>

        {/* 3 · Anillos y puntos volumétricos. */}
        <div ref={layerRef('rings')} aria-hidden="true" className="absolute top-1/2 left-1/2 size-0 will-change-transform">
          <svg viewBox="-200 -200 400 400" className="absolute top-1/2 left-1/2 h-auto w-[calc(var(--w)*4)] -translate-x-1/2 -translate-y-1/2 overflow-visible">
            <defs>
              <radialGradient id="sphere" cx="35%" cy="35%" r="70%">
                <stop offset="0" stopColor="#ffb3bd" />
                <stop offset="0.45" stopColor="#db354a" />
                <stop offset="1" stopColor="#5a1430" />
              </radialGradient>
              <radialGradient id="sphere-blue" cx="35%" cy="35%" r="70%">
                <stop offset="0" stopColor="#e6f3ff" />
                <stop offset="0.5" stopColor="#74b1e0" />
                <stop offset="1" stopColor="#24456b" />
              </radialGradient>
            </defs>
            {[
              {r: 40, c: '#db354a', w: 2.2, gap: 7.5, o: 0.95},
              {r: 50, c: '#af286c', w: 1.8, gap: 8, o: 0.8},
              {r: 64, c: '#db354a', w: 1.5, gap: 9, o: 0.6},
              {r: 82, c: '#af286c', w: 1.3, gap: 10, o: 0.45},
              {r: 104, c: '#db354a', w: 1.1, gap: 11, o: 0.32},
              {r: 132, c: '#74b1e0', w: 1, gap: 12, o: 0.22},
              {r: 166, c: '#af286c', w: 0.9, gap: 13, o: 0.16},
            ].map((ring) => (
              <circle key={ring.r} r={ring.r} fill="none" stroke={ring.c} strokeOpacity={ring.o} strokeWidth={ring.w} strokeDasharray={`0 ${ring.gap}`} strokeLinecap="round" />
            ))}
            <circle r="57" fill="none" stroke="#74b1e0" strokeOpacity="0.35" strokeWidth="0.6" />
            {/* Volumetric beads riding the rings. */}
            {[
              [64, -38, 3.2, 'sphere'],
              [82, 152, 2.6, 'sphere-blue'],
              [104, 24, 2.2, 'sphere'],
              [132, -128, 2.8, 'sphere-blue'],
              [104, 210, 1.8, 'sphere'],
              [166, 70, 2.2, 'sphere'],
            ].map(([r, deg, size, fill], i) => {
              const a = ((deg as number) * Math.PI) / 180;
              return <circle key={i} cx={Math.cos(a) * (r as number)} cy={Math.sin(a) * (r as number)} r={size as number} fill={`url(#${fill})`} />;
            })}
          </svg>
        </div>

        {/* 4 · Logo original, centrado y sin deformar. */}
        {/* lighten funde el fondo azul noche del PNG con la escena sin recortar el logo. */}
        <div ref={layerRef('logo')} className="absolute inset-0 grid place-items-center mix-blend-lighten will-change-transform">
          <picture className="block w-[var(--w)]">
            <source media="(max-width: 767px)" srcSet={site.logo.srcSmall} />
            <img
              src={site.logo.src}
              alt={site.logo.alt}
              width={site.logo.width}
              height={site.logo.height}
              fetchPriority="high"
              decoding="async"
              className="block h-auto w-full [mask-image:radial-gradient(ellipse_62%_64%_at_50%_50%,#000_68%,transparent_100%)]"
            />
          </picture>
        </div>

        {/* 5 · Arcos delanteros: rodean el logo por fuera, sin tapar el texto. */}
        <div ref={layerRef('arcsFront')} aria-hidden="true" className="absolute top-1/2 left-1/2 size-0 will-change-transform">
          <svg viewBox="-200 -200 400 400" className="absolute top-1/2 left-1/2 h-auto w-[calc(var(--w)*2)] -translate-x-1/2 -translate-y-1/2 overflow-visible">
            <defs>
              <linearGradient id="front-a" x1="0" y1="1" x2="0" y2="0">
                <stop offset="0" stopColor="#db354a" stopOpacity="0" />
                <stop offset="1" stopColor="#db354a" />
              </linearGradient>
              <linearGradient id="front-b" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#74b1e0" stopOpacity="0" />
                <stop offset="1" stopColor="#74b1e0" />
              </linearGradient>
            </defs>
            <path d="M-128 72 A148 148 0 0 1 -132 -66" fill="none" stroke="url(#front-a)" strokeWidth="3" strokeLinecap="round" />
            <path d="M128 -72 A148 148 0 0 1 134 62" fill="none" stroke="url(#front-b)" strokeWidth="3" strokeLinecap="round" />
            <path d="M-150 90 A175 175 0 0 1 -168 -40" fill="none" stroke="#af286c" strokeOpacity="0.55" strokeWidth="1.2" strokeDasharray="0 6" strokeLinecap="round" />
            <path d="M152 -92 A175 175 0 0 1 170 40" fill="none" stroke="#db354a" strokeOpacity="0.55" strokeWidth="1.2" strokeDasharray="0 6" strokeLinecap="round" />
            <circle cx="-132" cy="-66" r="3.4" fill="#f5f7fb" />
            <circle cx="134" cy="62" r="3.4" fill="#f5f7fb" />
          </svg>
        </div>

        {/* Titulares: entre la geometría delantera y las partículas. */}
        <div className="pointer-events-none absolute inset-0 grid place-items-center px-4 sm:px-6 md:px-[7vw]">
          <div className="relative w-full max-w-[1500px]">
            <div ref={line1Ref} className="absolute inset-x-0 top-1/2 -translate-y-1/2 text-center" style={{opacity: 0}}>
              <h1 id="hero-title">
                <span className="sr-only">
                  {site.name}: {hero.line1} {hero.line2}
                </span>
                <span aria-hidden="true">
                  <Headline text={hero.line1} mobileRows={2} desktopRows={2} />
                </span>
              </h1>
            </div>
            <div ref={line2Ref} aria-hidden="true" className="absolute inset-x-0 top-1/2 -translate-y-1/2 text-center" style={{opacity: 0}}>
              <Headline text={hero.line2} mobileRows={3} desktopRows={2} accent />
            </div>
          </div>
        </div>

        {/* 6 · Partículas, formas de primer plano y faldón de salida. */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <canvas ref={canvasRef} className="absolute inset-0 size-full" />
          <div ref={apronRef} className="absolute inset-x-0 bottom-0 h-full will-change-transform" style={{transform: 'translate3d(0,100%,0)'}}>
            <div className="h-24 bg-gradient-to-b from-transparent to-noche" />
            <div className="h-full bg-noche" />
          </div>
        </div>

        {/* Intro: promesa y CTAs operables desde el primer frame. */}
        <div ref={introRef} className="absolute inset-0 flex flex-col justify-between px-4 pt-32 pb-8 sm:px-6 md:px-[4vw] md:pt-36 md:pb-10">
          <p className="text-center font-mono text-label text-niebla/85 uppercase">{hero.kicker}</p>
          <div className="flex flex-col items-center gap-5 text-center">
            <p className="font-wide text-[clamp(0.95rem,1.6vw,1.35rem)] tracking-[0.04em] text-blanco">{hero.tagline}</p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link to="/unete" className="btn btn-primary">
                {hero.primaryCta}
              </Link>
              <Link to="/eventos" className="btn btn-ghost bg-noche/40 backdrop-blur-sm">
                {hero.secondaryCta}
              </Link>
            </div>
            {!reduced && (
              <a href="#experiencias" onClick={skip} className="font-mono text-[0.625rem] tracking-[0.18em] text-niebla/70 uppercase underline-offset-4 hover:text-blanco hover:underline">
                Desliza para descubrir · o salta la intro ↓
              </a>
            )}
          </div>
        </div>

        {/* HUD editorial (esquinas tipo SELENE, sin telemetría inventada). */}
        <div ref={hudRef} aria-hidden="true" className="pointer-events-none absolute inset-4 font-mono text-[0.625rem] tracking-[0.14em] text-niebla/75 uppercase sm:inset-6 md:text-label" style={{opacity: 0}}>
          <div className="brackets absolute inset-0 text-niebla/30" />
          <div className="absolute top-28 left-3 space-y-1 md:top-28 md:left-4">
            <p>
              <span ref={chapterRef} className="text-rojo">
                01
              </span>{' '}
              / 03
            </p>
            <p ref={chapterLabelRef} className="text-niebla/55">
              Identidad
            </p>
          </div>
          <div className="absolute top-28 right-3 text-right md:top-28 md:right-4">
            <p>Lima · Perú</p>
            <p className="text-niebla/55">Comunidad estudiantil</p>
          </div>
          <div className="absolute bottom-3 left-3 hidden gap-3 md:bottom-4 md:left-4 md:flex">
            {lines.map((l) => (
              <span key={l.key}>{l.name.replace('Dale ', '')}</span>
            ))}
          </div>
          <div className="absolute right-3 bottom-3 flex items-center gap-3 md:right-4 md:bottom-4">
            <span className="relative h-px w-20 bg-blanco/15">
              <span ref={barRef} className="absolute inset-0 origin-left bg-rojo" style={{transform: 'scaleX(0)'}} />
            </span>
            Desliza
          </div>
        </div>
      </div>
      {reduced && <ReducedHeadline hero={hero} />}
    </section>
  );
}

/** Sin movimiento: el lema se lee completo bajo la portada estática. */
function ReducedHeadline({hero}: {hero: typeof heroDefaults}) {
  return (
    <div className="bg-noche px-4 py-16 text-center sm:px-6 md:px-[7vw]" aria-hidden="true">
      <Headline text={hero.line1} mobileRows={2} desktopRows={2} />
      <div className="mt-6">
        <Headline text={hero.line2} mobileRows={3} desktopRows={2} accent />
      </div>
    </div>
  );
}

