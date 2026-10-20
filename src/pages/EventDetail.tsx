import {useQuery} from '@tanstack/react-query';
import {useState, type FormEvent} from 'react';
import {Link, useParams} from 'react-router-dom';
import {useAuth} from '../auth/AuthProvider';
import {EventCard, eventPhase, seatsLabel} from '../components/ui/Cards';
import {DetailHero, StickyAside} from '../components/ui/DetailHero';
import {DemoTag, ErrorState, Loading} from '../components/ui/Feedback';
import {Modal, PreviewSubmitted} from '../components/ui/Modal';
import {Section, SectionTitle} from '../components/ui/Page';
import {Timeline} from '../components/ui/Timeline';
import {labels, site} from '../content';
import {getAvailability, getEvent, listEvents} from '../data/api';
import type {EventRow} from '../data/types';
import {useSeo} from '../hooks/useSeo';
import {dateParts, fmtDate, fmtTime} from '../lib/format';
import {downloadIcs, shareLink} from '../lib/share';
import NotFound from './NotFound';
import {Avatar} from '../components/ui/Avatar';

export default function EventDetail() {
  const {slug = ''} = useParams();
  const q = useQuery({queryKey: ['event', slug], queryFn: () => getEvent(slug)});
  const e = q.data;
  const avail = useQuery({queryKey: ['availability', e?.id], queryFn: () => getAvailability([e!.id]), enabled: !!e});
  const related = useQuery({queryKey: ['events', 'upcoming'], queryFn: () => listEvents({when: 'upcoming'}), enabled: !!e});

  useSeo({
    title: e?.title ?? 'Evento',
    description: e?.summary,
    type: 'event',
    jsonLd: e
      ? {
          '@context': 'https://schema.org',
          '@type': 'Event',
          name: e.title,
          description: e.summary,
          startDate: e.starts_at,
          endDate: e.ends_at ?? undefined,
          eventStatus: e.status === 'cancelled' ? 'https://schema.org/EventCancelled' : 'https://schema.org/EventScheduled',
          eventAttendanceMode: {virtual: 'https://schema.org/OnlineEventAttendanceMode', presencial: 'https://schema.org/OfflineEventAttendanceMode', hibrida: 'https://schema.org/MixedEventAttendanceMode'}[e.modality],
          location: e.modality === 'virtual' ? {'@type': 'VirtualLocation', url: `${site.url}/eventos/${e.slug}`} : {'@type': 'Place', name: e.venue ?? 'Por confirmar', address: e.address ?? 'Lima, Perú'},
          organizer: {'@type': 'Organization', name: site.name, url: site.url},
        }
      : null,
  });

  if (q.isLoading) return <div className="pt-40"><Loading label="Cargando evento" /></div>;
  if (q.isError) return <div className="px-4 pt-40"><ErrorState error={q.error} retry={() => q.refetch()} /></div>;
  if (!e) return <NotFound what="evento" back="/eventos" />;

  const d = dateParts(e.starts_at);
  const phase = eventPhase(e);
  const a = avail.data?.[e.id];
  const more = (related.data ?? []).filter((x) => x.id !== e.id).slice(0, 3);

  return (
    <>
      <DetailHero seed={e.slug} image={e.cover_url} imageAlt={e.cover_alt} back={{to: '/eventos', label: 'Todos los eventos'}}>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`chip ${phase.tone}`}>{phase.label}</span>
          <span className="chip">{labels.eventKind[e.kind]}</span>
          <span className="chip">{labels.modality[e.modality]}</span>
          <span className="chip">{labels.eligibility[e.eligibility]}</span>
          {e.is_demo && <DemoTag />}
        </div>
        <div className="mt-8 grid gap-8 lg:grid-cols-[auto_1fr] lg:items-end lg:gap-14">
          <p className="font-wide leading-[0.82] text-blanco" aria-label={`${fmtDate(e.starts_at, {weekday: 'long'})}, ${fmtTime(e.starts_at)} horas`}>
            <span aria-hidden="true" className="block text-[clamp(5rem,13vw,11rem)]">{d.day}</span>
            <span aria-hidden="true" className="block font-mono text-[0.9rem] font-normal tracking-[0.2em] text-rojo">
              {d.month} {d.year} · {d.weekday} · {fmtTime(e.starts_at)} h
            </span>
          </p>
          <div>
            <h1 className="max-w-4xl font-wide text-[clamp(1.8rem,4.4vw,4rem)] leading-[1] text-blanco">{e.title}</h1>
            <p className="mt-5 max-w-2xl text-lead text-niebla/85">{e.summary}</p>
          </div>
        </div>
      </DetailHero>

      <Section className="pb-24">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_24rem] lg:gap-16">
          <div className="space-y-16">
            <section aria-labelledby="sobre" data-reveal>
              <h2 id="sobre" className="eyebrow">Sobre el evento</h2>
              <p className="prose-dale mt-4 max-w-2xl text-[1.0625rem]">{e.description || e.summary}</p>
              {e.requirements && (
                <div className="mt-8 max-w-2xl rounded-2xl bg-blanco/[0.03] p-5 ring-1 ring-blanco/10">
                  <p className="font-mono text-label text-azul uppercase">Requisitos</p>
                  <p className="mt-2 text-body text-niebla/85">{e.requirements}</p>
                </div>
              )}
            </section>

            {e.agenda.length > 0 && (
              <section aria-labelledby="agenda">
                <h2 id="agenda" className="eyebrow mb-8" data-reveal>
                  Agenda · hora de Lima
                </h2>
                <Timeline items={e.agenda.map((it, i) => ({key: String(i), label: `${it.time} h`, title: it.title, body: it.speaker ? `Con ${it.speaker}` : undefined}))} />
              </section>
            )}

            {(e.event_speakers ?? []).length > 0 && (
              <section aria-labelledby="ponentes">
                <h2 id="ponentes" className="eyebrow" data-reveal>
                  {e.event_speakers!.length > 1 ? 'Ponentes' : 'Ponente'}
                </h2>
                <ul className="mt-6 grid gap-4 sm:grid-cols-2">
                  {e.event_speakers!.map((s, i) => (
                    <li key={s.id} className="flex gap-4 rounded-2xl bg-noche-2 p-5 ring-1 ring-blanco/8" data-reveal>
                      <div className="w-20 shrink-0">
                        <Avatar name={s.name} index={i + 1} src={s.photo_url} />
                      </div>
                      <div>
                        <p className="flex flex-wrap items-center gap-2 font-bold text-blanco">
                          {s.name} {e.is_demo && <DemoTag />}
                        </p>
                        {s.title && <p className="mt-0.5 font-mono text-[0.625rem] tracking-[0.12em] text-azul uppercase">{s.title}</p>}
                        {s.bio && <p className="mt-2 text-[0.875rem] leading-relaxed text-niebla/75">{s.bio}</p>}
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section aria-labelledby="lugar" data-reveal>
              <h2 id="lugar" className="eyebrow">Dónde</h2>
              <div className="mt-4 grid overflow-hidden rounded-2xl ring-1 ring-blanco/10 sm:grid-cols-[1fr_14rem]">
                <div className="p-6">
                  <p className="text-[1.15rem] font-bold text-blanco">{e.modality === 'virtual' ? 'Sesión en línea' : (e.venue ?? 'Sede por confirmar')}</p>
                  <p className="mt-1 text-body text-niebla/75">
                    {e.modality === 'virtual'
                      ? 'El enlace de acceso se muestra solo a personas inscritas, en su cuenta.'
                      : `${e.address ?? 'Lima, Perú'}${e.modality === 'hibrida' ? ' · también con transmisión en línea para inscritos' : ''}`}
                  </p>
                </div>
                <div aria-hidden="true" className="relative min-h-32 bg-noche-3">
                  <svg viewBox="0 0 200 140" className="absolute inset-0 size-full">
                    {Array.from({length: 8}, (_, i) => (
                      <line key={i} x1={i * 28} y1="0" x2={i * 28 - 40} y2="140" stroke="#f5f7fb" strokeOpacity="0.07" strokeWidth="6" />
                    ))}
                    <circle cx="100" cy="70" r="34" fill="none" stroke="#db354a" strokeWidth="2" strokeDasharray="0 7" strokeLinecap="round" />
                    <circle cx="100" cy="70" r="7" fill={e.modality === 'virtual' ? '#74b1e0' : '#db354a'} />
                  </svg>
                </div>
              </div>
            </section>

            {(e.resources.length > 0 || e.recording_url) && (
              <section aria-labelledby="material" data-reveal>
                <h2 id="material" className="eyebrow">Material</h2>
                <ul className="mt-4 space-y-2">
                  {e.recording_url && (
                    <li>
                      <a href={e.recording_url} className="underline decoration-rojo underline-offset-4" target="_blank" rel="noreferrer">
                        Ver grabación
                      </a>
                    </li>
                  )}
                  {e.resources.map((r) => (
                    <li key={r.url}>
                      <a href={r.url} className="text-blanco underline decoration-rojo underline-offset-4" target="_blank" rel="noreferrer">
                        {r.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>

          <StickyAside>
            <RegistrationCard event={e} seats={seatsLabel(e, a)} taken={a ? a.confirmed : 0} />
          </StickyAside>
        </div>
      </Section>

      {more.length > 0 && (
        <Section className="pb-28">
          <SectionTitle eyebrow="También en agenda" title="Sigue aprendiendo." />
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {more.map((x) => (
              <div key={x.id} data-reveal>
                <EventCard event={x} />
              </div>
            ))}
          </div>
        </Section>
      )}
    </>
  );
}

function RegistrationCard({event: e, seats, taken}: {event: EventRow; seats: string | null; taken: number}) {
  const {user, demo} = useAuth();
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState<{name: string} | null>(null);
  const [shared, setShared] = useState('');
  const past = new Date(e.ends_at ?? e.starts_at).getTime() < Date.now();
  const pct = e.capacity ? Math.min(100, (taken / e.capacity) * 100) : 0;
  const canGuest = e.allow_guests && e.eligibility === 'publico';

  const submit = (ev: FormEvent<HTMLFormElement>) => {
    ev.preventDefault();
    const f = ev.currentTarget;
    if (!f.checkValidity()) {
      f.reportValidity();
      return;
    }
    const name = String(new FormData(f).get('name') ?? 'tu inscripción');
    setOpen(false);
    setDone({name});
  };

  return (
    <div className="relative overflow-hidden rounded-[24px] bg-noche-2 p-6 ring-1 ring-blanco/10 md:p-7">
      <svg aria-hidden="true" viewBox="0 0 200 200" className="pointer-events-none absolute -top-16 -right-16 size-48 opacity-60">
        <circle cx="100" cy="100" r="80" fill="none" stroke="#db354a" strokeWidth="2.5" strokeDasharray="0 10" strokeLinecap="round" />
        <circle cx="100" cy="100" r="56" fill="none" stroke="#74b1e0" strokeWidth="1.2" />
      </svg>
      <p className="relative eyebrow">Inscripción</p>
      <dl className="relative mt-5 space-y-4 text-[0.9375rem]">
        <div>
          <dt className="font-mono text-label text-niebla/55 uppercase">Cuándo</dt>
          <dd className="mt-1 font-semibold text-blanco first-letter:uppercase">
            {fmtDate(e.starts_at, {weekday: 'long'})}
            <span className="block font-normal text-niebla/75">
              {fmtTime(e.starts_at)}
              {e.ends_at ? ` – ${fmtTime(e.ends_at)}` : ''} h (hora de Lima)
            </span>
          </dd>
        </div>
        <div>
          <dt className="font-mono text-label text-niebla/55 uppercase">Quién puede asistir</dt>
          <dd className="mt-1 font-semibold text-blanco">{labels.eligibility[e.eligibility]}</dd>
        </div>
        <div>
          <dt className="font-mono text-label text-niebla/55 uppercase">Cupos</dt>
          <dd className="mt-1 font-semibold text-blanco">{seats}</dd>
          {e.capacity && (
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-blanco/10" role="meter" aria-valuemin={0} aria-valuemax={e.capacity} aria-valuenow={taken} aria-label="Cupos ocupados">
              <div className="h-full rounded-full bg-gradient-to-r from-rojo to-magenta" style={{width: `${Math.max(pct, 2)}%`}} />
            </div>
          )}
        </div>
      </dl>
      <div className="relative mt-7 space-y-3">
        {past ? (
          <p className="rounded-xl bg-blanco/5 px-4 py-3 text-[0.875rem] text-niebla/80">Este evento ya se realizó. Revisa el material disponible o explora la agenda.</p>
        ) : (
          <button type="button" className="btn btn-primary w-full" onClick={() => setOpen(true)}>
            Inscribirme
          </button>
        )}
        <div className="grid grid-cols-2 gap-2">
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => downloadIcs(e)}>
            Al calendario
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={async () => {
              const r = await shareLink(e.title);
              setShared(r === 'copied' ? 'Enlace copiado' : r === 'shared' ? 'Compartido' : 'No se pudo compartir');
            }}
          >
            Compartir
          </button>
        </div>
        <p className="min-h-5 text-center font-mono text-[0.625rem] tracking-[0.12em] text-ok uppercase" role="status">
          {shared}
        </p>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Inscribirme al evento">
        <form noValidate onSubmit={submit} className="space-y-3">
          <p className="text-[0.9rem] text-niebla/80">{e.title}</p>
          {!user && !demo && !canGuest ? (
            <div className="space-y-3">
              <p className="text-body">Este evento requiere una cuenta para inscribirse.</p>
              <Link to={`/ingresar?next=/eventos/${e.slug}`} className="btn btn-primary w-full">
                Ingresar
              </Link>
            </div>
          ) : (
            <>
              <label className="block">
                <span className="label">Nombre completo</span>
                <input name="name" required minLength={2} autoComplete="name" className="field" defaultValue={demo ? '' : undefined} />
              </label>
              <label className="block">
                <span className="label">Correo</span>
                <input name="email" type="email" required autoComplete="email" className="field" />
              </label>
              {e.eligibility !== 'publico' && (
                <label className="block">
                  <span className="label">Universidad</span>
                  <input name="university" required defaultValue={e.eligibility === 'utp' ? 'UTP' : ''} className="field" />
                </label>
              )}
              <label className="flex items-start gap-3 pt-1 text-[0.875rem] text-niebla/85">
                <input type="checkbox" required className="mt-1 size-4 accent-rojo" />
                <span>
                  Acepto la <Link to="/privacidad" className="underline">política de privacidad</Link>.
                </span>
              </label>
              <button type="submit" className="btn btn-primary w-full">
                Confirmar inscripción
              </button>
            </>
          )}
        </form>
      </Modal>
      <PreviewSubmitted
        open={!!done}
        onClose={() => setDone(null)}
        title="Formulario completo"
        summary={
          <p>
            Así se vería la confirmación de <strong className="text-blanco">{done?.name}</strong> para «{e.title}»: estado de cupo, comprobante y enlace de acceso en tu cuenta.
          </p>
        }
      />
    </div>
  );
}
