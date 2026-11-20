// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

/**
 * SITE_URL  : URL publique absolue (canonical, Open Graph, sitemap).
 *             Défaut : GitHub Pages. Pour le homelab : SITE_URL=https://ton-domaine.fr npm run build
 * BASE_PATH : sous-chemin si le site n'est pas à la racine (ex. "/portfolio" pour un dépôt projet GitHub Pages).
 */
const site = process.env.SITE_URL ?? 'https://solaldfg.github.io';
const base = process.env.BASE_PATH ?? '/';

export default defineConfig({
  site,
  base,
  trailingSlash: 'ignore',
  build: {
    // Feuilles de style externes : permet une CSP stricte (style-src 'self')
    inlineStylesheets: 'never',
    format: 'directory',
  },
  devToolbar: { enabled: false },
  vite: {
    plugins: [tailwindcss()],
    build: {
      // Jamais de script/asset inliné en data: ou en ligne → CSP stricte
      assetsInlineLimit: 0,
    },
  },
});
