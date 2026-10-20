import type {ReactNode} from 'react';
import {Link} from 'react-router-dom';
import {DemoModeError, errorMessage, isDemoMode} from '../../lib/supabase';

export function Spinner({label = 'Cargando'}: {label?: string}) {
  return (
    <span role="status" className="inline-flex items-center gap-3 font-mono text-label text-niebla/80 uppercase">
      <span aria-hidden="true" className="size-4 animate-spin rounded-full border-2 border-azul/30 border-t-azul" />
      {label}…
    </span>
  );
}

export function Loading({label}: {label?: string}) {
  return (
    <div className="grid min-h-40 place-items-center py-10">
      <Spinner label={label} />
    </div>
  );
}

/** Mensaje de estado anunciado a lectores de pantalla. */
export function StatusMessage({kind, children}: {kind: 'ok' | 'error' | 'info' | 'warn'; children: ReactNode}) {
  const tone = {
    ok: 'bg-ok/10 text-ok ring-ok/30',
    error: 'bg-rojo/12 text-[#ff8a98] ring-rojo/40',
    info: 'bg-azul/10 text-azul ring-azul/30',
    warn: 'bg-alerta/10 text-alerta ring-alerta/30',
  }[kind];
  return (
    <div role={kind === 'error' ? 'alert' : 'status'} className={`rounded-xl px-4 py-3 text-[0.9rem] leading-relaxed ring-1 ${tone}`}>
      {children}
    </div>
  );
}

export function ErrorState({error, retry}: {error: unknown; retry?: () => void}) {
  return (
    <div className="py-6">
      <StatusMessage kind="error">
        <span className="block font-semibold">No pudimos cargar esta información.</span>
        <span className="block opacity-90">{errorMessage(error)}</span>
        {retry && (
          <button type="button" onClick={retry} className="mt-2 underline underline-offset-4">
            Reintentar
          </button>
        )}
      </StatusMessage>
    </div>
  );
}

/** Estado vacío diseñado: información honesta en vez de pantallas en blanco. */
export function EmptyState({title, body, action}: {title: string; body?: ReactNode; action?: ReactNode}) {
  return (
    <div className="relative overflow-hidden rounded-[22px] px-6 py-14 text-center ring-1 ring-blanco/10 md:py-20">
      <svg aria-hidden="true" viewBox="0 0 400 400" className="pointer-events-none absolute top-1/2 left-1/2 size-[30rem] -translate-x-1/2 -translate-y-1/2 opacity-[0.18]">
        <circle cx="200" cy="200" r="120" fill="none" stroke="#db354a" strokeWidth="2.5" strokeDasharray="0 12" strokeLinecap="round" />
        <circle cx="200" cy="200" r="160" fill="none" stroke="#af286c" strokeWidth="2" strokeDasharray="0 14" strokeLinecap="round" />
        <circle cx="200" cy="200" r="80" fill="none" stroke="#74b1e0" strokeWidth="1" />
      </svg>
      <p className="relative font-wide text-[1.15rem] text-blanco md:text-[1.4rem]">{title}</p>
      {body && <div className="relative mx-auto mt-3 max-w-md text-body text-niebla/80">{body}</div>}
      {action && <div className="relative mt-6 flex flex-wrap justify-center gap-3">{action}</div>}
    </div>
  );
}

export function DemoTag({className = ''}: {className?: string}) {
  return (
    <span className={`inline-flex items-center rounded-full bg-alerta px-2 py-0.5 font-mono text-[0.625rem] font-medium tracking-[0.14em] text-tinta uppercase ${className}`}>
      Demo
    </span>
  );
}

/** Franja global del modo vista previa (sin Supabase configurado). */
export function DemoBanner() {
  if (!isDemoMode) return null;
  return (
    <div className="relative z-[60] truncate bg-alerta px-4 py-2 text-center font-mono text-[0.6875rem] tracking-[0.06em] text-tinta">
      <strong>
        <span className="hidden sm:inline">VISTA PREVIA · </span>DEMO
      </strong>
      <span className="hidden sm:inline"> — personas, eventos y concursos de ejemplo; nada se guarda.</span>
      <span className="sm:hidden"> · datos de ejemplo ·</span>{' '}
      <Link to="/nosotros#estado" className="whitespace-nowrap underline underline-offset-2">
        Saber más
      </Link>
    </div>
  );
}

export function NoSaveNotice() {
  if (!isDemoMode) return null;
  return (
    <StatusMessage kind="warn">
      Vista previa DEMO: este formulario no guarda datos porque Supabase no está configurado. Al enviarlo verás el aviso correspondiente, nunca una confirmación falsa.
    </StatusMessage>
  );
}

/** Error de una acción: en vista previa se muestra como aviso, no como fallo. */
export function ActionError({error}: {error: unknown}) {
  if (error instanceof DemoModeError) return <StatusMessage kind="warn">{error.message}</StatusMessage>;
  return <StatusMessage kind="error">{errorMessage(error)}</StatusMessage>;
}
