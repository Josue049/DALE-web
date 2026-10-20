import {useQuery} from '@tanstack/react-query';
import {useMemo, useState, type FormEvent} from 'react';
import {ProjectCard} from '../components/ui/Cards';
import {EmptyState, ErrorState, Loading} from '../components/ui/Feedback';
import {FilterBar, SearchInput, SelectFilter, useFilters} from '../components/ui/Filters';
import {Modal, PreviewSubmitted} from '../components/ui/Modal';
import {PageHeader, Section} from '../components/ui/Page';
import {careers} from '../content';
import {listProjects} from '../data/api';
import {useSeo} from '../hooks/useSeo';

export default function Projects() {
  useSeo({title: 'Proyectos', description: 'Dale Lab: proyectos estudiantiles interdisciplinarios. Explora, súmate como colaborador o propón el tuyo.'});
  const {values, set, reset, active} = useFilters(['q', 'discipline', 'busca'] as const);
  const q = useQuery({queryKey: ['projects'], queryFn: () => listProjects()});
  const [propose, setPropose] = useState(false);
  const [sent, setSent] = useState<string | null>(null);

  const disciplines = useMemo(() => [...new Set((q.data ?? []).flatMap((p) => p.disciplines))].sort(), [q.data]);
  const wanted = useMemo(() => [...new Set((q.data ?? []).flatMap((p) => p.looking_for))].sort(), [q.data]);
  const filtered = (q.data ?? []).filter(
    (p) =>
      (!values.discipline || p.disciplines.includes(values.discipline)) &&
      (!values.busca || p.looking_for.includes(values.busca)) &&
      (!values.q || `${p.title} ${p.summary} ${p.looking_for.join(' ')}`.toLowerCase().includes(values.q.toLowerCase())),
  );

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = e.currentTarget;
    if (!f.checkValidity()) {
      f.reportValidity();
      return;
    }
    setPropose(false);
    setSent(String(new FormData(f).get('title')));
  };

  return (
    <>
      <PageHeader
        eyebrow="Dale Lab"
        tone="magenta"
        title={
          <>
            Construye con gente <span className="text-gradient-brand">que no está en tu salón.</span>
          </>
        }
        intro="Proyectos estudiantiles que mezclan carreras. Todos pasan por moderación antes de publicarse; súmate a uno o propón el tuyo."
      >
        <div className="flex flex-wrap gap-3">
          <button type="button" className="btn btn-primary" onClick={() => setPropose(true)}>
            Proponer un proyecto
          </button>
          <a href="#escaparate" className="btn btn-ghost">
            Explorar proyectos
          </a>
        </div>
      </PageHeader>

      <Section className="pb-28" id="escaparate">
        <FilterBar count={filtered.length} onReset={active ? reset : undefined}>
          <SearchInput value={values.q} onChange={(v) => set('q', v)} placeholder="Buscar proyectos" label="Buscar proyectos" />
          <SelectFilter label="Disciplina" value={values.discipline} onChange={(v) => set('discipline', v)} options={disciplines.map((d) => [d, d])} />
          <SelectFilter label="Buscan" value={values.busca} onChange={(v) => set('busca', v)} options={wanted.map((d) => [d, d])} />
        </FilterBar>
        <div className="mt-10">
          {q.isLoading && <Loading label="Cargando proyectos" />}
          {q.isError && <ErrorState error={q.error} retry={() => q.refetch()} />}
          {q.isSuccess && filtered.length === 0 && <EmptyState title="Sin proyectos con estos filtros" action={<button type="button" className="btn btn-ghost" onClick={reset}>Ver todos</button>} />}
          {/* Mosaico editorial: alterna tarjetas anchas para romper la cuadrícula. */}
          <div className="grid gap-4 md:grid-cols-6 lg:gap-5">
            {filtered.map((p, i) => (
              <div key={p.id} data-reveal style={{transitionDelay: `${(i % 3) * 80}ms`}} className={i % 5 === 0 ? 'md:col-span-4' : i % 5 === 1 ? 'md:col-span-2' : 'md:col-span-2'}>
                <ProjectCard project={p} />
              </div>
            ))}
          </div>
        </div>
      </Section>

      <Modal open={propose} onClose={() => setPropose(false)} title="Proponer un proyecto" size="lg">
        <form noValidate onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="label">Nombre del proyecto</span>
            <input name="title" required minLength={3} maxLength={160} className="field" />
          </label>
          <label className="block sm:col-span-2">
            <span className="label">Resumen (máx. 300 caracteres)</span>
            <textarea name="summary" required maxLength={300} rows={2} className="field" />
          </label>
          <label className="block sm:col-span-2">
            <span className="label">Descripción y objetivos</span>
            <textarea name="description" required rows={4} className="field" />
          </label>
          <label className="block">
            <span className="label">Carreras involucradas</span>
            <select name="discipline" required className="field" defaultValue="">
              <option value="" disabled>
                Elige una
              </option>
              {careers.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="label">¿Qué perfiles buscan?</span>
            <input name="looking" className="field" placeholder="Ej.: Diseño UX, Marketing" />
          </label>
          <label className="block sm:col-span-2">
            <span className="label">Enlace (opcional)</span>
            <input name="link" type="url" className="field" placeholder="https://" />
          </label>
          <p className="text-[0.8125rem] text-niebla/60 sm:col-span-2">La propuesta entra a una cola de moderación: el equipo puede aprobarla, rechazarla o pedir cambios.</p>
          <button type="submit" className="btn btn-primary sm:col-span-2">
            Enviar a moderación
          </button>
        </form>
      </Modal>
      <PreviewSubmitted open={!!sent} onClose={() => setSent(null)} title="Propuesta lista" summary={<p>«{sent}» quedaría en estado <strong className="text-blanco">En revisión</strong> hasta que el equipo la modere.</p>} />
    </>
  );
}
