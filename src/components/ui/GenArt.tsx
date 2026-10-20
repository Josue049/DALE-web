import {useMemo} from 'react';

/**
 * Portadas generativas con semilla (slug): anillos punteados, arcos y
 * bloques con la paleta del logo. Cada contenido obtiene una composición
 * propia y estable, sin fotos de stock ni imágenes ajenas.
 */
const PALETTE = ['#db354a', '#af286c', '#74b1e0', '#f5f7fb'];

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

export function GenArt({seed, className = '', label}: {seed: string; className?: string; label?: string}) {
  const art = useMemo(() => {
    let x = hash(seed) || 1;
    const r = () => ((x = Math.imul(x ^ (x >>> 15), 2246822507) ^ Math.imul(x ^ (x >>> 13), 3266489909)), (x >>> 0) / 4294967296);
    const pick = <T,>(a: T[]) => a[Math.floor(r() * a.length)];
    const cx = 80 + r() * 240;
    const cy = 60 + r() * 180;
    const main = pick(PALETTE.slice(0, 3));
    const second = pick(PALETTE.filter((c) => c !== main && c !== '#f5f7fb'));
    const rings = Array.from({length: 3 + Math.floor(r() * 3)}, (_, i) => ({r: 40 + i * (26 + r() * 14), c: i % 2 ? second : main, gap: 8 + Math.floor(r() * 6), w: 1.5 + r() * 2}));
    const arcs = Array.from({length: 2}, () => {
      const rad = 120 + r() * 140;
      const a0 = r() * Math.PI * 2;
      const a1 = a0 + 0.8 + r() * 1.6;
      return {d: `M${cx + Math.cos(a0) * rad} ${cy + Math.sin(a0) * rad} A${rad} ${rad} 0 0 1 ${cx + Math.cos(a1) * rad} ${cy + Math.sin(a1) * rad}`, c: pick(PALETTE), w: 2 + r() * 4};
    });
    const blocks = r() > 0.5 ? Array.from({length: 2}, () => ({x: r() * 300, y: r() * 200, s: 30 + r() * 60, c: pick(PALETTE.slice(0, 3))})) : [];
    const beads = Array.from({length: 4}, () => ({a: r() * Math.PI * 2, k: Math.floor(r() * rings.length), s: 3 + r() * 5, c: pick(PALETTE)}));
    const angle = Math.floor(r() * 360);
    return {cx, cy, main, second, rings, arcs, blocks, beads, angle};
  }, [seed]);

  const id = `ga${hash(seed).toString(36)}`;
  return (
    <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" className={className} role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      <defs>
        <linearGradient id={id} gradientTransform={`rotate(${art.angle} .5 .5)`}>
          <stop offset="0" stopColor={art.main} stopOpacity="0.45" />
          <stop offset="0.6" stopColor="#151e3c" stopOpacity="0" />
        </linearGradient>
        <radialGradient id={`${id}s`} cx="35%" cy="35%" r="70%">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.5" stopColor={art.main} />
          <stop offset="1" stopColor="#101831" />
        </radialGradient>
      </defs>
      <rect width="400" height="300" fill="#151e3c" />
      <rect width="400" height="300" fill={`url(#${id})`} />
      {art.blocks.map((b, i) => (
        <rect key={i} x={b.x} y={b.y} width={b.s} height={b.s} fill={i ? 'none' : b.c} stroke={b.c} strokeWidth="2.5" opacity="0.8" />
      ))}
      {art.rings.map((g, i) => (
        <circle key={i} cx={art.cx} cy={art.cy} r={g.r} fill="none" stroke={g.c} strokeWidth={g.w} strokeDasharray={`0 ${g.gap}`} strokeLinecap="round" opacity={0.9 - i * 0.12} />
      ))}
      {art.arcs.map((a, i) => (
        <path key={i} d={a.d} fill="none" stroke={a.c} strokeWidth={a.w} strokeLinecap="round" opacity="0.85" />
      ))}
      {art.beads.map((b, i) => {
        const rr = art.rings[b.k].r;
        return <circle key={i} cx={art.cx + Math.cos(b.a) * rr} cy={art.cy + Math.sin(b.a) * rr} r={b.s} fill={`url(#${id}s)`} />;
      })}
      <circle cx={art.cx} cy={art.cy} r="12" fill="#f5f7fb" />
    </svg>
  );
}
