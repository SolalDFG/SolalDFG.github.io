import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

/**
 * Un projet = un fichier YAML dans src/content/projects/<slug>.yaml.
 * Le nom du fichier donne le slug des URL (/projets/<slug> et /en/projects/<slug>).
 * Les textes acceptent `code` et **gras** (rendu inline uniquement).
 */
const localized = z.object({
  title: z.string(),
  /** Précision optionnelle du statut, affichée dans le badge (ex. « bêta privée en préparation ») */
  statusDetail: z.string().optional(),
  /** 1 phrase d'impact affichée sur la carte */
  impact: z.string(),
  context: z.string(),
  goal: z.string(),
  /** Titre optionnel de la section « Ce que j'ai fait » (ex. projet de groupe) */
  doneTitle: z.string().optional(),
  done: z.array(z.string()).min(1),
  /** Note optionnelle sous la liste (ex. « Mon rôle : … ») */
  doneNote: z.string().optional(),
  challenges: z.array(z.object({ problem: z.string(), solution: z.string() })).min(1),
  result: z.string(),
  learnings: z.array(z.string()).min(1),
  diagramCaption: z.string().optional(),
  snippet: z
    .object({ caption: z.string(), code: z.string() })
    .optional(),
});

const projects = defineCollection({
  loader: glob({ pattern: '*.yaml', base: './src/content/projects' }),
  schema: z.object({
    order: z.number(),
    category: z.enum(['infra', 'network', 'dev']),
    status: z.enum(['production', 'in-progress', 'done']),
    kind: z.enum(['personal', 'school', 'group']),
    stack: z.array(z.string()).min(1),
    /** Nom du schéma SVG (src/components/diagrams) ou absent */
    diagram: z.enum(['homelab', 'clipping', 'tp3', 'kasgrunt', 'logs', 'taskcollab']).optional(),
    links: z
      .array(z.object({ label: z.string(), href: z.url() }))
      .default([]),
    fr: localized,
    en: localized,
  }),
});

export const collections = { projects };
