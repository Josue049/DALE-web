import {useState} from 'react';

/**
 * Gráficas de una sola serie (un tono, sin leyenda: el título nombra la
 * serie). Barras finas con extremo redondeado anclado a la base, rejilla
 * recesiva, tooltip al pasar el cursor/enfocar y tabla equivalente para
 * lectores de pantalla.
 */

type Datum = {label: string; value: number};

export function ColumnChart({title, data, unit = ''}: {title: string; data: Datum[]; unit?: string}) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...data.map((d) => d.value));
  const nice = Math.ceil(max / 20) * 20;
  const W = 600;
  const H = 240;
  const pad = {l: 34, r: 8, t: 16, b: 28};
  const bw = Math.min(36, ((W - pad.l - pad.r) / data.length) * 0.5);
  const x = (i: number) => pad.l + ((i + 0.5) * (W - pad.l - pad.r)) / data.length;
  const y = (v: number) => pad.t + (1 - v / nice) * (H - pad.t - pad.b);

  return (
    <figure className="rounded-[20px] bg-noche-2 p-5 ring-1 ring-blanco/8">
      <figcaption className="font-bold text-blanco">{title}</figcaption>
      <div className="relative mt-4">
        <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={`${title}: ${data.map((d) => `${d.label} ${d.value}`).join(', ')}`}>
          {[0, 0.5, 1].map((t) => (
            <g key={t}>
              <line x1={pad.l} x2={W - pad.r} y1={y(nice * t)} y2={y(nice * t)} stroke="rgb(245 247 251 / 0.08)" />
              <text x={pad.l - 8} y={y(nice * t) + 4} textAnchor="end" fontSize="11" fill="#8a94b2" fontFamily="IBM Plex Mono, monospace">
                {Math.round(nice * t)}
              </text>
            </g>
          ))}
          {data.map((d, i) => {
            const top = y(d.value);
            const h = y(0) - top;
            const r = Math.min(4, h);
            return (
              <g key={d.label} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} onFocus={() => setHover(i)} onBlur={() => setHover(null)} tabIndex={0} aria-label={`${d.label}: ${d.value}${unit}`}>
                {/* Hit target taller and wider than the bar. */}
                <rect x={x(i) - bw} y={pad.t} width={bw * 2} height={H - pad.t - pad.b} fill="transparent" />
                <path
                  d={`M${x(i) - bw / 2} ${y(0)} V${top + r} q0 -${r} ${r} -${r} H${x(i) + bw / 2 - r} q${r} 0 ${r} ${r} V${y(0)} Z`}
                  fill="#db354a"
                  opacity={hover === null || hover === i ? 1 : 0.45}
                  className="transition-opacity"
                />
                <text x={x(i)} y={H - 8} textAnchor="middle" fontSize="11" fill="#8a94b2" fontFamily="IBM Plex Mono, monospace">
                  {d.label}
                </text>
              </g>
            );
          })}
          {/* Selective direct label: only the latest value. */}
          {data.length > 0 && (
            <text x={x(data.length - 1)} y={y(data[data.length - 1].value) - 8} textAnchor="middle" fontSize="12" fill="#f5f7fb" fontWeight="700">
              {data[data.length - 1].value}
            </text>
          )}
        </svg>
        {hover !== null && (
          <div className="pointer-events-none absolute -translate-x-1/2 rounded-lg bg-blanco px-3 py-1.5 text-[0.8125rem] font-semibold text-noche shadow-lg" style={{left: `${(x(hover) / W) * 100}%`, top: `${(y(data[hover].value) / H) * 100 - 18}%`}}>
            {data[hover].label}: {data[hover].value}
            {unit}
          </div>
        )}
      </div>
      <DataTableView data={data} title={title} />
    </figure>
  );
}

export function BarList({title, data, unit = ''}: {title: string; data: Datum[]; unit?: string}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <figure className="rounded-[20px] bg-noche-2 p-5 ring-1 ring-blanco/8">
      <figcaption className="font-bold text-blanco">{title}</figcaption>
      <ul className="mt-5 space-y-3.5">
        {data.map((d) => (
          <li key={d.label} className="group" title={`${d.label}: ${d.value}${unit}`}>
            <div className="flex justify-between gap-4 text-[0.8125rem]">
              <span className="truncate text-niebla/85">{d.label}</span>
              <span className="font-mono text-blanco tabular-nums">
                {d.value}
                {unit}
              </span>
            </div>
            <div className="mt-1.5 h-2 rounded-full bg-blanco/[0.06]">
              <div className="h-full rounded-full bg-azul transition-[filter] group-hover:brightness-125" style={{width: `${(d.value / max) * 100}%`}} />
            </div>
          </li>
        ))}
      </ul>
    </figure>
  );
}

function DataTableView({data, title}: {data: Datum[]; title: string}) {
  return (
    <details className="mt-3">
      <summary className="cursor-pointer font-mono text-[0.625rem] tracking-[0.12em] text-niebla/55 uppercase hover:text-blanco">Ver como tabla</summary>
      <table className="table-dale mt-2">
        <caption className="sr-only">{title}</caption>
        <tbody>
          {data.map((d) => (
            <tr key={d.label}>
              <th scope="row">{d.label}</th>
              <td className="text-right">{d.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}
