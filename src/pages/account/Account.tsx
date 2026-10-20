import {useQuery} from '@tanstack/react-query';
import {useState, type FormEvent, type ReactNode} from 'react';
import {Link, NavLink, useNavigate, useParams} from 'react-router-dom';
import {useAuth} from '../../auth/AuthProvider';
import {Avatar} from '../../components/ui/Avatar';
import {Credential, THEMES, exportCredential, type CredentialTheme} from '../../components/ui/Credential';
import {DemoTag, EmptyState} from '../../components/ui/Feedback';
import {Modal, PreviewSubmitted} from '../../components/ui/Modal';
import {careers, interestsCatalog, labels} from '../../content';
import {isDemoMode, myRecognitions, myRegistrations} from '../../data/api';
import {demoTeam} from '../../data/demo';
import type {Profile} from '../../data/types';
import {useSeo} from '../../hooks/useSeo';
import {dateParts, fmtDate, fmtTime, relativeDays} from '../../lib/format';

const TABS = [
  ['', 'Resumen'],
  ['perfil', 'Perfil'],
  ['credencial', 'Credencial'],
  ['inscripciones', 'Inscripciones'],
  ['equipos', 'Equipos'],
  ['reconocimientos', 'Reconocimientos'],
] as const;

export default function Account() {
  const {tab = ''} = useParams();
  const {profile, demo, signOut} = useAuth();
  const nav = useNavigate();
  useSeo({title: 'Mi cuenta', noindex: true});
  if (!profile) return null;

  const fields = [profile.full_name, profile.username, profile.university, profile.career, profile.bio, profile.interests.length, profile.skills.length, profile.avatar_url];
  const complete = Math.round((fields.filter(Boolean).length / fields.length) * 100);

  return (
    <div className="px-4 pt-28 pb-24 sm:px-6 md:px-[4vw] md:pt-32">
      {demo && (
        <p className="mb-6 rounded-2xl bg-alerta/10 px-4 py-3 text-[0.875rem] text-alerta ring-1 ring-alerta/30">
          Vista previa con un perfil ficticio. Puedes navegar y probar los formularios; nada se guarda.
        </p>
      )}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[17rem_minmax(0,1fr)] lg:gap-12">
        <aside className="min-w-0 lg:sticky lg:top-28 lg:self-start">
          <div className="rounded-[24px] bg-noche-2 p-5 ring-1 ring-blanco/10">
            <div className="flex items-center gap-4">
              <div className="relative">
                <ProgressRing value={complete} />
                <div className="absolute inset-[6px]">
                  <Avatar name={profile.full_name} size="sm" src={profile.avatar_url} />
                </div>
              </div>
              <div className="min-w-0">
                <p className="truncate font-bold text-blanco">{profile.full_name}</p>
                <p className="truncate font-mono text-[0.625rem] tracking-[0.12em] text-azul uppercase">{profile.career}</p>
                <p className="mt-1 font-mono text-[0.625rem] tracking-[0.12em] text-niebla/55 uppercase">Perfil {complete}% completo</p>
              </div>
            </div>
            <nav aria-label="Secciones de la cuenta" className="relative mt-5 -mx-1 flex gap-1 overflow-x-auto lg:flex-col">
              {TABS.map(([k, l]) => (
                <NavLink
                  key={k}
                  to={k ? `/mi-cuenta/${k}` : '/mi-cuenta'}
                  end
                  className={({isActive}) => `shrink-0 rounded-xl px-3 py-2.5 font-mono text-[0.6875rem] tracking-[0.1em] uppercase transition-colors ${isActive ? 'bg-blanco text-noche' : 'text-niebla/75 hover:bg-blanco/5 hover:text-blanco'}`}
                >
                  {l}
                </NavLink>
              ))}
            </nav>
            <button
              type="button"
              className="mt-4 w-full rounded-xl px-3 py-2.5 text-left font-mono text-[0.6875rem] tracking-[0.1em] text-rojo uppercase hover:bg-rojo/10"
              onClick={async () => {
                if (!demo) await signOut();
                nav('/');
              }}
            >
              Cerrar sesión
            </button>
          </div>
        </aside>
        <div className="min-w-0">
          {tab === '' && <Overview profile={profile} complete={complete} />}
          {tab === 'perfil' && <ProfileForm profile={profile} />}
          {tab === 'credencial' && <CredentialTab profile={profile} />}
          {tab === 'inscripciones' && <Registrations />}
          {tab === 'equipos' && <Teams />}
          {tab === 'reconocimientos' && <Recognitions />}
        </div>
      </div>
    </div>
  );
}

function ProgressRing({value}: {value: number}) {
  const C = 2 * Math.PI * 30;
  return (
    <svg viewBox="0 0 64 64" className="size-16 -rotate-90" role="img" aria-label={`Perfil ${value}% completo`}>
      <circle cx="32" cy="32" r="30" fill="none" stroke="rgb(245 247 251 / 0.1)" strokeWidth="3" />
      <circle cx="32" cy="32" r="30" fill="none" stroke="#db354a" strokeWidth="3" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - value / 100)} />
    </svg>
  );
}

function Head({eyebrow, title, action}: {eyebrow: string; title: string; action?: ReactNode}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="mt-2 font-wide text-[clamp(1.6rem,3.2vw,2.6rem)] leading-[1] text-blanco">{title}</h1>
      </div>
      {action}
    </div>
  );
}

function Overview({profile, complete}: {profile: Profile; complete: number}) {
  const regs = useQuery({queryKey: ['my-registrations'], queryFn: myRegistrations});
  const recs = useQuery({queryKey: ['my-recognitions'], queryFn: myRecognitions});
  const upcoming = (regs.data ?? []).filter((r) => r.events && new Date(r.events.starts_at).getTime() > Date.now() && r.status !== 'cancelled');
  return (
    <>
      <Head eyebrow="Mi cuenta" title={`Hola, ${profile.full_name.split(' ')[0]}.`} />
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          ['Próximos eventos', upcoming.length],
          ['Equipos', 1],
          ['Reconocimientos', recs.data?.length ?? 0],
        ].map(([l, n]) => (
          <div key={l} className="rounded-[20px] bg-noche-2 p-5 ring-1 ring-blanco/8">
            <p className="font-wide text-[2.6rem] leading-none text-blanco">{String(n).padStart(2, '0')}</p>
            <p className="mt-2 font-mono text-label text-niebla/60 uppercase">{l}</p>
          </div>
        ))}
      </div>
      {complete < 100 && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-[20px] bg-gradient-to-r from-rojo/20 to-magenta/10 p-5 ring-1 ring-rojo/30">
          <p className="text-body text-blanco">Completa tu perfil para participar en concursos con elegibilidad por universidad o carrera.</p>
          <Link to="/mi-cuenta/perfil" className="btn btn-light btn-sm">
            Completar perfil
          </Link>
        </div>
      )}
      <h2 className="mt-12 eyebrow">Tu agenda</h2>
      <ul className="mt-4 space-y-3">
        {upcoming.map((r) => {
          const d = dateParts(r.events!.starts_at);
          return (
            <li key={r.id} className="flex items-center gap-5 rounded-[20px] bg-noche-2 p-4 ring-1 ring-blanco/8">
              <div className="w-14 text-center font-wide leading-none text-blanco">
                <span className="block text-[1.8rem]">{d.day}</span>
                <span className="font-mono text-[0.625rem] text-rojo">{d.month}</span>
              </div>
              <div className="min-w-0 flex-1">
                <Link to={`/eventos/${r.events!.slug}`} className="block truncate font-bold text-blanco hover:text-azul">
                  {r.events!.title}
                </Link>
                <p className="font-mono text-[0.625rem] tracking-[0.1em] text-niebla/60 uppercase">
                  {fmtTime(r.events!.starts_at)} h · {labels.modality[r.events!.modality]} · {relativeDays(r.events!.starts_at)}
                </p>
              </div>
              <StatusChip status={r.status} />
            </li>
          );
        })}
        {regs.isSuccess && upcoming.length === 0 && <EmptyState title="Tu agenda está libre" action={<Link to="/eventos" className="btn btn-primary">Explorar eventos</Link>} />}
      </ul>
    </>
  );
}

function StatusChip({status}: {status: string}) {
  const tone = status === 'confirmed' ? 'text-ok ring-ok/40' : status === 'waitlisted' ? 'text-alerta ring-alerta/40' : 'text-gris';
  return <span className={`chip shrink-0 ${tone}`}>{labels.registration[status] ?? status}</span>;
}

function ProfileForm({profile}: {profile: Profile}) {
  const [isPublic, setPublic] = useState(profile.is_public);
  const [interests, setInterests] = useState(profile.interests);
  const [saved, setSaved] = useState(false);
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!e.currentTarget.checkValidity()) {
      e.currentTarget.reportValidity();
      return;
    }
    setSaved(true);
  };
  return (
    <>
      <Head eyebrow="Perfil" title="Tus datos" />
      <form noValidate onSubmit={submit} className="grid gap-4 rounded-[24px] bg-noche-2 p-6 ring-1 ring-blanco/8 sm:grid-cols-2 md:p-8">
        <div className="flex items-center gap-5 sm:col-span-2">
          <div className="w-20">
            <Avatar name={profile.full_name} src={profile.avatar_url} />
          </div>
          <label className="btn btn-ghost btn-sm cursor-pointer">
            Cambiar foto
            <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" />
          </label>
          <span className="text-[0.8125rem] text-niebla/55">JPG, PNG o WebP · máx. 2 MB</span>
        </div>
        <label className="block">
          <span className="label">Nombre completo</span>
          <input required defaultValue={profile.full_name} className="field" />
        </label>
        <label className="block">
          <span className="label">Usuario</span>
          <input defaultValue={profile.username ?? ''} pattern="[a-z0-9_.]{3,30}" className="field" />
        </label>
        <label className="block">
          <span className="label">Universidad</span>
          <input defaultValue={profile.university ?? ''} className="field" />
        </label>
        <label className="block">
          <span className="label">Carrera</span>
          <select defaultValue={profile.career ?? ''} className="field">
            {careers.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <label className="block sm:col-span-2">
          <span className="label">Bio</span>
          <textarea defaultValue={profile.bio ?? ''} maxLength={600} rows={3} className="field" />
        </label>
        <label className="block sm:col-span-2">
          <span className="label">Habilidades (separadas por coma)</span>
          <input defaultValue={profile.skills.join(', ')} className="field" />
        </label>
        <fieldset className="sm:col-span-2">
          <legend className="label">Intereses</legend>
          <div className="flex flex-wrap gap-2">
            {interestsCatalog.map((i) => {
              const on = interests.includes(i);
              return (
                <button key={i} type="button" aria-pressed={on} onClick={() => setInterests(on ? interests.filter((x) => x !== i) : [...interests, i])} className={`chip ${on ? 'bg-blanco text-noche ring-blanco' : 'hover:text-blanco'}`}>
                  {i}
                </button>
              );
            })}
          </div>
        </fieldset>
        <div className="flex items-start justify-between gap-6 rounded-2xl bg-blanco/[0.03] p-5 ring-1 ring-blanco/10 sm:col-span-2">
          <div>
            <p className="font-bold text-blanco">Perfil público en /comunidad</p>
            <p className="mt-1 text-[0.875rem] text-niebla/70">Mostrar nombre, carrera, bio, habilidades e intereses. Tu correo nunca se muestra.</p>
          </div>
          <button type="button" role="switch" aria-checked={isPublic} onClick={() => setPublic(!isPublic)} className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${isPublic ? 'bg-rojo' : 'bg-blanco/15'}`}>
            <span className="sr-only">Perfil público</span>
            <span className={`absolute top-1 size-5 rounded-full bg-blanco transition-transform ${isPublic ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>
        <button type="submit" className="btn btn-primary sm:col-span-2 sm:justify-self-start">
          Guardar cambios
        </button>
      </form>
      <PreviewSubmitted open={saved} onClose={() => setSaved(false)} title="Cambios listos" summary={<p>Tu perfil se actualizaría{isPublic ? ' y quedaría visible en el directorio' : ''}.</p>} />
    </>
  );
}

function CredentialTab({profile}: {profile: Profile}) {
  const [theme, setTheme] = useState<CredentialTheme>(profile.credential_theme);
  const since = new Intl.DateTimeFormat('es-PE', {month: 'short', year: 'numeric'}).format(new Date(profile.created_at)).replace('.', '');
  const data = {name: profile.full_name, career: profile.career ?? '', university: profile.university ?? '', handle: profile.username ?? '', since, theme};
  return (
    <>
      <Head eyebrow="Credencial" title="Tu credencial comunitaria" />
      <div className="grid items-center gap-10 rounded-[28px] bg-tinta p-6 ring-1 ring-blanco/10 md:grid-cols-2 md:p-10">
        <Credential data={data} />
        <div>
          <p className="text-body text-niebla/80">
            Generada con tus datos de perfil. Es una credencial de comunidad, <strong className="text-blanco">no un documento oficial de la UTP</strong>.
          </p>
          <p className="label mt-6">Color</p>
          <div className="flex gap-3">
            {(Object.keys(THEMES) as CredentialTheme[]).map((k) => (
              <button key={k} type="button" aria-pressed={theme === k} aria-label={THEMES[k].label} onClick={() => setTheme(k)} className={`size-11 rounded-full ring-2 ring-offset-2 ring-offset-tinta ${theme === k ? 'ring-blanco' : 'ring-transparent'}`} style={{background: `linear-gradient(135deg, ${THEMES[k].a}, ${THEMES[k].b})`}} />
            ))}
          </div>
          <button type="button" className="btn btn-primary mt-8" onClick={() => exportCredential(data)}>
            Descargar PNG
          </button>
        </div>
      </div>
    </>
  );
}

function Registrations() {
  const regs = useQuery({queryKey: ['my-registrations'], queryFn: myRegistrations});
  const [cancel, setCancel] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  return (
    <>
      <Head eyebrow="Inscripciones" title="Eventos y concursos" />
      <div className="relative overflow-x-auto rounded-[24px] bg-noche-2 ring-1 ring-blanco/8">
        <table className="table-dale min-w-[640px]">
          <thead>
            <tr>
              <th>Evento</th>
              <th>Fecha</th>
              <th>Estado</th>
              <th>Asistencia</th>
              <th>
                <span className="sr-only">Acciones</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {(regs.data ?? []).map((r) => {
              const past = r.events && new Date(r.events.starts_at).getTime() < Date.now();
              return (
                <tr key={r.id}>
                  <td>
                    <Link to={`/eventos/${r.events?.slug}`} className="font-semibold text-blanco hover:text-azul">
                      {r.events?.title}
                    </Link>{' '}
                    {r.events?.is_demo && <DemoTag />}
                  </td>
                  <td className="whitespace-nowrap">{r.events && fmtDate(r.events.starts_at, {month: 'short'})}</td>
                  <td>
                    <StatusChip status={r.status} />
                  </td>
                  <td>{past ? (r.attended ? 'Asististe ✓' : 'Sin registrar') : '—'}</td>
                  <td className="text-right">
                    {!past && r.status !== 'cancelled' && (
                      <button type="button" className="font-mono text-[0.6875rem] tracking-[0.1em] text-rojo uppercase hover:underline" onClick={() => setCancel(r.events?.title ?? '')}>
                        Cancelar
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <h2 className="mt-12 eyebrow">Concursos</h2>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-[20px] bg-noche-2 p-5 ring-1 ring-blanco/8">
        <div>
          <Link to={`/concursos/${demoTeam.contest.slug}`} className="font-bold text-blanco hover:text-azul">
            {demoTeam.contest.title}
          </Link>
          <p className="font-mono text-[0.625rem] tracking-[0.1em] text-niebla/60 uppercase">Equipo «{demoTeam.name}» · inscripción activa</p>
        </div>
        <Link to="/mi-cuenta/equipos" className="btn btn-ghost btn-sm">
          Gestionar equipo
        </Link>
      </div>
      <Modal open={!!cancel} onClose={() => setCancel(null)} title="¿Cancelar inscripción?">
        <p className="text-body">Liberarás tu cupo en «{cancel}». Si hay lista de espera, la siguiente persona lo recibirá.</p>
        <div className="mt-6 flex gap-3">
          <button type="button" className="btn btn-ghost flex-1" onClick={() => setCancel(null)}>
            Volver
          </button>
          <button
            type="button"
            className="btn btn-primary flex-1"
            onClick={() => {
              setCancel(null);
              setDone(true);
            }}
          >
            Sí, cancelar
          </button>
        </div>
      </Modal>
      <PreviewSubmitted open={done} onClose={() => setDone(false)} title="Cancelación" summary={<p>Tu inscripción pasaría a «Cancelada».</p>} />
    </>
  );
}

function Teams() {
  const t = demoTeam;
  const stage = t.contest.contest_stages?.find((s) => s.accepts_submissions);
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState('');
  const submit = (msg: string) => (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!e.currentTarget.checkValidity()) {
      e.currentTarget.reportValidity();
      return;
    }
    e.currentTarget.reset();
    setFileName('');
    setPreview(msg);
  };
  return (
    <>
      <Head eyebrow="Equipos" title={t.name} action={<DemoTag />} />
      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-[24px] bg-noche-2 p-6 ring-1 ring-blanco/8">
          <p className="eyebrow">Integrantes · {t.members.filter((m) => m.status === 'accepted').length}/{t.contest.max_team_size}</p>
          <p className="mt-1 text-[0.875rem] text-niebla/65">
            En <Link to={`/concursos/${t.contest.slug}`} className="text-blanco underline underline-offset-2">{t.contest.title}</Link>
          </p>
          <ul className="mt-5 space-y-3">
            {t.members.map((m, i) => (
              <li key={m.name} className="flex items-center gap-4">
                <Avatar name={m.name} index={i} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-blanco">
                    {m.name} {m.captain && <span className="ml-1 font-mono text-[0.625rem] tracking-[0.1em] text-rojo uppercase">Capitán(a)</span>}
                  </p>
                  <p className="text-[0.8125rem] text-niebla/60">{m.career}</p>
                </div>
                <span className={`chip ${m.status === 'accepted' ? 'text-ok ring-ok/40' : 'text-alerta ring-alerta/40'}`}>{m.status === 'accepted' ? 'Aceptado' : 'Invitado'}</span>
              </li>
            ))}
          </ul>
          <form noValidate onSubmit={submit('La invitación se enviaría a la cuenta con ese correo.')} className="mt-6 flex gap-2">
            <label className="sr-only" htmlFor="invite">
              Correo de la persona a invitar
            </label>
            <input id="invite" type="email" required className="field" placeholder="correo@ejemplo.com" />
            <button type="submit" className="btn btn-ghost">
              Invitar
            </button>
          </form>
        </section>

        {stage && (
          <section className="rounded-[24px] bg-noche-2 p-6 ring-1 ring-rojo/30">
            <p className="eyebrow">Entrega · {stage.name}</p>
            <p className="mt-1 text-[0.875rem] text-niebla/65">
              Cierra el {fmtDate(stage.ends_at)} a las {fmtTime(stage.ends_at)} h ({relativeDays(stage.ends_at)}). Puedes reemplazarla hasta el cierre.
            </p>
            <form noValidate onSubmit={submit('Tu entrega quedaría registrada para el jurado, con fecha y hora.')} className="mt-5 space-y-3">
              <label className="block">
                <span className="label">Título</span>
                <input required minLength={3} className="field" />
              </label>
              <label className="block">
                <span className="label">Descripción</span>
                <textarea rows={3} maxLength={4000} className="field" />
              </label>
              <label className="block">
                <span className="label">Enlace</span>
                <input type="url" className="field" placeholder="https://" />
              </label>
              <label className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border border-dashed border-blanco/20 p-6 text-center hover:border-azul/60">
                <span className="font-mono text-label text-azul uppercase">{fileName || 'Adjuntar archivo (máx. 25 MB)'}</span>
                <span className="text-[0.8125rem] text-niebla/55">PDF, ZIP o presentación</span>
                <input type="file" className="sr-only" onChange={(e) => setFileName(e.target.files?.[0]?.name ?? '')} />
              </label>
              <button type="submit" className="btn btn-primary w-full">
                Entregar
              </button>
            </form>
          </section>
        )}
      </div>
      <PreviewSubmitted open={!!preview} onClose={() => setPreview(null)} title="Acción lista" summary={<p>{preview}</p>} />
    </>
  );
}

function Recognitions() {
  const recs = useQuery({queryKey: ['my-recognitions'], queryFn: myRecognitions});
  return (
    <>
      <Head eyebrow="Reconocimientos" title="Certificados e insignias" />
      <p className="-mt-4 mb-8 max-w-2xl text-body text-niebla/70">Se emiten solo cuando se confirma tu asistencia o participación. Cada uno tiene un código público de verificación.</p>
      <ul className="grid gap-4 md:grid-cols-2">
        {(recs.data ?? []).map((r, i) => (
          <li key={r.id} className={`relative overflow-hidden rounded-[24px] p-6 ring-1 ${i % 2 ? 'bg-gradient-to-br from-azul/20 to-noche-2 ring-azul/30' : 'bg-gradient-to-br from-rojo/20 to-noche-2 ring-rojo/30'}`}>
            <svg aria-hidden="true" viewBox="0 0 100 100" className="absolute -top-6 -right-6 size-32 opacity-50">
              <circle cx="50" cy="50" r="40" fill="none" stroke="#f5f7fb" strokeWidth="2" strokeDasharray="0 7" strokeLinecap="round" />
              <circle cx="50" cy="50" r="26" fill="none" stroke="#f5f7fb" strokeWidth="1" />
            </svg>
            <p className="font-mono text-label text-azul uppercase">
              {r.kind === 'certificado' ? 'Certificado' : 'Insignia'} {isDemoMode && <DemoTag className="ml-1" />}
            </p>
            <p className="mt-3 max-w-[85%] font-wide text-[1.15rem] leading-tight text-blanco">{r.title}</p>
            <p className="mt-2 text-[0.8125rem] text-niebla/65">Emitido el {fmtDate(r.issued_at)}</p>
            <Link to={`/verificar/${r.verify_token}`} className="mt-5 inline-block font-mono text-[0.6875rem] tracking-[0.1em] text-blanco uppercase underline decoration-rojo underline-offset-4">
              Ver verificación pública →
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
