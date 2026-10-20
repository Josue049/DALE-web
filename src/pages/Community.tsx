import {useQuery} from '@tanstack/react-query';
import {useState} from 'react';
import {Link} from 'react-router-dom';
import {Avatar} from '../components/ui/Avatar';
import {Credential, THEMES, exportCredential, type CredentialTheme} from '../components/ui/Credential';
import {DemoTag, EmptyState, Loading} from '../components/ui/Feedback';
import {FilterBar, SearchInput, SelectFilter, useFilters} from '../components/ui/Filters';
import {Modal} from '../components/ui/Modal';
import {PageHeader, Section, SectionTitle} from '../components/ui/Page';
import {careers} from '../content';
import {isDemoMode, searchMembers} from '../data/api';
import type {PublicMember} from '../data/types';
import {useSeo} from '../hooks/useSeo';

export default function Community() {
  useSeo({title: 'Comunidad', description: 'Dale Network: conoce a integrantes de todas las carreras con perfil público voluntario, arma equipo y crea tu credencial comunitaria.'});
  const {values, set, reset, active} = useFilters(['q', 'career'] as const);
  const q = useQuery({queryKey: ['members', values.q, values.career], queryFn: () => searchMembers(values.q, values.career)});
  const [selected, setSelected] = useState<PublicMember | null>(null);

  return (
    <>
      <PageHeader
        eyebrow="Dale Network"
        tone="magenta"
        title={
          <>
            Tu próximo equipo <span className="text-gradient-brand">estudia otra cosa.</span>
          </>
        }
        intro="Conoce a integrantes que decidieron mostrar su perfil. Los perfiles son públicos solo si cada persona lo activa en su cuenta."
      >
        <div className="flex flex-wrap gap-3">
          <Link to="/unete" className="btn btn-primary">
            Únete a la comunidad
          </Link>
          <a href="#credencial" className="btn btn-ghost">
            Crea tu credencial
          </a>
        </div>
      </PageHeader>

      <Section className="pb-24" label="Directorio">
        <FilterBar count={q.data?.length} onReset={active ? reset : undefined}>
          <SearchInput value={values.q} onChange={(v) => set('q', v)} placeholder="Nombre, habilidad o interés" label="Buscar integrantes" />
          <SelectFilter label="Carrera" value={values.career} onChange={(v) => set('career', v)} options={careers.filter((c) => c !== 'Otra').map((c) => [c, c])} />
        </FilterBar>
        <div className="mt-10">
          {q.isLoading && <Loading label="Buscando integrantes" />}
          {q.isSuccess && q.data.length === 0 && <EmptyState title="Nadie coincide con esa búsqueda" body="Prueba con otra habilidad o carrera." />}
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {(q.data ?? []).map((m, i) => (
              <li key={m.id} data-reveal style={{transitionDelay: `${(i % 4) * 60}ms`}}>
                <button type="button" onClick={() => setSelected(m)} className="group flex h-full w-full flex-col rounded-[20px] bg-noche-2 p-5 text-left ring-1 ring-blanco/8 transition-all hover:-translate-y-1 hover:ring-magenta/50">
                  <div className="flex items-center gap-4">
                    <Avatar name={m.full_name} index={i} size="sm" src={m.avatar_url} />
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-2 font-bold text-blanco">
                        {m.full_name} {isDemoMode && <DemoTag />}
                      </p>
                      <p className="truncate font-mono text-[0.625rem] tracking-[0.12em] text-azul uppercase">{m.career}</p>
                    </div>
                  </div>
                  {m.bio && <p className="mt-4 line-clamp-2 text-[0.875rem] text-niebla/75">{m.bio}</p>}
                  <ul className="mt-auto flex flex-wrap gap-1.5 pt-4">
                    {m.skills.slice(0, 3).map((s) => (
                      <li key={s} className="chip">
                        {s}
                      </li>
                    ))}
                    {m.open_to_volunteer && <li className="chip text-ok ring-ok/40">Voluntariado</li>}
                  </ul>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </Section>

      <CredentialMaker />

      <Modal open={!!selected} onClose={() => setSelected(null)} title={selected?.full_name ?? ''}>
        {selected && (
          <div className="space-y-5">
            <div className="flex items-center gap-4">
              <Avatar name={selected.full_name} size="sm" src={selected.avatar_url} />
              <div>
                <p className="font-mono text-label text-azul uppercase">{selected.career}</p>
                <p className="text-[0.875rem] text-niebla/70">{selected.university}</p>
              </div>
            </div>
            {selected.bio && <p className="text-body">{selected.bio}</p>}
            <div>
              <p className="label">Habilidades</p>
              <ul className="flex flex-wrap gap-2">
                {selected.skills.map((s) => (
                  <li key={s} className="chip text-blanco">
                    {s}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="label">Intereses</p>
              <ul className="flex flex-wrap gap-2">
                {selected.interests.map((s) => (
                  <li key={s} className="chip">
                    {s}
                  </li>
                ))}
              </ul>
            </div>
            <p className="rounded-xl bg-blanco/5 px-4 py-3 text-[0.8125rem] text-niebla/75">Por privacidad no mostramos correos. Para contactar, invita a esta persona a tu equipo desde un concurso o encuéntrala en un evento.</p>
          </div>
        )}
      </Modal>
    </>
  );
}

function CredentialMaker() {
  const [d, setD] = useState({name: '', career: '', handle: '', theme: 'rojo' as CredentialTheme});
  const since = new Intl.DateTimeFormat('es-PE', {month: 'short', year: 'numeric'}).format(new Date()).replace('.', '');
  const data = {...d, university: 'Universidad Tecnológica del Perú', since};
  return (
    <Section className="pb-28" id="credencial" label="Credencial">
      <div className="grid items-center gap-12 rounded-[32px] bg-tinta p-6 ring-1 ring-blanco/10 md:p-14 lg:grid-cols-2">
        <div>
          <SectionTitle eyebrow="Credencial comunitaria" title="Tu carta de presentación." />
          <p className="mt-5 max-w-md text-body text-niebla/80" data-reveal>
            Personalízala y descárgala para tus redes. Es una credencial de la comunidad: <strong className="text-blanco">no es un documento oficial de la UTP</strong>. Se genera en tu navegador; no se sube a ningún servidor.
          </p>
          <form className="mt-8 grid gap-3 sm:grid-cols-2" onSubmit={(e) => e.preventDefault()} data-reveal>
            <label className="block sm:col-span-2">
              <span className="label">Nombre</span>
              <input className="field" maxLength={40} value={d.name} onChange={(e) => setD({...d, name: e.target.value})} placeholder="Tu nombre" />
            </label>
            <label className="block">
              <span className="label">Carrera</span>
              <select className="field" value={d.career} onChange={(e) => setD({...d, career: e.target.value})}>
                <option value="">Elige tu carrera</option>
                {careers.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="label">Usuario</span>
              <input className="field" maxLength={24} value={d.handle} onChange={(e) => setD({...d, handle: e.target.value.replace(/[^\w.]/g, '').toLowerCase()})} placeholder="tu.usuario" />
            </label>
            <fieldset className="sm:col-span-2">
              <legend className="label">Color</legend>
              <div className="flex gap-3">
                {(Object.keys(THEMES) as CredentialTheme[]).map((k) => (
                  <label key={k} className="cursor-pointer">
                    <input type="radio" name="theme" value={k} checked={d.theme === k} onChange={() => setD({...d, theme: k})} className="peer sr-only" />
                    <span className="block size-11 rounded-full ring-2 ring-transparent ring-offset-2 ring-offset-tinta peer-checked:ring-blanco peer-focus-visible:ring-azul" style={{background: `linear-gradient(135deg, ${THEMES[k].a}, ${THEMES[k].b})`}} />
                    <span className="sr-only">{THEMES[k].label}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <button type="button" className="btn btn-primary sm:col-span-2" onClick={() => exportCredential(data)}>
              Descargar PNG
            </button>
          </form>
        </div>
        <div data-reveal>
          <Credential data={data} />
        </div>
      </div>
    </Section>
  );
}
