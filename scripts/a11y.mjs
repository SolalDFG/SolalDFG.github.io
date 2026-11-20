#!/usr/bin/env node
/**
 * Audit axe-core (WCAG 2.1 A/AA : contrastes, ARIA, alternatives textuelles, titres…) sur TOUTES les pages du build.
 *   npm run build && npm run a11y
 */
import { chromium } from 'playwright';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { serve } from './serve.mjs';

const axeSource = readFileSync(createRequire(import.meta.url).resolve('axe-core/axe.min.js'), 'utf8');
const pages = [];
(function walk(dir) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p);
    else if (e.endsWith('.html')) pages.push('/' + p.slice('dist/'.length).replace(/index\.html$/, ''));
  }
})('dist');

const PORT = 4393;
const server = await serve('dist', PORT);
const browser = await chromium.launch();
let issues = 0;
for (const w of [375, 1280]) {
  const page = await browser.newPage({ viewport: { width: w, height: 900 } });
  for (const p of pages.sort()) {
    await page.goto(`http://localhost:${PORT}${p}`, { waitUntil: 'networkidle' });
    await page.addScriptTag({ content: axeSource });
    const res = await page.evaluate(() => axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'] }));
    for (const v of res.violations) {
      issues++;
      console.log(`✗ ${p} @${w}px [${v.impact}] ${v.id} : ${v.help}`);
      for (const n of v.nodes.slice(0, 3)) console.log(`    ${n.target.join(' ')} — ${n.failureSummary?.split('\n')[1]?.trim() ?? ''}`);
    }
  }
  await page.close();
}
await browser.close();
server.close();
console.log(issues ? `${issues} violation(s)` : `✓ axe : 0 violation sur ${pages.length} pages × 2 largeurs`);
process.exitCode = issues ? 1 : 0;
