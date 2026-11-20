#!/usr/bin/env node
/**
 * Vérification de confidentialité et d'honnêteté, sur le code ET sur dist/ :
 *  - aucune IP privée (10/8, 172.16/12, 192.168/16, 100.64/10 de Tailscale)
 *  - aucun nom d'outil de téléchargement
 *  - jamais « CCNA certifié » / « certifié CCNA » / « CCNA certified »
 *  - aucune trace de l'adresse mail d'école (domaine « myskolae »), y compris dans les noms de fichiers et les PDF
 *   npm run build && npm run check:privacy
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOTS = ['src', 'public', 'scripts', 'deploy', '.github', 'dist', 'README.md', 'DEPLOY.md', 'PLAN.md', 'TODO_SOLAL.md', 'astro.config.mjs', 'package.json'];
const SKIP = new Set(['node_modules', '.git', '.astro', '.review']);
const SELF = 'scripts/check-privacy.mjs';

const RULES = [
  { name: 'IP privée', re: /\b(?:10\.\d{1,3}|192\.168|172\.(?:1[6-9]|2\d|3[01])|100\.(?:6[4-9]|[7-9]\d|1[01]\d|12[0-7]))\.\d{1,3}\.\d{1,3}\b/g },
  { name: 'IP privée (préfixe)', re: /\b192\.168\.\d{1,3}\.(?:x|X|\*)/g },
  { name: 'outil de téléchargement', re: /\b(?:qbittorrent|radarr|sonarr|prowlarr|lidarr|readarr|bazarr|jackett|flaresolverr|transmission-daemon|deluge|sabnzbd|nzbget|jellyseerr|overseerr|torrent)\w*/gi },
  { name: '« CCNA certifié »', re: /ccna\s+certifi|certifi\w*\s+ccna/gi },
  { name: 'adresse d’école', re: /my\s*skolae/gi },
];

const TEXT_EXT = /\.(?:astro|ts|mjs|js|json|ya?ml|md|css|html|xml|txt|svg|sh|conf|webmanifest|toml|caddyfile)$/i;
const findings = [];

function walk(p) {
  let st;
  try {
    st = statSync(p);
  } catch {
    return;
  }
  if (st.isDirectory()) {
    for (const e of readdirSync(p)) if (!SKIP.has(e)) walk(join(p, e));
    return;
  }
  const rel = relative('.', p);
  if (rel === SELF) return;
  // Noms de fichiers
  for (const r of RULES) if (r.re.test(rel)) findings.push(`${rel} : nom de fichier → ${r.name}`), (r.re.lastIndex = 0);
  const isText = TEXT_EXT.test(p) || !/\.\w+$/.test(p);
  const isPdf = /\.pdf$/i.test(p);
  if (!isText && !isPdf) return;
  const content = readFileSync(p, isPdf ? 'latin1' : 'utf8');
  for (const r of RULES) {
    if (isPdf && !/skolae/.test(r.re.source)) continue; // dans les PDF : seulement l'adresse d'école
    r.re.lastIndex = 0;
    let m;
    while ((m = r.re.exec(content))) {
      const line = content.slice(0, m.index).split('\n').length;
      findings.push(`${rel}:${line} → ${r.name} : « ${m[0]} »`);
    }
  }
}

for (const r of ROOTS) walk(r);
if (findings.length) {
  console.error(`✗ ${findings.length} problème(s) :\n  ` + findings.join('\n  '));
  process.exit(1);
}
console.log('✓ Aucune IP privée, aucun outil de téléchargement, aucun « CCNA certifié », aucune trace d’adresse d’école (code + dist/).');
