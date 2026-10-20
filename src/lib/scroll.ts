import Lenis from 'lenis';

/**
 * One rAF loop for the whole site (portado de SELENE). Lenis advances first,
 * then every scroll-driven component reads its own rect and writes styles
 * directly — nothing here goes through React state, so scrolling never
 * re-renders.
 *
 * Diferencias con SELENE: el motor vive en el Layout del router y se reinicia
 * solo cuando cambia el modo (smooth / reduced motion / admin), nunca por
 * navegación; `stop` garantiza que jamás haya dos loops ni dos Lenis vivos.
 */

type Tick = (time: number) => void;

const subscribers = new Set<Tick>();
let lenis: Lenis | null = null;
let stopActive: (() => void) | null = null;

export function startScroll(smooth: boolean): () => void {
  // Defensive: StrictMode or a mode switch may call us twice.
  stopActive?.();

  if (smooth) {
    lenis = new Lenis({lerp: 0.1, smoothWheel: true, wheelMultiplier: 0.9, autoResize: true});
  }

  let raf = 0;
  const loop = (time: number) => {
    lenis?.raf(time);
    subscribers.forEach((fn) => fn(time));
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);

  const stop = () => {
    cancelAnimationFrame(raf);
    lenis?.destroy();
    lenis = null;
    if (stopActive === stop) stopActive = null;
  };
  stopActive = stop;
  return stop;
}

export function onFrame(fn: Tick): () => void {
  subscribers.add(fn);
  return () => {
    subscribers.delete(fn);
  };
}

/** Jump (or glide) to an absolute position; used by route changes and restoration. */
export function scrollToY(y: number, immediate = true) {
  if (lenis) {
    lenis.scrollTo(y, {immediate, force: true});
  } else {
    window.scrollTo({top: y, behavior: immediate ? 'instant' : 'smooth'});
  }
}

/** Smooth-scrolls to an in-page hash like `#eventos`, or to the top for `#top`. */
export function scrollToHash(hash: string, {updateUrl = true} = {}) {
  const target = hash === '#top' ? 0 : document.querySelector<HTMLElement>(hash);
  if (target === null) return false;
  if (lenis) {
    lenis.scrollTo(target, {duration: 1.4, offset: typeof target === 'number' ? 0 : -72});
  } else if (typeof target === 'number') {
    window.scrollTo({top: target});
  } else {
    target.scrollIntoView();
  }
  // Move keyboard focus with the jump so the next Tab starts there.
  if (typeof target !== 'number') {
    if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
    target.focus({preventScroll: true});
  }
  if (updateUrl) history.replaceState(history.state, '', hash === '#top' ? location.pathname + location.search : hash);
  return true;
}

/** Lenis must re-measure after async content changes the page height. */
export function refreshScroll() {
  lenis?.resize();
}
