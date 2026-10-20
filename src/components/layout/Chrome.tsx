import {useEffect, useRef, useState} from 'react';
import {Link, NavLink, useLocation} from 'react-router-dom';
import {useAuth} from '../../auth/AuthProvider';
import {nav, site} from '../../content';
import {onFrame} from '../../lib/scroll';
import {DemoBanner} from '../ui/Feedback';

/** El logo oficial, sin redibujar ni deformar (proporción 1264×843). */
export function Logo({className = '', eager = false}: {className?: string; eager?: boolean}) {
  return (
    <img
      src={site.logo.srcSmall}
      alt={site.logo.alt}
      width={site.logo.width}
      height={site.logo.height}
      decoding="async"
      loading={eager ? 'eager' : 'lazy'}
      className={`aspect-[1264/843] h-auto object-contain ${className}`}
    />
  );
}

/**
 * Header portado de SELENE (Chrome.tsx): navegación de alto nivel y menú
 * móvil accesible. El fondo aparece al hacer scroll leyendo la posición en
 * el mismo loop rAF (sin estado de React por frame).
 */
export function Header() {
  const [open, setOpen] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const location = useLocation();
  const {user, isStaff, isJudge, demo} = useAuth();

  // Cierra el menú al navegar.
  useEffect(() => setOpen(false), [location.pathname]);

  useEffect(() => {
    let solid = false;
    return onFrame(() => {
      const next = window.scrollY > 24;
      if (next === solid || !barRef.current) return;
      solid = next;
      barRef.current.dataset.solid = String(next);
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    menuRef.current?.querySelector<HTMLElement>('a')?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        toggleRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.documentElement.style.overflow = '';
    };
  }, [open]);

  const account = user || demo ? {to: '/mi-cuenta', label: 'Mi cuenta'} : {to: '/ingresar', label: 'Ingresar'};

  return (
    <header className="fixed inset-x-0 top-0 z-50 text-blanco">
      <a href="#contenido" className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-[70] focus:rounded-full focus:bg-blanco focus:px-4 focus:py-2 focus:text-noche">
        Saltar al contenido
      </a>
      <DemoBanner />
      <div
        ref={barRef}
        data-solid="false"
        className="flex items-center justify-between gap-4 px-4 py-3 transition-[background-color,box-shadow] duration-300 data-[solid=true]:bg-noche/88 data-[solid=true]:shadow-[0_1px_0_rgb(245_247_251/0.08)] data-[solid=true]:backdrop-blur-md sm:px-6 md:px-[3vw]"
      >
        <Link to="/" className="flex shrink-0 items-center gap-3" aria-label={`${site.name} — inicio`}>
          <Logo eager className="w-[4.5rem] rounded-md md:w-[5.25rem]" />
        </Link>
        <nav aria-label="Principal" className="hidden items-center gap-6 lg:flex xl:gap-8">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({isActive}) => `font-mono text-label uppercase transition-colors hover:text-blanco ${isActive ? 'text-blanco underline decoration-rojo decoration-2 underline-offset-8' : 'text-blanco/70'}`}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          {(isStaff || isJudge) && (
            <Link to={isStaff ? '/admin' : '/jurado'} className="hidden font-mono text-label text-azul uppercase hover:text-blanco md:inline">
              {isStaff ? 'Panel' : 'Jurado'}
            </Link>
          )}
          <Link to={account.to} className="btn btn-ghost btn-sm hidden sm:inline-flex">
            {account.label}
          </Link>
          <Link to="/unete" className="btn btn-primary btn-sm">
            Únete
          </Link>
          <button
            ref={toggleRef}
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="menu-movil"
            className="ml-1 grid size-10 place-items-center rounded-full ring-1 ring-blanco/25 lg:hidden"
          >
            <span className="sr-only">{open ? 'Cerrar menú' : 'Abrir menú'}</span>
            <span aria-hidden="true" className="relative block h-3 w-4">
              <span className={`absolute left-0 h-0.5 w-4 bg-current transition-transform ${open ? 'top-1.5 rotate-45' : 'top-0'}`} />
              <span className={`absolute top-1.5 left-0 h-0.5 w-4 bg-current transition-opacity ${open ? 'opacity-0' : ''}`} />
              <span className={`absolute left-0 h-0.5 w-4 bg-current transition-transform ${open ? 'top-1.5 -rotate-45' : 'top-3'}`} />
            </span>
          </button>
        </div>
      </div>
      <div
        id="menu-movil"
        ref={menuRef}
        inert={!open}
        className={`fixed inset-0 -z-10 flex flex-col justify-center gap-5 overflow-y-auto bg-noche/97 px-6 pt-20 pb-10 backdrop-blur-xl transition-opacity lg:hidden ${open ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
      >
        <nav aria-label="Menú móvil" className="flex flex-col gap-5">
          {nav.map((item, i) => (
            <NavLink key={item.to} to={item.to} className="flex items-baseline gap-4 font-wide text-[1.6rem] text-blanco">
              <span className="font-mono text-label text-rojo">0{i + 1}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link to={account.to} className="btn btn-ghost">
            {account.label}
          </Link>
          {(isStaff || isJudge) && (
            <Link to={isStaff ? '/admin' : '/jurado'} className="btn btn-ghost">
              {isStaff ? 'Panel admin' : 'Área de jurado'}
            </Link>
          )}
          <Link to="/contacto" className="btn btn-ghost">
            Contacto
          </Link>
        </div>
      </div>
    </header>
  );
}

const footerCols = [
  {title: 'Participa', links: [['Eventos', '/eventos'], ['Concursos', '/concursos'], ['Proyectos', '/proyectos'], ['Oportunidades', '/oportunidades']]},
  {title: 'Comunidad', links: [['Nosotros', '/nosotros'], ['Comunidad', '/comunidad'], ['Únete', '/unete'], ['Contacto', '/contacto']]},
  {title: 'Cuenta', links: [['Ingresar', '/ingresar'], ['Crear cuenta', '/registro'], ['Mi cuenta', '/mi-cuenta'], ['Verificar certificado', '/verificar']]},
  {title: 'Legal', links: [['Privacidad', '/privacidad'], ['Términos', '/terminos']]},
];

export function Footer() {
  return (
    <footer className="relative border-t border-blanco/10 bg-tinta px-4 pt-16 pb-10 sm:px-6 md:px-[6vw]">
      <div className="grid gap-12 md:grid-cols-[1.2fr_2fr]">
        <div>
          <Logo className="w-40 rounded-lg" />
          <p className="mt-6 max-w-sm font-wide text-[1rem] leading-tight text-blanco">Aprende. Crea. Compite. Conecta.</p>
          <p className="mt-4 max-w-sm text-[0.8125rem] leading-relaxed text-niebla/60">{site.disclaimer}</p>
        </div>
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          {footerCols.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <p className="font-mono text-label text-gris uppercase">{col.title}</p>
              <ul className="mt-4 space-y-2.5">
                {col.links.map(([label, to]) => (
                  <li key={to}>
                    <Link to={to} className="text-[0.9rem] text-niebla/85 transition-colors hover:text-blanco">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
      </div>
      <div className="mt-14 flex flex-col gap-3 border-t border-blanco/10 pt-6 font-mono text-[0.625rem] tracking-[0.14em] text-niebla/45 uppercase md:flex-row md:justify-between">
        <span>© {new Date().getFullYear()} {site.name} · Comunidad estudiantil</span>
        <span>Horarios en hora de Lima (UTC−5)</span>
      </div>
    </footer>
  );
}
