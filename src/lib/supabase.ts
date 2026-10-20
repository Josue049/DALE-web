import {createClient, type SupabaseClient} from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * Sin variables de Supabase la app arranca en MODO VISTA PREVIA: lee
 * contenido de ejemplo rotulado DEMO y rechaza cualquier escritura.
 * Solo se usa la anon key pública; nunca credenciales privilegiadas.
 */
export const isDemoMode = !url || !anonKey;

export const supabase: SupabaseClient | null = isDemoMode
  ? null
  : createClient(url!, anonKey!, {
      auth: {persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce'},
    });

export const emailNotifications = import.meta.env.VITE_EMAIL_NOTIFICATIONS === 'true';

export class DemoModeError extends Error {
  constructor() {
    super('Modo vista previa: esta acción no se guarda. Configura Supabase (ver README) para habilitar inscripciones y cuentas reales.');
    this.name = 'DemoModeError';
  }
}

/** Cliente garantizado o error explícito de modo demo (para escrituras). */
export function db(): SupabaseClient {
  if (!supabase) throw new DemoModeError();
  return supabase;
}

/** Traduce errores de Postgres/Supabase a mensajes en español para la UI. */
export function errorMessage(e: unknown): string {
  if (e instanceof DemoModeError) return e.message;
  const err = e as {message?: string; code?: string; details?: string};
  const msg = err?.message ?? String(e);
  if (err?.code === '23505' && !/[áéíóú]|Ya /.test(msg)) return 'Ese registro ya existe (dato duplicado).';
  if (err?.code === '42501' && /row-level security/.test(msg)) return 'No tienes permiso para realizar esta acción.';
  if (/Invalid login credentials/i.test(msg)) return 'Correo o contraseña incorrectos.';
  if (/Email not confirmed/i.test(msg)) return 'Confirma tu correo antes de ingresar (revisa tu bandeja).';
  if (/User already registered/i.test(msg)) return 'Ya existe una cuenta con ese correo.';
  if (/Password should be at least/i.test(msg)) return 'La contraseña debe tener al menos 8 caracteres.';
  if (/Failed to fetch|NetworkError/i.test(msg)) return 'No se pudo conectar con el servidor. Revisa tu conexión.';
  if (/rate limit/i.test(msg)) return 'Demasiados intentos. Espera unos minutos.';
  return msg;
}
