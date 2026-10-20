/** Utilidades 100% cliente: calendario .ics y compartir enlace. */

const icsDate = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
const esc = (s: string) => s.replace(/[\\,;]/g, (m) => `\\${m}`).replace(/\n/g, '\\n');

export function downloadIcs(e: {slug: string; title: string; summary: string; starts_at: string; ends_at: string | null; venue?: string | null; address?: string | null}) {
  const end = e.ends_at ?? new Date(new Date(e.starts_at).getTime() + 3600000).toISOString();
  const body = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//DALE CON TODO//Agenda//ES',
    'BEGIN:VEVENT',
    `UID:${e.slug}@daleconto.do`,
    `DTSTAMP:${icsDate(new Date().toISOString())}`,
    `DTSTART:${icsDate(e.starts_at)}`,
    `DTEND:${icsDate(end)}`,
    `SUMMARY:${esc(e.title)}`,
    `DESCRIPTION:${esc(`${e.summary}\n${location.origin}/eventos/${e.slug}`)}`,
    `LOCATION:${esc([e.venue, e.address].filter(Boolean).join(', ') || 'En línea')}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([body], {type: 'text/calendar;charset=utf-8'}));
  a.download = `${e.slug}.ics`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

/** Comparte con la hoja nativa o copia el enlace. Devuelve qué hizo. */
export async function shareLink(title: string, url = location.href): Promise<'shared' | 'copied' | 'failed'> {
  try {
    if (navigator.share) {
      await navigator.share({title, url});
      return 'shared';
    }
    await navigator.clipboard.writeText(url);
    return 'copied';
  } catch {
    return 'failed';
  }
}
