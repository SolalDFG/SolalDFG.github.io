// Revue des schémas SVG : capture chaque <figure> de schéma (FR + EN) dans .review/figs/
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { serve } from './serve.mjs';
mkdirSync('.review/figs', { recursive: true });
const server = await serve('dist', 4398);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 900 }, deviceScaleFactor: 1.5 });
const slugs = ['homelab-proxmox', 'zone-du-clip', 'defense-en-profondeur-debian', 'kasgrunt', 'logs-centralises-lpic-102', 'taskcollab'];
for (const lang of (process.env.LANGS ?? 'fr,en').split(',')) {
  for (const s of slugs) {
    await page.goto(`http://localhost:4398${lang === 'fr' ? `/projets/${s}/` : `/en/projects/${s}/`}`);
    await page.evaluate(() => document.fonts.ready);
    const svg = await page.$('figure svg.diagram');
    if (svg) await svg.screenshot({ path: `.review/figs/${s}-${lang}.png` });
  }
}
await browser.close();
server.close();
