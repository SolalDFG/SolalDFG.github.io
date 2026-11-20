#!/usr/bin/env node
/**
 * CV de secours : génère public/cv.pdf (A4, 1 page) à partir des fichiers de src/data et src/content.
 *   npm run cv
 * Si tu as ton propre CV, remplace simplement public/cv.pdf (et ne relance plus ce script).
 * Les valeurs TODO_SOLAL apparaissent telles quelles : complète src/data/profile.json avant de régénérer.
 */
import { chromium } from 'playwright';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse } from 'yaml';

const j = (f) => JSON.parse(readFileSync(`src/data/${f}.json`, 'utf8'));
const profile = j('profile');
const xp = j('experience').items[0];
const skills = j('skills');
const edu = j('education').items[0];
const certs = j('certifications');
const projects = readdirSync('src/content/projects')
  .filter((f) => f.endsWith('.yaml'))
  .map((f) => parse(readFileSync(`src/content/projects/${f}`, 'utf8')))
  .sort((a, b) => a.order - b.order);
const font = (f) => `data:font/woff2;base64,${readFileSync(resolve('src/assets/fonts', f)).toString('base64')}`;
const md = (s) => s.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>').replace(/`([^`]+)`/g, '$1');
const h = profile.hero.fr;
const c = profile.contact;
const status = { production: 'En production', 'in-progress': 'En cours', done: 'Terminé' };
const kind = { personal: 'perso', school: 'école', group: 'groupe' };
const cisco = certs.groups.find((g) => g.id === 'cisco').items;

const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><style>
@font-face{font-family:Inter;src:url(${font('inter-latin-var.woff2')}) format('woff2');font-weight:100 900}
@font-face{font-family:JBM;src:url(${font('jetbrains-mono-latin-var.woff2')}) format('woff2');font-weight:100 800}
@page{size:A4;margin:12mm 13mm}
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:Inter;font-size:8.6pt;line-height:1.38;color:#1b2430}
.mono{font-family:JBM}
header{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:2px solid #1f9d5c;padding-bottom:7px}
h1{font-size:21pt;line-height:1;letter-spacing:-.4px}
.role{font-size:11pt;font-weight:600;margin-top:4px}
.status{color:#14784a;font-weight:600;margin-top:3px}
.contact{text-align:right;font-size:8pt;color:#3c4a5a}
.cols{display:grid;grid-template-columns:1fr 64mm;gap:7mm;margin-top:8px}
h2{font-family:JBM;font-size:8.6pt;text-transform:uppercase;letter-spacing:.6px;color:#14784a;border-bottom:1px solid #cfd8e0;padding-bottom:2px;margin:9px 0 5px}
h3{font-size:9.2pt}
.meta{color:#5b6b7b;font-size:8pt}
ul{padding-left:11px}li{margin:1.6px 0}
.proof{background:#eef8f2;border-left:3px solid #1f9d5c;padding:4px 7px;margin-top:6px}
.p{margin-bottom:4.5px}.p b{font-weight:600}
.tag{display:inline-block;font-family:JBM;font-size:7pt;border:1px solid #cfd8e0;border-radius:3px;padding:0 3px;margin:1px 1px 0 0;color:#3c4a5a}
.sk{margin-bottom:4px}.sk b{display:block}
</style></head><body>
<header><div><h1>${profile.name}</h1><div class="role">${h.role} (${h.level})</div>
<div class="status">● ${h.status} · ${h.search} · ${h.mobility}</div></div>
<div class="contact mono">${c.email}<br>${c.phone}<br>${c.linkedin}<br>github.com/${c.githubHandle}<br>${profile.location}</div></header>
<div class="proof"><b>${h.proofLead}</b> ${h.proof} Objectif : évoluer vers le réseau, puis la cybersécurité.</div>
<div class="cols"><div>
<h2>Expérience</h2>
<h3>${xp.fr.title} · ${xp.fr.type}</h3>
<div class="meta">${xp.org}, ${xp.place} · ${xp.fr.period}</div>
<p style="margin-top:3px">${xp.fr.summary}</p>
<ul>${xp.fr.missions.map((m) => `<li>${m}</li>`).join('')}</ul>
<h2>Projets</h2>
${projects
  .map((p) => `<div class="p"><b>${p.fr.title}</b> <span class="meta">· ${status[p.status]} · ${kind[p.kind]}</span><br>${md(p.fr.impact)}</div>`)
  .join('')}
</div><div>
<h2>Compétences</h2>
${skills.groups
  .map((g) => `<div class="sk"><b>${g.fr}</b>${g.items.map((i) => `<span class="tag">${i.name}</span>`).join(' ')}</div>`)
  .join('')}
<h2>Formation</h2>
<p><b>${edu.fr.title}</b><br><span class="meta">${edu.school} · ${edu.fr.mode}</span><br><span class="meta">${edu.fr.status}</span></p>
<h2>Certificats</h2>
<p><b>Cisco Networking Academy</b> <span class="meta">(certificats de cours, via l'ESGI)</span></p>
<ul>${cisco.slice(0, 4).map((x) => `<li>${x.fr}</li>`).join('')}<li>+ ${cisco.length - 4} cours (cybersécurité, IoT, IA…)</li></ul>
<p style="margin-top:4px"><b>CNIL</b> · L'atelier RGPD, 5 modules, 100 %</p>
<p style="margin-top:4px"><b>Udemy</b> · CCNA 200-301 labs (Packet Tracer), Juniper JNCIA-Junos</p>
<h2>Langues</h2>
<p>Français · <b>Anglais : TOEIC 885/990</b></p>
</div></div></body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent(html, { waitUntil: 'load' });
await page.evaluate(() => document.fonts.ready);
await page.pdf({ path: 'public/cv.pdf', format: 'A4', printBackground: true, preferCSSPageSize: true });
await browser.close();
console.log('✓ public/cv.pdf');
