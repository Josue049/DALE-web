import {useEffect, useLayoutEffect, useRef} from 'react';
import {Outlet, useLocation, useNavigationType} from 'react-router-dom';
import {useReducedMotion} from '../../hooks/useReducedMotion';
import {onFrame, scrollToHash, scrollToY, startScroll} from '../../lib/scroll';
import {Footer, Header} from './Chrome';

const positions = new Map<string, number>();

/** Repite `fn` en frames sucesivos hasta que devuelva true (contenido asíncrono). */
function retryFrames(fn: () => boolean, frames = 40) {
  let n = 0;
  let id = 0;
  const step = () => {
    if (fn() || ++n >= frames) return;
    id = requestAnimationFrame(step);
  };
  id = requestAnimationFrame(step);
  return () => cancelAnimationFrame(id);
}

/**
 * Restauración de scroll y hashes con React Router + Lenis:
 * - PUSH a otra ruta → arriba (o al #hash si existe).
 * - POP (atrás/adelante) → posición recordada para esa entrada del historial.
 * - Cambios de query (filtros) en la misma ruta → no se mueve.
 * El foco salta a <main> para lectores de pantalla y teclado.
 */
function ScrollManager() {
  const location = useLocation();
  const navType = useNavigationType();
  const keyRef = useRef(location.key);
  const lastPath = useRef<string | null>(null);

  useEffect(() => onFrame(() => positions.set(keyRef.current, window.scrollY)), []);

  useLayoutEffect(() => {
    keyRef.current = location.key;
    const pathChanged = lastPath.current !== null && lastPath.current !== location.pathname;
    const first = lastPath.current === null;
    lastPath.current = location.pathname;

    if (navType === 'POP' && !first) {
      const target = positions.get(location.key) ?? 0;
      return retryFrames(() => {
        const fits = document.documentElement.scrollHeight >= target + window.innerHeight - 2;
        if (fits) scrollToY(target);
        return fits;
      });
    }
    if (location.hash) {
      return retryFrames(() => scrollToHash(location.hash, {updateUrl: false}));
    }
    if (pathChanged) {
      scrollToY(0);
      document.getElementById('contenido')?.focus({preventScroll: true});
    } else if (first) {
      scrollToY(0);
    }
  }, [location.key, location.pathname, location.hash, navType]);

  return null;
}

export function Layout() {
  const reduced = useReducedMotion();
  const {pathname} = useLocation();
  // Las áreas operativas (admin/jurado) usan scroll nativo: tablas y paneles anidados.
  const operational = pathname.startsWith('/admin') || pathname.startsWith('/jurado');

  // Un único motor por modo; navegar entre rutas públicas NO lo reinicia.
  useEffect(() => startScroll(!reduced && !operational), [reduced, operational]);

  return (
    <>
      <ScrollManager />
      <Header />
      <main id="contenido" tabIndex={-1} className="outline-none">
        <Outlet />
      </main>
      {!operational && <Footer />}
    </>
  );
}
