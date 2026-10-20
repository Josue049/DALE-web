import type {LineKey} from '../../content';

/**
 * Ilustraciones originales por línea, construidas con la geometría y paleta
 * del logo (sin fotografías de stock ni imágenes ajenas). El panel admin
 * puede sustituirlas por fotos propias (content_sections → home.reel).
 */
export function LineArt({line, className = ''}: {line: LineKey; className?: string}) {
  const common = {viewBox: '0 0 300 400', className, 'aria-hidden': true as const, preserveAspectRatio: 'xMidYMid slice'};
  const bg = (
    <>
      <rect width="300" height="400" fill="#151e3c" />
      <rect width="300" height="400" fill={`url(#g-${line})`} />
    </>
  );
  switch (line) {
    case 'challenge':
      // Podio y arcos de victoria.
      return (
        <svg {...common}>
          <defs>
            <radialGradient id="g-challenge" cx="50%" cy="30%" r="80%">
              <stop offset="0" stopColor="#db354a" stopOpacity="0.55" />
              <stop offset="1" stopColor="#101831" stopOpacity="0" />
            </radialGradient>
          </defs>
          {bg}
          {[150, 120, 90].map((r, i) => (
            <path key={r} d={`M${150 - r} 250 A${r} ${r} 0 0 1 ${150 + r} 250`} fill="none" stroke={i === 1 ? '#74b1e0' : '#db354a'} strokeWidth={3 - i * 0.6} strokeDasharray={i === 0 ? '0 9' : undefined} strokeLinecap="round" opacity={0.9 - i * 0.15} />
          ))}
          <rect x="105" y="230" width="90" height="170" fill="#f5f7fb" opacity="0.95" />
          <rect x="30" y="280" width="75" height="120" fill="#c9cfdd" />
          <rect x="195" y="300" width="75" height="100" fill="#9aa3bd" />
          <text x="150" y="300" textAnchor="middle" fontFamily="Archivo, sans-serif" fontWeight="900" fontSize="56" fill="#101831">1</text>
          <circle cx="150" cy="150" r="10" fill="#f5f7fb" />
        </svg>
      );
    case 'talks':
      // Ondas concéntricas de voz desde un micrófono.
      return (
        <svg {...common}>
          <defs>
            <radialGradient id="g-talks" cx="50%" cy="55%" r="70%">
              <stop offset="0" stopColor="#74b1e0" stopOpacity="0.45" />
              <stop offset="1" stopColor="#101831" stopOpacity="0" />
            </radialGradient>
          </defs>
          {bg}
          {[40, 70, 100, 130, 160, 190].map((r, i) => (
            <circle key={r} cx="150" cy="220" r={r} fill="none" stroke={i % 2 ? '#af286c' : '#74b1e0'} strokeWidth={2.2 - i * 0.25} strokeDasharray={i > 2 ? `0 ${8 + i}` : undefined} strokeLinecap="round" opacity={1 - i * 0.13} />
          ))}
          <rect x="132" y="170" width="36" height="66" rx="18" fill="#f5f7fb" />
          <path d="M118 222 a32 32 0 0 0 64 0" fill="none" stroke="#f5f7fb" strokeWidth="5" />
          <rect x="146" y="254" width="8" height="30" fill="#f5f7fb" />
          <rect x="128" y="282" width="44" height="7" rx="3" fill="#f5f7fb" />
        </svg>
      );
    case 'lab':
      // Retícula de proyecto y piezas que encajan entre carreras.
      return (
        <svg {...common}>
          <defs>
            <linearGradient id="g-lab" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#af286c" stopOpacity="0.5" />
              <stop offset="1" stopColor="#101831" stopOpacity="0" />
            </linearGradient>
          </defs>
          {bg}
          {Array.from({length: 11}, (_, i) => (
            <line key={`v${i}`} x1={i * 30} y1="0" x2={i * 30} y2="400" stroke="#f5f7fb" strokeOpacity="0.06" />
          ))}
          {Array.from({length: 14}, (_, i) => (
            <line key={`h${i}`} x1="0" y1={i * 30} x2="300" y2={i * 30} stroke="#f5f7fb" strokeOpacity="0.06" />
          ))}
          <rect x="60" y="120" width="90" height="90" fill="#db354a" />
          <rect x="150" y="120" width="90" height="90" fill="none" stroke="#74b1e0" strokeWidth="3" />
          <rect x="60" y="210" width="90" height="90" fill="none" stroke="#f5f7fb" strokeWidth="3" />
          <rect x="150" y="210" width="90" height="90" fill="#af286c" />
          <circle cx="150" cy="210" r="16" fill="#f5f7fb" />
          <path d="M40 330 L260 330" stroke="#74b1e0" strokeWidth="2" strokeDasharray="0 9" strokeLinecap="round" />
        </svg>
      );
    case 'network':
      // Nodos conectados: personas de distintas carreras.
      return (
        <svg {...common}>
          <defs>
            <radialGradient id="g-network" cx="50%" cy="50%" r="70%">
              <stop offset="0" stopColor="#af286c" stopOpacity="0.45" />
              <stop offset="1" stopColor="#101831" stopOpacity="0" />
            </radialGradient>
          </defs>
          {bg}
          {(() => {
            const pts = [[150, 200], [70, 120], [230, 110], [60, 280], [240, 290], [150, 70], [150, 330], [100, 200], [205, 205]];
            const edges = [[0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [0, 6], [1, 5], [2, 5], [3, 6], [4, 6], [1, 7], [2, 8], [7, 3], [8, 4]];
            return (
              <>
                {edges.map(([a, b], i) => (
                  <line key={i} x1={pts[a][0]} y1={pts[a][1]} x2={pts[b][0]} y2={pts[b][1]} stroke="#74b1e0" strokeOpacity="0.45" strokeWidth="1.4" />
                ))}
                {pts.map(([x, y], i) => (
                  <circle key={i} cx={x} cy={y} r={i === 0 ? 18 : 8 + (i % 3) * 2} fill={i === 0 ? '#f5f7fb' : i % 2 ? '#db354a' : '#74b1e0'} />
                ))}
              </>
            );
          })()}
        </svg>
      );
    case 'future':
      // Trayectoria ascendente hacia un horizonte de anillos.
      return (
        <svg {...common}>
          <defs>
            <linearGradient id="g-future" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0" stopColor="#db354a" stopOpacity="0.5" />
              <stop offset="1" stopColor="#101831" stopOpacity="0" />
            </linearGradient>
          </defs>
          {bg}
          {[60, 90, 120].map((r, i) => (
            <circle key={r} cx="220" cy="90" r={r} fill="none" stroke="#f5f7fb" strokeOpacity={0.25 - i * 0.06} strokeDasharray="0 8" strokeLinecap="round" strokeWidth="2" />
          ))}
          <circle cx="220" cy="90" r="22" fill="#f5f7fb" />
          <path d="M30 360 C 90 340, 120 260, 160 220 S 200 130, 220 90" fill="none" stroke="#db354a" strokeWidth="4" strokeLinecap="round" />
          <path d="M30 360 C 90 340, 120 260, 160 220 S 200 130, 220 90" fill="none" stroke="#74b1e0" strokeWidth="1.4" strokeDasharray="0 10" strokeLinecap="round" transform="translate(-12 6)" />
          <circle cx="30" cy="360" r="7" fill="#74b1e0" />
        </svg>
      );
  }
}
