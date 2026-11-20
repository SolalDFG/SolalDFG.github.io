#!/usr/bin/env node
/**
 * Génère les images Open Graph (public/og-fr.png, public/og-en.png) et les icônes
 * (favicon.ico, apple-touch-icon.png, icon-192.png, icon-512.png) à partir des données du profil.
 *   npm run og
 * Prérequis : Playwright + Chromium (npx playwright install chromium).
 */
import { chromium } from 'playwright';
import sharp from 'sharp';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const profile = JSON.parse(readFileSync('src/data/profile.json', 'utf8'));
// Polices embarquées en data: URL (setContent ne peut pas charger de file://)
const font = (f) => `data:font/woff2;base64,${readFileSync(resolve('src/assets/fonts', f)).toString('base64')}`;

const html = (lang) => {
  const h = profile.hero[lang];
  const badges = lang === 'fr' ? profile.heroBadges : profile.heroBadgesEn;
  return `<!doctype html><html><head><meta charset="utf-8"><style>
  @font-face{font-family:Inter;src:url(${font('inter-latin-var.woff2')}) format('woff2');font-weight:100 900}
  @font-face{font-family:JBM;src:url(${font('jetbrains-mono-latin-var.woff2')}) format('woff2');font-weight:100 800}
  *{margin:0;box-sizing:border-box}
  body{width:1200px;height:630px;background:#0b1016;color:#e6edf3;font-family:Inter;position:relative;overflow:hidden}
  .grid{position:absolute;inset:0;background-image:linear-gradient(#243241 1px,transparent 1px),linear-gradient(90deg,#243241 1px,transparent 1px);background-size:48px 48px;opacity:.45;-webkit-mask-image:radial-gradient(ellipse at top left,#000 15%,transparent 70%)}
  .wrap{position:absolute;inset:0;padding:64px 72px;display:flex;flex-direction:column}
  .mono{font-family:JBM}
  .top{display:flex;align-items:center;gap:14px;font-size:24px;color:#3ddc84}
  .dot{width:16px;height:16px;border-radius:50%;background:#3ddc84;box-shadow:0 0 0 8px rgba(61,220,132,.15)}
  h1{font-size:96px;line-height:1.02;font-weight:800;letter-spacing:-2px;margin-top:22px}
  .role{font-size:38px;font-weight:600;margin-top:16px}
  .role span{color:#a7b4c2;font-weight:400}
  .proof{margin-top:30px;font-size:30px;line-height:1.35;color:#a7b4c2;border-left:4px solid #3ddc84;padding-left:18px;max-width:1000px}
  .proof b{color:#6ee7a8}
  .badges{margin-top:36px;display:flex;flex-wrap:wrap;gap:10px}
  .b{font-family:JBM;font-size:19px;padding:7px 12px;border:1px solid rgba(61,220,132,.45);border-radius:8px;background:#16202b;color:#e6edf3}
.foot{margin-top:auto;font-size:20px;color:#8b9bab}
  .corner{position:absolute;right:72px;top:64px;font-family:JBM;font-size:22px;color:#8b9bab}
  .corner b{color:#3ddc84;font-weight:600}
  </style></head><body><div class="grid"></div><div class="wrap">
  <div class="top mono"><span class="dot"></span>${h.status} · ${lang === 'fr' ? 'CDI Île-de-France' : 'Permanent role · Paris area'}</div>
  <h1>${profile.name}</h1>
  <div class="role">${h.role} <span>(${h.level})</span></div>
  <div class="proof"><b>${h.proofLead}</b> ${h.proof}</div>
  <div class="badges">${badges.map((b) => `<span class="b">${b}</span>`).join('')}</div>
  <div class="foot mono">github.com/${profile.contact.githubHandle}</div>
  </div><div class="corner"><b>~/</b>solal</div></body></html>`;
};

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
for (const lang of ['fr', 'en']) {
  await page.setContent(html(lang), { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  const buf = await page.screenshot({ type: 'png' });
  await sharp(buf).png({ palette: true, quality: 90, compressionLevel: 9 }).toFile(`public/og-${lang}.png`);
  console.log(`✓ public/og-${lang}.png`);
}
await browser.close();

// Icônes à partir du favicon SVG
const svg = readFileSync('public/favicon.svg');
await sharp(svg, { density: 600 }).resize(180, 180).png().toFile('public/apple-touch-icon.png');
await sharp(svg, { density: 600 }).resize(192, 192).png().toFile('public/icon-192.png');
await sharp(svg, { density: 600 }).resize(512, 512).png().toFile('public/icon-512.png');
// favicon.ico : conteneur ICO avec une image PNG 32×32 (format accepté par tous les navigateurs)
const png32 = await sharp(svg, { density: 300 }).resize(32, 32).png().toBuffer();
const header = Buffer.alloc(22);
header.writeUInt16LE(0, 0); // réservé
header.writeUInt16LE(1, 2); // type icône
header.writeUInt16LE(1, 4); // 1 image
header.writeUInt8(32, 6); // largeur
header.writeUInt8(32, 7); // hauteur
header.writeUInt8(0, 8); // palette
header.writeUInt8(0, 9); // réservé
header.writeUInt16LE(1, 10); // plans
header.writeUInt16LE(32, 12); // bpp
header.writeUInt32LE(png32.length, 14); // taille
header.writeUInt32LE(22, 18); // offset
writeFileSync('public/favicon.ico', Buffer.concat([header, png32]));
console.log('✓ icônes');
