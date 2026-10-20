import {useId, type ReactNode} from 'react';
import {useSearchParams} from 'react-router-dom';

/** Barra de filtros fija bajo el header; los valores viven en la URL. */
export function FilterBar({children, count, onReset}: {children: ReactNode; count?: number; onReset?: () => void}) {
  return (
    <div role="search" className="sticky top-[4.1rem] z-30 -mx-4 border-y border-blanco/8 bg-noche/90 px-4 py-3 backdrop-blur-md sm:-mx-6 sm:px-6 md:-mx-[6vw] md:px-[6vw]">
      <div className="flex flex-wrap items-center gap-3">
        {children}
        <div className="ml-auto flex items-center gap-4">
          {count !== undefined && (
            <p className="font-mono text-label text-niebla/60 uppercase" aria-live="polite">
              {count} {count === 1 ? 'resultado' : 'resultados'}
            </p>
          )}
          {onReset && (
            <button type="button" onClick={onReset} className="font-mono text-label text-azul uppercase hover:text-blanco">
              Limpiar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function SearchInput({value, onChange, placeholder = 'Buscar…', label = 'Buscar'}: {value: string; onChange: (v: string) => void; placeholder?: string; label?: string}) {
  const id = useId();
  return (
    <div className="w-full sm:w-auto sm:min-w-[16rem]">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <div className="relative">
        <svg aria-hidden="true" viewBox="0 0 20 20" className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-niebla/50">
          <circle cx="8.5" cy="8.5" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <path d="M13 13l4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
        <input id={id} type="search" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="field rounded-full py-2.5 pl-10" />
      </div>
    </div>
  );
}

export function SelectFilter({label, value, onChange, options}: {label: string; value: string; onChange: (v: string) => void; options: [string, string][]}) {
  const id = useId();
  return (
    <div className="min-w-[10rem] flex-1 sm:flex-none">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className="field rounded-full py-2.5">
        <option value="">{label}: todo</option>
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </div>
  );
}

/** Pestañas segmentadas (grupo de radio accesible). */
export function Segmented<T extends string>({value, onChange, options, label}: {value: T; onChange: (v: T) => void; options: [T, string][]; label: string}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex max-w-full overflow-x-auto rounded-full bg-blanco/5 p-1 ring-1 ring-blanco/10">
      {options.map(([v, l]) => (
        <button
          key={v}
          type="button"
          role="radio"
          aria-checked={value === v}
          onClick={() => onChange(v)}
          className={`shrink-0 rounded-full px-4 py-2 font-mono text-[0.6875rem] tracking-[0.1em] uppercase transition-colors ${value === v ? 'bg-blanco text-noche' : 'text-niebla/75 hover:text-blanco'}`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}

/** Filtros en la query string: compartibles y sin mover el scroll al cambiar. */
export function useFilters<K extends string>(keys: readonly K[]) {
  const [params, setParams] = useSearchParams();
  const values = Object.fromEntries(keys.map((k) => [k, params.get(k) ?? ''])) as Record<K, string>;
  const set = (key: K, v: string) => {
    const next = new URLSearchParams(params);
    if (v) next.set(key, v);
    else next.delete(key);
    setParams(next, {replace: true, preventScrollReset: true});
  };
  const reset = () => setParams(new URLSearchParams(), {replace: true, preventScrollReset: true});
  const active = keys.some((k) => values[k]);
  return {values, set, reset, active};
}
