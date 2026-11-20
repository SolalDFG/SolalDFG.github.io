import { getCollection } from 'astro:content';

/** Projets triés selon `order` (ordre d'affichage). */
export async function getProjects() {
  const all = await getCollection('projects');
  return all.sort((a, b) => a.data.order - b.data.order);
}
