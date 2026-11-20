#!/usr/bin/env node
/**
 * Vérifie tous les liens du site construit (internes + externes) avec linkinator.
 *   npm run build && npm run check:links
 * EXTERNAL=0 pour ne vérifier que les liens internes (hors ligne).
 */
import { LinkChecker } from 'linkinator';
import { serve } from './serve.mjs';

const PORT = 4397;
const server = await serve('dist', PORT);
const checker = new LinkChecker();
const internalOnly = process.env.EXTERNAL === '0';
// Réseaux sociaux qui refusent les robots (réponse 4xx/999 même si la page existe) : vérifiés à la main.
const BOT_BLOCKED = [/tiktok\.com/, /instagram\.com/, /linkedin\.com/];

// Les URL absolues (canonical, hreflang, og:image) visent le site public : on les réécrit vers le serveur local.
const SITE = (process.env.SITE_URL ?? 'https://solaldfg.github.io').replace(/\/$/, '');
const result = await checker.check({
  path: `http://localhost:${PORT}/`,
  urlRewriteExpressions: [{ pattern: new RegExp('^' + SITE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), replacement: `http://localhost:${PORT}` }],
  recurse: true,
  timeout: 15000,
  concurrency: 20,
  linksToSkip: (url) => {
    if (url.startsWith('mailto:') || url.startsWith('tel:')) return Promise.resolve(true);
    const external = !url.startsWith(`http://localhost:${PORT}`);
    return Promise.resolve(external && (internalOnly || BOT_BLOCKED.some((re) => re.test(url))));
  },
});
// Pages qui ne sont pas liées depuis l'accueil mais doivent exister
const extra = ['/sitemap.xml', '/robots.txt', '/404.html', '/cv.pdf', '/og-fr.png', '/og-en.png', '/favicon.ico', '/favicon.svg', '/apple-touch-icon.png', '/site.webmanifest', '/icon-192.png', '/icon-512.png'];
const missing = [];
for (const p of extra) {
  const r = await fetch(`http://localhost:${PORT}${p}`);
  if (!r.ok) missing.push(`${p} (${r.status})`);
}
server.close();

const broken = result.links.filter((l) => l.state === 'BROKEN');
const skipped = result.links.filter((l) => l.state === 'SKIPPED' && /^https?:/.test(l.url) && !l.url.includes('localhost'));
const checked = result.links.filter((l) => l.state === 'OK');
console.log(`${checked.length} liens OK, ${broken.length} cassé(s), ${skipped.length} externe(s) ignoré(s) (anti-robots).`);
for (const s of new Set(skipped.map((l) => l.url))) console.log(`  ↷ à vérifier à la main : ${s}`);
for (const b of broken) console.error(`  ✗ ${b.status} ${b.url}  (dans ${b.parent})`);
for (const m of missing) console.error(`  ✗ fichier annexe manquant : ${m}`);
if (broken.length || missing.length) process.exit(1);
console.log('✓ Zéro lien cassé.');
