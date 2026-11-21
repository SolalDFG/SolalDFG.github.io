/** Libellés d'interface FR/EN et helpers de routes. Le contenu (textes métier) est dans src/data et src/content. */
export type Lang = 'fr' | 'en';
export const LANGS: Lang[] = ['fr', 'en'];

const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

/** Préfixe un chemin absolu ("/cv.pdf") avec le base path du site. */
export function url(path: string): string {
  if (/^(https?:|mailto:|tel:|#)/.test(path)) return path;
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${BASE}${p}` || '/';
}

export const routes = {
  home: (lang: Lang) => (lang === 'fr' ? url('/') : url('/en/')),
  project: (lang: Lang, slug: string) => (lang === 'fr' ? url(`/projets/${slug}/`) : url(`/en/projects/${slug}/`)),
};

export const ui = {
  fr: {
    htmlLang: 'fr',
    locale: 'fr-FR',
    ogLocale: 'fr_FR',
    skip: 'Aller au contenu',
    nav: { projects: 'Projets', experience: 'Expérience', skills: 'Compétences', education: 'Formation', contact: 'Contact' },
    menu: 'Menu',
    switchTo: 'English',
    switchLabel: 'Read this page in English',
    homeLabel: 'Solal Diedhiou, retour à l’accueil',
    metaTitle: 'Solal Diedhiou · Technicien systèmes & réseaux / Support N2',
    metaDescription:
      'Technicien systèmes & réseaux / Support N2 junior, disponible immédiatement pour un CDI en Île-de-France. 2 ans d’alternance comme référent IT d’un centre médical (MGEN). Linux, Cisco, Proxmox, Docker, Windows/AD.',
    hero: { cv: 'Télécharger mon CV (PDF)', contact: 'Me contacter', skillsLabel: 'Compétences principales' },
    sections: {
      projects: { title: 'Projets', kicker: 'ls ~/projets', intro: 'Homelab en production, labs réseau et sécurité, outils développés : chaque projet a sa fiche détaillée.' },
      experience: { title: 'Expérience', kicker: 'cat experience.log' },
      skills: { title: 'Compétences', kicker: 'skills --by-domain', intro: 'Niveau indiqué honnêtement pour chaque compétence.' },
      education: { title: 'Formation & certifications', kicker: 'ls ~/diplomes' },
      contact: { title: 'Contact', kicker: 'ping solal' },
    },
    filters: { label: 'Filtrer les projets par catégorie', all: 'Tous' },
    categories: { infra: 'Infra & Homelab', network: 'Réseau & Sécurité', dev: 'Dev & Automatisation' },
    status: { production: 'En production', 'in-progress': 'En cours', done: 'Terminé' },
    kind: { personal: 'Projet perso', school: 'Projet d’école', group: 'Projet de groupe' },
    seeProject: 'Voir le projet',
    seeProjectOf: (t: string) => `Voir le projet : ${t}`,
    project: {
      back: 'Tous les projets',
      context: 'Contexte',
      goal: 'Objectif',
      done: 'Ce que j’ai fait',
      stack: 'Stack',
      challenges: 'Difficultés rencontrées et solutions',
      problem: 'Problème',
      solution: 'Solution',
      result: 'Résultat / état actuel',
      learnings: 'Ce que j’en retiens',
      diagram: 'Schéma d’architecture',
      links: 'Liens',
      next: 'Projet suivant',
      prev: 'Projet précédent',
    },
    experience: { context: 'Contexte' },
    education: { degree: 'Diplôme', certs: 'Certifications et formations' },
    certs: {
      view: 'Voir le certificat',
      viewOf: (t: string) => `Voir le certificat : ${t} (PDF)`,
      thumbAlt: (t: string) => `Aperçu du certificat ${t}`,
      completed: 'Obtenu le',
      modules: 'Attestations par module',
      score: 'Score aux évaluations',
      duration: 'Durée',
      pdf: 'PDF',
    },
    contact: {
      lead: 'Le plus simple : un e-mail ou un message LinkedIn. Je réponds rapidement.',
      seeking: 'Ce que je cherche',
      email: 'E-mail',
      phone: 'Téléphone',
      linkedin: 'LinkedIn',
      github: 'GitHub',
      cv: 'CV (PDF)',
      location: 'Localisation',
    },
    footer: { built: 'Site statique, sans traceur ni cookie.', source: 'Fait main avec Astro.' },
    notFound: { title: 'Page introuvable', text: 'Cette page n’existe pas ou a été déplacée.', back: 'Retour à l’accueil' },
    months: ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'],
  },
  en: {
    htmlLang: 'en',
    locale: 'en-GB',
    ogLocale: 'en_GB',
    skip: 'Skip to content',
    nav: { projects: 'Projects', experience: 'Experience', skills: 'Skills', education: 'Education', contact: 'Contact' },
    menu: 'Menu',
    switchTo: 'Français',
    switchLabel: 'Lire cette page en français',
    homeLabel: 'Solal Diedhiou, back to home',
    metaTitle: 'Solal Diedhiou · Systems & Network Technician / L2 Support',
    metaDescription:
      'Junior systems & network technician / L2 support, available now for a permanent role in the Paris area. 2 years as the go-to IT person of a medical centre (MGEN). Linux, Cisco, Proxmox, Docker, Windows/AD.',
    hero: { cv: 'Download my CV (PDF)', contact: 'Contact me', skillsLabel: 'Core skills' },
    sections: {
      projects: { title: 'Projects', kicker: 'ls ~/projects', intro: 'A homelab in production, networking and security labs, tools I built: each project has its own detailed page.' },
      experience: { title: 'Experience', kicker: 'cat experience.log' },
      skills: { title: 'Skills', kicker: 'skills --by-domain', intro: 'An honest level for every skill.' },
      education: { title: 'Education & certificates', kicker: 'ls ~/degrees' },
      contact: { title: 'Contact', kicker: 'ping solal' },
    },
    filters: { label: 'Filter projects by category', all: 'All' },
    categories: { infra: 'Infra & Homelab', network: 'Network & Security', dev: 'Dev & Automation' },
    status: { production: 'In production', 'in-progress': 'In progress', done: 'Completed' },
    kind: { personal: 'Personal project', school: 'School project', group: 'Group project' },
    seeProject: 'View project',
    seeProjectOf: (t: string) => `View project: ${t}`,
    project: {
      back: 'All projects',
      context: 'Context',
      goal: 'Goal',
      done: 'What I did',
      stack: 'Stack',
      challenges: 'Challenges and solutions',
      problem: 'Problem',
      solution: 'Solution',
      result: 'Outcome / current state',
      learnings: 'Takeaways',
      diagram: 'Architecture diagram',
      links: 'Links',
      next: 'Next project',
      prev: 'Previous project',
    },
    experience: { context: 'Context' },
    education: { degree: 'Degree', certs: 'Certificates and courses' },
    certs: {
      view: 'View certificate',
      viewOf: (t: string) => `View certificate: ${t} (PDF)`,
      thumbAlt: (t: string) => `Preview of the ${t} certificate`,
      completed: 'Completed',
      modules: 'Certificates per module',
      score: 'Assessment score',
      duration: 'Length',
      pdf: 'PDF',
    },
    contact: {
      lead: 'Easiest: an email or a LinkedIn message. I reply quickly.',
      seeking: 'What I’m looking for',
      email: 'Email',
      phone: 'Phone',
      linkedin: 'LinkedIn',
      github: 'GitHub',
      cv: 'CV (PDF)',
      location: 'Location',
    },
    footer: { built: 'Static site, no tracker, no cookie.', source: 'Hand-built with Astro.' },
    notFound: { title: 'Page not found', text: 'This page doesn’t exist or has moved.', back: 'Back to home' },
    months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  },
} as const;

export type UI = (typeof ui)[Lang];

/** "2026-03-08" → "8 mars 2026" / "8 Mar 2026" */
export function formatDate(iso: string, lang: Lang): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  const month = ui[lang].months[(m ?? 1) - 1];
  return d ? `${d} ${month} ${y}` : `${month} ${y}`;
}

/** Traductions des badges de stack saisis en français dans les YAML. */
const STACK_EN: Record<string, string> = {
  'LXC non privilégiés': 'Unprivileged LXC',
  'Bot Discord': 'Discord bot',
  'Rendu GPU': 'GPU rendering',
  'Données 100 % locales': '100% local data',
  "Reconnaissance d'images": 'Image recognition',
  'API Rebrickable': 'Rebrickable API',
  'fstab / options de montage': 'fstab / mount options',
  'Pare-feux': 'Firewalls',
  Sauvegardes: 'Backups',
  'Téléphonie IP': 'IP telephony',
  'Supervision · métrologie': 'Monitoring · metrics',
  'Cluster HA': 'HA cluster',
  'Cluster Proxmox HA (3 nœuds)': 'Proxmox HA cluster (3 nodes)',
  'Modèle maison PyTorch → ONNX': 'In-house PyTorch → ONNX model',
  'Tests e2e Playwright': 'Playwright e2e tests',
  'Sauvegardes chiffrées': 'Encrypted backups',
  'CI GitHub Actions': 'GitHub Actions CI',
};
export const stackLabel = (s: string, lang: Lang) => (lang === 'en' ? (STACK_EN[s] ?? s) : s);

/** Une valeur à compléter : on l'affiche mais on n'en fait jamais un lien. */
export const isTodo = (v: string | undefined | null) => !v || v.includes('TODO_SOLAL');

/** Rendu inline minimal : échappe le HTML puis gère `code` et **gras**. */
export function inline(text: string): string {
  const esc = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  return esc
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/TODO_SOLAL/g, '<mark class="todo">TODO_SOLAL</mark>');
}

/** Ancres des sections de l'accueil, par langue */
export const anchors = {
  fr: { projects: 'projets', experience: 'experience', skills: 'competences', education: 'formation', contact: 'contact' },
  en: { projects: 'projects', experience: 'experience', skills: 'skills', education: 'education', contact: 'contact' },
} as const;
