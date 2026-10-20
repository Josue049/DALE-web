-- =====================================================================
-- DALE CON TODO — esquema principal
-- Postgres (Supabase). Requiere el esquema `auth` de Supabase.
-- =====================================================================

-- ---------- Tipos ----------------------------------------------------
create type public.app_role as enum ('member', 'organizer', 'judge', 'admin');
create type public.activity_line as enum ('challenge', 'talks', 'lab', 'network', 'future');
create type public.event_status as enum ('draft', 'published', 'cancelled', 'archived');
create type public.contest_status as enum ('draft', 'published', 'closed', 'archived');
create type public.pub_status as enum ('draft', 'published', 'archived');
create type public.modality as enum ('virtual', 'presencial', 'hibrida');
-- utp: solo estudiantes UTP · invitadas: UTP + universidades invitadas · publico: público general
create type public.eligibility as enum ('utp', 'invitadas', 'publico');
create type public.participation_mode as enum ('individual', 'equipo', 'mixto');
create type public.registration_status as enum ('confirmed', 'waitlisted', 'cancelled');
create type public.invite_status as enum ('invited', 'accepted', 'declined');
create type public.moderation_status as enum ('pending', 'approved', 'rejected', 'changes_requested');
create type public.request_status as enum ('pending', 'accepted', 'declined');
create type public.opportunity_category as enum ('convocatoria', 'mentoria', 'voluntariado', 'practicas', 'beca', 'recurso');
create type public.recognition_kind as enum ('certificado', 'insignia');
create type public.application_status as enum ('new', 'contacted', 'accepted', 'archived');
create type public.partner_kind as enum ('aliado', 'auspiciador', 'comunidad');

-- ---------- Utilidades ----------------------------------------------
create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- Token opaco de 64 hex (dos UUIDv4 aleatorios, ~244 bits de entropía).
create or replace function public.opaque_token() returns text
language sql volatile as $$
  select replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')
$$;

-- ---------- Usuarios, perfiles y roles ------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '' check (char_length(full_name) <= 120),
  username text unique check (username ~ '^[a-z0-9_.]{3,30}$'),
  university text check (char_length(university) <= 120),
  career text check (char_length(career) <= 120),
  campus text check (char_length(campus) <= 80),
  bio text check (char_length(bio) <= 600),
  interests text[] not null default '{}',
  skills text[] not null default '{}',
  open_to_volunteer boolean not null default false,
  -- Perfil visible en /comunidad solo si la persona lo activa.
  is_public boolean not null default false,
  public_consent_at timestamptz,
  newsletter boolean not null default false,
  avatar_url text,
  credential_theme text not null default 'rojo' check (credential_theme in ('rojo', 'magenta', 'azul', 'noche')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index profiles_public_idx on public.profiles (is_public) where is_public;
create trigger profiles_updated before update on public.profiles for each row execute function public.set_updated_at();

create table public.user_roles (
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.app_role not null,
  granted_by uuid references auth.users (id) on delete set null,
  granted_at timestamptz not null default now(),
  primary key (user_id, role)
);

-- ---------- Contenido institucional ---------------------------------
create table public.content_sections (
  key text primary key check (key ~ '^[a-z0-9_.-]+$'),
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);
create trigger content_sections_updated before update on public.content_sections for each row execute function public.set_updated_at();

create table public.org_members (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 120),
  role_title text not null default '',
  career text,
  bio text,
  photo_url text,
  links jsonb not null default '[]'::jsonb,
  position int not null default 0,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger org_members_updated before update on public.org_members for each row execute function public.set_updated_at();

create table public.partners (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 120),
  kind public.partner_kind not null default 'aliado',
  logo_url text,
  website text,
  description text,
  position int not null default 0,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger partners_updated before update on public.partners for each row execute function public.set_updated_at();

create table public.media_assets (
  id uuid primary key default gen_random_uuid(),
  bucket text not null default 'media',
  path text not null,
  url text not null,
  alt text not null default '',
  credit text,
  license text,
  mime text,
  size_bytes bigint,
  uploaded_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (bucket, path)
);

-- ---------- Dale Talks: eventos -------------------------------------
create table public.events (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null check (char_length(title) between 3 and 160),
  summary text not null default '' check (char_length(summary) <= 300),
  description text not null default '',
  line public.activity_line not null default 'talks',
  kind text not null default 'webinar' check (kind in ('webinar', 'conferencia', 'taller', 'encuentro', 'voluntariado', 'otro')),
  modality public.modality not null default 'virtual',
  starts_at timestamptz not null,
  ends_at timestamptz,
  timezone text not null default 'America/Lima',
  venue text,
  address text,
  capacity int check (capacity is null or capacity > 0),
  waitlist_enabled boolean not null default false,
  allow_guests boolean not null default false,
  eligibility public.eligibility not null default 'publico',
  requirements text,
  registration_opens_at timestamptz,
  registration_closes_at timestamptz,
  agenda jsonb not null default '[]'::jsonb,
  resources jsonb not null default '[]'::jsonb,
  recording_url text,
  cover_url text,
  cover_alt text,
  status public.event_status not null default 'draft',
  is_demo boolean not null default false,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or ends_at > starts_at),
  check (registration_closes_at is null or registration_opens_at is null or registration_closes_at > registration_opens_at)
);
create index events_status_start_idx on public.events (status, starts_at);
create trigger events_updated before update on public.events for each row execute function public.set_updated_at();

-- Enlace privado de acceso (Zoom/Meet...). Solo visible a inscritos confirmados y staff.
create table public.event_access (
  event_id uuid primary key references public.events (id) on delete cascade,
  online_url text,
  notes text,
  updated_at timestamptz not null default now()
);

create table public.event_speakers (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  name text not null,
  title text,
  bio text,
  photo_url text,
  position int not null default 0
);
create index event_speakers_event_idx on public.event_speakers (event_id, position);

create table public.event_registrations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  user_id uuid references auth.users (id) on delete cascade,
  guest_name text check (char_length(guest_name) <= 120),
  guest_email text check (guest_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  status public.registration_status not null default 'confirmed',
  attended boolean not null default false,
  token text not null unique default public.opaque_token(),
  created_at timestamptz not null default now(),
  cancelled_at timestamptz,
  check (user_id is not null or (guest_email is not null and guest_name is not null))
);
create unique index event_reg_user_uniq on public.event_registrations (event_id, user_id) where user_id is not null;
create unique index event_reg_guest_uniq on public.event_registrations (event_id, lower(guest_email)) where guest_email is not null;
create index event_reg_event_status_idx on public.event_registrations (event_id, status, created_at);

create table public.saved_events (
  user_id uuid not null references auth.users (id) on delete cascade,
  event_id uuid not null references public.events (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, event_id)
);

-- ---------- Dale Challenge: concursos -------------------------------
create table public.contests (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null check (char_length(title) between 3 and 160),
  summary text not null default '' check (char_length(summary) <= 300),
  description text not null default '',
  disciplines text[] not null default '{}',
  participation_mode public.participation_mode not null default 'equipo',
  min_team_size int not null default 1 check (min_team_size >= 1),
  max_team_size int not null default 1 check (max_team_size >= 1),
  eligibility public.eligibility not null default 'utp',
  rules text not null default '',
  bases_url text,
  prizes jsonb not null default '[]'::jsonb,
  registration_opens_at timestamptz,
  registration_closes_at timestamptz,
  cover_url text,
  cover_alt text,
  judges_public boolean not null default false,
  results_published boolean not null default false,
  results_published_at timestamptz,
  status public.contest_status not null default 'draft',
  is_demo boolean not null default false,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (max_team_size >= min_team_size)
);
create index contests_status_idx on public.contests (status, registration_closes_at);
create trigger contests_updated before update on public.contests for each row execute function public.set_updated_at();

create table public.contest_stages (
  id uuid primary key default gen_random_uuid(),
  contest_id uuid not null references public.contests (id) on delete cascade,
  position int not null default 0,
  name text not null,
  description text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  accepts_submissions boolean not null default false,
  check (ends_at > starts_at)
);
create index contest_stages_contest_idx on public.contest_stages (contest_id, position);

create table public.rubric_criteria (
  id uuid primary key default gen_random_uuid(),
  contest_id uuid not null references public.contests (id) on delete cascade,
  position int not null default 0,
  name text not null,
  description text,
  weight numeric(6, 2) not null default 1 check (weight > 0),
  max_score int not null default 10 check (max_score between 1 and 100)
);
create index rubric_contest_idx on public.rubric_criteria (contest_id, position);

create table public.contest_judges (
  contest_id uuid not null references public.contests (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  display_name text not null,
  bio text,
  assigned_at timestamptz not null default now(),
  primary key (contest_id, user_id)
);
create index contest_judges_user_idx on public.contest_judges (user_id);

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  contest_id uuid not null references public.contests (id) on delete cascade,
  name text not null check (char_length(name) between 2 and 60),
  captain_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
create unique index teams_name_uniq on public.teams (contest_id, lower(name));

create table public.team_members (
  team_id uuid not null references public.teams (id) on delete cascade,
  contest_id uuid not null references public.contests (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  status public.invite_status not null default 'invited',
  invited_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  primary key (team_id, user_id)
);
-- Una persona solo puede pertenecer (aceptada) a un equipo por concurso.
create unique index team_members_one_team_per_contest on public.team_members (contest_id, user_id) where status = 'accepted';

create table public.contest_entries (
  id uuid primary key default gen_random_uuid(),
  contest_id uuid not null references public.contests (id) on delete cascade,
  user_id uuid references auth.users (id) on delete cascade,
  team_id uuid references public.teams (id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'withdrawn', 'disqualified')),
  created_at timestamptz not null default now(),
  check ((user_id is null) <> (team_id is null))
);
create unique index contest_entries_user_uniq on public.contest_entries (contest_id, user_id) where user_id is not null;
create unique index contest_entries_team_uniq on public.contest_entries (contest_id, team_id) where team_id is not null;

create table public.submissions (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.contest_entries (id) on delete cascade,
  stage_id uuid not null references public.contest_stages (id) on delete cascade,
  title text not null check (char_length(title) between 3 and 160),
  description text not null default '' check (char_length(description) <= 4000),
  link_url text check (link_url is null or link_url ~* '^https?://'),
  file_path text,
  submitted_by uuid references auth.users (id) on delete set null,
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (entry_id, stage_id),
  check (link_url is not null or file_path is not null)
);

create table public.scores (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions (id) on delete cascade,
  judge_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  criterion_id uuid not null references public.rubric_criteria (id) on delete cascade,
  score numeric(6, 2) not null check (score >= 0),
  comment text check (char_length(comment) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (submission_id, judge_id, criterion_id)
);
create trigger scores_updated before update on public.scores for each row execute function public.set_updated_at();

create table public.contest_results (
  id uuid primary key default gen_random_uuid(),
  contest_id uuid not null references public.contests (id) on delete cascade,
  entry_id uuid not null references public.contest_entries (id) on delete cascade,
  display_name text not null,
  rank int,
  award text,
  total_score numeric(8, 3),
  created_at timestamptz not null default now(),
  unique (contest_id, entry_id)
);

-- ---------- Dale Lab: proyectos -------------------------------------
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null check (char_length(title) between 3 and 160),
  summary text not null default '' check (char_length(summary) <= 300),
  description text not null default '',
  disciplines text[] not null default '{}',
  looking_for text[] not null default '{}',
  team_text text,
  cover_url text,
  cover_alt text,
  gallery jsonb not null default '[]'::jsonb,
  links jsonb not null default '[]'::jsonb,
  status public.moderation_status not null default 'pending',
  moderation_note text,
  owner_id uuid references auth.users (id) on delete set null default auth.uid(),
  is_demo boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index projects_status_idx on public.projects (status, published_at desc);
create trigger projects_updated before update on public.projects for each row execute function public.set_updated_at();

create table public.project_collab_requests (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  message text not null check (char_length(message) between 10 and 1000),
  status public.request_status not null default 'pending',
  created_at timestamptz not null default now(),
  unique (project_id, user_id)
);

-- ---------- Dale Future: oportunidades ------------------------------
create table public.opportunities (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null check (char_length(title) between 3 and 160),
  organization text,
  category public.opportunity_category not null default 'convocatoria',
  summary text not null default '' check (char_length(summary) <= 300),
  description text not null default '',
  requirements text,
  apply_url text check (apply_url is null or apply_url ~* '^(https?://|mailto:)'),
  deadline timestamptz,
  status public.pub_status not null default 'draft',
  is_demo boolean not null default false,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index opportunities_status_idx on public.opportunities (status, deadline);
create trigger opportunities_updated before update on public.opportunities for each row execute function public.set_updated_at();

-- ---------- Reconocimientos -----------------------------------------
create table public.badges (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  image_url text,
  created_at timestamptz not null default now()
);

create table public.recognitions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind public.recognition_kind not null default 'certificado',
  badge_id uuid references public.badges (id) on delete set null,
  title text not null,
  description text,
  holder_name text not null,
  event_id uuid references public.events (id) on delete set null,
  contest_id uuid references public.contests (id) on delete set null,
  verify_token text not null unique default public.opaque_token(),
  public_verification boolean not null default true,
  issued_by uuid references auth.users (id) on delete set null,
  issued_at timestamptz not null default now(),
  revoked_at timestamptz
);
create index recognitions_user_idx on public.recognitions (user_id);
create unique index recognitions_event_uniq on public.recognitions (user_id, event_id, kind) where event_id is not null;

-- ---------- Formularios públicos ------------------------------------
create table public.membership_applications (
  id uuid primary key default gen_random_uuid(),
  full_name text not null check (char_length(full_name) between 2 and 120),
  email text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  university text not null check (char_length(university) between 2 and 120),
  career text not null check (char_length(career) between 2 and 120),
  campus text,
  lines public.activity_line[] not null default '{}',
  interests text[] not null default '{}',
  motivation text check (char_length(motivation) <= 1200),
  consent_data boolean not null check (consent_data),
  consent_contact boolean not null default false,
  user_id uuid references auth.users (id) on delete set null,
  status public.application_status not null default 'new',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index membership_email_uniq on public.membership_applications (lower(email));
create trigger membership_updated before update on public.membership_applications for each row execute function public.set_updated_at();

create table public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 120),
  email text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  subject text not null check (char_length(subject) between 2 and 160),
  message text not null check (char_length(message) between 10 and 4000),
  handled boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------- Auditoría -----------------------------------------------
create table public.audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid,
  action text not null,
  entity text not null,
  entity_id text,
  details jsonb,
  created_at timestamptz not null default now()
);
create index audit_log_created_idx on public.audit_log (created_at desc);
