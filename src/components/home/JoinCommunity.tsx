import {useMutation} from '@tanstack/react-query';
import {useEffect, useState, type FormEvent} from 'react';
import {Link} from 'react-router-dom';
import {careers} from '../../content';
import {submitMembership} from '../../data/api';
import type {EventRow} from '../../data/types';
import {useReveals} from '../../hooks/useReveals';
import {fmtDateTime} from '../../lib/format';
import {errorMessage} from '../../lib/supabase';
import {NoSaveNotice, StatusMessage} from '../ui/Feedback';

function useCountdown(target: string | null) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!target) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [target]);
  const ms = target ? Math.max(0, new Date(target).getTime() - now) : 0;
  const s = Math.floor(ms / 1000);
  return {d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60};
}

/**
 * Cierre «ÚNETE / DALE CON TODO». Portado de Reserve.tsx (SELENE): misma
 * composición en dos columnas, pero el formulario registra la solicitud en
 * Supabase (RPC submit_membership_application) en lugar de abrir un mailto:.
 * El contador solo aparece si existe un evento futuro real (no demo).
 */
export function JoinCommunity({nextEvent}: {nextEvent: EventRow | null}) {
  const ref = useReveals<HTMLElement>();
  const t = useCountdown(nextEvent?.starts_at ?? null);
  const [invalid, setInvalid] = useState(false);
  const mutation = useMutation({mutationFn: submitMembership});

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    if (!form.checkValidity()) {
      setInvalid(true);
      form.reportValidity();
      return;
    }
    setInvalid(false);
    const d = new FormData(form);
    mutation.mutate({
      full_name: String(d.get('full_name')),
      email: String(d.get('email')),
      university: String(d.get('university')),
      career: String(d.get('career')),
      campus: '',
      lines: [],
      interests: [],
      motivation: '',
      consent_data: d.get('consent_data') === 'on',
      consent_contact: d.get('consent_contact') === 'on',
    });
  };

  const units: [string, number][] = [
    ['Días', t.d],
    ['Hrs', t.h],
    ['Min', t.m],
    ['Seg', t.s],
  ];

  return (
    <section ref={ref} id="unete" aria-labelledby="unete-title" className="relative overflow-hidden bg-noche px-4 pb-28 sm:px-6 md:px-[6vw] md:pb-40">
      {/* El universo del logo, de vuelta al pie: la portada como sujetalibros. */}
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-[60vw] left-1/2 size-[100vw] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_50%_30%,rgba(219,53,74,0.32),rgba(175,40,108,0.12)_45%,transparent_70%)]" />
      <svg aria-hidden="true" viewBox="0 0 400 400" className="pointer-events-none absolute -bottom-[40vw] left-1/2 w-[90vw] -translate-x-1/2 opacity-40">
        {[190, 160, 130].map((r, i) => (
          <circle key={r} cx="200" cy="200" r={r} fill="none" stroke={i % 2 ? '#af286c' : '#db354a'} strokeWidth="2.4" strokeDasharray="0 11" strokeLinecap="round" />
        ))}
      </svg>

      <div className="relative grid gap-12 border-t border-blanco/10 pt-20 md:grid-cols-2 md:gap-16 md:pt-28">
        <div data-reveal>
          <p className="eyebrow">Únete</p>
          <h2 id="unete-title" className="mt-4 font-wide text-[clamp(2.4rem,7vw,6rem)] leading-[0.92] text-blanco">
            Únete.
            <span className="block text-gradient-brand">Dale con todo.</span>
          </h2>
          <p className="mt-6 max-w-[30rem] text-body text-niebla/80">
            Déjanos tus datos y te escribiremos cuando abra una actividad para tu carrera. Para inscribirte a eventos y concursos, crea tu cuenta.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/registro" className="btn btn-light">
              Crear cuenta
            </Link>
            <Link to="/unete" className="btn btn-ghost">
              Formulario completo
            </Link>
          </div>

          {nextEvent && (
            <div className="mt-10">
              <p className="font-mono text-label text-niebla/55 uppercase">Próximo evento · {nextEvent.title}</p>
              <div className="mt-3 flex gap-2 md:gap-3" role="timer" aria-label={`Faltan ${t.d} días, ${t.h} horas y ${t.m} minutos para ${nextEvent.title}`}>
                {units.map(([label, v]) => (
                  <div key={label} className="brackets min-w-[4.25rem] px-3 py-3 text-center text-blanco/25 md:min-w-[5.5rem]">
                    <span className="block font-wide text-[1.5rem] text-blanco tabular-nums md:text-[2.25rem]">{String(v).padStart(2, '0')}</span>
                    <span className="mt-1 block font-mono text-[0.625rem] tracking-[0.14em] text-niebla/60 uppercase">{label}</span>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-[0.8125rem] text-niebla/60">{fmtDateTime(nextEvent.starts_at)}</p>
              <Link to={`/eventos/${nextEvent.slug}`} className="mt-3 inline-block font-mono text-label text-blanco uppercase underline decoration-rojo underline-offset-4">
                Ver evento →
              </Link>
            </div>
          )}
        </div>

        <form noValidate onSubmit={onSubmit} aria-describedby="unete-status" className="space-y-3" data-reveal>
          <NoSaveNotice />
          <label className="block">
            <span className="label">Nombre completo</span>
            <input name="full_name" required minLength={2} maxLength={120} autoComplete="name" className="field" />
          </label>
          <label className="block">
            <span className="label">Correo</span>
            <input name="email" type="email" required autoComplete="email" placeholder="tu@correo.com" className="field" />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="label">Universidad</span>
              <input name="university" required minLength={2} defaultValue="UTP" autoComplete="organization" className="field" />
            </label>
            <label className="block">
              <span className="label">Carrera</span>
              <select name="career" required defaultValue="" className="field">
                <option value="" disabled>
                  Elige tu carrera
                </option>
                {careers.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
          </div>
          <label className="flex items-start gap-3 pt-2 text-[0.875rem] text-niebla/85">
            <input name="consent_data" type="checkbox" required className="mt-1 size-4 accent-rojo" />
            <span>
              Acepto el tratamiento de mis datos según la <Link to="/privacidad" className="underline underline-offset-2">política de privacidad</Link>.
            </span>
          </label>
          <label className="flex items-start gap-3 text-[0.875rem] text-niebla/85">
            <input name="consent_contact" type="checkbox" className="mt-1 size-4 accent-rojo" />
            <span>Quiero recibir correos sobre actividades (opcional).</span>
          </label>
          <button type="submit" disabled={mutation.isPending} className="btn btn-primary mt-2 w-full">
            {mutation.isPending ? 'Enviando…' : 'Quiero unirme'}
          </button>
          <div id="unete-status" className="min-h-[1.25rem]">
            {invalid && <StatusMessage kind="error">Completa nombre, correo válido, universidad, carrera y el consentimiento.</StatusMessage>}
            {mutation.isError && <StatusMessage kind="error">{errorMessage(mutation.error)}</StatusMessage>}
            {mutation.isSuccess && (
              <StatusMessage kind="ok">
                {mutation.data === 'created' ? '¡Listo! Registramos tu solicitud. ' : 'Ya teníamos tu solicitud: actualizamos tus datos. '}
                No enviamos correo automático de confirmación; la organización te contactará.
              </StatusMessage>
            )}
          </div>
        </form>
      </div>
    </section>
  );
}
