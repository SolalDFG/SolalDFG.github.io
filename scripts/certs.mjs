#!/usr/bin/env node
/**
 * Importe les certificats depuis l'archive d'origine.
 *
 *   npm run certs                      # lit ./All_certificate.zip
 *   npm run certs -- chemin/archive.zip
 *
 * - décompresse dans un dossier temporaire (jamais dans public/)
 * - copie chaque PDF dans public/certificats/ sous un nom propre (slug)
 *   → les noms d'origine contiennent une adresse mail d'école : ils ne doivent
 *     JAMAIS apparaître sur le site
 * - génère une miniature WebP (public/certificats/thumbs/<slug>.webp)
 *
 * Prérequis : `unzip` et `pdftoppm` (paquet poppler-utils).
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readdirSync, copyFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import sharp from 'sharp';

// Motif (début du nom d'origine, insensible à la casse) → slug publié
const MAP = [
  [/^CCNA-_Introduction_to_Networks_certificate/i, 'cisco-ccna-itn'],
  [/^CCNA-_Enterprise_Networking/i, 'cisco-ccna-ensa'],
  [/^Network_Technician_Career_Path_certificate/i, 'cisco-network-technician-exam'],
  [/^Networking_Basics_certificate/i, 'cisco-networking-basics'],
  [/^Introduction_to_Cybersecurity_certificate/i, 'cisco-intro-cybersecurity'],
  [/^Introduction_to_Cybersecurity_Badge/i, 'cisco-intro-cybersecurity-badge-2024'],
  [/^Industrial_Networking_Essentials_certificate/i, 'cisco-industrial-networking'],
  [/^Digital_Safety_and_Security_Awareness_certificate/i, 'cisco-digital-safety'],
  [/^Introduction_to_IoT_certificate/i, 'cisco-intro-iot'],
  [/^Introduction_to_IoT_Badge/i, 'cisco-intro-iot-badge-2024'],
  [/^Introduction_to_Modern_AI_certificate/i, 'cisco-intro-modern-ai'],
  [/^Certificat_RGPD 1\.pdf$/i, 'cnil-rgpd-module-1'],
  [/^Certificat_RGPD 2\.pdf$/i, 'cnil-rgpd-module-2'],
  [/^Certificat_RGPD 3\.pdf$/i, 'cnil-rgpd-module-3'],
  [/^Certificat_RGPD 4\.pdf$/i, 'cnil-rgpd-module-4'],
  [/^Certificat_RGPD 5\.pdf$/i, 'cnil-rgpd-module-5'],
  [/^Certificat_Cisco_CCNA_Packet_Tracer/i, 'udemy-ccna-packet-tracer-labs'],
  [/^Juniper_JNCIA_Junos/i, 'udemy-juniper-jncia-junos'],
];

const zip = resolve(process.argv[2] ?? 'All_certificate.zip');
if (!existsSync(zip)) {
  console.error(`Archive introuvable : ${zip}`);
  process.exit(1);
}
const outDir = resolve('public/certificats');
const thumbDir = join(outDir, 'thumbs');
mkdirSync(thumbDir, { recursive: true });

const work = mkdtempSync(join(tmpdir(), 'certs-'));
try {
  execFileSync('unzip', ['-q', '-o', zip, '-d', work]);
  const files = readdirSync(work, { recursive: true }).filter((f) => String(f).toLowerCase().endsWith('.pdf'));
  const seen = new Set();
  for (const rel of files) {
    const base = String(rel).split('/').pop();
    const hit = MAP.find(([re]) => re.test(base));
    if (!hit) {
      console.warn(`⚠ Non mappé (ignoré) : ${base} → ajoute une entrée dans MAP`);
      continue;
    }
    const slug = hit[1];
    seen.add(slug);
    const src = join(work, String(rel));
    copyFileSync(src, join(outDir, `${slug}.pdf`));
    // Rendu PNG de la 1re page à ~100 dpi puis conversion WebP 480 px de large
    const pngBase = join(work, `thumb-${slug}`);
    execFileSync('pdftoppm', ['-png', '-r', '100', '-f', '1', '-l', '1', '-singlefile', src, pngBase]);
    await sharp(`${pngBase}.png`).resize({ width: 480 }).webp({ quality: 72 }).toFile(join(thumbDir, `${slug}.webp`));
    console.log(`✓ ${slug}`);
  }
  const missing = MAP.map(([, s]) => s).filter((s) => !seen.has(s));
  if (missing.length) console.warn(`⚠ Absents de l'archive : ${missing.join(', ')}`);
} finally {
  rmSync(work, { recursive: true, force: true });
}
