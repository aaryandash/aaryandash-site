import { z } from 'astro/zod';

/**
 * Astro's image() helper is only available inside a content collection
 * definition during a build. Accepting it as a parameter keeps this schema
 * unit-testable with a stub.
 */
type ImageFn = () => z.ZodType;

export function projectSchema({ image }: { image: ImageFn }) {
  return z.object({
    title: z.string().min(1),
    /** Sort order in the parts bin. Lower comes first. */
    order: z.number().int().nonnegative(),
    /** e.g. "FRC 2025" or "Princeton CAD 2026". */
    season: z.string().min(1),
    role: z.string().min(1),
    /** One line for the parts bin card and the meta description. */
    summary: z.string().min(1).max(200),
    tools: z.array(z.string().min(1)).min(1),
    materials: z.array(z.string().min(1)).default([]),
    /** Print geometry, for an honest LAYER readout on the build plate.
        Optional; the plate falls back to sensible defaults. */
    heightMm: z.number().positive().optional(),
    layerHeightMm: z.number().positive().optional(),
    /** Transparent print image (PNG with alpha) used for the build-plate
        print reveal, so the part reads as sitting on the bed. Optional;
        the plate falls back to heroRender when absent. */
    printTransparent: image().optional(),
    specs: z
      .array(z.object({ label: z.string().min(1), value: z.string().min(1) }))
      .default([]),
    heroRender: image(),
    heroAlt: z.string().min(1),
    sectionRender: image().optional(),
    sectionAlt: z.string().min(1).optional(),
    /**
     * Optional interactive 3D model (.glb), shown behind a "View in 3D"
     * button on the project sheet. Not an image() — it is not run through the
     * image pipeline; it is a path/import to a binary asset. Omit it and the
     * sheet simply shows the static render with no button.
     */
    model: z.string().optional(),
    gallery: z
      .array(
        z.object({
          src: image(),
          alt: z.string().min(1),
          caption: z.string().default(''),
        }),
      )
      .default([]),
    featured: z.boolean().default(false),
  });
}
