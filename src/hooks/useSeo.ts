import {useEffect} from 'react';
import {site} from '../content';

type Seo = {
  title?: string;
  description?: string;
  image?: string;
  type?: 'website' | 'article' | 'event';
  noindex?: boolean;
  /** JSON-LD (p. ej. schema.org/Event) inyectado mientras la ruta está montada. */
  jsonLd?: Record<string, unknown> | null;
};

function setMeta(attr: 'name' | 'property', key: string, value: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.content = value;
}

/**
 * Título, descripción, Open Graph y canonical por ruta. Es una SPA: los
 * buscadores que ejecutan JS lo leen; para el resto, `scripts/postbuild.mjs`
 * escribe HTML con metadatos estáticos de las rutas públicas principales.
 */
export function useSeo({title, description, image, type = 'website', noindex, jsonLd}: Seo) {
  const ld = jsonLd ? JSON.stringify(jsonLd) : '';
  useEffect(() => {
    const fullTitle = title ? `${title} · ${site.name}` : `${site.name} — No importa qué estudies`;
    document.title = fullTitle;
    const desc = description || site.description;
    const url = site.url + location.pathname;
    setMeta('name', 'description', desc);
    setMeta('property', 'og:title', fullTitle);
    setMeta('property', 'og:description', desc);
    setMeta('property', 'og:type', type === 'event' ? 'website' : type);
    setMeta('property', 'og:url', url);
    setMeta('property', 'og:image', image?.startsWith('http') ? image : site.url + (image || '/brand/og.jpg'));
    setMeta('name', 'robots', noindex ? 'noindex, nofollow' : 'index, follow');
    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = url;

    let script: HTMLScriptElement | null = null;
    if (ld) {
      script = document.createElement('script');
      script.type = 'application/ld+json';
      script.textContent = ld;
      document.head.appendChild(script);
    }
    return () => script?.remove();
  }, [title, description, image, type, noindex, ld]);
}
