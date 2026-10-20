import {Link} from 'react-router-dom';
import {useSeo} from '../hooks/useSeo';

export default function NotFound({what, back = '/'}: {what?: string; back?: string}) {
  useSeo({title: 'No encontrado', noindex: true});
  return (
    <section className="relative grid min-h-[86svh] place-items-center overflow-hidden px-4 pt-28 pb-16 text-center">
      <svg aria-hidden="true" viewBox="0 0 400 400" className="pointer-events-none absolute top-1/2 left-1/2 size-[44rem] -translate-x-1/2 -translate-y-1/2 animate-[spin_80s_linear_infinite] opacity-60 motion-reduce:animate-none">
        {[180, 150, 120, 90].map((r, i) => (
          <circle key={r} cx="200" cy="200" r={r} fill="none" stroke={i % 2 ? '#af286c' : '#db354a'} strokeWidth={2.8 - i * 0.4} strokeDasharray={`0 ${10 + i * 2}`} strokeLinecap="round" />
        ))}
        <path d="M40 260 A170 170 0 0 1 300 60" fill="none" stroke="#74b1e0" strokeWidth="3" strokeLinecap="round" />
      </svg>
      <div className="relative">
        <p className="font-wide text-[clamp(6rem,22vw,16rem)] leading-[0.8] text-blanco [text-shadow:0_0.04em_0_#c3c9da,0_0.08em_0_#db354a]">404</p>
        <h1 className="mt-6 font-wide text-title text-blanco">{what ? `No encontramos este ${what}` : 'Esta página se salió de la cancha'}</h1>
        <p className="mx-auto mt-3 max-w-md text-body text-niebla/75">Puede que el enlace haya cambiado o que el contenido ya no esté publicado.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link to={back} className="btn btn-primary">
            {back === '/' ? 'Volver al inicio' : 'Volver al listado'}
          </Link>
          <Link to="/eventos" className="btn btn-ghost">
            Ver eventos
          </Link>
        </div>
      </div>
    </section>
  );
}
