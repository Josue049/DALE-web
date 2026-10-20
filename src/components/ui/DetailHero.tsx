import {useEffect, useRef, type ReactNode} from 'react';
import {Link} from 'react-router-dom';
import {useReducedMotion} from '../../hooks/useReducedMotion';
import {clamp, lerp} from '../../lib/math';
import {onFrame} from '../../lib/scroll';
import {GenArt} from './GenArt';

/**
 * Cabecera de las páginas de detalle: portada generativa (o imagen) en un
 * plano lejano que se desplaza más lento que el titular — parallax de dos
 * capas con el loop de SELENE — y un velo que la funde con la página.
 */
export function DetailHero({seed, image, imageAlt, back, children}: {seed: string; image?: string | null; imageAlt?: string | null; back: {to: string; label: string}; children: ReactNode}) {
  const rootRef = useRef<HTMLElement>(null);
  const artRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) return;
    let last = -1;
    return onFrame(() => {
      const root = rootRef.current;
      if (!root) return;
      const r = root.getBoundingClientRect();
      if (r.bottom < 0) return;
      const p = clamp(-r.top / Math.max(1, r.height));
      if (Math.abs(p - last) < 0.0005) return;
      last = p;
      artRef.current!.style.transform = `translate3d(0, ${p * 30}%, 0) scale(${lerp(1.05, 1.18, p)})`;
      textRef.current!.style.transform = `translate3d(0, ${p * 12}vh, 0)`;
      textRef.current!.style.opacity = String(1 - clamp(p * 1.3));
    });
  }, [reduced]);

  return (
    <header ref={rootRef} className="relative isolate overflow-hidden">
      <div ref={artRef} aria-hidden={image ? undefined : true} className="absolute inset-0 -z-10 will-change-transform" style={{transform: 'scale(1.05)'}}>
        {image ? <img src={image} alt={imageAlt ?? ''} className="size-full object-cover" /> : <GenArt seed={seed} className="size-full" />}
      </div>
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-b from-noche/70 via-noche/80 to-noche" />
      <div aria-hidden="true" className="grain absolute inset-0 -z-10 opacity-50 mix-blend-soft-light" />
      <div ref={textRef} className="px-4 pt-32 pb-12 will-change-transform sm:px-6 md:px-[6vw] md:pt-44 md:pb-16">
        <Link to={back.to} className="inline-flex items-center gap-2 font-mono text-label text-niebla/75 uppercase hover:text-blanco">
          ← {back.label}
        </Link>
        <div className="mt-6">{children}</div>
      </div>
    </header>
  );
}

/** Tarjeta lateral fija (sticky) para acciones principales en detalles. */
export function StickyAside({children}: {children: ReactNode}) {
  return <aside className="lg:sticky lg:top-28 lg:self-start">{children}</aside>;
}
