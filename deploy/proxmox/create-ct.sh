#!/usr/bin/env bash
# =============================================================================
#  create-ct.sh : crée le conteneur LXC du portfolio sur l'hôte Proxmox VE
# -----------------------------------------------------------------------------
#  À lancer EN ROOT SUR L'HÔTE PROXMOX (pas dans un conteneur), depuis une copie
#  du dossier deploy/proxmox/ :
#
#     scp -r deploy/proxmox root@<IP_PROXMOX>:/root/portfolio-deploy
#     ssh root@<IP_PROXMOX>
#     cd /root/portfolio-deploy
#     CT_IP=<IP_DU_CT>/24 CT_GW=<IP_PASSERELLE> SSH_PUBKEY=/root/.ssh/portfolio_deploy.pub ./create-ct.sh
#
#  Règles du homelab respectées :
#   - un service = un conteneur LXC NON PRIVILÉGIÉ
#   - IP fixe HORS de la plage DHCP de la box (.10 → .150) : choisis une adresse en dehors
#   - prochain ID libre : 107
#
#  Ressources : 1 vCPU, 256 Mo RAM, 2 Go disque. Un site statique servi par nginx
#  consomme en pratique ~10 Mo (nginx) + ~35 Mo (cloudflared) + ~20 Mo (Debian minimal).
#
#  Le script est idempotent sur la partie configuration : il refuse de recréer un
#  CT existant, mais peut être relancé avec SKIP_CREATE=1 pour ne refaire que la config.
# =============================================================================
set -euo pipefail

# ---- Paramètres (surchargeables par variables d'environnement) ---------------
CTID="${CTID:-107}"
HOSTNAME_CT="${HOSTNAME_CT:-portfolio}"
CT_IP="${CT_IP:?Définis CT_IP, ex. CT_IP=<IP_DU_CT>/24 (hors plage DHCP .10-.150)}"
CT_GW="${CT_GW:?Définis CT_GW = IP de la passerelle (la box)}"
CT_DNS="${CT_DNS:-}"                         # optionnel : IP du Raspberry Pi (Pi-hole). Vide = DNS de l'hôte
BRIDGE="${BRIDGE:-vmbr0}"
ROOTFS_STORAGE="${ROOTFS_STORAGE:-local-zfs}" # TODO_SOLAL : nom du stockage du pool NVMe (pvesm status)
TEMPLATE_STORAGE="${TEMPLATE_STORAGE:-local}"
CORES="${CORES:-1}"
MEMORY="${MEMORY:-256}"
SWAP="${SWAP:-256}"
DISK_GB="${DISK_GB:-2}"
SSH_PUBKEY="${SSH_PUBKEY:-}"                 # clé publique autorisée pour l'utilisateur « deploy » (rsync)
SKIP_CREATE="${SKIP_CREATE:-0}"
HERE="$(cd "$(dirname "$0")" && pwd)"

log() { printf '\033[1;32m==>\033[0m %s\n' "$*"; }
die() { printf '\033[1;31mERREUR :\033[0m %s\n' "$*" >&2; exit 1; }

command -v pct >/dev/null || die "pct introuvable : ce script se lance sur l'hôte Proxmox."
[[ $EUID -eq 0 ]] || die "à lancer en root."
[[ -f "$HERE/nginx/portfolio.conf" ]] || die "nginx/portfolio.conf introuvable à côté du script."

# ---- 1. Template Debian 13 minimal -------------------------------------------
if [[ "$SKIP_CREATE" != "1" ]]; then
  pct status "$CTID" >/dev/null 2>&1 && die "le CT $CTID existe déjà. Choisis un autre CTID ou relance avec SKIP_CREATE=1."

  log "Recherche du template Debian 13 standard"
  pveam update >/dev/null
  TEMPLATE="$(pveam available --section system | awk '/debian-13-standard/ {print $2}' | sort -V | tail -1)"
  [[ -n "$TEMPLATE" ]] || die "aucun template debian-13-standard disponible (pveam available)."
  if ! pveam list "$TEMPLATE_STORAGE" | grep -q "$TEMPLATE"; then
    log "Téléchargement de $TEMPLATE"
    pveam download "$TEMPLATE_STORAGE" "$TEMPLATE"
  fi

  # ---- 2. Création du conteneur non privilégié -------------------------------
  log "Création du CT $CTID ($HOSTNAME_CT) : ${CORES} vCPU, ${MEMORY} Mo, ${DISK_GB} Go"
  ARGS=(
    --hostname "$HOSTNAME_CT"
    --unprivileged 1                 # règle du homelab : jamais de conteneur privilégié
    --features nesting=1             # recommandé pour systemd récent dans un CT Debian 13
    --ostype debian
    --cores "$CORES" --memory "$MEMORY" --swap "$SWAP"
    --rootfs "${ROOTFS_STORAGE}:${DISK_GB}"
    --net0 "name=eth0,bridge=${BRIDGE},ip=${CT_IP},gw=${CT_GW},firewall=1"
    --onboot 1 --startup order=50
    --tags "web;portfolio"
    --description "Portfolio statique (nginx + Cloudflare Tunnel). Aucun port exposé sur la box."
  )
  [[ -n "$CT_DNS" ]] && ARGS+=(--nameserver "$CT_DNS")
  [[ -n "$SSH_PUBKEY" ]] && ARGS+=(--ssh-public-keys "$SSH_PUBKEY")
  pct create "$CTID" "${TEMPLATE_STORAGE}:vztmpl/${TEMPLATE}" "${ARGS[@]}"
fi

log "Démarrage du CT $CTID"
pct start "$CTID" 2>/dev/null || true
for _ in $(seq 1 30); do pct exec "$CTID" -- true 2>/dev/null && break; sleep 1; done
# Attendre le réseau (apt en a besoin)
for _ in $(seq 1 30); do pct exec "$CTID" -- getent hosts deb.debian.org >/dev/null 2>&1 && break; sleep 2; done

# ---- 3. Paquets : nginx + rsync + ssh (+ brotli si dispo) --------------------
log "Installation de nginx, rsync, openssh-server"
pct exec "$CTID" -- bash -c '
  set -e
  export DEBIAN_FRONTEND=noninteractive
  apt-get update -q
  apt-get install -y -q --no-install-recommends nginx rsync openssh-server ca-certificates curl unattended-upgrades
  # Module brotli (paquets Debian) : facultatif, gzip reste actif sinon
  apt-get install -y -q libnginx-mod-http-brotli-filter libnginx-mod-http-brotli-static 2>/dev/null || echo "brotli indisponible : gzip seul"
  dpkg-reconfigure -f noninteractive unattended-upgrades
'

# ---- 4. Utilisateur de déploiement (rsync/SSH, sans sudo) --------------------
log "Utilisateur « deploy » propriétaire de /var/www/portfolio"
pct exec "$CTID" -- bash -c '
  set -e
  id deploy >/dev/null 2>&1 || useradd --create-home --shell /bin/bash deploy
  install -d -o deploy -g deploy -m 755 /var/www/portfolio
  install -d -o deploy -g deploy -m 700 /home/deploy/.ssh
  # Reprend les clés posées par --ssh-public-keys (root) pour l utilisateur deploy
  if [ -s /root/.ssh/authorized_keys ]; then
    install -o deploy -g deploy -m 600 /root/.ssh/authorized_keys /home/deploy/.ssh/authorized_keys
  fi
  # Page d attente tant que le premier déploiement n a pas eu lieu
  [ -f /var/www/portfolio/index.html ] || echo "<!doctype html><title>Bientôt</title><p>Déploiement en attente.</p>" > /var/www/portfolio/index.html
  chown -R deploy:deploy /var/www/portfolio
'

# ---- 5. SSH durci : clés uniquement, pas de root -----------------------------
log "Durcissement SSH (clé uniquement, root interdit)"
pct push "$CTID" "$HERE/nginx/sshd-hardening.conf" /etc/ssh/sshd_config.d/90-hardening.conf --perms 644
pct exec "$CTID" -- bash -c 'sshd -t && systemctl reload ssh'

# ---- 6. Configuration nginx --------------------------------------------------
log "Configuration nginx durcie"
pct push "$CTID" "$HERE/nginx/portfolio.conf" /etc/nginx/sites-available/portfolio --perms 644
pct push "$CTID" "$HERE/nginx/security-headers.conf" /etc/nginx/snippets/security-headers.conf --perms 644
pct push "$CTID" "$HERE/nginx/compression.conf" /etc/nginx/conf.d/compression.conf --perms 644
pct exec "$CTID" -- bash -c '
  set -e
  # Active brotli uniquement si le module est installé
  if [ -e /usr/share/nginx/modules-available/mod-http-brotli-filter.conf ] || ls /etc/nginx/modules-enabled/ 2>/dev/null | grep -q brotli; then
    sed -i "s/^# *brotli/brotli/" /etc/nginx/conf.d/compression.conf
  fi
  ln -sf /etc/nginx/sites-available/portfolio /etc/nginx/sites-enabled/portfolio
  rm -f /etc/nginx/sites-enabled/default
  nginx -t
  systemctl enable --now nginx
  systemctl reload nginx
'

log "Terminé. Vérifie depuis le LAN : curl -I http://${CT_IP%/*}/"
log "Étapes suivantes : deploy.sh (envoi du site), puis cloudflared/setup-cloudflared.sh (exposition publique)."
