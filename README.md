# Portfolio · Solal Diedhiou

Site statique bilingue (FR par défaut, EN) : **Astro 7** + **Tailwind CSS 4**, aucun traceur, aucun service externe, polices auto-hébergées. Un seul petit script (filtre des projets, menu mobile).

- Accueil : `/` et `/en/`
- Fiches projet : `/projets/<slug>/` et `/en/projects/<slug>/`
- Annexes : `/cv.pdf`, `/certificats/*.pdf`, `/sitemap.xml`, `/robots.txt`, `/404.html`

> Avant toute mise en ligne, traite la liste [`TODO_SOLAL.md`](TODO_SOLAL.md).

## Lancer en local

Prérequis : Node.js **22.12 ou plus récent** et npm.

```bash
npm install
npm run dev          # http://localhost:4321, rechargement à chaud
```

## Builder

```bash
npm run build        # astro check (types + contenu) puis build → dist/
npm run preview      # sert dist/ sur http://localhost:4321
```

L'URL publique sert aux balises canonical, Open Graph et au sitemap. Par défaut : `https://solaldfg.github.io`. Pour un autre domaine :

```bash
SITE_URL=https://ton-domaine.fr npm run build
BASE_PATH=/portfolio npm run build   # si le site est servi dans un sous-dossier
```

## Modifier le contenu (sans toucher au code)

Tout le texte est dans des fichiers de données. Le build valide leur structure et signale clairement une erreur de saisie.

| Je veux changer… | Fichier |
|---|---|
| Nom, poste, statut, e-mail, téléphone (vide = ligne masquée), LinkedIn, badges du hero, « ce que je cherche » | `src/data/profile.json` |
| Expériences (MGEN, stage Bricard : missions, dates, chiffres) | `src/data/experience.json` |
| Compétences, niveaux (`prod`, `projects`, `notions`) et savoir-être (`soft`) | `src/data/skills.json` |
| Formations (Bachelor ESGI, BTS SIO) | `src/data/education.json` |
| Certifications (cartes, dates, PDF associés) | `src/data/certifications.json` |
| Un projet (textes FR + EN, stack, statut, liens) | `src/content/projects/<slug>.yaml` |
| Libellés de l'interface (menus, boutons, titres de section) | `src/i18n/ui.ts` |

Règles pratiques :

- **Valeurs à compléter** : toute valeur contenant `TODO_SOLAL` s'affiche telle quelle (encadrée en jaune) et n'est jamais transformée en lien. Remplace-la par la vraie valeur : l'e-mail devient automatiquement un lien `mailto:`, LinkedIn un lien externe, etc.
- **Mise en forme dans les textes de projets** : `**gras**` et `` `code` `` sont reconnus. Rien d'autre (pas de HTML).
- **Ajouter un projet** : copie un fichier `.yaml` existant dans `src/content/projects/`, renomme-le (le nom devient l'URL), remplis les blocs `fr:` et `en:`. `order` fixe la position, `category` vaut `infra`, `network` ou `dev`, `status` vaut `production`, `in-progress` ou `done`, `kind` vaut `personal`, `school` ou `group`.
- **Schéma d'architecture** : `diagram: homelab | clipping | tp3 | kasgrunt | logs | taskcollab` (SVG faits main dans `src/components/diagrams/`).
- **Badges de stack en anglais** : les badges saisis en français sont traduits via la table `STACK_EN` de `src/i18n/ui.ts`.

### Fichiers à remplacer

| Fichier | Comment |
|---|---|
| `public/cv.pdf` | Ton **vrai CV, caviardé** : ligne téléphone supprimée, ville remplacée par « Île-de-France ». Caviardage réel (texte retiré du PDF), voir ci-dessous. `npm run cv` génère seulement un CV de secours dans `.review/` et n'écrase jamais ce fichier. |
| `public/og-fr.png`, `public/og-en.png` | Images de partage (LinkedIn, etc.), régénérées par `npm run og` après une modification du profil. Le même script crée les favicons. |
| `public/certificats/` | `npm run certs -- chemin/vers/archive.zip` recopie et renomme les PDF, puis génère les miniatures (besoin de `unzip` et `pdftoppm`). Pour un nouveau certificat : ajoute une ligne dans `MAP` (`scripts/certs.mjs`) et une entrée dans `src/data/certifications.json`. |

### Mettre à jour le CV publié

Ne travaille jamais sur l'original : fais une copie, puis

```bash
python3 -m venv .venv && .venv/bin/pip install pymupdf fonttools
# police du CV : Lora Regular (Google Fonts, OFL), en .ttf
.venv/bin/python scripts/redact-cv.py copie-du-cv.pdf Lora-Regular.ttf public/cv.pdf
npm run check:privacy        # échoue si un téléphone, la ville ou le code postal restent extractibles
pdftoppm -png -r 110 -singlefile public/cv.pdf .review/cv   # contrôle visuel
```

Le script repère la ligne au format téléphone et la ligne « Ville (code postal) » dans la colonne de gauche, supprime réellement leur texte (`add_redact_annot` + `apply_redactions`), puis réécrit « Île-de-France » à la même place et dans la même police. Si ton nouveau CV a une autre mise en page, vérifie la capture.

## Vérifications

```bash
npm run build && npm run check:privacy   # IP internes, outils de téléchargement, mentions interdites, adresse d'école, ville, code postal, téléphone (code + dist/ + texte des PDF)
npm run build && npm run check:links     # linkinator : zéro lien cassé (EXTERNAL=0 pour rester hors ligne)
npm run build && npm run shots           # captures 375 / 768 / 1440 px FR+EN + test « hero visible sans scroller » → .review/shots/
npm run build && npm run figures         # captures des schémas SVG → .review/figs/
npm run build && npm run lighthouse      # Lighthouse mobile → .review/lighthouse/ (seuil 95 partout)
npm run build && npm run a11y            # axe-core (WCAG 2.1 AA) sur toutes les pages, 375 et 1280 px
npm run build && npm run keyboard        # navigation au clavier : ordre, focus visible, menu mobile
```

Les scripts Playwright utilisent Chromium : `npx playwright install chromium` la première fois.

## Déployer

Deux options, détaillées pas à pas dans [`DEPLOY.md`](DEPLOY.md) :

- **A. Homelab Proxmox** (préférée) : CT LXC 107 non privilégié, nginx durci, exposition par Cloudflare Tunnel. Scripts dans `deploy/proxmox/`, puis `npm run deploy:proxmox` à chaque mise à jour.
- **B. GitHub Pages** (repli) : `.github/workflows/deploy.yml`, déploiement automatique à chaque `git push` sur `main`.

## Structure

```
src/
  data/                 contenu (JSON)
  content/projects/     1 fichier YAML par projet (FR + EN)
  components/           sections de l'accueil, cartes, badges, icônes
  components/diagrams/  schémas SVG faits main
  views/                Home + ProjectPage (partagées FR/EN)
  pages/                routes (/, /en/, /projets/[slug], /en/projects/[slug], 404, sitemap, robots)
  i18n/ui.ts            libellés FR/EN, helpers d'URL
  styles/global.css     thème (couleurs, typo), composants CSS
public/                 fichiers servis tels quels (CV, certificats, OG, favicons, script)
scripts/                outils : certificats, OG, CV, captures, Lighthouse, vérifications
deploy/proxmox/         déploiement homelab
```

Choix techniques : aucun script ni style inline (CSP stricte possible), polices Inter et JetBrains Mono en sous-ensemble latin, une seule couleur d'accent, contrastes AA vérifiés, animations coupées si `prefers-reduced-motion`.
