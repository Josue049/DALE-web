import {useState, type FormEvent, type ReactNode} from 'react';
import {Link, useNavigate, useSearchParams} from 'react-router-dom';
import {useAuth} from '../../auth/AuthProvider';
import {Logo} from '../../components/layout/Chrome';
import {ActionError, NoSaveNotice, StatusMessage} from '../../components/ui/Feedback';
import {PreviewSubmitted} from '../../components/ui/Modal';
import {useSeo} from '../../hooks/useSeo';

type Mode = 'login' | 'register' | 'recover';

const COPY: Record<Mode, {title: string; eyebrow: string; cta: string}> = {
  login: {eyebrow: 'Ingresar', title: 'Bienvenido de vuelta.', cta: 'Ingresar'},
  register: {eyebrow: 'Crear cuenta', title: 'Empieza a darlo todo.', cta: 'Crear mi cuenta'},
  recover: {eyebrow: 'Recuperar clave', title: 'Recupera tu acceso.', cta: 'Enviar enlace'},
};

export default function AuthPages({mode}: {mode: Mode}) {
  const c = COPY[mode];
  useSeo({title: c.eyebrow, noindex: true});
  const auth = useAuth();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const [preview, setPreview] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);
  const [pw, setPw] = useState('');

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = e.currentTarget;
    setError(null);
    if (!f.checkValidity()) {
      f.reportValidity();
      return;
    }
    const d = new FormData(f);
    if (mode === 'register' && d.get('password') !== d.get('confirm')) {
      setError(new Error('Las contraseñas no coinciden.'));
      return;
    }
    if (auth.demo) {
      setPreview(true);
      return;
    }
    setBusy(true);
    try {
      if (mode === 'login') {
        await auth.signIn(String(d.get('email')), String(d.get('password')));
        nav(params.get('next') || '/mi-cuenta');
      } else if (mode === 'register') {
        const r = await auth.signUp(String(d.get('email')), String(d.get('password')), String(d.get('name')));
        if (r.needsConfirmation) setInfo('Te enviamos un correo para confirmar tu cuenta.');
        else nav('/mi-cuenta');
      } else {
        await auth.sendReset(String(d.get('email')));
        setInfo('Si el correo existe, recibirás un enlace para crear una nueva contraseña.');
      }
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="grid min-h-svh lg:grid-cols-2">
      <AuthVisual />
      <div className="flex items-center px-4 pt-32 pb-16 sm:px-6 md:px-[6vw] lg:pt-28">
        <div className="mx-auto w-full max-w-md">
          <p className="eyebrow">{c.eyebrow}</p>
          <h1 className="mt-3 font-wide text-[clamp(1.9rem,4vw,3rem)] leading-[1] text-blanco">{c.title}</h1>
          <form noValidate onSubmit={submit} className="mt-8 space-y-4">
            <NoSaveNotice />
            {mode === 'register' && (
              <Field label="Nombre completo">
                <input name="name" required minLength={2} autoComplete="name" className="field" />
              </Field>
            )}
            <Field label="Correo">
              <input name="email" type="email" required autoComplete="email" className="field" />
            </Field>
            {mode !== 'recover' && (
              <PasswordField
                name="password"
                label="Contraseña"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                value={pw}
                onChange={setPw}
                meter={mode === 'register'}
              />
            )}
            {mode === 'register' && (
              <Field label="Repite la contraseña">
                <input name="confirm" type="password" required minLength={8} autoComplete="new-password" className="field" />
              </Field>
            )}
            {mode === 'register' && (
              <label className="flex items-start gap-3 text-[0.875rem] text-niebla/85">
                <input type="checkbox" required className="mt-1 size-4 accent-rojo" />
                <span>
                  Acepto los <Link to="/terminos" className="underline">términos</Link> y la <Link to="/privacidad" className="underline">política de privacidad</Link>.
                </span>
              </label>
            )}
            {mode === 'login' && (
              <div className="text-right">
                <Link to="/recuperar-clave" className="font-mono text-[0.6875rem] tracking-[0.1em] text-azul uppercase hover:text-blanco">
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
            )}
            {error != null && <ActionError error={error} />}
            {info && <StatusMessage kind="ok">{info}</StatusMessage>}
            <button type="submit" disabled={busy} className="btn btn-primary w-full">
              {busy ? 'Procesando…' : c.cta}
            </button>
          </form>
          <p className="mt-8 text-center text-[0.9rem] text-niebla/70">
            {mode === 'login' ? (
              <>
                ¿Aún no tienes cuenta? <Link to="/registro" className="text-blanco underline decoration-rojo underline-offset-4">Créala aquí</Link>
              </>
            ) : (
              <>
                ¿Ya tienes cuenta? <Link to="/ingresar" className="text-blanco underline decoration-rojo underline-offset-4">Ingresa</Link>
              </>
            )}
          </p>
          {auth.demo && (
            <p className="mt-6 text-center text-[0.8125rem] text-niebla/55">
              En la vista previa puedes explorar <Link to="/mi-cuenta" className="text-azul underline">tu cuenta</Link>, el <Link to="/jurado" className="text-azul underline">área de jurado</Link> y el <Link to="/admin" className="text-azul underline">panel admin</Link> con datos demo.
            </p>
          )}
        </div>
      </div>
      <PreviewSubmitted
        open={preview}
        onClose={() => setPreview(false)}
        title={mode === 'login' ? 'Inicio de sesión' : mode === 'register' ? 'Registro' : 'Recuperación'}
        summary={<p>{mode === 'recover' ? 'Aquí se enviaría un enlace de recuperación a tu correo.' : 'Aquí se crearía tu sesión y te llevaríamos a tu cuenta.'}</p>}
      />
    </section>
  );
}

function Field({label, children}: {label: string; children: ReactNode}) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
    </label>
  );
}

function strength(pw: string) {
  let s = 0;
  if (pw.length >= 8) s++;
  if (pw.length >= 12) s++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (/[^\w]/.test(pw)) s++;
  return Math.min(4, s);
}

function PasswordField({name, label, autoComplete, value, onChange, meter}: {name: string; label: string; autoComplete: string; value: string; onChange: (v: string) => void; meter?: boolean}) {
  const [show, setShow] = useState(false);
  const s = strength(value);
  const words = ['Muy débil', 'Débil', 'Aceptable', 'Buena', 'Excelente'];
  return (
    <div>
      <label className="block">
        <span className="label">{label}</span>
        <span className="relative block">
          <input name={name} type={show ? 'text' : 'password'} required minLength={8} autoComplete={autoComplete} value={value} onChange={(e) => onChange(e.target.value)} className="field pr-24" />
          <button type="button" onClick={() => setShow((v) => !v)} className="absolute top-1/2 right-3 -translate-y-1/2 font-mono text-[0.625rem] tracking-[0.12em] text-azul uppercase" aria-pressed={show}>
            {show ? 'Ocultar' : 'Mostrar'}
          </button>
        </span>
      </label>
      {meter && (
        <div className="mt-2" aria-live="polite">
          <div className="flex gap-1" aria-hidden="true">
            {[0, 1, 2, 3].map((i) => (
              <span key={i} className={`h-1 flex-1 rounded-full transition-colors ${i < s ? (s < 2 ? 'bg-rojo' : s < 3 ? 'bg-alerta' : 'bg-ok') : 'bg-blanco/10'}`} />
            ))}
          </div>
          <p className="mt-1 font-mono text-[0.625rem] tracking-[0.12em] text-niebla/60 uppercase">{value ? `Seguridad: ${words[s]}` : 'Mínimo 8 caracteres'}</p>
        </div>
      )}
    </div>
  );
}

/** Panel visual: el universo del logo en pequeño, girando lento. */
function AuthVisual() {
  return (
    <div aria-hidden="true" className="relative hidden overflow-hidden bg-tinta lg:block">
      <div className="absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_45%,#1f2a5a,transparent_70%)]" />
      <div className="grain absolute inset-0 opacity-60 mix-blend-soft-light" />
      <svg viewBox="-200 -200 400 400" className="absolute top-[45%] left-1/2 w-[130%] -translate-x-1/2 -translate-y-1/2 animate-[spin_120s_linear_infinite] motion-reduce:animate-none">
        {[60, 80, 104, 132, 166].map((r, i) => (
          <circle key={r} r={r} fill="none" stroke={i % 2 ? '#af286c' : '#db354a'} strokeOpacity={0.8 - i * 0.13} strokeWidth={2 - i * 0.25} strokeDasharray={`0 ${8 + i}`} strokeLinecap="round" />
        ))}
        <path d="M-150 30 A152 152 0 0 1 150 30" fill="none" stroke="#74b1e0" strokeWidth="1.5" strokeOpacity="0.6" />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <Logo eager className="w-[62%] max-w-[560px] mix-blend-lighten [mask-image:radial-gradient(ellipse_62%_64%_at_50%_50%,#000_68%,transparent_100%)]" />
      </div>
      <p className="absolute inset-x-0 bottom-12 text-center font-wide text-[1.1rem] tracking-[0.04em] text-blanco">Aprende. Crea. Compite. Conecta.</p>
    </div>
  );
}
