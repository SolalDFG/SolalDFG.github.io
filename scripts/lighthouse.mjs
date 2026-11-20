#!/usr/bin/env node
/**
 * Lighthouse (mobile) sur le build : accueil FR/EN + une page projet. Rapports dans .review/lighthouse/.
 *   npm run build && npm run lighthouse
 * Utilise le Chromium de Playwright si CHROME_PATH n'est pas défini.
 */
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const run = promisify(execFile);
import { mkdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from 'playwright';
import { serve } from './serve.mjs';

const PORT = 4396;
const OUT = resolve('.review/lighthouse');
// Sous WSL, chrome-launcher crée ses profils temporaires dans le dossier courant : on l'isole ici
const WORK = resolve('.review/lighthouse/tmp');
mkdirSync(WORK, { recursive: true });
process.env.CHROME_PATH ??= chromium.executablePath();
const server = await serve('dist', PORT);
const pages = { 'home-fr': '/', 'home-en': '/en/', 'homelab-fr': '/projets/homelab-proxmox/', 'kasgrunt-en': '/en/projects/kasgrunt/' };
let ok = true;
for (const [name, path] of Object.entries(pages)) {
  const out = `${OUT}/${name}.json`;
  try {
    // Asynchrone : le serveur statique tourne dans ce même processus
    await run(
      'npx',
      ['--yes', 'lighthouse@13.6.0', `http://localhost:${PORT}${path}`, '--quiet', '--output=json', `--output-path=${out}`,
        '--only-categories=performance,accessibility,best-practices,seo', '--chrome-flags=--headless=new --no-sandbox'],
      { maxBuffer: 64 * 1024 * 1024, cwd: WORK },
    );
  } catch (e) {
    // Lighthouse peut échouer au nettoyage du profil Chrome sous WSL alors que le rapport est écrit
  }
  const r = JSON.parse(readFileSync(out, 'utf8'));
  const scores = Object.fromEntries(Object.entries(r.categories).map(([k, v]) => [k, Math.round(v.score * 100)]));
  const bad = Object.values(scores).some((s) => s < 95);
  if (bad) ok = false;
  console.log(`${bad ? '✗' : '✓'} ${name.padEnd(12)} ${Object.entries(scores).map(([k, v]) => `${k}=${v}`).join('  ')}`);
  for (const [id, a] of Object.entries(r.audits)) {
    if (a.score !== null && a.score < 0.9 && a.scoreDisplayMode !== 'informative' && a.scoreDisplayMode !== 'notApplicable' && a.scoreDisplayMode !== 'manual')
      console.log(`    · ${id}: ${a.title}${a.displayValue ? ` (${a.displayValue})` : ''}`);
  }
}
server.close();
if (!ok) process.exitCode = 1;
