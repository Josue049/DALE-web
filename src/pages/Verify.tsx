import {useState, type FormEvent} from 'react';
import {useNavigate, useParams} from 'react-router-dom';
import {StatusMessage} from '../components/ui/Feedback';
import {PageHeader, Section} from '../components/ui/Page';
import {demoRecognitions} from '../data/demo';
import {isDemoMode} from '../lib/supabase';
import {useSeo} from '../hooks/useSeo';
import {fmtDate} from '../lib/format';

export default function Verify() {
  useSeo({title: 'Verificar certificado', description: 'Comprueba la autenticidad de un certificado o insignia de DALE CON TODO.', noindex: true});
  const {token = ''} = useParams();
  const nav = useNavigate();
  const [value, setValue] = useState(token);
  const found = token ? demoRecognitions.find((r) => r.verify_token === token) : undefined;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const v = value.trim();
    if (v) nav(`/verificar/${encodeURIComponent(v)}`);
  };

  return (
    <>
      <PageHeader eyebrow="Reconocimientos" title="Verificar un certificado" intro="Ingresa el código que aparece en el certificado o insignia. Mostramos solo lo necesario para confirmar su autenticidad." tone="azul" />
      <Section className="pb-28">
        <form onSubmit={submit} className="flex max-w-2xl flex-col gap-3 sm:flex-row" role="search">
          <label htmlFor="code" className="sr-only">
            Código de verificación
          </label>
          <input id="code" value={value} onChange={(e) => setValue(e.target.value)} className="field font-mono" placeholder="Código de 64 caracteres" />
          <button type="submit" className="btn btn-primary">
            Verificar
          </button>
        </form>
        <div className="mt-8 max-w-2xl" aria-live="polite">
          {token && found && (
            <div className="relative overflow-hidden rounded-[24px] bg-noche-2 p-7 ring-1 ring-ok/40">
              <p className="font-mono text-label text-ok uppercase">✓ Reconocimiento auténtico {isDemoMode && '· demo'}</p>
              <p className="mt-3 font-wide text-[1.4rem] leading-tight text-blanco">{found.title}</p>
              <p className="mt-2 text-body">
                Otorgado a <strong className="text-blanco">{found.holder_name}</strong> el {fmtDate(found.issued_at)}.
              </p>
            </div>
          )}
          {token && !found && <StatusMessage kind="warn">No encontramos un reconocimiento con ese código{isDemoMode ? ' en los datos de demostración' : ''}. Revisa que esté completo.</StatusMessage>}
          {!token && isDemoMode && (
            <p className="text-[0.875rem] text-niebla/60">
              Prueba con un código de demostración:{' '}
              <button type="button" className="font-mono text-azul underline" onClick={() => setValue(demoRecognitions[0].verify_token)}>
                usar código demo
              </button>
            </p>
          )}
        </div>
      </Section>
    </>
  );
}
