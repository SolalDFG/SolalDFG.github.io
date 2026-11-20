#!/usr/bin/env node
/**
 * Test clavier : parcourt chaque page à la touche Tab et vérifie que
 *  - le 1er arrêt est le lien d'évitement « Aller au contenu »
 *  - chaque élément focalisé a un indicateur de focus visible (outline)
 *  - tous les liens/boutons visibles sont atteignables
 *  - le menu mobile s'ouvre au clavier et se ferme avec Échap
 *   npm run build && node scripts/keyboard.mjs
 */
import { chromium } from 'playwright';
import { serve } from './serve.mjs';

const PORT = 4395;
const server = await serve('dist', PORT);
const browser = await chromium.launch();
let fail = 0;

for (const [path, w] of [['/', 1280], ['/en/', 1280], ['/projets/homelab-proxmox/', 1280], ['/', 375]]) {
  const page = await browser.newPage({ viewport: { width: w, height: 800 } });
  await page.goto(`http://localhost:${PORT}${path}`, { waitUntil: 'networkidle' });
  const total = await page.evaluate(
    () =>
      [...document.querySelectorAll('a[href], button, summary, [tabindex="0"]')].filter((e) => {
        const r = e.getBoundingClientRect();
        const d = e.closest('details');
        if (d && !d.open && e.tagName !== 'SUMMARY') return false; // menu fermé : non focalisable, c'est voulu
        return r.width > 0 && r.height > 0 && e.getAttribute('tabindex') !== '-1' && !e.closest('[hidden]') && getComputedStyle(e).visibility !== 'hidden';
      }).length,
  );
  const seen = new Set();
  let first = '';
  let noOutline = [];
  for (let i = 0; i < total + 40; i++) {
    await page.keyboard.press('Tab');
    const info = await page.evaluate(() => {
      const e = document.activeElement;
      if (!e || e === document.body) return null;
      const cs = getComputedStyle(e);
      const id = e.outerHTML.slice(0, 90);
      return { id, text: (e.textContent || '').trim().slice(0, 40), outline: cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0 };
    });
    if (!info) continue;
    if (i === 0) first = info.text;
    if (!info.outline) noOutline.push(info.text || info.id);
    seen.add(info.id);
  }
  const okSkip = /Aller au contenu|Skip to content/.test(first);
  const reach = seen.size >= total;
  console.log(`${okSkip && reach && !noOutline.length ? '✓' : '✗'} ${path} @${w}px : ${seen.size}/${total} éléments atteints, 1er arrêt « ${first} »${noOutline.length ? `, sans focus visible : ${noOutline.slice(0, 5).join(' | ')}` : ''}`);
  if (!okSkip || !reach || noOutline.length) fail++;

  if (w < 768) {
    await page.focus('summary');
    await page.keyboard.press('Enter');
    const open = await page.evaluate(() => document.querySelector('[data-menu]').open);
    await page.keyboard.press('Escape');
    const closed = await page.evaluate(() => !document.querySelector('[data-menu]').open);
    console.log(`${open && closed ? '✓' : '✗'} menu mobile : ouverture Entrée=${open}, fermeture Échap=${closed}`);
    if (!(open && closed)) fail++;
  }
  await page.close();
}
await browser.close();
server.close();
process.exitCode = fail ? 1 : 0;
