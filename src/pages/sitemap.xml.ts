import type { APIRoute } from 'astro';
import { getProjects } from '../lib/projects';
import { url } from '../i18n/ui';

/** sitemap.xml avec alternates hreflang FR/EN. */
export const GET: APIRoute = async ({ site }) => {
  const abs = (p: string) => new URL(url(p), site).href;
  const pairs: { fr: string; en: string }[] = [{ fr: '/', en: '/en/' }];
  for (const p of await getProjects()) pairs.push({ fr: `/projets/${p.id}/`, en: `/en/projects/${p.id}/` });

  const entry = (loc: string, pair: { fr: string; en: string }) => `  <url>
    <loc>${abs(loc)}</loc>
    <xhtml:link rel="alternate" hreflang="fr" href="${abs(pair.fr)}"/>
    <xhtml:link rel="alternate" hreflang="en" href="${abs(pair.en)}"/>
    <xhtml:link rel="alternate" hreflang="x-default" href="${abs(pair.fr)}"/>
  </url>`;

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${pairs.flatMap((p) => [entry(p.fr, p), entry(p.en, p)]).join('\n')}
</urlset>
`;
  return new Response(body, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
