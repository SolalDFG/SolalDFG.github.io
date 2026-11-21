# Déploiement

Deux options. **A** est la cible (homelab), **B** est le repli gratuit et sans maintenance.
Dans les commandes, remplace les valeurs entre chevrons : `<IP_PROXMOX>`, `<IP_DU_CT>`, `<IP_PASSERELLE>`, `<ton-domaine.fr>`.

---

## Option A : auto-hébergement sur le homelab Proxmox

### Architecture

```
Visiteur ──HTTPS──▶ Cloudflare ◀══ tunnel sortant ══ cloudflared ─▶ nginx :80   (CT 107, LXC non privilégié)
                                                                     ▲
PC (deploy.sh) ── rsync/SSH (LAN, utilisateur « deploy ») ───────────┘
```

- Aucun port ouvert sur la Livebox, l'IP publique de la maison n'apparaît nulle part : c'est `cloudflared` qui ouvre une connexion **sortante** vers Cloudflare.
- HTTPS (certificat) géré par Cloudflare.
- Le CT respecte les règles du homelab : un service = un conteneur LXC **non privilégié**, IP fixe **hors plage DHCP** (.10 → .150), ID **107**.

### Ressources réellement consommées (estimation)

| Composant | RAM typique | Remarque |
|---|---|---|
| Debian 13 minimal (systemd, journald, sshd) | ~20–25 Mo | |
| nginx (1 master + 1 worker) | ~5–10 Mo | site 100 % statique, aucun PHP/Node côté serveur |
| cloudflared | ~30–40 Mo | |
| **Total** | **~60–75 Mo** | sur 256 Mo alloués : large marge |

- Disque : Debian minimal ~500 Mo + site ~5 Mo (dont ~4 Mo de PDF) : **2 Go suffisent**.
- CPU : quasi nul au repos, 1 vCPU est largement suffisant (le cache et la compression font le reste ; Cloudflare met aussi en cache).
- Conclusion : **viable sans risque** pour le serveur, l'impact est négligeable à côté des autres services.

### Prérequis

1. **Un nom de domaine** (≈ 10 €/an, ex. chez OVH, Gandi, Cloudflare Registrar). Un tunnel Cloudflare public a besoin d'un domaine dont les DNS sont gérés par Cloudflare. Sans domaine, utilise l'option B.
2. Un compte **Cloudflare** gratuit, avec le domaine ajouté (Cloudflare indique deux serveurs DNS à renseigner chez le registrar ; compter de quelques minutes à quelques heures).
3. Une IP libre **hors plage DHCP** pour le CT (vérifie avec `ping <IP_DU_CT>` qu'elle ne répond pas, et dans la liste DHCP de la box).

### Étapes

**1. Créer une clé SSH dédiée au déploiement** (sur ton PC) :

```bash
ssh-keygen -t ed25519 -f ~/.ssh/portfolio_deploy -C "portfolio-deploy" -N ""
```

**2. Copier les fichiers de déploiement et la clé publique sur l'hôte Proxmox** :

```bash
scp -r deploy/proxmox root@<IP_PROXMOX>:/root/portfolio-deploy
scp ~/.ssh/portfolio_deploy.pub root@<IP_PROXMOX>:/root/portfolio-deploy/
```

**3. Sur l'hôte Proxmox, vérifier le nom du stockage des conteneurs** (pool NVMe) :

```bash
ssh root@<IP_PROXMOX>
pvesm status          # repère le stockage de type zfspool des conteneurs (souvent local-zfs)
pct list              # vérifie que l'ID 107 est bien libre
```

**4. Créer le conteneur 107** :

```bash
cd /root/portfolio-deploy
CT_IP=<IP_DU_CT>/24 \
CT_GW=<IP_PASSERELLE> \
CT_DNS=<IP_DU_RASPBERRY_PI> \
ROOTFS_STORAGE=local-zfs \
SSH_PUBKEY=/root/portfolio-deploy/portfolio_deploy.pub \
./create-ct.sh
```

Le script : télécharge le template Debian 13, crée le CT (1 vCPU, 256 Mo, 2 Go, non privilégié, démarrage auto), installe nginx/rsync/ssh, crée l'utilisateur `deploy`, durcit SSH (clé uniquement, root interdit), installe la config nginx (en-têtes de sécurité, gzip/brotli, cache, page 404) et les mises à jour de sécurité automatiques.

Contrôle depuis ton PC : `curl -I http://<IP_DU_CT>/` → `200 OK` (page d'attente).

**5. Déployer le site** (sur ton PC, à la racine du projet) :

```bash
cp deploy/proxmox/deploy.env.example deploy/proxmox/deploy.env
# édite deploy.env : CT_HOST=<IP_DU_CT>, SITE_URL=https://<ton-domaine.fr>
npm run deploy:proxmox
```

Le script build le site avec la bonne URL, lance la vérification de confidentialité, puis envoie `dist/` par rsync (fichiers supprimés côté serveur s'ils n'existent plus).

**6. Créer le tunnel Cloudflare** (navigateur) :

1. Cloudflare → **Zero Trust** → **Networks** → **Tunnels** → **Create a tunnel** → type **Cloudflared** → nom `portfolio`.
2. Copie le **token** affiché (longue chaîne commençant par `eyJ`). C'est un secret : ne le mets dans aucun fichier du dépôt.
3. Onglet **Public Hostname** → **Add** : sous-domaine vide (ou `www`), domaine `<ton-domaine.fr>`, **Service** : `HTTP` → `localhost:80`.

**7. Installer cloudflared dans le CT** (sur l'hôte Proxmox) :

```bash
cd /root/portfolio-deploy
CF_TUNNEL_TOKEN='eyJ...' ./cloudflared/setup-cloudflared.sh
```

Le tunnel doit passer à **HEALTHY** dans le tableau de bord. Ouvre `https://<ton-domaine.fr>/`.

**8. Réglages Cloudflare conseillés** (onglet du domaine) :

- SSL/TLS → **Edge Certificates** → **Always Use HTTPS** : activé.
- Caching → laisser le niveau standard (les assets `/_astro/` sont déjà marqués immuables par nginx).

**9. Supervision** :

- Uptime Kuma : ajoute les 3 sondes décrites dans [`deploy/proxmox/monitoring/uptime-kuma.md`](deploy/proxmox/monitoring/uptime-kuma.md).
- Homepage : colle le bloc de [`deploy/proxmox/monitoring/homepage-services.yaml`](deploy/proxmox/monitoring/homepage-services.yaml) dans ton `services.yaml`.
- Documente l'IP du CT 107 avec tes autres IP fixes.

**10. Mises à jour du site** : modifie le contenu, puis `npm run deploy:proxmox`. C'est tout.

### Vérifications après déploiement

```bash
curl -sI https://<ton-domaine.fr>/ | grep -iE "^HTTP|content-security|strict-transport|x-content-type|referrer"
curl -sI https://<ton-domaine.fr>/page-qui-n-existe-pas | head -1     # → 404
```

Tu peux aussi passer l'URL dans <https://securityheaders.com> et PageSpeed Insights.

### Retour arrière / suppression

```bash
pct stop 107 && pct destroy 107                       # sur l'hôte Proxmox
```

Puis supprime le tunnel dans Cloudflare Zero Trust. Le site lui-même vit dans Git : rien n'est perdu.

### Fichiers fournis (`deploy/proxmox/`)

| Fichier | Rôle |
|---|---|
| `create-ct.sh` | création et configuration du CT 107 (sur l'hôte Proxmox) |
| `nginx/portfolio.conf` | site nginx : URLs propres, cache, 404, méthodes limitées, IP réelle derrière le tunnel |
| `nginx/security-headers.conf` | CSP, HSTS, X-Content-Type-Options, Referrer-Policy, X-Frame-Options, Permissions-Policy, COOP/CORP |
| `nginx/compression.conf` | gzip (+ brotli si le module Debian est disponible) |
| `nginx/sshd-hardening.conf` | SSH : clé uniquement, root interdit, utilisateur `deploy` seul |
| `deploy.sh` + `deploy.env.example` | build local + rsync vers le CT (sur ton PC) |
| `cloudflared/setup-cloudflared.sh` | installation du tunnel (token du tableau de bord) |
| `cloudflared/config.example.yml` | variante tunnel géré en local (fichier de config) |
| `monitoring/uptime-kuma.md`, `monitoring/homepage-services.yaml` | supervision et tuile de tableau de bord |

La config nginx a été validée (`nginx -t`) et testée dans un conteneur nginx : en-têtes présents, gzip actif, 404 personnalisée, `/.git` refusé, POST refusé (405), aucune violation CSP dans le navigateur.

---

## Option B : GitHub Pages (repli)

Gratuit, HTTPS inclus, aucune machine à maintenir. Le workflow `.github/workflows/deploy.yml` est prêt.

> **En service depuis le 21/11/2026** : https://solaldfg.github.io (dépôt public `SolalDFG/SolalDFG.github.io`, Pages en mode « GitHub Actions »). Les étapes 1 à 4 ci-dessous sont faites ; chaque `git push` sur `main` redéploie. L'option A reste prête pour plus tard.

**1. Créer le dépôt sur GitHub** (compte `SolalDFG`) :

- Nom **`SolalDFG.github.io`** → site à la racine : `https://solaldfg.github.io/` (recommandé).
- Tout autre nom (ex. `portfolio`) → site à `https://solaldfg.github.io/portfolio/` : le workflow règle le sous-chemin tout seul.
- Dépôt **public** (requis pour Pages en offre gratuite). Le brief de mission et l'archive d'origine des certificats sont exclus par `.gitignore`.

**2. Pousser le code** (depuis le dossier du projet) :

```bash
git remote add origin git@github.com:SolalDFG/SolalDFG.github.io.git
git push -u origin main
```

**3. Activer Pages** : dépôt → **Settings** → **Pages** → **Source : GitHub Actions**.

**4. Suivre le déploiement** : onglet **Actions** → « Déploiement GitHub Pages ». En ~1 minute, le site est en ligne. Chaque `git push` sur `main` redéploie.

**5. (Optionnel) Domaine personnalisé** :

1. Settings → Pages → **Custom domain** : `<ton-domaine.fr>` (+ « Enforce HTTPS »).
2. Chez le registrar : enregistrement `CNAME www → solaldfg.github.io` et/ou les 4 `A` de GitHub Pages pour l'apex (voir la doc GitHub « Managing a custom domain »).
3. Settings → **Secrets and variables** → **Actions** → onglet **Variables** : `SITE_URL = https://<ton-domaine.fr>` et `BASE_PATH = /`.

Le workflow lance aussi `npm run check:privacy` : si une IP interne ou une mention interdite se glisse dans le contenu, le déploiement est bloqué.
