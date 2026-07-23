import { z } from 'astro/zod';

/** The editable home-page copy. Kept tiny and Zod-validated so malformed
    content (e.g. a bad CMS edit) fails the build instead of rendering wrong. */
export const homeSchema = z.object({
  subheading: z.string().min(1),
  description: z.string().min(1),
});

export type HomeContent = z.infer<typeof homeSchema>;

export function parseHome(data: unknown): HomeContent {
  return homeSchema.parse(data);
}
