import {useEffect, useId, useRef, type ReactNode} from 'react';

/**
 * Diálogo modal accesible sobre <dialog> nativo: foco atrapado por el
 * navegador, Escape para cerrar, clic en el fondo para cerrar y foco devuelto
 * al disparador.
 */
export function Modal({open, onClose, title, children, size = 'md'}: {open: boolean; onClose: () => void; title: string; children: ReactNode; size?: 'md' | 'lg'}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      d.showModal();
      document.documentElement.style.overflow = 'hidden';
    } else if (!open && d.open) {
      d.close();
    }
    return () => {
      document.documentElement.style.overflow = '';
    };
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className={`m-auto w-[calc(100%-2rem)] ${size === 'lg' ? 'max-w-3xl' : 'max-w-lg'} rounded-[24px] bg-noche-2 p-0 text-niebla shadow-[0_40px_120px_-20px_rgb(0_0_0/0.8)] ring-1 ring-blanco/12 backdrop:bg-tinta/75 backdrop:backdrop-blur-sm open:animate-leg-in`}
    >
      <div className="relative overflow-hidden p-6 md:p-8">
        <svg aria-hidden="true" viewBox="0 0 200 200" className="pointer-events-none absolute -top-16 -right-16 size-56 opacity-50">
          <circle cx="100" cy="100" r="80" fill="none" stroke="#db354a" strokeWidth="2.5" strokeDasharray="0 10" strokeLinecap="round" />
          <circle cx="100" cy="100" r="58" fill="none" stroke="#af286c" strokeWidth="2" strokeDasharray="0 9" strokeLinecap="round" />
        </svg>
        <div className="relative flex items-start justify-between gap-6">
          <h2 id={titleId} className="font-wide text-[1.25rem] leading-tight text-blanco">
            {title}
          </h2>
          <button type="button" onClick={onClose} className="grid size-9 shrink-0 place-items-center rounded-full ring-1 ring-blanco/20 hover:bg-blanco/10" aria-label="Cerrar">
            <span aria-hidden="true">✕</span>
          </button>
        </div>
        <div className="relative mt-5">{children}</div>
      </div>
    </dialog>
  );
}

/** Confirmación honesta de los formularios en vista previa: nada se guarda. */
export function PreviewSubmitted({open, onClose, title, summary}: {open: boolean; onClose: () => void; title: string; summary: ReactNode}) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <div className="space-y-4 text-body">
        <div>{summary}</div>
        <p className="rounded-xl bg-alerta/10 px-4 py-3 text-[0.875rem] text-alerta ring-1 ring-alerta/30">
          Vista previa DEMO: validamos el formulario, pero <strong>no se envió ni se guardó</strong> ningún dato.
        </p>
        <button type="button" className="btn btn-light w-full" onClick={onClose}>
          Entendido
        </button>
      </div>
    </Modal>
  );
}
