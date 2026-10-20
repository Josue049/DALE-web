import type {Session, User} from '@supabase/supabase-js';
import {useQuery, useQueryClient} from '@tanstack/react-query';
import {createContext, useContext, useEffect, useMemo, useState, type ReactNode} from 'react';
import {getMyRoles, getProfile} from '../data/api';
import {demoProfile} from '../data/demo';
import type {Profile, Role} from '../data/types';
import {db, isDemoMode, supabase} from '../lib/supabase';

type AuthState = {
  ready: boolean;
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  roles: Role[];
  isStaff: boolean;
  isAdmin: boolean;
  isJudge: boolean;
  /** Modo vista previa: sin backend, las áreas privadas se muestran en solo lectura. */
  demo: boolean;
  refreshProfile: () => void;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<{needsConfirmation: boolean}>;
  signOut: () => Promise<void>;
  sendReset: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
};

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({children}: {children: ReactNode}) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(isDemoMode);
  const qc = useQueryClient();

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({data}) => {
      setSession(data.session);
      setReady(true);
    });
    const {data} = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      qc.invalidateQueries();
    });
    return () => data.subscription.unsubscribe();
  }, [qc]);

  const user = session?.user ?? null;
  const profileQ = useQuery({queryKey: ['profile', user?.id], queryFn: () => getProfile(user!.id), enabled: !!user});
  const rolesQ = useQuery({queryKey: ['roles', user?.id], queryFn: () => getMyRoles(user!.id), enabled: !!user});

  const value = useMemo<AuthState>(() => {
    const roles = isDemoMode ? [] : (rolesQ.data ?? []);
    return {
      ready: ready && (!user || (profileQ.isFetched && rolesQ.isFetched)),
      session,
      user,
      profile: isDemoMode ? demoProfile : (profileQ.data ?? null),
      roles,
      isStaff: roles.includes('admin') || roles.includes('organizer'),
      isAdmin: roles.includes('admin'),
      isJudge: roles.includes('judge'),
      demo: isDemoMode,
      refreshProfile: () => {
        qc.invalidateQueries({queryKey: ['profile']});
        qc.invalidateQueries({queryKey: ['roles']});
      },
      signIn: async (email, password) => {
        const {error} = await db().auth.signInWithPassword({email, password});
        if (error) throw error;
      },
      signUp: async (email, password, fullName) => {
        const {data, error} = await db().auth.signUp({
          email,
          password,
          options: {data: {full_name: fullName}, emailRedirectTo: `${location.origin}/mi-cuenta`},
        });
        if (error) throw error;
        return {needsConfirmation: !data.session};
      },
      signOut: async () => {
        await db().auth.signOut();
        qc.clear();
      },
      sendReset: async (email) => {
        const {error} = await db().auth.resetPasswordForEmail(email, {redirectTo: `${location.origin}/recuperar-clave`});
        if (error) throw error;
      },
      updatePassword: async (password) => {
        const {error} = await db().auth.updateUser({password});
        if (error) throw error;
      },
    };
  }, [ready, session, user, profileQ.data, profileQ.isFetched, rolesQ.data, rolesQ.isFetched, qc]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth fuera de AuthProvider');
  return v;
}
