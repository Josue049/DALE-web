/** Tipos de dominio, espejo de supabase/migrations. */
import type {LineKey} from '../content';

export type Role = 'member' | 'organizer' | 'judge' | 'admin';
export type Modality = 'virtual' | 'presencial' | 'hibrida';
export type Eligibility = 'utp' | 'invitadas' | 'publico';
export type RegistrationStatus = 'confirmed' | 'waitlisted' | 'cancelled';
export type ModerationStatus = 'pending' | 'approved' | 'rejected' | 'changes_requested';

export interface Profile {
  id: string;
  full_name: string;
  username: string | null;
  university: string | null;
  career: string | null;
  campus: string | null;
  bio: string | null;
  interests: string[];
  skills: string[];
  open_to_volunteer: boolean;
  is_public: boolean;
  newsletter: boolean;
  avatar_url: string | null;
  credential_theme: 'rojo' | 'magenta' | 'azul' | 'noche';
  created_at: string;
}

export interface PublicMember {
  id: string;
  full_name: string;
  username: string | null;
  university: string | null;
  career: string | null;
  bio: string | null;
  interests: string[];
  skills: string[];
  open_to_volunteer: boolean;
  avatar_url: string | null;
}

export interface AgendaItem {
  time: string;
  title: string;
  speaker?: string;
}
export interface LinkItem {
  label: string;
  url: string;
}

export interface Speaker {
  id: string;
  event_id: string;
  name: string;
  title: string | null;
  bio: string | null;
  photo_url: string | null;
  position: number;
}

export interface EventRow {
  id: string;
  slug: string;
  title: string;
  summary: string;
  description: string;
  line: LineKey;
  kind: string;
  modality: Modality;
  starts_at: string;
  ends_at: string | null;
  timezone: string;
  venue: string | null;
  address: string | null;
  capacity: number | null;
  waitlist_enabled: boolean;
  allow_guests: boolean;
  eligibility: Eligibility;
  requirements: string | null;
  registration_opens_at: string | null;
  registration_closes_at: string | null;
  agenda: AgendaItem[];
  resources: LinkItem[];
  recording_url: string | null;
  cover_url: string | null;
  cover_alt: string | null;
  status: 'draft' | 'published' | 'cancelled' | 'archived';
  is_demo: boolean;
  created_by: string | null;
  created_at: string;
  event_speakers?: Speaker[];
}

export interface Availability {
  event_id: string;
  confirmed: number;
  capacity: number | null;
  waitlisted: number;
}

export interface Registration {
  id: string;
  event_id: string;
  user_id: string | null;
  guest_name: string | null;
  guest_email: string | null;
  status: RegistrationStatus;
  attended: boolean;
  token: string;
  created_at: string;
  events?: Pick<EventRow, 'id' | 'slug' | 'title' | 'starts_at' | 'modality' | 'venue' | 'status' | 'is_demo'>;
}

export interface Prize {
  place: string;
  title: string;
  description?: string;
}

export interface Stage {
  id: string;
  contest_id: string;
  position: number;
  name: string;
  description: string | null;
  starts_at: string;
  ends_at: string;
  accepts_submissions: boolean;
}

export interface Criterion {
  id: string;
  contest_id: string;
  position: number;
  name: string;
  description: string | null;
  weight: number;
  max_score: number;
}

export interface Judge {
  contest_id: string;
  user_id: string;
  display_name: string;
  bio: string | null;
}

export interface Contest {
  id: string;
  slug: string;
  title: string;
  summary: string;
  description: string;
  disciplines: string[];
  participation_mode: 'individual' | 'equipo' | 'mixto';
  min_team_size: number;
  max_team_size: number;
  eligibility: Eligibility;
  rules: string;
  bases_url: string | null;
  prizes: Prize[];
  registration_opens_at: string | null;
  registration_closes_at: string | null;
  cover_url: string | null;
  cover_alt: string | null;
  judges_public: boolean;
  results_published: boolean;
  results_published_at: string | null;
  status: 'draft' | 'published' | 'closed' | 'archived';
  is_demo: boolean;
  created_by: string | null;
  created_at: string;
  contest_stages?: Stage[];
  rubric_criteria?: Criterion[];
}

export interface Result {
  id: string;
  contest_id: string;
  entry_id: string;
  display_name: string;
  rank: number | null;
  award: string | null;
  total_score: number | null;
}

export interface Team {
  id: string;
  contest_id: string;
  name: string;
  captain_id: string;
  created_at: string;
}

export interface TeamMember {
  team_id: string;
  contest_id: string;
  user_id: string;
  status: 'invited' | 'accepted' | 'declined';
  created_at: string;
}

export interface Entry {
  id: string;
  contest_id: string;
  user_id: string | null;
  team_id: string | null;
  status: 'active' | 'withdrawn' | 'disqualified';
  created_at: string;
}

export interface Submission {
  id: string;
  entry_id: string;
  stage_id: string;
  title: string;
  description: string;
  link_url: string | null;
  file_path: string | null;
  submitted_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  slug: string;
  title: string;
  summary: string;
  description: string;
  disciplines: string[];
  looking_for: string[];
  team_text: string | null;
  cover_url: string | null;
  cover_alt: string | null;
  gallery: {url: string; alt: string}[];
  links: LinkItem[];
  status: ModerationStatus;
  moderation_note: string | null;
  owner_id: string | null;
  is_demo: boolean;
  published_at: string | null;
  created_at: string;
}

export interface Opportunity {
  id: string;
  slug: string;
  title: string;
  organization: string | null;
  category: 'convocatoria' | 'mentoria' | 'voluntariado' | 'practicas' | 'beca' | 'recurso';
  summary: string;
  description: string;
  requirements: string | null;
  apply_url: string | null;
  deadline: string | null;
  status: 'draft' | 'published' | 'archived';
  is_demo: boolean;
  created_by: string | null;
  created_at: string;
}

export interface OrgMember {
  id: string;
  name: string;
  role_title: string;
  career: string | null;
  bio: string | null;
  photo_url: string | null;
  links: LinkItem[];
  position: number;
  published: boolean;
}

export interface Partner {
  id: string;
  name: string;
  kind: 'aliado' | 'auspiciador' | 'comunidad';
  logo_url: string | null;
  website: string | null;
  description: string | null;
  position: number;
  published: boolean;
}

export interface Recognition {
  id: string;
  user_id: string;
  kind: 'certificado' | 'insignia';
  title: string;
  description: string | null;
  holder_name: string;
  verify_token: string;
  public_verification: boolean;
  issued_at: string;
  revoked_at: string | null;
}

export interface ContentMap {
  'home.hero': Record<string, string>;
  'home.manifesto': Record<string, string>;
  'brand.lines': Record<string, string>;
  'home.reel': Record<string, string>;
  'site.contact': Record<string, string>;
}
