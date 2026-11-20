#!/usr/bin/env bash
# =============================================================================
#  setup-cloudflared.sh : expose le portfolio via Cloudflare Tunnel
# -----------------------------------------------------------------------------
#  Pourquoi : aucun port ouvert sur la Livebox, l'IP publique de la maison n'est
#  jamais exposée, le HTTPS est géré par Cloudflare. cloudflared ouvre une
#  connexion SORTANTE vers Cloudflare et relaie le trafic vers nginx en local.
#
#  Prérequis (voir DEPLOY.md) :
#   1. un nom de domaine dont les DNS sont gérés par Cloudflare (offre gratuite)
#   2. un tunnel créé dans le tableau de bord Cloudflare Zero Trust
#      (Networks → Tunnels → Create tunnel → Cloudflared) : copie son TOKEN
#   3. dans ce tunnel, une « Public hostname » : <ton-domaine> → Service HTTP → localhost:80
#
#  À lancer SUR L'HÔTE PROXMOX (le script agit dans le CT via pct exec) :
#     CF_TUNNEL_TOKEN='eyJh...' ./cloudflared/setup-cloudflared.sh
#  Le token est un secret : ne le commite jamais, ne le colle pas dans un fichier du dépôt.
# =============================================================================
set -euo pipefail
CTID="${CTID:-107}"
CF_TUNNEL_TOKEN="${CF_TUNNEL_TOKEN:?Définis CF_TUNNEL_TOKEN (token du tunnel, tableau de bord Cloudflare Zero Trust)}"

command -v pct >/dev/null || { echo "À lancer sur l'hôte Proxmox." >&2; exit 1; }

echo "==> Installation de cloudflared dans le CT $CTID (dépôt officiel Cloudflare)"
pct exec "$CTID" -- bash -c '
  set -e
  export DEBIAN_FRONTEND=noninteractive
  install -d -m 0755 /usr/share/keyrings
  curl -fsSL https://pkg.cloudflare.com/cloudflare-main.gpg -o /usr/share/keyrings/cloudflare-main.gpg
  echo "deb [signed-by=/usr/share/keyrings/cloudflare-main.gpg] https://pkg.cloudflare.com/cloudflared any main" > /etc/apt/sources.list.d/cloudflared.list
  apt-get update -q
  apt-get install -y -q cloudflared
'

echo "==> Enregistrement du service (tunnel géré depuis le tableau de bord)"
# Le token est passé par stdin pour ne pas apparaître dans la liste des processus de l'hôte
printf '%s' "$CF_TUNNEL_TOKEN" | pct exec "$CTID" -- bash -c '
  set -e
  TOKEN="$(cat)"
  if systemctl list-unit-files | grep -q "^cloudflared.service"; then
    cloudflared service uninstall || true
  fi
  cloudflared service install "$TOKEN"
  systemctl enable --now cloudflared
'
pct exec "$CTID" -- systemctl --no-pager --lines=5 status cloudflared || true
echo "==> Fait. Vérifie : https://<ton-domaine>/ (le tunnel doit apparaître « HEALTHY » dans Cloudflare)."
