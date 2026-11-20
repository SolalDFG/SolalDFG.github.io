# Checks Uptime Kuma pour le portfolio

Ajoute ces moniteurs dans Uptime Kuma (bouton **+ Ajouter une sonde**). Ils couvrent les deux maillons : nginx dans le CT, et la chaîne publique Cloudflare Tunnel.

| # | Type | Nom | URL / cible | Réglages |
|---|------|-----|-------------|----------|
| 1 | HTTP(s) - Mot-clé | Portfolio · public | `https://TODO_SOLAL-domaine.fr/` | Mot-clé : `Solal Diedhiou` · intervalle 300 s · 2 nouvelles tentatives · notif certificat expirant activée |
| 2 | HTTP(s) | Portfolio · nginx (LAN) | `http://<IP_DU_CT_107>/` | intervalle 60 s · code attendu 200 |
| 3 | HTTP(s) | Portfolio · CV | `https://TODO_SOLAL-domaine.fr/cv.pdf` | intervalle 3600 s · code attendu 200 |

Lecture des alertes :

- **1 en panne, 2 OK** : nginx tourne, c'est le tunnel (cloudflared) ou le DNS Cloudflare. Dans le CT : `systemctl status cloudflared`.
- **1 et 2 en panne** : le CT ou nginx est arrêté. Sur l'hôte : `pct status 107`, puis dans le CT `systemctl status nginx`.
- **3 en panne seul** : le CV a été oublié au dernier déploiement (`public/cv.pdf`).

Pense à ajouter les sondes au même groupe que tes autres services (ex. « Web ») et à les afficher sur ta page de statut si tu en as une.
