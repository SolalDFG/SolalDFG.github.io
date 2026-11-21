# Portfolio · Solal Diedhiou

Portfolio bilingue (FR / EN) d'un technicien systèmes & réseaux : expérience, projets d'infrastructure documentés avec leurs schémas, compétences et certifications vérifiables.

**En ligne : [solaldfg.github.io](https://solaldfg.github.io)** · [version anglaise](https://solaldfg.github.io/en/)

## Stack

| Rôle | Outil |
|---|---|
| Générateur de site statique | [Astro](https://astro.build) 7, TypeScript |
| Styles | Tailwind CSS 4 (jetons de thème dans `@theme`) |
| Contenu | JSON (`src/data`) + YAML (`src/content/projects`), validés par un schéma zod au build |
| Schémas d'architecture | SVG écrits à la main, composants Astro |
| Tests | Playwright, axe-core, Lighthouse, linkinator |
| CI / hébergement | GitHub Actions → GitHub Pages |
| Option auto-hébergée | conteneur LXC Proxmox, nginx durci, Cloudflare Tunnel (voir [`DEPLOY.md`](DEPLOY.md)) |

## Choix techniques

**Site 100 % statique.** 19 pages HTML générées au build, environ 930 Ko au total hors PDF (polices comprises). Pas de framework côté client, pas de traceur, pas de cookie, pas de service tiers. Un seul script de 1,6 Ko (filtre des projets, menu mobile), chargé en `defer`. Polices Inter et JetBrains Mono auto-hébergées, en sous-ensemble latin.

**Internationalisation sans bibliothèque.**
- Le français est servi à la racine (`/`), l'anglais sous `/en/`. Les fiches projet ont le même slug dans les deux langues.
- Chaque projet tient dans un seul fichier YAML, avec un bloc `fr:` et un bloc `en:`. Les libellés d'interface sont dans `src/i18n/ui.ts`.
- Sur chaque page, le bouton FR / EN mène à la page équivalente, pas à l'accueil.
- `hreflang`, `lang`, les URL canoniques et les alternates du sitemap sont générés pour chaque page.

**Performance et accessibilité mesurées.**
- **Lighthouse (mobile) : 100 / 100 / 100 / 100** en performance, accessibilité, bonnes pratiques et SEO, sur l'accueil FR, l'accueil EN et deux fiches projet.
- **axe-core** (WCAG 2.1 AA) : 0 violation, sur les 19 pages, à 375 et 1280 px.
- Navigation au clavier testée : lien d'évitement, focus visible partout, menu mobile (Entrée / Échap).
- Animations coupées si `prefers-reduced-motion`.

**Prêt pour une CSP stricte.** Aucun script exécutable ni style inline (`inlineStylesheets: 'never'`, aucun asset inliné). La config nginx de `deploy/` envoie `default-src 'none'; script-src 'self'; style-src 'self'`, sans `unsafe-inline`.

**Contrôle de confidentialité dans la CI.** `scripts/check-privacy.mjs` tourne à chaque déploiement, sur le code source, sur le site généré et sur le texte extrait des PDF publiés (CV, certificats). Il bloque la mise en ligne s'il trouve :
- une adresse IP privée ;
- un nom d'outil qui n'a rien à faire sur un portfolio ;
- une mention de certification inexacte ;
- une donnée personnelle (téléphone, ville, code postal, adresse d'école…).

Le CV publié est caviardé par `scripts/redact-cv.py` : le texte est réellement retiré du PDF (PyMuPDF `apply_redactions`), pas simplement masqué par un rectangle.

**Honnêteté du contenu.** Chaque compétence affiche son niveau réel (« Utilisé en prod », « Projets », « Notions »). Les certificats Cisco Networking Academy sont présentés comme des certificats de cours, et chacun renvoie vers son PDF.

## Lancer en local

Prérequis : Node.js 22.12 ou plus récent.

```bash
npm install
npm run dev        # http://localhost:4321, rechargement à chaud
npm run build      # vérification des types et du contenu, puis build → dist/
npm run preview    # sert dist/ sur http://localhost:4321
```

## Vérifications

Toutes s'exécutent sur le build (`npm run build` d'abord). Les scripts Playwright demandent Chromium la première fois : `npx playwright install chromium`.

| Commande | Ce qu'elle vérifie |
|---|---|
| `npm run check:privacy` | IP privées, données personnelles, mentions interdites (code, `dist/`, texte des PDF) |
| `npm run check:links` | zéro lien cassé (linkinator) |
| `npm run a11y` | axe-core sur toutes les pages, mobile et desktop |
| `npm run keyboard` | ordre de tabulation, focus visible, menu mobile |
| `npm run shots` | captures 375 / 768 / 1440 px et test « hero visible sans scroller » |
| `npm run lighthouse` | Lighthouse mobile, seuil 95 dans les 4 catégories |

## Modifier le contenu

Le texte vit dans des fichiers de données ; le build signale toute erreur de structure.

| Contenu | Fichier |
|---|---|
| Identité, contact, hero, poste recherché | `src/data/profile.json` |
| Expériences | `src/data/experience.json` |
| Compétences et niveaux | `src/data/skills.json` |
| Formations | `src/data/education.json` |
| Certifications | `src/data/certifications.json` |
| Projets (FR + EN) | `src/content/projects/<slug>.yaml` |
| Libellés de l'interface | `src/i18n/ui.ts` |

## Structure

```
src/
  data/                 contenu (JSON)
  content/projects/     un fichier YAML par projet (FR + EN)
  components/           sections, cartes, badges, icônes
  components/diagrams/  schémas SVG
  views/                accueil et fiche projet, communs aux deux langues
  pages/                routes, 404, sitemap, robots.txt
  i18n/ui.ts            libellés FR / EN, helpers d'URL
public/                 CV, certificats, favicons, images de partage, script
scripts/                vérifications, génération (OG, miniatures), caviardage du CV
deploy/proxmox/         déploiement auto-hébergé (LXC, nginx, Cloudflare Tunnel)
.github/workflows/      build, contrôle de confidentialité, déploiement Pages
```

## Déploiement

Chaque `git push` sur `main` déclenche le workflow : build, contrôle de confidentialité, puis publication sur GitHub Pages. L'option auto-hébergée (Proxmox, nginx, Cloudflare Tunnel) est décrite pas à pas dans [`DEPLOY.md`](DEPLOY.md).
