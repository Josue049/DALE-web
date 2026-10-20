import {useEffect, useMemo, useState, type FormEvent, type ReactNode} from 'react';
import {Modal, PreviewSubmitted} from '../../components/ui/Modal';
import {downloadCsv} from '../../lib/format';

export type Column<T> = {key: string; label: string; render?: (row: T) => ReactNode; value?: (row: T) => string | number; className?: string};
export type FieldDef = {name: string; label: string; type?: 'text' | 'textarea' | 'number' | 'datetime-local' | 'select' | 'checkbox' | 'url' | 'email'; options?: [string, string][]; required?: boolean; full?: boolean};

/**
 * Tabla administrativa genérica: búsqueda, orden por columna, paginación,
 * exportación CSV (real, generada en el navegador) y edición en un panel
 * lateral. En vista previa los guardados muestran el aviso de no persistencia.
 */
export function DataTable<T extends {id: string}>({
  title,
  rows,
  columns,
  fields,
  searchKeys,
  filters,
  extraActions,
  csvName,
  createLabel = 'Nuevo',
  pageSize = 8,
}: {
  title: string;
  rows: T[];
  columns: Column<T>[];
  fields?: FieldDef[];
  searchKeys: (keyof T)[];
  filters?: ReactNode;
  extraActions?: (row: T) => ReactNode;
  csvName: string;
  createLabel?: string;
  pageSize?: number;
}) {
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<{key: string; dir: 1 | -1} | null>(null);
  const [page, setPage] = useState(0);
  const [editing, setEditing] = useState<T | 'new' | null>(null);
  const [deleting, setDeleting] = useState<T | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    let r = t ? rows.filter((row) => searchKeys.some((k) => String(row[k] ?? '').toLowerCase().includes(t))) : rows;
    if (sort) {
      const col = columns.find((c) => c.key === sort.key);
      const val = (row: T) => (col?.value ? col.value(row) : String((row as Record<string, unknown>)[sort.key] ?? ''));
      r = [...r].sort((a, b) => (val(a) > val(b) ? sort.dir : val(a) < val(b) ? -sort.dir : 0));
    }
    return r;
  }, [rows, q, sort, columns, searchKeys]);
  useEffect(() => setPage(0), [q, rows]);
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const view = filtered.slice(page * pageSize, page * pageSize + pageSize);

  const exportCsv = () =>
    downloadCsv(
      `${csvName}.csv`,
      filtered.map((row) => Object.fromEntries(columns.map((c) => [c.label, c.value ? c.value(row) : (row as Record<string, unknown>)[c.key]]))),
    );

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!e.currentTarget.checkValidity()) {
      e.currentTarget.reportValidity();
      return;
    }
    setPreview(editing === 'new' ? 'El registro se crearía y quedaría en el historial de auditoría.' : 'Los cambios se guardarían y quedarían en el historial de auditoría.');
    setEditing(null);
  };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full sm:w-72">
          <label htmlFor={`s-${csvName}`} className="sr-only">
            Buscar en {title}
          </label>
          <input id={`s-${csvName}`} type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Buscar en ${title.toLowerCase()}`} className="field rounded-full py-2.5" />
        </div>
        {filters}
        <div className="ml-auto flex gap-2">
          <button type="button" onClick={exportCsv} className="btn btn-ghost btn-sm">
            Exportar CSV
          </button>
          {fields && (
            <button type="button" onClick={() => setEditing('new')} className="btn btn-primary btn-sm">
              + {createLabel}
            </button>
          )}
        </div>
      </div>

      <div className="relative mt-5 overflow-x-auto rounded-[20px] bg-noche-2 ring-1 ring-blanco/8">
        <table className="table-dale min-w-[720px]">
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c.key} aria-sort={sort?.key === c.key ? (sort.dir === 1 ? 'ascending' : 'descending') : undefined}>
                  <button type="button" className="inline-flex items-center gap-1 uppercase hover:text-blanco" onClick={() => setSort(sort?.key === c.key ? {key: c.key, dir: sort.dir === 1 ? -1 : 1} : {key: c.key, dir: 1})}>
                    {c.label}
                    <span aria-hidden="true" className="text-[0.6rem]">
                      {sort?.key === c.key ? (sort.dir === 1 ? '▲' : '▼') : '↕'}
                    </span>
                  </button>
                </th>
              ))}
              <th>
                <span className="sr-only">Acciones</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {view.map((row) => (
              <tr key={row.id} className="transition-colors hover:bg-blanco/[0.02]">
                {columns.map((c) => (
                  <td key={c.key} className={c.className}>
                    {c.render ? c.render(row) : String((row as Record<string, unknown>)[c.key] ?? '—')}
                  </td>
                ))}
                <td className="text-right whitespace-nowrap">
                  {extraActions?.(row)}
                  {fields && (
                    <>
                      <button type="button" onClick={() => setEditing(row)} className="ml-3 font-mono text-[0.6875rem] tracking-[0.1em] text-azul uppercase hover:text-blanco">
                        Editar
                      </button>
                      <button type="button" onClick={() => setDeleting(row)} className="ml-3 font-mono text-[0.6875rem] tracking-[0.1em] text-rojo uppercase hover:underline">
                        Borrar
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
            {view.length === 0 && (
              <tr>
                <td colSpan={columns.length + 1} className="py-12 text-center text-niebla/60">
                  {rows.length === 0 ? 'Aún no hay registros.' : 'Ningún registro coincide con la búsqueda.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex items-center justify-between font-mono text-[0.6875rem] tracking-[0.1em] text-niebla/55 uppercase">
        <span>
          {filtered.length} registro(s) · página {page + 1} de {pages}
        </span>
        <span className="flex gap-2">
          <button type="button" className="btn btn-ghost btn-sm" disabled={page === 0} onClick={() => setPage(page - 1)} aria-label="Página anterior">
            ←
          </button>
          <button type="button" className="btn btn-ghost btn-sm" disabled={page >= pages - 1} onClick={() => setPage(page + 1)} aria-label="Página siguiente">
            →
          </button>
        </span>
      </div>

      {fields && (
        <Drawer open={editing !== null} onClose={() => setEditing(null)} title={editing === 'new' ? `${createLabel}` : `Editar · ${title}`}>
          <form noValidate onSubmit={submit} className="grid gap-4 sm:grid-cols-2" key={editing === 'new' ? 'new' : (editing?.id ?? 'x')}>
            {fields.map((f) => {
              const v = editing && editing !== 'new' ? (editing as Record<string, unknown>)[f.name] : undefined;
              const dv = Array.isArray(v) ? v.join(', ') : typeof v === 'string' && f.type === 'datetime-local' ? v.slice(0, 16) : (v as string | number | undefined);
              const cls = f.full || f.type === 'textarea' ? 'sm:col-span-2' : '';
              if (f.type === 'checkbox')
                return (
                  <label key={f.name} className={`flex items-center gap-3 text-[0.9rem] ${cls}`}>
                    <input type="checkbox" defaultChecked={!!v} className="size-4 accent-rojo" />
                    {f.label}
                  </label>
                );
              return (
                <label key={f.name} className={`block ${cls}`}>
                  <span className="label">
                    {f.label}
                    {f.required && ' *'}
                  </span>
                  {f.type === 'textarea' ? (
                    <textarea defaultValue={dv as string} required={f.required} rows={4} className="field" />
                  ) : f.type === 'select' ? (
                    <select defaultValue={(dv as string) ?? ''} required={f.required} className="field">
                      {f.options?.map(([k, l]) => (
                        <option key={k} value={k}>
                          {l}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input type={f.type ?? 'text'} defaultValue={dv} required={f.required} className="field" />
                  )}
                </label>
              );
            })}
            <div className="flex gap-3 pt-2 sm:col-span-2">
              <button type="button" className="btn btn-ghost flex-1" onClick={() => setEditing(null)}>
                Cancelar
              </button>
              <button type="submit" className="btn btn-primary flex-1">
                Guardar
              </button>
            </div>
          </form>
        </Drawer>
      )}
      <Modal open={!!deleting} onClose={() => setDeleting(null)} title="¿Eliminar registro?">
        <p className="text-body">Esta acción no se puede deshacer y quedará registrada en la auditoría.</p>
        <div className="mt-6 flex gap-3">
          <button type="button" className="btn btn-ghost flex-1" onClick={() => setDeleting(null)}>
            Cancelar
          </button>
          <button
            type="button"
            className="btn btn-primary flex-1"
            onClick={() => {
              setDeleting(null);
              setPreview('El registro se eliminaría.');
            }}
          >
            Eliminar
          </button>
        </div>
      </Modal>
      <PreviewSubmitted open={!!preview} onClose={() => setPreview(null)} title="Acción lista" summary={<p>{preview}</p>} />
    </div>
  );
}

/** Panel lateral para formularios largos (sobre <dialog>, accesible). */
export function Drawer({open, onClose, title, children}: {open: boolean; onClose: () => void; title: string; children: ReactNode}) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="lg">
      {children}
    </Modal>
  );
}
