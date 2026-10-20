import {useEffect, useRef} from 'react';
import {useReducedMotion} from '../../hooks/useReducedMotion';
import {clamp} from '../../lib/math';
import {onFrame} from '../../lib/scroll';

/**
 * Manifiesto que se enciende palabra por palabra con el scroll. Cada palabra
 * es un <span> cuya opacidad se escribe directamente en el loop rAF; el
 * texto completo está siempre en el DOM (legible por lectores y buscadores).
 */
export function ScrollWords({text, className = '', highlight = []}: {text: string; className?: string; highlight?: string[]}) {
  const ref = useRef<HTMLParagraphElement>(null);
  const reduced = useReducedMotion();
  const words = text.split(/\s+/);

  useEffect(() => {
    const el = ref.current;
    if (!el || reduced) return;
    const spans = Array.from(el.querySelectorAll<HTMLSpanElement>('[data-w]'));
    let last = -1;
    return onFrame(() => {
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight;
      if (r.bottom < 0 || r.top > vh) return;
      // 0 cuando el párrafo asoma por abajo; 1 cuando su final cruza el 45% de la pantalla.
      const p = clamp((vh * 0.85 - r.top) / (r.height + vh * 0.4));
      if (Math.abs(p - last) < 0.001) return;
      last = p;
      const lit = p * spans.length;
      spans.forEach((s, i) => {
        s.style.opacity = String(0.16 + 0.84 * clamp(lit - i));
      });
    });
  }, [reduced, text]);

  return (
    <p ref={ref} className={className}>
      {words.map((w, i) => {
        const hot = highlight.some((h) => w.toLowerCase().replace(/[.,]/g, '').startsWith(h.toLowerCase()));
        return (
          <span key={i} data-w style={{opacity: reduced ? 1 : 0.16}} className={hot ? 'text-gradient-brand' : undefined}>
            {w}{' '}
          </span>
        );
      })}
    </p>
  );
}
