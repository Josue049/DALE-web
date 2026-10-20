/**
 * Acceso a datos. Lecturas: Supabase o, en modo vista previa, el contenido
 * DEMO. Escrituras: SIEMPRE Supabase (en modo demo lanzan DemoModeError;
 * nunca se simula un guardado).
 */
import {db, emailNotifications, isDemoMode, supabase} from '../lib/supabase';
import {demoContests, demoEvents, demoJudges, demoMembers, demoOpportunities, demoOrg, demoProfile, demoProjects, demoRecognitions, demoRegistrations, demoResults, demoStats} from './demo';
import type {
  Availability, Contest, Criterion, Entry, EventRow, Judge, OrgMember, Opportunity, Partner, Profile, Project,
  PublicMember, Recognition, Registration, Result, Role, Submission, Team, TeamMember,
} from './types';

const must = <T>(res: {data: T | null; error: unknown}): T => {
  if (res.error) throw res.error;
  return res.data as T;
};

// ---------------------------------------------------------------- contenido
export async function getContent(): Promise<Record<string, Record<string, string>>> {
  if (!supabase) return {};
  const rows = must(await supabase.from('content_sections').select('key, data'));
  return Object.fromEntries((rows as {key: string; data: Record<string, string>}[]).map((r) => [r.key, r.data]));
}

export async function saveContent(key: string, data: Record<string, string>) {
  must(await db().from('content_sections').upsert({key, data}).select());
}

export async function listOrgMembers(all = false): Promise<OrgMember[]> {
  if (!supabase) return demoOrg;
  let q = supabase.from('org_members').select('*').order('position').order('name');
  if (!all) q = q.eq('published', true);
  return must(await q);
}

export async function listPartners(all = false): Promise<Partner[]> {
  if (!supabase) return [];
  let q = supabase.from('partners').select('*').order('position').order('name');
  if (!all) q = q.eq('published', true);
  return must(await q);
}

// ---------------------------------------------------------------- eventos
export type EventFilters = {q?: string; when?: 'upcoming' | 'past' | 'all'; modality?: string; kind?: string; line?: string};

export async function listEvents(f: EventFilters = {}): Promise<EventRow[]> {
  const nowIso = new Date().toISOString();
  let rows: EventRow[];
  if (!supabase) {
    rows = demoEvents;
  } else {
    let q = supabase.from('events').select('*').in('status', ['published', 'cancelled']);
    if (f.when === 'upcoming') q = q.gte('starts_at', new Date(Date.now() - 3 * 3600000).toISOString());
    if (f.when === 'past') q = q.lt('starts_at', nowIso);
    rows = must(await q.order('starts_at', {ascending: f.when !== 'past'}).limit(200));
  }
  const text = f.q?.trim().toLowerCase();
  return rows.filter((e) => {
    if (!supabase && f.when === 'upcoming' && e.starts_at < nowIso) return false;
    if (!supabase && f.when === 'past' && e.starts_at >= nowIso) return false;
    if (f.modality && e.modality !== f.modality) return false;
    if (f.kind && e.kind !== f.kind) return false;
    if (f.line && e.line !== f.line) return false;
    if (text && !`${e.title} ${e.summary}`.toLowerCase().includes(text)) return false;
    return true;
  });
}

export async function getEvent(slug: string): Promise<EventRow | null> {
  if (!supabase) return demoEvents.find((e) => e.slug === slug) ?? null;
  const row = must(await supabase.from('events').select('*, event_speakers(*)').eq('slug', slug).maybeSingle()) as EventRow | null;
  if (row?.event_speakers) row.event_speakers.sort((a, b) => a.position - b.position);
  return row;
}

export async function getAvailability(ids: string[]): Promise<Record<string, Availability>> {
  if (!supabase || !ids.length) {
    return Object.fromEntries(demoEvents.filter((e) => ids.includes(e.id)).map((e) => [e.id, {event_id: e.id, confirmed: 0, capacity: e.capacity, waitlisted: 0}]));
  }
  const rows = must(await supabase.rpc('event_availability', {p_ids: ids})) as Availability[];
  return Object.fromEntries(rows.map((r) => [r.event_id, r]));
}

export type RegisterResult = {id: string; status: 'confirmed' | 'waitlisted'; token: string; duplicate: boolean; emailSent: boolean};

export async function registerForEvent(eventId: string, guest?: {name: string; email: string}): Promise<RegisterResult> {
  const res = must(
    await db().rpc('register_for_event', {p_event: eventId, p_guest_name: guest?.name ?? null, p_guest_email: guest?.email ?? null}),
  ) as Omit<RegisterResult, 'emailSent'>;
  let emailSent = false;
  if (emailNotifications && !res.duplicate) {
    // La Edge Function verifica la inscripción con el token antes de enviar.
    const r = await db().functions.invoke('notify-registration', {body: {token: res.token}});
    emailSent = !r.error;
  }
  return {...res, emailSent};
}

export async function myRegistrationFor(eventId: string): Promise<Registration | null> {
  if (!supabase) return null;
  const {data: auth} = await supabase.auth.getUser();
  if (!auth.user) return null;
  return must(await supabase.from('event_registrations').select('*').eq('event_id', eventId).eq('user_id', auth.user.id).maybeSingle());
}

export async function getEventAccess(eventId: string): Promise<{online_url: string | null; notes: string | null} | null> {
  if (!supabase) return null;
  return must(await supabase.from('event_access').select('online_url, notes').eq('event_id', eventId).maybeSingle());
}

export async function cancelRegistration(id: string) {
  must(await db().rpc('cancel_event_registration', {p_registration: id}));
}

export async function getRegistrationByToken(token: string) {
  if (!supabase) return null;
  const rows = must(await supabase.rpc('get_registration_by_token', {p_token: token})) as {
    status: string; guest_name: string | null; event_title: string; event_slug: string; starts_at: string; modality: string;
  }[];
  return rows[0] ?? null;
}

export async function cancelRegistrationByToken(token: string) {
  must(await db().rpc('cancel_registration_by_token', {p_token: token}));
}

export async function myRegistrations(): Promise<Registration[]> {
  if (!supabase) return demoRegistrations;
  return must(await supabase.from('event_registrations').select('*, events(id, slug, title, starts_at, modality, venue, status, is_demo)').order('created_at', {ascending: false}));
}

export async function mySavedEvents(): Promise<EventRow[]> {
  if (!supabase) return [];
  const rows = must(await supabase.from('saved_events').select('events(*)').order('created_at', {ascending: false})) as unknown as {events: EventRow}[];
  return rows.map((r) => r.events).filter(Boolean);
}

export async function toggleSavedEvent(eventId: string, save: boolean, userId: string) {
  if (save) must(await db().from('saved_events').upsert({event_id: eventId, user_id: userId}).select());
  else must(await db().from('saved_events').delete().eq('event_id', eventId).eq('user_id', userId));
}

// ---------------------------------------------------------------- concursos
export type ContestFilters = {q?: string; discipline?: string; mode?: string; state?: 'open' | 'upcoming' | 'closed' | ''};

export function contestState(c: Contest): 'upcoming' | 'open' | 'evaluation' | 'results' | 'closed' {
  const now = Date.now();
  if (c.results_published) return 'results';
  if (c.status === 'closed') return 'closed';
  if (c.registration_opens_at && new Date(c.registration_opens_at).getTime() > now) return 'upcoming';
  if (!c.registration_closes_at || new Date(c.registration_closes_at).getTime() > now) return 'open';
  return 'evaluation';
}

export async function listContests(f: ContestFilters = {}): Promise<Contest[]> {
  const rows: Contest[] = supabase
    ? must(await supabase.from('contests').select('*').in('status', ['published', 'closed']).order('registration_closes_at', {ascending: true, nullsFirst: false}))
    : demoContests;
  const text = f.q?.trim().toLowerCase();
  return rows.filter((c) => {
    const st = contestState(c);
    if (f.state === 'open' && st !== 'open') return false;
    if (f.state === 'upcoming' && st !== 'upcoming') return false;
    if (f.state === 'closed' && !['evaluation', 'results', 'closed'].includes(st)) return false;
    if (f.mode && c.participation_mode !== f.mode && !(c.participation_mode === 'mixto')) return false;
    if (f.discipline && !c.disciplines.some((d) => d.toLowerCase().includes(f.discipline!.toLowerCase()))) return false;
    if (text && !`${c.title} ${c.summary} ${c.disciplines.join(' ')}`.toLowerCase().includes(text)) return false;
    return true;
  });
}

export async function getContest(slug: string): Promise<Contest | null> {
  if (!supabase) return demoContests.find((c) => c.slug === slug) ?? null;
  const row = must(await supabase.from('contests').select('*, contest_stages(*), rubric_criteria(*)').eq('slug', slug).maybeSingle()) as Contest | null;
  row?.contest_stages?.sort((a, b) => a.position - b.position);
  row?.rubric_criteria?.sort((a, b) => a.position - b.position);
  return row;
}

export async function getContestJudges(contestId: string): Promise<Judge[]> {
  if (!supabase) return demoJudges[contestId] ?? [];
  return must(await supabase.from('contest_judges').select('contest_id, user_id, display_name, bio').eq('contest_id', contestId));
}

export async function getContestResults(contestId: string): Promise<Result[]> {
  if (!supabase) return demoResults[contestId] ?? [];
  return must(await supabase.from('contest_results').select('*').eq('contest_id', contestId).order('rank', {ascending: true, nullsFirst: false}));
}

export type MyContestState = {
  entry: Entry | null;
  team: Team | null;
  members: (TeamMember & {full_name?: string})[];
  submissions: Submission[];
  invitations: (TeamMember & {teams: Team})[];
};

export async function myContestState(contestId: string, userId: string): Promise<MyContestState> {
  const empty: MyContestState = {entry: null, team: null, members: [], submissions: [], invitations: []};
  if (!supabase) return empty;
  const memberships = must(await supabase.from('team_members').select('*, teams(*)').eq('contest_id', contestId).eq('user_id', userId)) as (TeamMember & {teams: Team})[];
  const accepted = memberships.find((m) => m.status === 'accepted');
  const invitations = memberships.filter((m) => m.status === 'invited');
  let entry: Entry | null = null;
  let team: Team | null = null;
  let members: TeamMember[] = [];
  if (accepted) {
    team = accepted.teams;
    entry = must(await supabase.from('contest_entries').select('*').eq('team_id', team.id).maybeSingle());
    members = must(await supabase.from('team_members').select('*').eq('team_id', team.id));
  } else {
    entry = must(await supabase.from('contest_entries').select('*').eq('contest_id', contestId).eq('user_id', userId).eq('status', 'active').maybeSingle());
  }
  const submissions: Submission[] = entry ? must(await supabase.from('submissions').select('*').eq('entry_id', entry.id)) : [];
  return {entry, team, members, submissions, invitations};
}

export const registerIndividual = async (contestId: string) => must(await db().rpc('register_contest_individual', {p_contest: contestId})) as string;
export const createTeam = async (contestId: string, name: string) => must(await db().rpc('create_team', {p_contest: contestId, p_name: name})) as string;
export const inviteToTeam = async (teamId: string, email: string) => must(await db().rpc('invite_to_team', {p_team: teamId, p_email: email}));
export const respondInvite = async (teamId: string, accept: boolean) => must(await db().rpc('respond_team_invite', {p_team: teamId, p_accept: accept}));
export const leaveTeam = async (teamId: string) => must(await db().rpc('leave_team', {p_team: teamId}));
export const withdrawEntry = async (entryId: string) => must(await db().rpc('withdraw_contest_entry', {p_entry: entryId}));

export async function submitWork(entryId: string, stageId: string, v: {title: string; description: string; link_url: string; file?: File | null}) {
  let filePath: string | null = null;
  if (v.file) {
    if (v.file.size > 25 * 1024 * 1024) throw new Error('El archivo supera 25 MB.');
    filePath = `${entryId}/${stageId}-${Date.now()}-${v.file.name.replace(/[^\w.-]+/g, '_')}`;
    must(await db().storage.from('submissions').upload(filePath, v.file, {upsert: false}));
  }
  return must(
    await db().rpc('upsert_submission', {p_entry: entryId, p_stage: stageId, p_title: v.title, p_description: v.description, p_link_url: v.link_url || null, p_file_path: filePath}),
  ) as string;
}

export async function signedSubmissionUrl(path: string) {
  const res = await db().storage.from('submissions').createSignedUrl(path, 600);
  return must(res).signedUrl;
}

export async function myTeams(userId: string) {
  if (!supabase) return [];
  return must(
    await supabase.from('team_members').select('status, created_at, teams(id, name, captain_id, contest_id, contests(title, slug, min_team_size, max_team_size))').eq('user_id', userId).neq('status', 'declined'),
  ) as unknown as {status: string; created_at: string; teams: Team & {contests: Pick<Contest, 'title' | 'slug' | 'min_team_size' | 'max_team_size'>}}[];
}

export async function myContestEntries(userId: string) {
  if (!supabase) return [];
  return must(await supabase.from('contest_entries').select('*, contests(title, slug, results_published)').eq('user_id', userId)) as (Entry & {contests: Pick<Contest, 'title' | 'slug' | 'results_published'>})[];
}

// ---------------------------------------------------------------- jurado
export type Assignment = {
  submission_id: string; contest_id: string; contest_title: string; contest_slug: string; stage_name: string; entry_label: string;
  title: string; description: string; link_url: string | null; file_path: string | null; submitted_at: string;
  scored_criteria: number; total_criteria: number; results_published: boolean;
};

export async function judgeAssignments(): Promise<Assignment[]> {
  if (!supabase) return [];
  return must(await supabase.rpc('judge_assignments'));
}

export async function criteriaFor(contestId: string): Promise<Criterion[]> {
  if (!supabase) return demoContests.find((c) => c.id === contestId)?.rubric_criteria ?? [];
  return must(await supabase.from('rubric_criteria').select('*').eq('contest_id', contestId).order('position'));
}

export async function myScores(submissionId: string) {
  if (!supabase) return [];
  return must(await supabase.from('scores').select('*').eq('submission_id', submissionId)) as {criterion_id: string; score: number; comment: string | null}[];
}

export async function saveScores(submissionId: string, scores: {criterion_id: string; score: number; comment: string}[], judgeId: string) {
  must(
    await db()
      .from('scores')
      .upsert(scores.map((s) => ({...s, submission_id: submissionId, judge_id: judgeId})), {onConflict: 'submission_id,judge_id,criterion_id'})
      .select(),
  );
}

// ---------------------------------------------------------------- proyectos
export async function listProjects(f: {q?: string; discipline?: string} = {}): Promise<Project[]> {
  const rows: Project[] = supabase ? must(await supabase.from('projects').select('*').eq('status', 'approved').order('published_at', {ascending: false})) : demoProjects;
  const text = f.q?.trim().toLowerCase();
  return rows.filter((p) => {
    if (f.discipline && !p.disciplines.some((d) => d.toLowerCase().includes(f.discipline!.toLowerCase()))) return false;
    if (text && !`${p.title} ${p.summary} ${p.looking_for.join(' ')}`.toLowerCase().includes(text)) return false;
    return true;
  });
}

export async function getProject(slug: string): Promise<Project | null> {
  if (!supabase) return demoProjects.find((p) => p.slug === slug) ?? null;
  return must(await supabase.from('projects').select('*').eq('slug', slug).maybeSingle());
}

export async function myProjects(userId: string): Promise<Project[]> {
  if (!supabase) return [];
  return must(await supabase.from('projects').select('*').eq('owner_id', userId).order('created_at', {ascending: false}));
}

export async function saveProject(v: Partial<Project> & {title: string}, id?: string) {
  const payload = {
    title: v.title, summary: v.summary, description: v.description, disciplines: v.disciplines, looking_for: v.looking_for,
    team_text: v.team_text, links: v.links, cover_url: v.cover_url, cover_alt: v.cover_alt, slug: v.slug,
  };
  if (id) return must(await db().from('projects').update(payload).eq('id', id).select().single()) as Project;
  return must(await db().from('projects').insert(payload).select().single()) as Project;
}

export async function requestCollab(projectId: string, message: string, userId: string) {
  must(await db().from('project_collab_requests').insert({project_id: projectId, message, user_id: userId}).select());
}

export async function collabRequestsForOwner(projectIds: string[]) {
  if (!supabase || !projectIds.length) return [];
  return must(await supabase.from('project_collab_requests').select('*').in('project_id', projectIds).order('created_at', {ascending: false})) as {
    id: string; project_id: string; user_id: string; message: string; status: string; created_at: string;
  }[];
}

export async function setCollabStatus(id: string, status: 'accepted' | 'declined') {
  must(await db().from('project_collab_requests').update({status}).eq('id', id).select());
}

// ---------------------------------------------------------------- oportunidades
export async function listOpportunities(f: {q?: string; category?: string; state?: 'active' | 'expired' | ''} = {}): Promise<Opportunity[]> {
  const rows: Opportunity[] = supabase
    ? must(await supabase.from('opportunities').select('*').eq('status', 'published').order('deadline', {ascending: true, nullsFirst: false}))
    : demoOpportunities;
  const now = Date.now();
  const text = f.q?.trim().toLowerCase();
  return rows.filter((o) => {
    const expired = !!o.deadline && new Date(o.deadline).getTime() < now;
    if (f.state === 'active' && expired) return false;
    if (f.state === 'expired' && !expired) return false;
    if (f.category && o.category !== f.category) return false;
    if (text && !`${o.title} ${o.summary} ${o.organization ?? ''}`.toLowerCase().includes(text)) return false;
    return true;
  });
}

export async function getOpportunity(slug: string): Promise<Opportunity | null> {
  if (!supabase) return demoOpportunities.find((o) => o.slug === slug) ?? null;
  return must(await supabase.from('opportunities').select('*').eq('slug', slug).maybeSingle());
}

// ---------------------------------------------------------------- comunidad
export async function searchMembers(q?: string, career?: string, offset = 0): Promise<PublicMember[]> {
  if (!supabase) {
    const t = q?.trim().toLowerCase();
    return demoMembers.filter(
      (m) => (!t || `${m.full_name} ${m.career} ${m.skills.join(' ')} ${m.interests.join(' ')}`.toLowerCase().includes(t)) && (!career || (m.career ?? '').toLowerCase().includes(career.toLowerCase())),
    );
  }
  return must(await supabase.rpc('search_members', {p_query: q || null, p_career: career || null, p_limit: 24, p_offset: offset}));
}

export type MembershipInput = {
  full_name: string; email: string; university: string; career: string; campus: string;
  lines: string[]; interests: string[]; motivation: string; consent_data: boolean; consent_contact: boolean;
};

export async function submitMembership(v: MembershipInput): Promise<'created' | 'updated'> {
  return must(
    await db().rpc('submit_membership_application', {
      p_full_name: v.full_name, p_email: v.email, p_university: v.university, p_career: v.career, p_campus: v.campus,
      p_lines: v.lines, p_interests: v.interests, p_motivation: v.motivation, p_consent_data: v.consent_data, p_consent_contact: v.consent_contact,
    }),
  );
}

export async function sendContact(v: {name: string; email: string; subject: string; message: string}) {
  // Sin .select(): el visitante anónimo puede insertar pero no leer mensajes.
  const {error} = await db().from('contact_messages').insert(v);
  if (error) throw error;
}

// ---------------------------------------------------------------- perfil y cuenta
export async function getProfile(userId: string): Promise<Profile | null> {
  if (!supabase) return demoProfile;
  return must(await supabase.from('profiles').select('*').eq('id', userId).maybeSingle());
}

export async function getMyRoles(userId: string): Promise<Role[]> {
  if (!supabase) return [];
  const rows = must(await supabase.from('user_roles').select('role').eq('user_id', userId)) as {role: Role}[];
  return rows.map((r) => r.role);
}

export async function updateProfile(userId: string, patch: Partial<Profile>) {
  return must(await db().from('profiles').update(patch).eq('id', userId).select().single()) as Profile;
}

export async function uploadAvatar(userId: string, file: File) {
  if (file.size > 2 * 1024 * 1024) throw new Error('La imagen supera 2 MB.');
  const path = `${userId}/avatar-${Date.now()}.${file.name.split('.').pop()?.toLowerCase() || 'jpg'}`;
  must(await db().storage.from('avatars').upload(path, file, {upsert: true}));
  return db().storage.from('avatars').getPublicUrl(path).data.publicUrl;
}

export async function myRecognitions(): Promise<Recognition[]> {
  if (!supabase) return demoRecognitions;
  return must(await supabase.from('recognitions').select('*').order('issued_at', {ascending: false}));
}

export async function setRecognitionVisibility(id: string, visible: boolean) {
  must(await db().from('recognitions').update({public_verification: visible}).eq('id', id).select());
}

export async function verifyRecognition(token: string) {
  if (!supabase) return null;
  const rows = must(await supabase.rpc('verify_recognition', {p_token: token})) as {
    title: string; kind: string; holder: string; issued_at: string; event_title: string | null; contest_title: string | null; revoked: boolean;
  }[];
  return rows[0] ?? null;
}

/** Próximo evento real (no demo) para el contador del cierre. */
export async function nextRealEvent(): Promise<EventRow | null> {
  if (!supabase) return null;
  return must(
    await supabase.from('events').select('*').eq('status', 'published').eq('is_demo', false).gt('starts_at', new Date().toISOString()).order('starts_at').limit(1).maybeSingle(),
  );
}

// ---------------------------------------------------------------- admin
export async function adminStats(): Promise<typeof demoStats> {
  if (!supabase) return demoStats;
  return must(await supabase.rpc('admin_stats'));
}

export async function adminAudit(limit = 30) {
  if (!supabase) return [];
  return must(await supabase.from('audit_log').select('*').order('created_at', {ascending: false}).limit(limit)) as {
    id: number; actor_id: string | null; action: string; entity: string; entity_id: string | null; details: Record<string, string> | null; created_at: string;
  }[];
}

export type AdminUser = {id: string; email: string; full_name: string; university: string | null; career: string | null; roles: Role[]; created_at: string; total: number};

export async function adminUsers(q: string, page: number, size = 25): Promise<AdminUser[]> {
  if (!supabase) return [];
  return must(await supabase.rpc('admin_list_users', {p_query: q || null, p_limit: size, p_offset: page * size}));
}

export const adminSetRole = async (userId: string, role: Role, grant: boolean) => must(await db().rpc('admin_set_role', {p_user: userId, p_role: role, p_grant: grant}));
export const adminAssignJudge = async (contestId: string, email: string, name: string, bio: string) =>
  must(await db().rpc('admin_assign_judge', {p_contest: contestId, p_email: email, p_display_name: name, p_bio: bio || null}));
export const computeResults = async (contestId: string) => must(await db().rpc('compute_contest_results', {p_contest: contestId})) as number;
export const publishResults = async (contestId: string, published: boolean) => must(await db().rpc('set_contest_results_published', {p_contest: contestId, p_published: published}));
export const issueEventCertificates = async (eventId: string) => must(await db().rpc('issue_event_certificates', {p_event: eventId})) as number;
export const issueRecognition = async (v: {user: string; kind: 'certificado' | 'insignia'; title: string; description: string; badge?: string | null}) =>
  must(await db().rpc('issue_recognition', {p_user: v.user, p_kind: v.kind, p_title: v.title, p_description: v.description || null, p_badge: v.badge || null, p_event: null, p_contest: null})) as string;

/** CRUD genérico para el panel (RLS decide qué puede hacer cada rol). */
export async function adminList<T>(table: string, opts: {select?: string; order?: string; ascending?: boolean; eq?: Record<string, unknown>} = {}): Promise<T[]> {
  if (!supabase) return adminDemoTable(table) as T[];
  let q = supabase.from(table).select(opts.select ?? '*');
  for (const [k, v] of Object.entries(opts.eq ?? {})) if (v !== undefined && v !== '') q = q.eq(k, v as string);
  if (opts.order) q = q.order(opts.order, {ascending: opts.ascending ?? false});
  return must(await q.limit(1000)) as T[];
}

export async function adminUpsert(table: string, values: Record<string, unknown>, id?: string, idColumn = 'id') {
  if (id) return must(await db().from(table).update(values).eq(idColumn, id).select().single());
  return must(await db().from(table).insert(values).select().single());
}

export async function adminDelete(table: string, id: string, idColumn = 'id') {
  must(await db().from(table).delete().eq(idColumn, id));
}

export async function uploadMedia(file: File, meta: {alt: string; credit?: string; license?: string}, uploaderId: string) {
  if (file.size > 5 * 1024 * 1024) throw new Error('El archivo supera 5 MB.');
  const path = `${new Date().getFullYear()}/${Date.now()}-${file.name.replace(/[^\w.-]+/g, '_').toLowerCase()}`;
  must(await db().storage.from('media').upload(path, file, {upsert: false, contentType: file.type}));
  const url = db().storage.from('media').getPublicUrl(path).data.publicUrl;
  return must(
    await db().from('media_assets').insert({bucket: 'media', path, url, alt: meta.alt, credit: meta.credit || null, license: meta.license || null, mime: file.type, size_bytes: file.size, uploaded_by: uploaderId}).select().single(),
  ) as {url: string};
}

function adminDemoTable(table: string): unknown[] {
  switch (table) {
    case 'events':
      return demoEvents;
    case 'contests':
      return demoContests;
    case 'projects':
      return demoProjects;
    case 'opportunities':
      return demoOpportunities;
    case 'contest_stages':
      return demoContests[0].contest_stages ?? [];
    case 'rubric_criteria':
      return demoContests[0].rubric_criteria ?? [];
    default:
      return [];
  }
}

export {isDemoMode};
