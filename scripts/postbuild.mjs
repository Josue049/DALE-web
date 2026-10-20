// Tras `vite build`: sitemap.xml, robots.txt, HTML con metadatos estáticos por
// ruta pública (para buscadores/redes que no ejecutan JS) y fallback SPA.
import {mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';

const dist = 'dist';
const site = (process.env.VITE_SITE_URL || 'https://daleconto.do').replace(/\/$/, '');
const routes = [
  ['/', 'DALE CON TODO — No importa qué estudies', 'Comunidad multidisciplinaria nacida entre estudiantes de la UTP: concursos, webinars, proyectos entre carreras, voluntariado y networking.'],
  ['/nosotros', 'Nosotros · DALE CON TODO', 'Historia, misión, visión y valores de la comunidad.'],
  ['/eventos', 'Eventos · DALE CON TODO', 'Webinars, talleres, conferencias, encuentros y voluntariados. Horarios en hora de Lima.'],
  ['/concursos', 'Concursos · DALE CON TODO', 'Dale Challenge: retos individuales o por equipos con bases, cronograma, jurado y premios.'],
  ['/proyectos', 'Proyectos · DALE CON TODO', 'Dale Lab: proyectos estudiantiles interdisciplinarios.'],
  ['/comunidad', 'Comunidad · DALE CON TODO', 'Dale Network: perfiles opt-in y credencial comunitaria.'],
  ['/oportunidades', 'Oportunidades · DALE CON TODO', 'Dale Future: convocatorias, mentorías, prácticas, becas y voluntariado.'],
  ['/unete', 'Únete · DALE CON TODO', 'Súmate a la comunidad multidisciplinaria.'],
  ['/contacto', 'Contacto · DALE CON TODO', 'Consultas, alianzas y propuestas.'],
  ['/privacidad', 'Privacidad · DALE CON TODO', 'Política de privacidad.'],
  ['/terminos', 'Términos · DALE CON TODO', 'Términos de uso.'],
];

const base = readFileSync(join(dist, 'index.html'), 'utf8');
const esc = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
for (const [path, title, desc] of routes) {
  let html = base
    .replace(/<title>.*?<\/title>/, `<title>${esc(title)}</title>`)
    .replace(/(<meta name="description" content=")[^"]*/, `$1${esc(desc)}`)
    .replace(/(<meta property="og:title" content=")[^"]*/, `$1${esc(title)}`)
    .replace(/(<meta property="og:description" content=")[^"]*/, `$1${esc(desc)}`)
    .replace('</head>', `    <link rel="canonical" href="${site}${path === '/' ? '/' : path}" />\n    <meta property="og:url" content="${site}${path}" />\n  </head>`);
  if (path === '/') {
    writeFileSync(join(dist, 'index.html'), html);
  } else {
    mkdirSync(join(dist, path), {recursive: true});
    writeFileSync(join(dist, path, 'index.html'), html);
  }
}
writeFileSync(join(dist, '404.html'), base);
const today = new Date().toISOString().slice(0, 10);
writeFileSync(
  join(dist, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${routes.map(([p]) => `  <url><loc>${site}${p}</loc><lastmod>${today}</lastmod></url>`).join('\n')}\n</urlset>\n`,
);
writeFileSync(join(dist, 'robots.txt'), `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /jurado\nDisallow: /mi-cuenta\nSitemap: ${site}/sitemap.xml\n`);
console.log(`postbuild: ${routes.length} rutas con metadatos, sitemap.xml, robots.txt y 404.html`);
