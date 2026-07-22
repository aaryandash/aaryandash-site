import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { projectSchema } from './lib/projectSchema';

const projects = defineCollection({
  loader: glob({ base: './src/content/projects', pattern: '**/*.{md,mdx}' }),
  schema: ({ image }) => projectSchema({ image }),
});

export const collections = { projects };
