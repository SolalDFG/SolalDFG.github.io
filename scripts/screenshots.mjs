#!/usr/bin/env node
/**
 * Auto-revue visuelle : captures 375 / 768 / 1440 px, FR et EN, dans .review/shots/
 * + « test recruteur » : vérifie que les 6 éléments du hero sont visibles sans scroller (375×667).
 *   npm run build && npm run shots
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { serve } from './serve.mjs';

const PORT = 4399;
const OUT = '.review/shots';
mkdirSync(OUT, { recursive: true });
const server = await serve('dist', PORT);
const base = `http://localhost:${PORT}`;
const browser = await chromium.launch();

const pages = [
  ['home-fr', '/'],
  ['home-en', '/en/'],
  ['homelab-fr', '/projets/homelab-proxmox/'],
  ['homelab-en', '/en/projects/homelab-proxmox/'],
  ['clip-fr', '/projets/zone-du-clip/'],
  ['tp3-fr', '/projets/defense-en-profondeur-debian/'],
  ['kasgrunt-en', '/en/projects/kasgrunt/'],
  ['logs-fr', '/projets/logs-centralises-lpic-102/'],
  ['taskcollab-fr', '/projets/taskcollab/'],
  ['404', '/nope'],
];
const widths = (process.env.WIDTHS ?? '375,768,1440').split(',').map(Number);
const only = process.env.ONLY?.split(',');

for (const w of widths) {
  const ctx = await browser.newContext({ viewport: { width: w, height: w < 500 ? 667 : w < 1000 ? 1024 : 900 }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  for (const [name, path] of pages) {
    if (only && !only.includes(name)) continue;
    await page.goto(base + path, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: `${OUT}/${name}-${w}-fold.png` });
    // Déclenche le chargement paresseux des images
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 600) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 30));
      }
      window.scrollTo(0, 0);
    });
    await page.waitForLoadState('networkidle');
    if (process.env.SECTIONS) {
      const secs = await page.$$('main > section, main > article > header, main > article > div');
      for (let i = 0; i < secs.length; i++) await secs[i].screenshot({ path: `${OUT}/${name}-${w}-s${i}.png` });
    }
    if (!process.env.FOLD_ONLY) await page.screenshot({ path: `${OUT}/${name}-${w}-full.png`, fullPage: true });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    if (overflow > 0) console.warn(`⚠ ${name} @${w}px : débordement horizontal de ${overflow}px`);
  }
  await ctx.close();
}

// Test recruteur : 375×667 (iPhone SE) et 360×640, sans scroller
let ok = true;
for (const [w, h] of [[375, 667], [360, 640], [390, 844], [1440, 900], [768, 1024]]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  for (const path of ['/', '/en/']) {
    await page.goto(base + path, { waitUntil: 'networkidle' });
    const res = await page.evaluate((vh) => {
      const hero = document.querySelector('section[aria-labelledby="hero-title"]');
      const q = (sel) => hero.querySelector(sel);
      const checks = {
        nom: q('h1'),
        poste: q('h1 + p'),
        statut: q('h1 + p + p'),
        preuve: q('h1 + p + p + p'),
        boutons: q('a[download]')?.parentElement,
        badges: q('ul'),
      };
      return Object.fromEntries(Object.entries(checks).map(([k, el]) => [k, el ? Math.round(el.getBoundingClientRect().bottom) <= vh : false]));
    }, h);
    const fails = Object.entries(res).filter(([, v]) => !v).map(([k]) => k);
    console.log(`${fails.length ? '✗' : '✓'} hero ${path} @${w}×${h}${fails.length ? ' — hors écran : ' + fails.join(', ') : ''}`);
    if (fails.length) ok = false;
  }
  await ctx.close();
}

await browser.close();
server.close();
if (!ok) process.exitCode = 1;
