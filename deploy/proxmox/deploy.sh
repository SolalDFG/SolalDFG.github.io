#!/usr/bin/env bash
# =============================================================================
#  deploy.sh : build local puis envoi de dist/ vers le CT 107 (rsync sur SSH)
# -----------------------------------------------------------------------------
#  À lancer SUR TON PC, à la racine du projet :
#     cp deploy/proxmox/deploy.env.example deploy/proxmox/deploy.env   # une seule fois, puis complète-le
#     ./deploy/proxmox/deploy.sh
#
#  Le CT doit exister (create-ct.sh) et ta clé publique doit être autorisée pour
#  l'utilisateur « deploy » (paramètre SSH_PUBKEY de create-ct.sh).
# =============================================================================
set -euo pipefail
cd "$(dirname "$0")/../.."

ENV_FILE="deploy/proxmox/deploy.env"
# shellcheck disable=SC1090
[[ -f "$ENV_FILE" ]] && source "$ENV_FILE"

CT_HOST="${CT_HOST:?Définis CT_HOST (IP du CT 107 ou nom DNS local) dans $ENV_FILE}"
CT_USER="${CT_USER:-deploy}"
SSH_KEY="${SSH_KEY:-$HOME/.ssh/portfolio_deploy}"
SITE_URL="${SITE_URL:?Définis SITE_URL (ex. https://ton-domaine.fr) dans $ENV_FILE}"
REMOTE_DIR="${REMOTE_DIR:-/var/www/portfolio}"

echo "==> Build pour $SITE_URL"
SITE_URL="$SITE_URL" BASE_PATH="/" npm run build

echo "==> Vérification confidentialité (IP internes, outils, mentions interdites)"
npm run --silent check:privacy

echo "==> Envoi vers $CT_USER@$CT_HOST:$REMOTE_DIR"
rsync -az --delete --human-readable --info=stats1 \
  -e "ssh -i $SSH_KEY -o StrictHostKeyChecking=accept-new" \
  dist/ "$CT_USER@$CT_HOST:$REMOTE_DIR/"

echo "==> Contrôle HTTP"
code="$(curl -s -o /dev/null -w '%{http_code}' "http://$CT_HOST/")" || true
echo "    http://$CT_HOST/ → $code"
echo "==> Déployé. Public : $SITE_URL"
