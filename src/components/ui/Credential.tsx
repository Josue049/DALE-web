import {useRef, type PointerEvent} from 'react';
import {site} from '../../content';
import {useReducedMotion} from '../../hooks/useReducedMotion';

export type CredentialTheme = 'rojo' | 'magenta' | 'azul' | 'noche';
export const THEMES: Record<CredentialTheme, {label: string; a: string; b: string}> = {
  rojo: {label: 'Rojo', a: '#db354a', b: '#5a1430'},
  magenta: {label: 'Magenta', a: '#af286c', b: '#3a1040'},
  azul: {label: 'Azul', a: '#74b1e0', b: '#1c2f5a'},
  noche: {label: 'Noche', a: '#1c2750', b: '#0a1024'},
};

type Data = {name: string; career: string; university: string; handle: string; since: string; theme: CredentialTheme};

/**
 * Credencial comunitaria (NO oficial de la UTP). Se inclina con el puntero
 * (transform directo, sin estado de React) y se exporta como PNG dibujada en
 * un <canvas> en el navegador: no se sube a ningún servidor.
 */
export function Credential({data}: {data: Data}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const t = THEMES[data.theme];

  const tilt = (e: PointerEvent<HTMLDivElement>) => {
    if (reduced || e.pointerType === 'touch') return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    ref.current!.style.transform = `perspective(900px) rotateY(${x * 14}deg) rotateX(${-y * 14}deg)`;
    ref.current!.style.setProperty('--gx', `${(x + 0.5) * 100}%`);
    ref.current!.style.setProperty('--gy', `${(y + 0.5) * 100}%`);
  };
  const reset = () => {
    if (ref.current) ref.current.style.transform = '';
  };

  return (
    <div onPointerMove={tilt} onPointerLeave={reset} className="mx-auto w-full max-w-[24rem]">
      <div
        ref={ref}
        role="img"
        aria-label={`Credencial comunitaria de ${data.name || 'tu nombre'}, ${data.career || 'tu carrera'}. No es un documento oficial de la UTP.`}
        className="relative aspect-[5/8] overflow-hidden rounded-[28px] p-6 shadow-[0_40px_100px_-30px_rgb(0_0_0/0.8)] ring-1 ring-blanco/15 transition-transform duration-200 ease-out"
        style={{background: `radial-gradient(120% 80% at 50% 0%, ${t.a}, ${t.b} 70%)`}}
      >
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-70 mix-blend-overlay" style={{background: 'radial-gradient(40% 30% at var(--gx,50%) var(--gy,30%), rgba(255,255,255,0.55), transparent 70%)'}} />
        <svg aria-hidden="true" viewBox="0 0 200 200" className="absolute -right-20 -bottom-20 size-80 opacity-50">
          {[90, 74, 58].map((r, i) => (
            <circle key={r} cx="100" cy="100" r={r} fill="none" stroke="#f5f7fb" strokeWidth={2 - i * 0.4} strokeDasharray="0 8" strokeLinecap="round" />
          ))}
        </svg>
        <div className="relative flex h-full flex-col">
          <img src={site.logo.srcSmall} alt="" className="w-28 rounded-lg mix-blend-lighten" />
          <p className="mt-auto font-mono text-[0.625rem] tracking-[0.18em] text-blanco/75 uppercase">Miembro de la comunidad</p>
          <p className="mt-2 font-wide text-[1.7rem] leading-[1] break-words text-blanco">{data.name || 'Tu nombre'}</p>
          <p className="mt-2 text-[0.9rem] text-blanco/85">{data.career || 'Tu carrera'}</p>
          <p className="text-[0.8rem] text-blanco/65">{data.university}</p>
          <div className="mt-6 flex items-end justify-between border-t border-blanco/25 pt-4 font-mono text-[0.625rem] tracking-[0.14em] text-blanco/75 uppercase">
            <span>@{data.handle || 'usuario'}</span>
            <span>Desde {data.since}</span>
          </div>
          <p className="mt-3 font-mono text-[0.5rem] tracking-[0.12em] text-blanco/55 uppercase">Credencial comunitaria · no oficial de la UTP</p>
        </div>
      </div>
    </div>
  );
}

/** Dibuja la credencial en un canvas 1000×1600 y la descarga como PNG. */
export async function exportCredential(data: Data) {
  const W = 1000;
  const H = 1600;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d')!;
  const t = THEMES[data.theme];
  const g = ctx.createRadialGradient(W / 2, 0, 50, W / 2, 0, H * 0.95);
  g.addColorStop(0, t.a);
  g.addColorStop(0.75, t.b);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.roundRect(0, 0, W, H, 70);
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.strokeStyle = 'rgba(245,247,251,0.45)';
  ctx.lineCap = 'round';
  [380, 310, 240].forEach((r, i) => {
    ctx.lineWidth = 9 - i * 2;
    ctx.setLineDash([0, 34]);
    ctx.beginPath();
    ctx.arc(W - 120, H - 120, r, 0, Math.PI * 2);
    ctx.stroke();
  });
  ctx.restore();
  ctx.setLineDash([]);

  await document.fonts.ready;
  const logo = new Image();
  logo.src = site.logo.srcSmall;
  await logo.decode().catch(() => undefined);
  if (logo.naturalWidth) {
    ctx.globalCompositeOperation = 'lighten';
    ctx.drawImage(logo, 70, 70, 300, 200);
    ctx.globalCompositeOperation = 'source-over';
  }
  ctx.fillStyle = 'rgba(245,247,251,0.75)';
  ctx.font = '500 26px "IBM Plex Mono", monospace';
  ctx.fillText('MIEMBRO DE LA COMUNIDAD', 70, 1030);
  ctx.fillStyle = '#f5f7fb';
  ctx.font = '900 84px Archivo, "Arial Black", sans-serif';
  wrap(ctx, (data.name || 'Tu nombre').toUpperCase(), 70, 1130, W - 140, 88);
  ctx.font = '500 38px Manrope, sans-serif';
  ctx.fillText(data.career || 'Tu carrera', 70, 1300);
  ctx.fillStyle = 'rgba(245,247,251,0.7)';
  ctx.font = '400 30px Manrope, sans-serif';
  ctx.fillText(data.university, 70, 1345);
  ctx.fillStyle = 'rgba(245,247,251,0.35)';
  ctx.fillRect(70, 1400, W - 140, 2);
  ctx.fillStyle = 'rgba(245,247,251,0.8)';
  ctx.font = '500 26px "IBM Plex Mono", monospace';
  ctx.fillText(`@${data.handle || 'usuario'}`.toUpperCase(), 70, 1455);
  const since = `DESDE ${data.since}`.toUpperCase();
  ctx.fillText(since, W - 70 - ctx.measureText(since).width, 1455);
  ctx.fillStyle = 'rgba(245,247,251,0.55)';
  ctx.font = '500 20px "IBM Plex Mono", monospace';
  ctx.fillText('CREDENCIAL COMUNITARIA · NO OFICIAL DE LA UTP', 70, 1520);

  const a = document.createElement('a');
  a.href = c.toDataURL('image/png');
  a.download = `credencial-dale-con-todo-${(data.handle || 'miembro').replace(/[^\w.-]/g, '')}.png`;
  a.click();
}

function wrap(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, max: number, lh: number) {
  const words = text.split(' ');
  let line = '';
  let yy = y;
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > max && line) {
      ctx.fillText(line, x, yy);
      line = w;
      yy += lh;
    } else line = test;
  }
  ctx.fillText(line, x, yy);
}
