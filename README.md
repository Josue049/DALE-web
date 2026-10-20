# DALE CON TODO

Sitio web de **DALE CON TODO**, una comunidad multidisciplinaria de estudiantes de la UTP.

> No importa qué estudies. Importa hasta dónde quieres llegar.

La web reúne eventos, concursos, proyectos y oportunidades de la comunidad, e incluye un área para miembros, un panel de jurado para evaluar concursos y un panel de administración.

## Stack

- **Frontend:** React 19, TypeScript, Vite 6, Tailwind CSS v4
- **Routing y datos:** React Router 7, TanStack Query
- **Scroll y animación:** Lenis con un único loop `requestAnimationFrame`, sin librerías de animación adicionales
- **Backend:** Supabase (Postgres, Auth, Storage, RLS y funciones RPC)
- **Tests:** Vitest + PGlite para la base de datos y Playwright para E2E
- **Deploy:** Vercel (también funciona en Netlify)

## Estado del proyecto

El frontend está completo y se puede navegar por todo. Ahora mismo funciona en **modo vista previa**: si no configuras las variables de Supabase, la app carga datos de ejemplo desde `src/data/demo.ts` y los formularios validan, pero no guardan nada. La interfaz marca este contenido como «Demo».

El backend (esquema, políticas de seguridad, RPCs y seed) está en `supabase/` y se conectará en la siguiente fase.

## Empezar

Requisitos: Node.js 20.12 o superior.

```bash
git clone https://github.com/Josue049/DALE-web.git
cd DALE-web
npm install
npm run dev
```

La app queda disponible en `http://localhost:3006`.

### Variables de entorno

Copia `.env.example` a `.env` y completa los valores:

| Variable | Descripción |
|---|---|
| `VITE_SUPABASE_URL` | URL del proyecto de Supabase |
| `VITE_SUPABASE_ANON_KEY` | Clave pública (anon) de Supabase |
| `VITE_SITE_URL` | URL pública del sitio, para canonical, Open Graph y sitemap |
| `VITE_EMAIL_NOTIFICATIONS` | `true` si está desplegada la Edge Function de notificaciones |
| `SUPABASE_SERVICE_ROLE_KEY` | Solo para scripts de servidor. No la expongas en el cliente |

Sin `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`, la app arranca en modo vista previa.

## Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción y post-build (sitemap, robots, metadatos por ruta, 404) |
| `npm run preview` | Sirve `dist/` en local |
| `npm run lint` | Comprobación de tipos con `tsc --noEmit` |
| `npm test` | Tests de base de datos (migraciones, RLS y flujos) sobre PGlite |
| `npm run test:e2e` | Tests end-to-end con Playwright, en escritorio y móvil |
| `npm run make-admin -- <correo>` | Da el rol de administrador a un usuario ya registrado. Requiere `SUPABASE_SERVICE_ROLE_KEY` |

## Estructura

```
src/
  auth/          Sesión y guards de rutas
  components/
    home/        Secciones de la portada
    layout/      Header, footer y layout general
    ui/          Componentes reutilizables
  data/          Tipos, capa de acceso a datos y contenido demo
  hooks/         Reduced motion, reveals, SEO, ajuste de texto
  lib/           Motor de scroll, utilidades y cliente de Supabase
  pages/         Rutas públicas, cuenta, jurado y admin
supabase/
  migrations/    Esquema, seguridad (RLS), RPCs y storage
  seed.sql
tests/db/        Tests de base de datos
e2e/             Tests end-to-end
scripts/         Post-build y capturas de pantalla
```

## Funcionalidades

**Sitio público:** portada, nosotros, eventos, concursos, proyectos, comunidad, oportunidades, formulario para unirse, contacto y verificación de credenciales.

**Área de miembros:** perfil, credencial descargable, inscripciones, equipos y reconocimientos.

**Jurado:** evaluación de entregas por rúbrica.

**Administración:** gestión de contenido, eventos, inscripciones, concursos, equipos, entregas, jurados, proyectos, oportunidades, usuarios, solicitudes, equipo, aliados y multimedia. Incluye estadísticas y exportación a CSV.

## Accesibilidad y rendimiento

- Se puede navegar con teclado, el foco siempre es visible y hay un enlace «Saltar al contenido».
- Los diálogos son nativos (`<dialog>`) y los cambios de estado se anuncian a lectores de pantalla.
- Se respeta `prefers-reduced-motion`.
- Las gráficas tienen una versión alternativa en tabla.
- Las rutas se cargan bajo demanda y las animaciones solo se calculan para las secciones visibles.

## Despliegue

El proyecto incluye `vercel.json` y `public/_redirects` para que el enrutado SPA funcione en Vercel y Netlify. Para desplegar, ejecuta `npm run build`, publica la carpeta `dist/` y define `VITE_SITE_URL` en el entorno.

## Créditos

El motor de scroll y las escenas animadas parten del proyecto SELENE. En [`docs/selene-migration.md`](docs/selene-migration.md) se detalla cómo se adaptó cada parte.

El logo y la identidad visual pertenecen a DALE CON TODO.

## Licencia

El código se distribuye bajo la licencia [MIT](LICENSE). El logo y la identidad visual de DALE CON TODO no están incluidos en esta licencia.
