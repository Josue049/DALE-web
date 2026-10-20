import {site} from '../content';

const TZ = site.timezone;

export const fmtDate = (iso: string, opts: Intl.DateTimeFormatOptions = {}) =>
  new Intl.DateTimeFormat('es-PE', {timeZone: TZ, day: 'numeric', month: 'long', year: 'numeric', ...opts}).format(new Date(iso));

export const fmtDateShort = (iso: string) =>
  new Intl.DateTimeFormat('es-PE', {timeZone: TZ, day: '2-digit', month: 'short'}).format(new Date(iso)).replace('.', '');

export const fmtTime = (iso: string) =>
  new Intl.DateTimeFormat('es-PE', {timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false}).format(new Date(iso));

export const fmtDateTime = (iso: string) => `${fmtDate(iso, {weekday: 'long'})} · ${fmtTime(iso)} (hora de Lima)`;

/** Partes de fecha en Lima para tarjetas tipo agenda. */
export function dateParts(iso: string) {
  const d = new Date(iso);
  const part = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('es-PE', {timeZone: TZ, ...o}).format(d);
  return {day: part({day: '2-digit'}), month: part({month: 'short'}).replace('.', '').toUpperCase(), weekday: part({weekday: 'short'}).replace('.', ''), year: part({year: 'numeric'})};
}

/** ISO UTC → valor para <input type="datetime-local"> expresado en hora de Lima. */
export function toLimaInput(iso: string | null | undefined): string {
  if (!iso) return '';
  const parts = new Intl.DateTimeFormat('en-CA', {timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false}).formatToParts(new Date(iso));
  const g = (t: string) => parts.find((p) => p.type === t)?.value ?? '00';
  return `${g('year')}-${g('month')}-${g('day')}T${g('hour') === '24' ? '00' : g('hour')}:${g('minute')}`;
}

/** Valor de datetime-local interpretado en Lima (UTC−5, sin horario de verano) → ISO UTC. */
export function fromLimaInput(value: string): string | null {
  if (!value) return null;
  return new Date(`${value}:00-05:00`).toISOString();
}

export function relativeDays(iso: string): string {
  const days = Math.round((new Date(iso).getTime() - Date.now()) / 86400000);
  if (days === 0) return 'hoy';
  if (days === 1) return 'mañana';
  if (days === -1) return 'ayer';
  return days > 0 ? `en ${days} días` : `hace ${-days} días`;
}

export function slugify(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export function toCsv(rows: Record<string, unknown>[]): string {
  if (!rows.length) return '';
  const cols = Object.keys(rows[0]);
  const esc = (v: unknown) => {
    const s = v == null ? '' : Array.isArray(v) ? v.join('; ') : typeof v === 'object' ? JSON.stringify(v) : String(v);
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [cols.join(','), ...rows.map((r) => cols.map((c) => esc(r[c])).join(','))].join('\n');
}

export function downloadCsv(filename: string, rows: Record<string, unknown>[]) {
  // BOM para que Excel abra bien las tildes.
  const blob = new Blob(['﻿' + toCsv(rows)], {type: 'text/csv;charset=utf-8'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
