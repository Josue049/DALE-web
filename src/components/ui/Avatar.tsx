/** Retrato geométrico de marca cuando no hay foto (sin rostros inventados). */
export function Avatar({name, index = 0, src, size = 'lg'}: {name: string; index?: number; src?: string | null; size?: 'sm' | 'lg'}) {
  const initials = name
    .replace(/\(.*?\)/g, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
  const tones = ['from-rojo to-magenta', 'from-azul to-magenta', 'from-magenta to-rojo', 'from-azul to-noche-3'];
  const dim = size === 'lg' ? 'aspect-square w-full rounded-[20px]' : 'size-12 rounded-full';
  if (src) return <img src={src} alt="" loading="lazy" className={`${dim} object-cover`} />;
  return (
    <div aria-hidden="true" className={`relative grid ${dim} place-items-center overflow-hidden bg-gradient-to-br ${tones[index % tones.length]}`}>
      <svg viewBox="0 0 100 100" className="absolute inset-0 size-full opacity-40">
        <circle cx="50" cy="50" r="40" fill="none" stroke="#f5f7fb" strokeWidth="1.5" strokeDasharray="0 6" strokeLinecap="round" />
        <circle cx="50" cy="50" r="28" fill="none" stroke="#f5f7fb" strokeWidth="1" />
      </svg>
      <span className={`relative font-wide text-blanco ${size === 'lg' ? 'text-[2rem]' : 'text-[0.9rem]'}`}>{initials}</span>
    </div>
  );
}
