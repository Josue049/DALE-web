import {PGlite} from '@electric-sql/pglite';
import {readdirSync, readFileSync} from 'node:fs';
import {join} from 'node:path';

/**
 * Postgres real (PGlite/WASM) con un shim mínimo de Supabase:
 * esquema `auth`, `auth.uid()` y roles `anon` / `authenticated`.
 * Las migraciones y el seed se cargan tal cual se aplican en Supabase.
 */

const root = join(import.meta.dirname, '..', '..', 'supabase');

const SHIM = `
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create schema auth;
grant usage on schema auth to anon, authenticated;
create table auth.users (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  raw_user_meta_data jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
grant execute on function auth.uid() to anon, authenticated;
`;

export type Db = PGlite & {
  as<T>(uid: string | null, fn: () => Promise<T>): Promise<T>;
  createUser(email: string, fullName?: string): Promise<string>;
};

export async function createDb({seed = true} = {}): Promise<Db> {
  const db = new PGlite() as Db;
  await db.exec(SHIM);
  const migrations = readdirSync(join(root, 'migrations')).filter((f) => f.endsWith('.sql')).sort();
  for (const file of migrations) {
    await db.exec(readFileSync(join(root, 'migrations', file), 'utf8'));
  }
  if (seed) await db.exec(readFileSync(join(root, 'seed.sql'), 'utf8'));

  // Ejecuta `fn` como un cliente con el JWT de `uid` (o anónimo si es null).
  db.as = async (uid, fn) => {
    await db.exec(`set role ${uid ? 'authenticated' : 'anon'}`);
    await db.query(`select set_config('request.jwt.claim.sub', $1, false)`, [uid ?? '']);
    try {
      return await fn();
    } finally {
      await db.exec('reset role');
      await db.query(`select set_config('request.jwt.claim.sub', '', false)`);
    }
  };

  db.createUser = async (email, fullName = '') => {
    const res = await db.query<{id: string}>(
      `insert into auth.users (email, raw_user_meta_data) values ($1, jsonb_build_object('full_name', $2::text)) returning id`,
      [email, fullName],
    );
    return res.rows[0].id;
  };

  return db;
}

/** Ejecuta y devuelve el mensaje de error de Postgres (o null si no falló). */
export async function errorOf(p: Promise<unknown>): Promise<string | null> {
  try {
    await p;
    return null;
  } catch (e) {
    return (e as Error).message;
  }
}
