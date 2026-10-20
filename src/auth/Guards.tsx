import type {ReactNode} from 'react';
import {Link, Navigate, useLocation} from 'react-router-dom';
import {Spinner} from '../components/ui/Feedback';
import type {Role} from '../data/types';
import {useAuth} from './AuthProvider';

/**
 * Protege rutas privadas. La seguridad real está en RLS (Postgres): esto solo
 * evita mostrar pantallas a quien no corresponde.
 * En modo vista previa se deja ver el área en solo lectura con aviso DEMO.
 */
export function RequireAuth({children, roles}: {children: ReactNode; roles?: Role[]}) {
  const {ready, user, roles: mine, demo} = useAuth();
  const location = useLocation();

  if (demo) return <>{children}</>;
  if (!ready) {
    return (
      <div className="grid min-h-[60svh] place-items-center">
        <Spinner label="Verificando tu sesión" />
      </div>
    );
  }
  if (!user) return <Navigate to={`/ingresar?next=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  if (roles && !roles.some((r) => mine.includes(r))) {
    return (
      <section className="mx-auto grid min-h-[60svh] max-w-xl place-content-center gap-4 px-4 pt-28 text-center">
        <p className="eyebrow">Acceso restringido</p>
        <h1 className="font-wide text-title text-blanco">No tienes permisos para esta sección</h1>
        <p className="text-body">Si crees que es un error, escribe a la organización desde la página de contacto.</p>
        <div>
          <Link to="/mi-cuenta" className="btn btn-ghost">
            Ir a mi cuenta
          </Link>
        </div>
      </section>
    );
  }
  return <>{children}</>;
}
