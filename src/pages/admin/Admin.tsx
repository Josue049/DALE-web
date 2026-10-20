import {useState, type ReactNode} from 'react';
import {Link, NavLink, useNavigate, useParams} from 'react-router-dom';
import {useAuth} from '../../auth/AuthProvider';
import {DemoTag} from '../../components/ui/Feedback';
import {Modal, PreviewSubmitted} from '../../components/ui/Modal';
import {heroDefaults, labels, lines, manifestoDefaults} from '../../content';
import {contestState} from '../../data/api';
import {demoApplications, demoAssignments, demoAudit, demoContests, demoEvents, demoJudges, demoMembers, demoOpportunities, demoOrg, demoProjects, demoStats, demoUsers} from '../../data/demo';
import type {Project} from '../../data/types';
import {useSeo} from '../../hooks/useSeo';
import {fmtDate, fmtTime, relativeDays} from '../../lib/format';
import {BarList, ColumnChart} from './Charts';
import {DataTable, type FieldDef} from './DataTable';

const SECTIONS: [string, string, string][] = [
  ['', 'Resumen', 'General'],
  ['contenido', 'Contenido / Home', 'General'],
  ['estadisticas', 'Estadísticas', 'General'],
  ['eventos', 'Eventos', 'Dale Talks'],
  ['inscripciones', 'Inscripciones', 'Dale Talks'],
  ['concursos', 'Concursos', 'Dale Challenge'],
  ['equipos', 'Equipos', 'Dale Challenge'],
  ['entregas', 'Entregas', 'Dale Challenge'],
  ['jurados', 'Jurados', 'Dale Challenge'],
  ['proyectos', 'Proyectos', 'Dale Lab'],
  ['oportunidades', 'Oportunidades', 'Dale Future'],
  ['usuarios', 'Usuarios', 'Comunidad'],
  ['solicitudes', 'Solicitudes', 'Comunidad'],
  ['equipo', 'Equipo organizador', 'Institucional'],
  ['aliados', 'Aliados', 'Institucional'],
  ['multimedia', 'Multimedia', 'Institucional'],
];

export default function Admin() {
  const {section = ''} = useParams();
  const {demo} = useAuth();
  const nav = useNavigate();
  useSeo({title: 'Panel de administración', noindex: true});
  const current = SECTIONS.find(([k]) => k === section) ?? SECTIONS[0];
  const groups = [...new Set(SECTIONS.map((s) => s[2]))];

  return (
    <div className="px-4 pt-28 pb-24 sm:px-6 md:px-[3vw] md:pt-32">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[15rem_minmax(0,1fr)]">
        <aside className="min-w-0 lg:sticky lg:top-28 lg:max-h-[calc(100svh-8rem)] lg:self-start lg:overflow-y-auto">
          <p className="font-wide text-[1.05rem] text-blanco">Panel</p>
          <p className="font-mono text-[0.625rem] tracking-[0.12em] text-niebla/55 uppercase">{demo ? 'Vista previa · solo lectura' : 'Administración'}</p>
          {/* Móvil: selector; escritorio: navegación agrupada. */}
          <label htmlFor="admin-nav" className="sr-only">
            Sección del panel
          </label>
          <select id="admin-nav" value={section} onChange={(e) => nav(e.target.value ? `/admin/${e.target.value}` : '/admin')} className="field mt-4 lg:hidden">
            {SECTIONS.map(([k, l, g]) => (
              <option key={k} value={k}>
                {g} · {l}
              </option>
            ))}
          </select>
          <nav aria-label="Secciones del panel" className="mt-6 hidden space-y-5 lg:block">
            {groups.map((g) => (
              <div key={g}>
                <p className="mb-1.5 font-mono text-[0.5625rem] tracking-[0.16em] text-gris uppercase">{g}</p>
                <ul>
                  {SECTIONS.filter((s) => s[2] === g).map(([k, l]) => (
                    <li key={k}>
                      <NavLink
                        end
                        to={k ? `/admin/${k}` : '/admin'}
                        className={({isActive}) => `block rounded-lg px-3 py-2 text-[0.875rem] transition-colors ${isActive ? 'bg-blanco font-semibold text-noche' : 'text-niebla/80 hover:bg-blanco/5 hover:text-blanco'}`}
                      >
                        {l}
                      </NavLink>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </aside>

        <div className="min-w-0">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-blanco/10 pb-6">
            <div>
              <p className="eyebrow">{current[2]}</p>
              <h1 className="mt-2 font-wide text-[clamp(1.6rem,3vw,2.5rem)] leading-[1] text-blanco">{current[1]}</h1>
            </div>
            {demo && <p className="rounded-full bg-alerta/10 px-4 py-2 font-mono text-[0.6875rem] tracking-[0.08em] text-alerta ring-1 ring-alerta/30">Datos demo · los cambios no se guardan</p>}
          </div>
          <SectionBody section={current[0]} />
        </div>
      </div>
    </div>
  );
}

function SectionBody({section}: {section: string}) {
  switch (section) {
    case 'contenido':
      return <ContentEditor />;
    case 'estadisticas':
      return <Stats />;
    case 'eventos':
      return <EventsAdmin />;
    case 'inscripciones':
      return <RegistrationsAdmin />;
    case 'concursos':
      return <ContestsAdmin />;
    case 'equipos':
      return <TeamsAdmin />;
    case 'entregas':
      return <SubmissionsAdmin />;
    case 'jurados':
      return <JudgesAdmin />;
    case 'proyectos':
      return <ProjectsAdmin />;
    case 'oportunidades':
      return <OpportunitiesAdmin />;
    case 'usuarios':
      return <UsersAdmin />;
    case 'solicitudes':
      return <ApplicationsAdmin />;
    case 'equipo':
      return <OrgAdmin />;
    case 'aliados':
      return <PartnersAdmin />;
    case 'multimedia':
      return <MediaAdmin />;
    default:
      return <Overview />;
  }
}

const Chip = ({children, tone = ''}: {children: ReactNode; tone?: string}) => <span className={`chip ${tone}`}>{children}</span>;
const statusTone = (s: string) => (['published', 'approved', 'confirmed', 'accepted', 'open'].includes(s) ? 'text-ok ring-ok/40' : ['draft', 'pending', 'new', 'waitlisted', 'invited', 'upcoming'].includes(s) ? 'text-alerta ring-alerta/40' : 'text-gris');
const STATUS: Record<string, string> = {published: 'Publicado', draft: 'Borrador', cancelled: 'Cancelado', archived: 'Archivado', closed: 'Cerrado', ...labels.moderation};

function Kpi({label, value, hint, to}: {label: string; value: number | string; hint?: string; to?: string}) {
  const body = (
    <>
      <p className="font-mono text-[0.625rem] tracking-[0.14em] text-niebla/60 uppercase">{label}</p>
      <p className="mt-2 font-wide text-[2.2rem] leading-none text-blanco tabular-nums">{value}</p>
      {hint && <p className="mt-2 text-[0.75rem] text-niebla/55">{hint}</p>}
    </>
  );
  const cls = 'block rounded-[20px] bg-noche-2 p-5 ring-1 ring-blanco/8 transition-all hover:ring-blanco/25';
  return to ? (
    <Link to={to} className={cls}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

function Overview() {
  const s = demoStats;
  const tasks = [
    {n: s.projects_pending, label: 'proyectos esperan moderación', to: '/admin/proyectos'},
    {n: s.applications_new, label: 'solicitudes de membresía nuevas', to: '/admin/solicitudes'},
    {n: demoAssignments.filter((a) => a.scored < 4).length, label: 'entregas sin evaluar por completo', to: '/admin/entregas'},
    {n: s.messages_open, label: 'mensajes de contacto sin atender', to: '/admin/solicitudes'},
  ];
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Kpi label="Miembros" value={s.members} hint={`${s.public_members} con perfil público`} to="/admin/usuarios" />
        <Kpi label="Inscripciones a eventos" value={s.registrations} hint={`${s.events_upcoming} eventos próximos`} to="/admin/inscripciones" />
        <Kpi label="Participaciones en concursos" value={s.entries} hint={`${s.submissions} entregas`} to="/admin/entregas" />
        <Kpi label="Oportunidades activas" value={s.opportunities_active} to="/admin/oportunidades" />
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <ColumnChart title="Inscripciones por mes (últimos 6 meses)" data={s.registrations_by_month.map((m) => ({label: m.month, value: m.count}))} />
        <div className="rounded-[20px] bg-noche-2 p-5 ring-1 ring-blanco/8">
          <p className="font-bold text-blanco">Pendientes</p>
          <ul className="mt-4 space-y-2">
            {tasks.map((t) => (
              <li key={t.label}>
                <Link to={t.to} className="flex items-center gap-4 rounded-xl p-3 transition-colors hover:bg-blanco/5">
                  <span className={`grid size-10 shrink-0 place-items-center rounded-full font-wide text-[0.95rem] ${t.n ? 'bg-rojo text-blanco' : 'bg-blanco/8 text-niebla'}`}>{t.n}</span>
                  <span className="text-[0.9rem] text-niebla/85">{t.label}</span>
                  <span aria-hidden="true" className="ml-auto text-niebla/40">
                    →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="rounded-[20px] bg-noche-2 p-5 ring-1 ring-blanco/8">
        <p className="font-bold text-blanco">Actividad reciente (auditoría)</p>
        <ul className="mt-4 divide-y divide-blanco/8">
          {demoAudit.map((a) => (
            <li key={a.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3 text-[0.875rem]">
              <Chip tone={a.action === 'insert' ? 'text-ok ring-ok/40' : a.action === 'moderate' ? 'text-azul ring-azul/40' : ''}>{{insert: 'Alta', update: 'Edición', moderate: 'Moderación'}[a.action] ?? a.action}</Chip>
              <span className="font-mono text-[0.6875rem] text-niebla/55">{a.entity}</span>
              <span className="text-blanco">{a.title}</span>
              <span className="ml-auto font-mono text-[0.6875rem] text-niebla/50">
                {fmtDate(a.when, {month: 'short', year: undefined})} · {fmtTime(a.when)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Stats() {
  const s = demoStats;
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <ColumnChart title="Inscripciones por mes" data={s.registrations_by_month.map((m) => ({label: m.month, value: m.count}))} />
      <BarList title="Miembros por carrera" data={s.members_by_career.map((m) => ({label: m.career, value: m.count}))} />
      <BarList title="Eventos con más inscripciones" data={s.top_events.map((e) => ({label: e.title, value: e.count}))} />
      <div className="grid grid-cols-2 gap-3 self-start">
        <Kpi label="Solicitudes totales" value={s.applications} />
        <Kpi label="Proyectos publicados" value={s.projects_approved} />
        <Kpi label="Concursos publicados" value={s.contests_published} />
        <Kpi label="Eventos publicados" value={s.events_published} />
      </div>
    </div>
  );
}

function ContentEditor() {
  const [hero, setHero] = useState({...heroDefaults});
  const [manifesto, setManifesto] = useState({...manifestoDefaults});
  const [names, setNames] = useState(Object.fromEntries(lines.map((l) => [l.key, l.name])));
  const [saved, setSaved] = useState(false);
  const input = (label: string, value: string, onChange: (v: string) => void, area = false) => (
    <label className="block">
      <span className="label">{label}</span>
      {area ? <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={3} className="field" /> : <input value={value} onChange={(e) => onChange(e.target.value)} className="field" />}
    </label>
  );
  return (
    <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_26rem]">
      <form
        className="space-y-8"
        onSubmit={(e) => {
          e.preventDefault();
          setSaved(true);
        }}
      >
        <fieldset className="space-y-4 rounded-[20px] bg-noche-2 p-6 ring-1 ring-blanco/8">
          <legend className="px-2 font-bold text-blanco">Portada (escena de seis capas)</legend>
          <p className="text-[0.8125rem] text-niebla/60">Solo se editan los textos: la estructura y la animación de la escena no cambian.</p>
          {input('Kicker', hero.kicker, (v) => setHero({...hero, kicker: v}))}
          <div className="grid gap-4 sm:grid-cols-2">
            {input('Titular 1', hero.line1, (v) => setHero({...hero, line1: v}))}
            {input('Titular 2', hero.line2, (v) => setHero({...hero, line2: v}))}
          </div>
          {input('Lema', hero.tagline, (v) => setHero({...hero, tagline: v}))}
          <div className="grid gap-4 sm:grid-cols-2">
            {input('Botón principal', hero.primaryCta, (v) => setHero({...hero, primaryCta: v}))}
            {input('Botón secundario', hero.secondaryCta, (v) => setHero({...hero, secondaryCta: v}))}
          </div>
        </fieldset>
        <fieldset className="space-y-4 rounded-[20px] bg-noche-2 p-6 ring-1 ring-blanco/8">
          <legend className="px-2 font-bold text-blanco">Manifiesto</legend>
          {input('Titular', manifesto.heading, (v) => setManifesto({...manifesto, heading: v}), true)}
          {input('Texto', manifesto.body, (v) => setManifesto({...manifesto, body: v}), true)}
        </fieldset>
        <fieldset className="grid gap-4 rounded-[20px] bg-noche-2 p-6 ring-1 ring-blanco/8 sm:grid-cols-2">
          <legend className="px-2 font-bold text-blanco">Nombres de las líneas</legend>
          {lines.map((l) => (
            <div key={l.key}>{input(l.title, names[l.key], (v) => setNames({...names, [l.key]: v}))}</div>
          ))}
        </fieldset>
        <button type="submit" className="btn btn-primary">
          Publicar cambios
        </button>
      </form>
      <div className="xl:sticky xl:top-28 xl:self-start">
        <p className="label">Vista previa en vivo</p>
        <div className="relative aspect-[4/5] overflow-hidden rounded-[24px] bg-[radial-gradient(60%_55%_at_50%_48%,#1f2a5a,#0b1127)] p-6 ring-1 ring-blanco/10">
          <svg aria-hidden="true" viewBox="-200 -200 400 400" className="absolute top-1/2 left-1/2 w-[160%] -translate-x-1/2 -translate-y-1/2 opacity-60">
            {[60, 80, 104, 132].map((r, i) => (
              <circle key={r} r={r} fill="none" stroke={i % 2 ? '#af286c' : '#db354a'} strokeWidth="2" strokeDasharray={`0 ${9 + i}`} strokeLinecap="round" />
            ))}
          </svg>
          <div className="relative flex h-full flex-col justify-between text-center">
            <p className="font-mono text-[0.5625rem] tracking-[0.16em] text-niebla/80 uppercase">{hero.kicker}</p>
            <div>
              <p className="font-wide text-[1.6rem] leading-[0.95] text-blanco">{hero.line1}</p>
              <p className="mt-3 font-wide text-[1.1rem] leading-[1] text-blanco/80">{hero.line2}</p>
            </div>
            <div>
              <p className="font-wide text-[0.7rem] text-blanco">{hero.tagline}</p>
              <div className="mt-3 flex justify-center gap-2">
                <span className="rounded-full bg-rojo px-3 py-1.5 font-mono text-[0.5rem] tracking-[0.1em] text-blanco uppercase">{hero.primaryCta}</span>
                <span className="rounded-full px-3 py-1.5 font-mono text-[0.5rem] tracking-[0.1em] text-blanco uppercase ring-1 ring-blanco/30">{hero.secondaryCta}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <PreviewSubmitted open={saved} onClose={() => setSaved(false)} title="Cambios de portada" summary={<p>Los nuevos textos se publicarían en la portada sin alterar la escena.</p>} />
    </div>
  );
}

const eventFields: FieldDef[] = [
  {name: 'title', label: 'Título', required: true, full: true},
  {name: 'slug', label: 'Slug (URL)', required: true},
  {name: 'kind', label: 'Tipo', type: 'select', options: Object.entries(labels.eventKind)},
  {name: 'summary', label: 'Resumen', type: 'textarea', required: true},
  {name: 'description', label: 'Descripción', type: 'textarea'},
  {name: 'modality', label: 'Modalidad', type: 'select', options: Object.entries(labels.modality)},
  {name: 'eligibility', label: 'Elegibilidad', type: 'select', options: Object.entries(labels.eligibility)},
  {name: 'starts_at', label: 'Inicio (hora de Lima)', type: 'datetime-local', required: true},
  {name: 'ends_at', label: 'Fin (hora de Lima)', type: 'datetime-local'},
  {name: 'capacity', label: 'Cupos', type: 'number'},
  {name: 'venue', label: 'Sede'},
  {name: 'status', label: 'Estado', type: 'select', options: [['draft', 'Borrador'], ['published', 'Publicado'], ['cancelled', 'Cancelado']]},
  {name: 'waitlist_enabled', label: 'Lista de espera', type: 'checkbox'},
  {name: 'allow_guests', label: 'Permitir invitados sin cuenta', type: 'checkbox'},
];

function EventsAdmin() {
  return (
    <DataTable
      title="Eventos"
      csvName="eventos"
      createLabel="Nuevo evento"
      rows={demoEvents}
      searchKeys={['title', 'slug']}
      fields={eventFields}
      columns={[
        {key: 'title', label: 'Evento', render: (e) => <Link to={`/eventos/${e.slug}`} className="font-semibold text-blanco hover:text-azul">{e.title}</Link>},
        {key: 'starts_at', label: 'Fecha', value: (e) => e.starts_at, render: (e) => <span className="whitespace-nowrap">{fmtDate(e.starts_at, {month: 'short'})}</span>},
        {key: 'modality', label: 'Modalidad', render: (e) => labels.modality[e.modality]},
        {key: 'capacity', label: 'Cupos', value: (e) => e.capacity ?? 0, render: (e) => e.capacity ?? '∞'},
        {key: 'status', label: 'Estado', render: (e) => <Chip tone={statusTone(e.status)}>{new Date(e.starts_at) < new Date() ? 'Realizado' : STATUS[e.status]}</Chip>},
      ]}
    />
  );
}

const fakeRegs = demoEvents.slice(0, 4).flatMap((e, i) =>
  demoMembers.slice(i, i + 5).map((m, k) => ({id: `${e.id}-${m.id}`, event: e.title, name: m.full_name, career: m.career ?? '', status: k === 4 && e.waitlist_enabled ? 'waitlisted' : 'confirmed', attended: false, date: e.starts_at})),
);

function RegistrationsAdmin() {
  const [event, setEvent] = useState('');
  const [att, setAtt] = useState<Record<string, boolean>>({});
  const [cert, setCert] = useState(false);
  const rows = fakeRegs.filter((r) => !event || r.event === event);
  return (
    <>
      <DataTable
        title="Inscripciones"
        csvName="inscripciones"
        rows={rows}
        searchKeys={['name', 'event', 'career']}
        filters={
          <select value={event} onChange={(e) => setEvent(e.target.value)} className="field w-auto rounded-full py-2.5" aria-label="Filtrar por evento">
            <option value="">Todos los eventos</option>
            {[...new Set(fakeRegs.map((r) => r.event))].map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        }
        columns={[
          {key: 'name', label: 'Persona', render: (r) => <span className="font-semibold text-blanco">{r.name}</span>},
          {key: 'career', label: 'Carrera'},
          {key: 'event', label: 'Evento'},
          {key: 'status', label: 'Estado', render: (r) => <Chip tone={statusTone(r.status)}>{labels.registration[r.status]}</Chip>},
          {
            key: 'attended',
            label: 'Asistencia',
            value: (r) => (att[r.id] ? 'Sí' : 'No'),
            render: (r) => (
              <label className="inline-flex cursor-pointer items-center gap-2">
                <input type="checkbox" checked={!!att[r.id]} onChange={(e) => setAtt({...att, [r.id]: e.target.checked})} className="size-4 accent-rojo" />
                <span className="sr-only">Marcar asistencia de {r.name}</span>
                {att[r.id] ? 'Asistió' : '—'}
              </label>
            ),
          },
        ]}
      />
      <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-[20px] bg-noche-2 p-5 ring-1 ring-blanco/8">
        <p className="text-[0.9rem] text-niebla/80">Los certificados se emiten solo para asistencia marcada ({Object.values(att).filter(Boolean).length} seleccionada/s).</p>
        <button type="button" className="btn btn-light btn-sm" disabled={!Object.values(att).some(Boolean)} onClick={() => setCert(true)}>
          Emitir certificados
        </button>
      </div>
      <PreviewSubmitted open={cert} onClose={() => setCert(false)} title="Certificados" summary={<p>Se emitirían {Object.values(att).filter(Boolean).length} certificado(s) con código de verificación.</p>} />
    </>
  );
}

function ContestsAdmin() {
  const [results, setResults] = useState(false);
  return (
    <>
      <DataTable
        title="Concursos"
        csvName="concursos"
        createLabel="Nuevo concurso"
        rows={demoContests}
        searchKeys={['title', 'slug']}
        fields={[
          {name: 'title', label: 'Título', required: true, full: true},
          {name: 'slug', label: 'Slug', required: true},
          {name: 'participation_mode', label: 'Participación', type: 'select', options: Object.entries(labels.participation)},
          {name: 'summary', label: 'Resumen', type: 'textarea', required: true},
          {name: 'rules', label: 'Bases', type: 'textarea'},
          {name: 'min_team_size', label: 'Mín. integrantes', type: 'number'},
          {name: 'max_team_size', label: 'Máx. integrantes', type: 'number'},
          {name: 'eligibility', label: 'Elegibilidad', type: 'select', options: Object.entries(labels.eligibility)},
          {name: 'registration_closes_at', label: 'Cierre de inscripción', type: 'datetime-local'},
          {name: 'judges_public', label: 'Publicar jurado', type: 'checkbox'},
        ]}
        extraActions={(c) => (
          <button type="button" onClick={() => setResults(true)} className="font-mono text-[0.6875rem] tracking-[0.1em] text-blanco uppercase hover:text-azul" disabled={c.results_published}>
            {c.results_published ? 'Publicado' : 'Resultados'}
          </button>
        )}
        columns={[
          {key: 'title', label: 'Concurso', render: (c) => <Link to={`/concursos/${c.slug}`} className="font-semibold text-blanco hover:text-azul">{c.title}</Link>},
          {key: 'participation_mode', label: 'Formato', render: (c) => labels.participation[c.participation_mode]},
          {key: 'state', label: 'Estado', value: (c) => contestState(c), render: (c) => <Chip tone={statusTone(contestState(c))}>{contestState(c)}</Chip>},
          {key: 'registration_closes_at', label: 'Cierre', value: (c) => c.registration_closes_at ?? '', render: (c) => (c.registration_closes_at ? relativeDays(c.registration_closes_at) : '—')},
        ]}
      />
      <Modal open={results} onClose={() => setResults(false)} title="Calcular y publicar resultados">
        <ol className="space-y-3 text-body">
          <li>1. Se calcula el promedio ponderado (0–100) de todos los jurados por entrega.</li>
          <li>2. Puedes revisar el ranking y asignar premios.</li>
          <li>3. Al publicar, los resultados son públicos y la evaluación se cierra.</li>
        </ol>
        <button type="button" className="btn btn-primary mt-6 w-full" onClick={() => setResults(false)}>
          Entendido (vista previa)
        </button>
      </Modal>
    </>
  );
}

function TeamsAdmin() {
  const rows = [
    {id: 't1', name: 'Las Integrales', contest: demoContests[0].title, members: 2, invited: 1, created: demoContests[0].created_at},
    {id: 't2', name: 'Equipo Norte', contest: demoContests[0].title, members: 4, invited: 0, created: demoContests[0].created_at},
    {id: 't3', name: 'Colectivo 4C', contest: demoContests[0].title, members: 3, invited: 1, created: demoContests[0].created_at},
  ];
  return (
    <DataTable
      title="Equipos"
      csvName="equipos"
      rows={rows}
      searchKeys={['name', 'contest']}
      columns={[
        {key: 'name', label: 'Equipo', render: (r) => <span className="font-semibold text-blanco">{r.name}</span>},
        {key: 'contest', label: 'Concurso'},
        {key: 'members', label: 'Aceptados'},
        {key: 'invited', label: 'Invitaciones pendientes'},
      ]}
    />
  );
}

function SubmissionsAdmin() {
  return (
    <DataTable
      title="Entregas"
      csvName="entregas"
      rows={demoAssignments.map((a) => ({id: a.id, title: a.title, team: a.team, stage: a.stage, contest: a.contest.title, submitted_at: a.submitted_at, scored: a.scored}))}
      searchKeys={['title', 'team']}
      columns={[
        {key: 'title', label: 'Entrega', render: (r) => <span className="font-semibold text-blanco">{r.title}</span>},
        {key: 'team', label: 'Equipo'},
        {key: 'stage', label: 'Etapa'},
        {key: 'submitted_at', label: 'Fecha', render: (r) => `${fmtDate(r.submitted_at, {month: 'short', year: undefined})} · ${fmtTime(r.submitted_at)}`},
        {key: 'scored', label: 'Criterios evaluados', render: (r) => <Chip tone={r.scored >= 4 ? 'text-ok ring-ok/40' : 'text-alerta ring-alerta/40'}>{r.scored}/4</Chip>},
      ]}
    />
  );
}

function JudgesAdmin() {
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);
  const rows = Object.values(demoJudges).flat().map((j) => ({id: j.user_id, name: j.display_name, bio: j.bio ?? '', contest: demoContests.find((c) => c.id === j.contest_id)?.title ?? ''}));
  return (
    <>
      <div className="mb-5 flex justify-end">
        <button type="button" className="btn btn-primary btn-sm" onClick={() => setOpen(true)}>
          + Asignar jurado
        </button>
      </div>
      <DataTable
        title="Jurados"
        csvName="jurados"
        rows={rows}
        searchKeys={['name', 'contest']}
        columns={[
          {key: 'name', label: 'Jurado', render: (r) => <span className="font-semibold text-blanco">{r.name}</span>},
          {key: 'bio', label: 'Perfil'},
          {key: 'contest', label: 'Concurso'},
        ]}
      />
      <Modal open={open} onClose={() => setOpen(false)} title="Asignar jurado">
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!e.currentTarget.checkValidity()) return e.currentTarget.reportValidity();
            setOpen(false);
            setDone(true);
          }}
        >
          <label className="block">
            <span className="label">Concurso</span>
            <select className="field">
              {demoContests.map((c) => (
                <option key={c.id}>{c.title}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="label">Correo de la cuenta</span>
            <input type="email" required className="field" />
          </label>
          <label className="block">
            <span className="label">Nombre público</span>
            <input required className="field" />
          </label>
          <button type="submit" className="btn btn-primary w-full">
            Asignar
          </button>
        </form>
      </Modal>
      <PreviewSubmitted open={done} onClose={() => setDone(false)} title="Jurado asignado" summary={<p>La persona recibiría el rol de jurado y solo vería las entregas de ese concurso.</p>} />
    </>
  );
}

const pendingProjects: Project[] = [
  {...demoProjects[0], id: 'pp1', slug: 'app-de-tutorias', title: 'App de tutorías entre ciclos', summary: 'Estudiantes de ciclos altos enseñan a los de primeros ciclos.', status: 'pending'},
  {...demoProjects[1], id: 'pp2', slug: 'revista-digital', title: 'Revista digital estudiantil', summary: 'Publicación trimestral con artículos de todas las carreras.', status: 'pending'},
  {...demoProjects[2], id: 'pp3', slug: 'reciclaje-campus', title: 'Reciclaje inteligente en campus', summary: 'Puntos de reciclaje con seguimiento por QR.', status: 'changes_requested', moderation_note: 'Agrega objetivos medibles.'},
];

function ProjectsAdmin() {
  const [action, setAction] = useState<{p: Project; a: string} | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const queue = pendingProjects;
  return (
    <>
      <p className="eyebrow">Cola de moderación · {queue.length}</p>
      <ul className="mt-4 grid gap-4 lg:grid-cols-3">
        {queue.map((p) => (
          <li key={p.id} className="flex flex-col rounded-[20px] bg-noche-2 p-5 ring-1 ring-blanco/8">
            <div className="flex items-center gap-2">
              <Chip tone={statusTone(p.status)}>{labels.moderation[p.status]}</Chip>
              <DemoTag />
            </div>
            <p className="mt-3 font-bold text-blanco">{p.title}</p>
            <p className="mt-1 text-[0.875rem] text-niebla/70">{p.summary}</p>
            {p.moderation_note && <p className="mt-3 rounded-lg bg-alerta/10 px-3 py-2 text-[0.8125rem] text-alerta">Nota: {p.moderation_note}</p>}
            <div className="mt-auto flex flex-wrap gap-2 pt-5">
              <button type="button" className="btn btn-primary btn-sm" onClick={() => setAction({p, a: 'Aprobar'})}>
                Aprobar
              </button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setAction({p, a: 'Pedir cambios'})}>
                Pedir cambios
              </button>
              <button type="button" className="btn btn-ghost btn-sm text-rojo" onClick={() => setAction({p, a: 'Rechazar'})}>
                Rechazar
              </button>
            </div>
          </li>
        ))}
      </ul>
      <h2 className="mt-12 mb-4 eyebrow">Publicados</h2>
      <DataTable
        title="Proyectos"
        csvName="proyectos"
        rows={demoProjects}
        searchKeys={['title']}
        columns={[
          {key: 'title', label: 'Proyecto', render: (p) => <Link to={`/proyectos/${p.slug}`} className="font-semibold text-blanco hover:text-azul">{p.title}</Link>},
          {key: 'disciplines', label: 'Disciplinas', value: (p) => p.disciplines.join(', '), render: (p) => p.disciplines.slice(0, 2).join(', ')},
          {key: 'status', label: 'Estado', render: (p) => <Chip tone={statusTone(p.status)}>{labels.moderation[p.status]}</Chip>},
        ]}
      />
      <Modal open={!!action} onClose={() => setAction(null)} title={`${action?.a ?? ''} · ${action?.p.title ?? ''}`}>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            setDone(action?.a ?? '');
            setAction(null);
          }}
        >
          <label className="block">
            <span className="label">Nota para el equipo {action?.a === 'Aprobar' ? '(opcional)' : ''}</span>
            <textarea rows={3} required={action?.a !== 'Aprobar'} className="field" />
          </label>
          <button type="submit" className="btn btn-primary w-full">
            Confirmar
          </button>
        </form>
      </Modal>
      <PreviewSubmitted open={!!done} onClose={() => setDone(null)} title="Moderación" summary={<p>La acción «{done}» quedaría registrada y el equipo recibiría tu nota.</p>} />
    </>
  );
}

function OpportunitiesAdmin() {
  return (
    <DataTable
      title="Oportunidades"
      csvName="oportunidades"
      createLabel="Nueva oportunidad"
      rows={demoOpportunities}
      searchKeys={['title', 'organization']}
      fields={[
        {name: 'title', label: 'Título', required: true, full: true},
        {name: 'slug', label: 'Slug', required: true},
        {name: 'category', label: 'Categoría', type: 'select', options: Object.entries(labels.opportunity)},
        {name: 'organization', label: 'Organización'},
        {name: 'deadline', label: 'Fecha límite', type: 'datetime-local'},
        {name: 'summary', label: 'Resumen', type: 'textarea', required: true},
        {name: 'requirements', label: 'Requisitos', type: 'textarea'},
        {name: 'apply_url', label: 'Enlace de postulación', type: 'url', full: true},
      ]}
      columns={[
        {key: 'title', label: 'Oportunidad', render: (o) => <Link to={`/oportunidades/${o.slug}`} className="font-semibold text-blanco hover:text-azul">{o.title}</Link>},
        {key: 'category', label: 'Categoría', render: (o) => labels.opportunity[o.category]},
        {key: 'deadline', label: 'Vence', value: (o) => o.deadline ?? '', render: (o) => (o.deadline ? relativeDays(o.deadline) : 'Sin fecha')},
        {key: 'state', label: 'Vigencia', value: (o) => (o.deadline && new Date(o.deadline) < new Date() ? 'Caducada' : 'Activa'), render: (o) => (o.deadline && new Date(o.deadline) < new Date() ? <Chip>Caducada</Chip> : <Chip tone="text-ok ring-ok/40">Activa</Chip>)},
      ]}
    />
  );
}

function UsersAdmin() {
  const [editing, setEditing] = useState<(typeof demoUsers)[number] | null>(null);
  const [done, setDone] = useState(false);
  return (
    <>
      <DataTable
        title="Usuarios"
        csvName="usuarios"
        rows={demoUsers}
        searchKeys={['full_name', 'email', 'career']}
        extraActions={(u) => (
          <button type="button" onClick={() => setEditing(u)} className="font-mono text-[0.6875rem] tracking-[0.1em] text-azul uppercase hover:text-blanco">
            Roles
          </button>
        )}
        columns={[
          {key: 'full_name', label: 'Nombre', render: (u) => <span className="font-semibold text-blanco">{u.full_name}</span>},
          {key: 'email', label: 'Correo'},
          {key: 'career', label: 'Carrera'},
          {key: 'roles', label: 'Roles', value: (u) => u.roles.join(', '), render: (u) => <span className="flex flex-wrap gap-1">{u.roles.map((r) => <Chip key={r} tone={r === 'admin' ? 'text-rojo ring-rojo/40' : r === 'member' ? '' : 'text-azul ring-azul/40'}>{labels.role[r]}</Chip>)}</span>},
          {key: 'created_at', label: 'Alta', render: (u) => fmtDate(u.created_at, {month: 'short'})},
        ]}
      />
      <Modal open={!!editing} onClose={() => setEditing(null)} title={`Roles · ${editing?.full_name ?? ''}`}>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            setEditing(null);
            setDone(true);
          }}
        >
          {(['member', 'organizer', 'judge', 'admin'] as const).map((r) => (
            <label key={r} className="flex items-center justify-between rounded-xl bg-blanco/[0.03] px-4 py-3 ring-1 ring-blanco/8">
              <span>
                <span className="font-semibold text-blanco">{labels.role[r]}</span>
                <span className="block text-[0.75rem] text-niebla/60">{{member: 'Permanente: todo registro es miembro', organizer: 'Gestiona lo que crea', judge: 'Evalúa concursos asignados', admin: 'Acceso total'}[r]}</span>
              </span>
              <input type="checkbox" defaultChecked={editing?.roles.includes(r)} disabled={r === 'member'} className="size-4 accent-rojo" />
            </label>
          ))}
          <button type="submit" className="btn btn-primary w-full">
            Guardar roles
          </button>
        </form>
      </Modal>
      <PreviewSubmitted open={done} onClose={() => setDone(false)} title="Roles" summary={<p>Los roles se actualizarían y el cambio quedaría auditado.</p>} />
    </>
  );
}

function ApplicationsAdmin() {
  return (
    <DataTable
      title="Solicitudes de membresía"
      csvName="solicitudes"
      rows={demoApplications}
      searchKeys={['full_name', 'email', 'career']}
      columns={[
        {key: 'full_name', label: 'Nombre', render: (a) => <span className="font-semibold text-blanco">{a.full_name}</span>},
        {key: 'email', label: 'Correo'},
        {key: 'university', label: 'Universidad'},
        {key: 'career', label: 'Carrera'},
        {key: 'status', label: 'Estado', render: (a) => <Chip tone={statusTone(a.status)}>{{new: 'Nueva', contacted: 'Contactada', accepted: 'Aceptada'}[a.status] ?? a.status}</Chip>},
        {key: 'created_at', label: 'Fecha', render: (a) => relativeDays(a.created_at)},
      ]}
    />
  );
}

function OrgAdmin() {
  return (
    <DataTable
      title="Equipo organizador"
      csvName="equipo"
      createLabel="Nuevo integrante"
      rows={demoOrg}
      searchKeys={['name', 'role_title']}
      fields={[
        {name: 'name', label: 'Nombre', required: true},
        {name: 'role_title', label: 'Cargo', required: true},
        {name: 'career', label: 'Carrera'},
        {name: 'position', label: 'Orden', type: 'number'},
        {name: 'bio', label: 'Bio', type: 'textarea'},
        {name: 'published', label: 'Publicado', type: 'checkbox'},
      ]}
      columns={[
        {key: 'name', label: 'Nombre', render: (m) => <span className="font-semibold text-blanco">{m.name}</span>},
        {key: 'role_title', label: 'Cargo'},
        {key: 'career', label: 'Carrera'},
        {key: 'published', label: 'Visible', value: (m) => (m.published ? 'Sí' : 'No'), render: (m) => (m.published ? <Chip tone="text-ok ring-ok/40">Publicado</Chip> : <Chip>Oculto</Chip>)},
      ]}
    />
  );
}

function PartnersAdmin() {
  return (
    <DataTable
      title="Aliados"
      csvName="aliados"
      createLabel="Nuevo aliado"
      rows={[] as {id: string; name: string; kind: string}[]}
      searchKeys={['name']}
      fields={[
        {name: 'name', label: 'Nombre', required: true},
        {name: 'kind', label: 'Tipo', type: 'select', options: [['aliado', 'Aliado'], ['auspiciador', 'Auspiciador'], ['comunidad', 'Comunidad']]},
        {name: 'website', label: 'Sitio web', type: 'url'},
        {name: 'description', label: 'Descripción', type: 'textarea'},
        {name: 'published', label: 'Publicado', type: 'checkbox'},
      ]}
      columns={[
        {key: 'name', label: 'Aliado'},
        {key: 'kind', label: 'Tipo'},
      ]}
    />
  );
}

function MediaAdmin() {
  const [files, setFiles] = useState<{name: string; url: string; size: number}[]>([]);
  const [drag, setDrag] = useState(false);
  const add = (list: FileList | null) => {
    if (!list) return;
    setFiles((f) => [...Array.from(list).filter((x) => x.type.startsWith('image/')).map((x) => ({name: x.name, url: URL.createObjectURL(x), size: x.size})), ...f]);
  };
  return (
    <div className="space-y-6">
      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          add(e.dataTransfer.files);
        }}
        className={`flex cursor-pointer flex-col items-center gap-3 rounded-[24px] border-2 border-dashed p-12 text-center transition-colors ${drag ? 'border-azul bg-azul/5' : 'border-blanco/15 hover:border-blanco/30'}`}
      >
        <svg aria-hidden="true" viewBox="0 0 48 48" className="size-12 text-azul">
          <circle cx="24" cy="24" r="20" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="0 6" strokeLinecap="round" />
          <path d="M24 32V16m-7 7 7-7 7 7" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
        <span className="font-bold text-blanco">Arrastra imágenes o haz clic para elegir</span>
        <span className="text-[0.8125rem] text-niebla/60">JPG, PNG, WebP o SVG · máx. 5 MB · incluye texto alternativo y créditos</span>
        <input type="file" accept="image/*" multiple className="sr-only" onChange={(e) => add(e.target.files)} />
      </label>
      {files.length > 0 && (
        <>
          <p className="rounded-xl bg-alerta/10 px-4 py-3 text-[0.8125rem] text-alerta ring-1 ring-alerta/30">Vista local: estas imágenes solo existen en tu navegador y no se subieron a ningún servidor.</p>
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
            {files.map((f) => (
              <li key={f.url} className="overflow-hidden rounded-2xl bg-noche-2 ring-1 ring-blanco/8">
                <img src={f.url} alt="" className="aspect-square w-full object-cover" />
                <div className="p-3">
                  <p className="truncate text-[0.8125rem] text-blanco">{f.name}</p>
                  <p className="font-mono text-[0.625rem] text-niebla/50">{(f.size / 1024).toFixed(0)} KB</p>
                  <input aria-label={`Texto alternativo de ${f.name}`} placeholder="Texto alternativo" className="field mt-2 px-2.5 py-1.5 text-[0.75rem]" />
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
