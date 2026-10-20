import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {lazy, Suspense, type ReactNode} from 'react';
import {BrowserRouter, Route, Routes} from 'react-router-dom';
import {AuthProvider} from './auth/AuthProvider';
import {RequireAuth} from './auth/Guards';
import {Layout} from './components/layout/Layout';
import {Loading} from './components/ui/Feedback';
import Home from './pages/Home';

// La portada carga de inmediato; el resto de rutas se divide en chunks.
const About = lazy(() => import('./pages/About'));
const Events = lazy(() => import('./pages/Events'));
const EventDetail = lazy(() => import('./pages/EventDetail'));
const Contests = lazy(() => import('./pages/Contests'));
const ContestDetail = lazy(() => import('./pages/ContestDetail'));
const Projects = lazy(() => import('./pages/Projects'));
const ProjectDetail = lazy(() => import('./pages/ProjectDetail'));
const Community = lazy(() => import('./pages/Community'));
const Opportunities = lazy(() => import('./pages/Opportunities'));
const OpportunityDetail = lazy(() => import('./pages/OpportunityDetail'));
const Join = lazy(() => import('./pages/Join'));
const Contact = lazy(() => import('./pages/Contact'));
const Legal = lazy(() => import('./pages/Legal'));
const Verify = lazy(() => import('./pages/Verify'));
const NotFound = lazy(() => import('./pages/NotFound'));
const AuthPages = lazy(() => import('./pages/auth/AuthPages'));
const Account = lazy(() => import('./pages/account/Account'));
const Judge = lazy(() => import('./pages/Judge'));
const Admin = lazy(() => import('./pages/admin/Admin'));

const queryClient = new QueryClient({
  defaultOptions: {queries: {staleTime: 60_000, refetchOnWindowFocus: false, retry: 1}},
});

const page = (node: ReactNode) => <Suspense fallback={<div className="min-h-[70svh] pt-32"><Loading /></div>}>{node}</Suspense>;

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<Home />} />
              <Route path="nosotros" element={page(<About />)} />
              <Route path="eventos" element={page(<Events />)} />
              <Route path="eventos/:slug" element={page(<EventDetail />)} />
              <Route path="concursos" element={page(<Contests />)} />
              <Route path="concursos/:slug" element={page(<ContestDetail />)} />
              <Route path="proyectos" element={page(<Projects />)} />
              <Route path="proyectos/:slug" element={page(<ProjectDetail />)} />
              <Route path="comunidad" element={page(<Community />)} />
              <Route path="oportunidades" element={page(<Opportunities />)} />
              <Route path="oportunidades/:slug" element={page(<OpportunityDetail />)} />
              <Route path="unete" element={page(<Join />)} />
              <Route path="contacto" element={page(<Contact />)} />
              <Route path="privacidad" element={page(<Legal kind="privacidad" />)} />
              <Route path="terminos" element={page(<Legal kind="terminos" />)} />
              <Route path="verificar/:token?" element={page(<Verify />)} />
              <Route path="ingresar" element={page(<AuthPages mode="login" />)} />
              <Route path="registro" element={page(<AuthPages mode="register" />)} />
              <Route path="recuperar-clave" element={page(<AuthPages mode="recover" />)} />
              <Route path="mi-cuenta/:tab?" element={page(<RequireAuth><Account /></RequireAuth>)} />
              <Route path="jurado" element={page(<RequireAuth roles={['judge', 'admin']}><Judge /></RequireAuth>)} />
              <Route path="admin/:section?" element={page(<RequireAuth roles={['admin', 'organizer']}><Admin /></RequireAuth>)} />
              <Route path="*" element={page(<NotFound />)} />
            </Route>
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
