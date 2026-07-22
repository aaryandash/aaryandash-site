# Phase 1: Foundation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A deployed, live portfolio site with the drawing-set design system in place and one complete project sheet, built on GitHub Pages.

**Architecture:** Astro static site with zero client JavaScript on the baseline page. All design decisions live in typed TypeScript modules (`src/lib/`) that are unit-tested, with `.astro` components consuming them — this keeps the visual system verifiable rather than scattered through templates. Content is an Astro content collection validated by a Zod schema that enforces accessibility requirements at build time. Animation uses the vanilla `motion` API, not React; no framework runtime ships in Phase 1.

**Tech Stack:** Astro 7, MDX, Zod (via `astro/zod`), `motion` 12, Fontsource (IBM Plex), Vitest 4, GitHub Actions → GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-07-22-cad-portfolio-design.md`

## Global Constraints

- Node `>=22.12.0` (Astro 7 engine requirement). Local is v22.23.1; CI pins 22.
- Total JavaScript under 100kb; LCP under 2s on simulated 4G.
- No React in Phase 1. React arrives in Phase 2 with the build plate.
- Every image requires non-empty alt text — enforced by schema, not by review.
- All motion gated behind `prefers-reduced-motion`.
- Site must render usefully with JavaScript disabled.
- Internal links always go through `href()` from `src/lib/paths.ts` — never hardcoded. GitHub Pages serves project sites from a subpath, and hardcoded absolute links break silently.
- Nav labels are literal. "Personal Interests", never a clever synonym.
- Repo: `/home/aaryan/projects/aaryandash-site`, branch `main`.

## Deferred to later phases (deliberately not in this plan)

| Spec item | Phase |
|---|---|
| Build plate drag interaction | 2 |
| Constraint-solve animated hero (static hero in Phase 1) | 2 |
| Section-view scrubber | 2 |
| Sveltia CMS + edit-mode overlay | 3 |
| Personal Interests page | 4 |
| Per-page generated OG images (site-wide default in Phase 1) | 5 |
| Paper/light theme — current light values fail WCAG and need their own contrast pass | 5 |

---

## File Structure

```
aaryandash-site/
├── .github/workflows/deploy.yml     CI: test, build, deploy to Pages
├── astro.config.mjs                 site/base from env, mdx + sitemap
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── public/
│   └── .nojekyll                    stops Pages mangling _astro/
├── src/
│   ├── content.config.ts            collection wiring only
│   ├── lib/
│   │   ├── paths.ts        + .test  base-path-safe URL building
│   │   ├── contrast.ts     + .test  WCAG luminance/ratio math
│   │   ├── tokens.ts       + .test  design tokens, contrast-verified
│   │   ├── sheets.ts       + .test  nav model, sheet numbering
│   │   ├── meta.ts         + .test  titles, canonical URLs
│   │   ├── projectSchema.ts + .test Zod schema for projects
│   │   └── callout.ts      + .test  leader-line geometry
│   ├── styles/global.css            tokens → CSS custom properties
│   ├── layouts/BaseLayout.astro     head, meta, grid substrate
│   ├── components/
│   │   ├── TitleBlock.astro         nav, doubles as drawing title block
│   │   ├── PartCard.astro           one project card — Phase 2 drag source
│   │   ├── SpecTable.astro          material/process/tolerance table
│   │   ├── DimensionCallout.astro   SVG leader line + label
│   │   └── Gallery.astro            process photos
│   ├── content/projects/
│   │   └── intake-wedges.mdx        first real project
│   ├── assets/projects/intake-wedges/
│   │   └── hero.webp                supplied by Aaryan
│   └── pages/
│       ├── index.astro              hero + featured work
│       └── projects/
│           ├── index.astro          full parts bin listing
│           └── [...slug].astro      project sheet
```

Rationale for the `src/lib/` split: each module is pure TypeScript with no Astro imports, so it unit-tests in plain Vitest with no environment shimming. `.astro` files stay thin — markup and composition only. This is what makes the design system testable rather than aspirational.

---

## Task 1: Scaffold, test harness, and base-path-safe links

**Files:**
- Create: `package.json`, `tsconfig.json`, `astro.config.mjs`, `vitest.config.ts`, `.gitignore`, `public/.nojekyll`
- Create: `src/lib/paths.ts`
- Test: `src/lib/paths.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces: `joinBase(base: string, path: string): string`, `href(path: string): string` — every later task uses `href()` for internal links.

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "aaryandash-site",
  "type": "module",
  "version": "0.1.0",
  "private": true,
  "engines": { "node": ">=22.12.0" },
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "check": "astro check",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

- [ ] **Step 2: Install dependencies**

```bash
cd /home/aaryan/projects/aaryandash-site
npm install astro@^7.1.3 @astrojs/mdx@^7.0.3 @astrojs/sitemap@^3.7.3 motion@^12.42.2 \
  @fontsource-variable/ibm-plex-sans@^5.3.0 @fontsource/ibm-plex-mono@^5.3.0
npm install -D vitest@^4.1.10 typescript@^5.7.0
```

Expected: completes with no `EBADENGINE` warnings. If you see one, your Node is wrong — check `node -v` reports v22.x.

- [ ] **Step 3: Create `tsconfig.json`**

```json
{
  "extends": "astro/tsconfigs/strict",
  "include": [".astro/types.d.ts", "**/*"],
  "exclude": ["dist"]
}
```

- [ ] **Step 4: Create `astro.config.mjs`**

`site` and `base` come from environment variables so CI can inject the real GitHub Pages values and local dev works without them. Never hardcode these.

```js
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

const SITE = process.env.PUBLIC_SITE_URL ?? 'http://localhost:4321';
const BASE = process.env.PUBLIC_BASE_PATH ?? '/';

export default defineConfig({
  site: SITE,
  base: BASE,
  trailingSlash: 'ignore',
  integrations: [mdx(), sitemap()],
  build: { format: 'directory' },
});
```

- [ ] **Step 5: Create `vitest.config.ts`**

Plain Node environment — every tested module is pure TypeScript with no Astro or DOM imports, so no environment shim is needed.

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
```

- [ ] **Step 6: Create `.gitignore`**

```
node_modules/
dist/
.astro/
.DS_Store
*.log
.env
.env.production
```

- [ ] **Step 7: Create `public/.nojekyll`**

GitHub Pages runs Jekyll by default, which strips directories beginning with an underscore. Astro emits assets into `_astro/`. Without this file every stylesheet and script 404s on the live site — and it fails silently, looking like a CSS bug.

```bash
touch public/.nojekyll
```

- [ ] **Step 8: Write the failing test for base-path joining**

Create `src/lib/paths.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { joinBase } from './paths';

describe('joinBase', () => {
  it('returns root when base and path are both root', () => {
    expect(joinBase('/', '/')).toBe('/');
  });

  it('joins a path onto a root base', () => {
    expect(joinBase('/', '/projects')).toBe('/projects');
  });

  it('joins a path onto a subpath base', () => {
    expect(joinBase('/aaryandash-site/', '/projects')).toBe('/aaryandash-site/projects');
  });

  it('handles a base without a trailing slash', () => {
    expect(joinBase('/aaryandash-site', '/projects')).toBe('/aaryandash-site/projects');
  });

  it('handles a path without a leading slash', () => {
    expect(joinBase('/aaryandash-site/', 'projects')).toBe('/aaryandash-site/projects');
  });

  it('never produces a double slash', () => {
    expect(joinBase('/base/', '/a/b')).toBe('/base/a/b');
    expect(joinBase('/', '/a')).not.toContain('//');
  });

  it('returns the base itself for a root path under a subpath base', () => {
    expect(joinBase('/aaryandash-site/', '/')).toBe('/aaryandash-site/');
  });
});
```

- [ ] **Step 9: Run the test and confirm it fails**

```bash
npm test
```

Expected: FAIL — `Failed to resolve import "./paths"`.

- [ ] **Step 10: Implement `src/lib/paths.ts`**

```ts
/**
 * Join a base path and a route into a single absolute path.
 *
 * GitHub Pages serves project sites from a subpath (e.g. /aaryandash-site/).
 * Every internal link must be built through this, or it breaks on deploy
 * while working perfectly in local dev.
 */
export function joinBase(base: string, path: string): string {
  const trimmedBase = base.endsWith('/') ? base.slice(0, -1) : base;
  const normalisedPath = path.startsWith('/') ? path : `/${path}`;

  if (normalisedPath === '/') {
    return trimmedBase === '' ? '/' : `${trimmedBase}/`;
  }

  return `${trimmedBase}${normalisedPath}`;
}

/** Build an internal link using the base path Astro was configured with. */
export function href(path: string): string {
  return joinBase(import.meta.env.BASE_URL ?? '/', path);
}
```

- [ ] **Step 11: Run the test and confirm it passes**

```bash
npm test
```

Expected: PASS — 7 tests in `src/lib/paths.test.ts`.

- [ ] **Step 12: Create a minimal placeholder page so the build has something to emit**

Create `src/pages/index.astro`:

```astro
---
---
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>aaryandash-site</title>
  </head>
  <body>
    <h1>Scaffold online</h1>
  </body>
</html>
```

- [ ] **Step 13: Verify the build succeeds**

```bash
npm run build
```

Expected: `[build] Complete!` and a `dist/index.html` on disk. Confirm with `ls dist/`.

- [ ] **Step 14: Commit**

```bash
git add -A
git commit -m "feat: scaffold Astro project with test harness and base-path helper"
```

---

## Task 2: Design tokens, verified against WCAG

**Files:**
- Create: `src/lib/contrast.ts`, `src/lib/tokens.ts`, `src/styles/global.css`
- Test: `src/lib/contrast.test.ts`, `src/lib/tokens.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces: `contrastRatio(a: string, b: string): number`, `color` (frozen token object), `type`, `space`. `global.css` exposes every token as a CSS custom property named `--color-<key>` etc.

The point of testing tokens: the drawing-set look depends on low-contrast hairlines, which is exactly the design instinct that produces unreadable sites. These tests make it impossible to ship a palette that fails accessibility without a test going red.

- [ ] **Step 1: Write the failing test for contrast math**

Create `src/lib/contrast.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { hexToRgb, relativeLuminance, contrastRatio } from './contrast';

describe('hexToRgb', () => {
  it('parses a six-digit hex', () => {
    expect(hexToRgb('#FF6B1A')).toEqual([255, 107, 26]);
  });

  it('parses without the leading hash', () => {
    expect(hexToRgb('0B0D0F')).toEqual([11, 13, 15]);
  });

  it('expands a three-digit hex', () => {
    expect(hexToRgb('#FFF')).toEqual([255, 255, 255]);
  });

  it('throws on malformed input', () => {
    expect(() => hexToRgb('#GG0000')).toThrow(/Invalid hex colour/);
    expect(() => hexToRgb('#12345')).toThrow(/Invalid hex colour/);
  });
});

describe('relativeLuminance', () => {
  it('is 0 for black and 1 for white', () => {
    expect(relativeLuminance('#000000')).toBeCloseTo(0, 5);
    expect(relativeLuminance('#FFFFFF')).toBeCloseTo(1, 5);
  });
});

describe('contrastRatio', () => {
  it('gives 21 for black against white', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 2);
  });

  it('gives 1 for a colour against itself', () => {
    expect(contrastRatio('#FF6B1A', '#FF6B1A')).toBeCloseTo(1, 5);
  });

  it('is symmetric in its arguments', () => {
    const a = contrastRatio('#0B0D0F', '#E6EDF3');
    const b = contrastRatio('#E6EDF3', '#0B0D0F');
    expect(a).toBeCloseTo(b, 10);
  });
});
```

- [ ] **Step 2: Run the test and confirm it fails**

```bash
npm test
```

Expected: FAIL — `Failed to resolve import "./contrast"`.

- [ ] **Step 3: Implement `src/lib/contrast.ts`**

```ts
/** WCAG 2.1 relative luminance and contrast ratio maths. */

export function hexToRgb(hex: string): [number, number, number] {
  const raw = hex.replace('#', '');
  const full = raw.length === 3 ? raw.split('').map((c) => c + c).join('') : raw;

  if (!/^[0-9a-fA-F]{6}$/.test(full)) {
    throw new Error(`Invalid hex colour: ${hex}`);
  }

  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ];
}

export function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((channel) => {
    const s = channel / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  }) as [number, number, number];

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [lighter, darker] = la > lb ? [la, lb] : [lb, la];
  return (lighter + 0.05) / (darker + 0.05);
}
```

- [ ] **Step 4: Run the test and confirm it passes**

```bash
npm test
```

Expected: PASS — 8 new tests in `contrast.test.ts`, 15 total.

- [ ] **Step 5: Write the failing test for the token palette**

Create `src/lib/tokens.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { color, font, space } from './tokens';
import { contrastRatio } from './contrast';

describe('colour tokens meet WCAG AA on the dark canvas', () => {
  it('body text clears 4.5:1', () => {
    expect(contrastRatio(color.text, color.canvas)).toBeGreaterThanOrEqual(4.5);
  });

  it('muted text clears 4.5:1', () => {
    expect(contrastRatio(color.textMuted, color.canvas)).toBeGreaterThanOrEqual(4.5);
  });

  it('accent clears 4.5:1 — it is used for annotation text, not just decoration', () => {
    expect(contrastRatio(color.accent, color.canvas)).toBeGreaterThanOrEqual(4.5);
  });

  it('underdefined blue clears 4.5:1', () => {
    expect(contrastRatio(color.underdefined, color.canvas)).toBeGreaterThanOrEqual(4.5);
  });

  it('meaningful borders clear the 3:1 non-text threshold', () => {
    expect(contrastRatio(color.lineBright, color.canvas)).toBeGreaterThanOrEqual(3);
  });
});

describe('the decorative grid stays quiet', () => {
  it('grid line contrast is under 2:1 so it reads as substrate, not content', () => {
    expect(contrastRatio(color.line, color.canvas)).toBeLessThan(2);
  });
});

describe('token shape', () => {
  it('every colour is a valid six-digit hex', () => {
    for (const value of Object.values(color)) {
      expect(value).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  it('exposes the font stacks used by the drawing system', () => {
    expect(font.mono).toContain('IBM Plex Mono');
    expect(font.sans).toContain('IBM Plex Sans');
  });

  it('space scale is ascending', () => {
    const values = Object.values(space).map((v) => parseFloat(v));
    const sorted = [...values].sort((a, b) => a - b);
    expect(values).toEqual(sorted);
  });
});
```

- [ ] **Step 6: Run the test and confirm it fails**

```bash
npm test
```

Expected: FAIL — `Failed to resolve import "./tokens"`.

- [ ] **Step 7: Implement `src/lib/tokens.ts`**

These hex values are contrast-verified. `lineBright` is `#55636D` rather than something darker specifically because it must clear 3:1 — do not darken it to taste without re-running the tests.

```ts
/**
 * Design tokens — the single source of truth for the drawing-set system.
 * CSS custom properties in global.css are generated from these names by hand;
 * keep them in sync.
 */

export const color = {
  /** Page background — near-black, not pure black. */
  canvas: '#0B0D0F',
  /** Raised surfaces: spec tables, cards. */
  surface: '#12161A',
  /** Decorative graph-paper grid. Deliberately near-invisible. */
  line: '#2A3238',
  /** Meaningful borders and dividers. Clears 3:1. */
  lineBright: '#55636D',
  /** Primary body text. */
  text: '#E6EDF3',
  /** Secondary text, annotations, captions. */
  textMuted: '#9AA7B2',
  /** Active or critical annotation. One per viewport, maximum. */
  accent: '#FF6B1A',
  /** Unresolved and inactive states — the underdefined-sketch blue. */
  underdefined: '#4C8DFF',
} as const;

/** Named `font`, not `type` — `type` collides with TypeScript's
    `import { type X }` syntax and produces confusing parse errors. */
export const font = {
  mono: "'IBM Plex Mono', ui-monospace, SFMono-Regular, Menlo, monospace",
  sans: "'IBM Plex Sans Variable', 'IBM Plex Sans', system-ui, sans-serif",
} as const;

export const space = {
  xs: '0.25rem',
  sm: '0.5rem',
  md: '1rem',
  lg: '2rem',
  xl: '4rem',
  xxl: '8rem',
} as const;

/** Hairline widths. The drawing look depends on these staying genuinely thin. */
export const stroke = {
  hair: '0.5px',
  thin: '1px',
  medium: '2px',
} as const;
```

- [ ] **Step 8: Run the test and confirm it passes**

```bash
npm test
```

Expected: PASS — 24 tests total.

- [ ] **Step 9: Create `src/styles/global.css`**

```css
@import '@fontsource-variable/ibm-plex-sans';
@import '@fontsource/ibm-plex-mono/400.css';
@import '@fontsource/ibm-plex-mono/500.css';

:root {
  --color-canvas: #0b0d0f;
  --color-surface: #12161a;
  --color-line: #2a3238;
  --color-line-bright: #55636d;
  --color-text: #e6edf3;
  --color-text-muted: #9aa7b2;
  --color-accent: #ff6b1a;
  --color-underdefined: #4c8dff;

  --font-mono: 'IBM Plex Mono', ui-monospace, SFMono-Regular, Menlo, monospace;
  --font-sans: 'IBM Plex Sans Variable', 'IBM Plex Sans', system-ui, sans-serif;

  --space-xs: 0.25rem;
  --space-sm: 0.5rem;
  --space-md: 1rem;
  --space-lg: 2rem;
  --space-xl: 4rem;
  --space-xxl: 8rem;

  --stroke-hair: 0.5px;
  --stroke-thin: 1px;
  --stroke-medium: 2px;

  --grid-size: 24px;
  --measure: 68ch;
}

*,
*::before,
*::after {
  box-sizing: border-box;
}

body {
  margin: 0;
  background-color: var(--color-canvas);
  /* Graph-paper substrate. Two gradients, no image request. */
  background-image:
    linear-gradient(to right, var(--color-line) var(--stroke-hair), transparent var(--stroke-hair)),
    linear-gradient(to bottom, var(--color-line) var(--stroke-hair), transparent var(--stroke-hair));
  background-size: var(--grid-size) var(--grid-size);
  color: var(--color-text);
  font-family: var(--font-sans);
  font-size: 16px;
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
}

h1, h2, h3, h4 {
  font-family: var(--font-mono);
  font-weight: 500;
  letter-spacing: 0.02em;
  line-height: 1.2;
}

/* Annotation type: labels, dimensions, spec values, title block. */
.annotation {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-text-muted);
}

a {
  color: var(--color-text);
  text-decoration-color: var(--color-line-bright);
  text-underline-offset: 0.25em;
}

a:hover {
  color: var(--color-accent);
  text-decoration-color: var(--color-accent);
}

:focus-visible {
  outline: var(--stroke-medium) solid var(--color-accent);
  outline-offset: 3px;
}

img {
  max-width: 100%;
  height: auto;
}

.prose {
  max-width: var(--measure);
}

/* Anything that animates must opt in via this attribute so the
   reduced-motion override below can reach all of it in one rule. */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

- [ ] **Step 10: Verify the build still succeeds**

```bash
npm run build
```

Expected: `[build] Complete!`

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "feat: add contrast-verified design tokens and global stylesheet"
```

---

## Task 3: Project content schema and the first project

**Split into 3a and 3b during execution.** The schema and collection wiring (3a) have no content dependency and are done first. Only the content file itself (3b) needs a render, because Astro fails the build when frontmatter references a missing asset.

- **Task 3a — steps 1 to 5:** `projectSchema.ts`, its tests, and `content.config.ts`. No content file, no images. The collection resolves to an empty array, which every consuming page handles.
- **Task 3b — steps 6 to 9:** the hero render at `src/assets/projects/intake-wedges/hero.webp` (isometric, ≥1600px wide, dark or transparent background) and `intake-wedges.mdx`. Deferred until Aaryan has renders exported.

Task 6 (dimension callouts) also defers with 3b — a callout needs a hero image to point at. Tasks 4, 5 and 7 run in between, so the site deploys and is live before any content exists.

**Files:**
- Create: `src/lib/projectSchema.ts`, `src/content.config.ts`, `src/content/projects/intake-wedges.mdx`
- Test: `src/lib/projectSchema.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces: `projectSchema({ image }): ZodObject` — consumed by `content.config.ts`. Collection name is `projects`. Later tasks query it with `getCollection('projects')` and each entry exposes `entry.data` matching this schema plus `entry.id` as the URL slug.

The schema is defined as a standalone factory rather than inline in `content.config.ts` so it can be unit-tested without importing the `astro:content` virtual module, which does not resolve outside an Astro build.

- [ ] **Step 1: Write the failing schema test**

Create `src/lib/projectSchema.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { z } from 'astro/zod';
import { projectSchema } from './projectSchema';

/** Stand-in for Astro's image() helper, which only exists during a build. */
const imageStub = () => z.string();
const schema = projectSchema({ image: imageStub });

const valid = {
  title: 'Intake Wedges',
  order: 1,
  season: 'FRC 2025',
  role: 'Design lead',
  summary: 'Compliant wedges that funnel game pieces into the intake throat.',
  tools: ['Onshape', 'Bambu Studio'],
  materials: ['PETG'],
  specs: [{ label: 'Material', value: 'PETG' }],
  heroRender: 'hero.webp',
  heroAlt: 'Isometric view of the left intake wedge',
};

describe('projectSchema', () => {
  it('accepts a well-formed project', () => {
    expect(() => schema.parse(valid)).not.toThrow();
  });

  it('defaults gallery to an empty array', () => {
    expect(schema.parse(valid).gallery).toEqual([]);
  });

  it('defaults featured to false', () => {
    expect(schema.parse(valid).featured).toBe(false);
  });

  it('rejects a missing title', () => {
    const { title, ...rest } = valid;
    expect(() => schema.parse(rest)).toThrow();
  });

  it('rejects an empty title', () => {
    expect(() => schema.parse({ ...valid, title: '' })).toThrow();
  });

  it('rejects a hero render with no alt text — accessibility is a build error, not a review note', () => {
    const { heroAlt, ...rest } = valid;
    expect(() => schema.parse(rest)).toThrow();
  });

  it('rejects empty alt text', () => {
    expect(() => schema.parse({ ...valid, heroAlt: '' })).toThrow();
  });

  it('rejects a gallery image with no alt text', () => {
    const withBadGallery = {
      ...valid,
      gallery: [{ src: 'a.webp', alt: '', caption: 'A caption' }],
    };
    expect(() => schema.parse(withBadGallery)).toThrow();
  });

  it('rejects a project with no tools listed', () => {
    expect(() => schema.parse({ ...valid, tools: [] })).toThrow();
  });

  it('rejects a negative order', () => {
    expect(() => schema.parse({ ...valid, order: -1 })).toThrow();
  });

  it('rejects a summary longer than 200 characters', () => {
    expect(() => schema.parse({ ...valid, summary: 'x'.repeat(201) })).toThrow();
  });
});
```

- [ ] **Step 2: Run the test and confirm it fails**

```bash
npm test
```

Expected: FAIL — `Failed to resolve import "./projectSchema"`.

- [ ] **Step 3: Implement `src/lib/projectSchema.ts`**

```ts
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
    specs: z
      .array(z.object({ label: z.string().min(1), value: z.string().min(1) }))
      .default([]),
    heroRender: image(),
    heroAlt: z.string().min(1),
    sectionRender: image().optional(),
    sectionAlt: z.string().min(1).optional(),
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
```

- [ ] **Step 4: Run the test and confirm it passes**

```bash
npm test
```

Expected: PASS — 35 tests total.

- [ ] **Step 5: Create `src/content.config.ts`**

```ts
import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { projectSchema } from './lib/projectSchema';

const projects = defineCollection({
  loader: glob({ base: './src/content/projects', pattern: '**/*.{md,mdx}' }),
  schema: ({ image }) => projectSchema({ image }),
});

export const collections = { projects };
```

- [ ] **Step 6: Place the hero render**

```bash
mkdir -p src/assets/projects/intake-wedges
# Copy your exported render to src/assets/projects/intake-wedges/hero.webp
ls -lh src/assets/projects/intake-wedges/hero.webp
```

Expected: the file exists and is non-zero.

- [ ] **Step 7: Create `src/content/projects/intake-wedges.mdx`**

The frontmatter structure is final. **The prose below is scaffolding — Aaryan replaces every sentence with the real story.** The headings are the ones that matter to an engineering reader: what was constrained, what was tried, what failed, what shipped.

```mdx
---
title: 'Intake Wedges'
order: 1
season: 'FRC 2025'
role: 'Design lead'
summary: 'Compliant wedges that funnel game pieces into the intake throat.'
tools: ['Onshape', 'Bambu Studio']
materials: ['PETG']
specs:
  - label: 'Material'
    value: 'PETG'
  - label: 'Process'
    value: 'FDM, 0.2mm layer'
  - label: 'Quantity'
    value: '2 (mirrored)'
  - label: 'Iterations'
    value: '4'
heroRender: './hero.webp'
heroAlt: 'Isometric view of the left intake wedge, showing the compliant funnel face'
featured: true
---

## The constraint

REPLACE THIS. What did the geometry have to satisfy? Frame width, game piece
dimensions, the angle the piece arrives at, the space the drivetrain left you.

## What I tried

REPLACE THIS. The approaches that did not survive, and why. This section is the
one that distinguishes an engineer from someone who owns CAD software.

## What failed

REPLACE THIS. Be specific and unembarrassed. A part that cracked, a tolerance
that was wrong, an assumption about the game piece that turned out false.

## What shipped

REPLACE THIS. The final geometry and the reason it works.
```

- [ ] **Step 8: Verify the content collection builds and validates**

```bash
npm run build
```

Expected: `[build] Complete!` with no content-collection errors. To prove the schema is actually enforcing things, temporarily delete the `heroAlt:` line and re-run — the build must fail with a Zod error naming `heroAlt`. Restore the line afterwards.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: add project content collection with accessibility-enforcing schema"
```

---

## Task 4: Navigation model, metadata, and the base layout

**Files:**
- Create: `src/lib/sheets.ts`, `src/lib/meta.ts`, `src/layouts/BaseLayout.astro`, `src/components/TitleBlock.astro`
- Test: `src/lib/sheets.test.ts`, `src/lib/meta.test.ts`

**Interfaces:**
- Consumes: `href()` from `src/lib/paths.ts`
- Produces:
  - `SHEETS: readonly Sheet[]` where `Sheet = { n: number; label: string; path: string }`
  - `sheetNumber(n: number): string` — zero-padded to two digits
  - `sheetLabel(n: number, total: number): string` — e.g. `"SHEET 01 OF 04"`
  - `activeSheet(pathname: string): Sheet | undefined`
  - `pageTitle(title?: string): string`, `canonicalUrl(site: string, base: string, path: string): string`
  - `BaseLayout` accepting props `{ title?: string; description?: string; path: string }`

- [ ] **Step 1: Write the failing test for the nav model**

Create `src/lib/sheets.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { SHEETS, builtSheets, sheetNumber, sheetLabel, activeSheet } from './sheets';

describe('sheetNumber', () => {
  it('zero-pads to two digits', () => {
    expect(sheetNumber(0)).toBe('00');
    expect(sheetNumber(3)).toBe('03');
  });

  it('leaves two-digit numbers alone', () => {
    expect(sheetNumber(12)).toBe('12');
  });
});

describe('sheetLabel', () => {
  it('formats as a drawing sheet reference', () => {
    expect(sheetLabel(1, 4)).toBe('SHEET 01 OF 04');
  });
});

describe('SHEETS', () => {
  it('uses the literal Personal Interests label, not a clever synonym', () => {
    const labels = SHEETS.map((s) => s.label);
    expect(labels).toContain('Personal Interests');
  });

  it('numbers sheets consecutively from zero', () => {
    SHEETS.forEach((sheet, index) => {
      expect(sheet.n).toBe(index);
    });
  });

  it('gives every sheet a root-relative path', () => {
    for (const sheet of SHEETS) {
      expect(sheet.path.startsWith('/')).toBe(true);
    }
  });
});

describe('builtSheets', () => {
  it('excludes sheets whose pages do not exist yet', () => {
    const paths = builtSheets().map((s) => s.path);
    expect(paths).not.toContain('/interests');
  });

  it('includes the sheets Phase 1 actually ships', () => {
    const paths = builtSheets().map((s) => s.path);
    expect(paths).toContain('/');
    expect(paths).toContain('/projects');
  });

  it('never links to a sheet marked unbuilt', () => {
    for (const sheet of builtSheets()) {
      expect(sheet.built).toBe(true);
    }
  });
});

describe('activeSheet', () => {
  it('matches the home sheet exactly', () => {
    expect(activeSheet('/')?.label).toBe('Home');
  });

  it('does not match home for a deeper path', () => {
    expect(activeSheet('/projects')?.label).toBe('Projects');
  });

  it('matches a project detail page to its parent sheet', () => {
    expect(activeSheet('/projects/intake-wedges')?.label).toBe('Projects');
  });

  it('tolerates a trailing slash', () => {
    expect(activeSheet('/projects/')?.label).toBe('Projects');
  });

  it('returns undefined for an unknown path', () => {
    expect(activeSheet('/nowhere')).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run the test and confirm it fails**

```bash
npm test
```

Expected: FAIL — `Failed to resolve import "./sheets"`.

- [ ] **Step 3: Implement `src/lib/sheets.ts`**

```ts
export interface Sheet {
  /** Sheet number in the drawing set, zero-indexed. */
  n: number;
  /** Nav label. Deliberately literal — see the spec. */
  label: string;
  /** Root-relative path, before the base path is applied. */
  path: string;
  /**
   * Whether the page exists yet. The full drawing set is declared up front so
   * sheet numbering stays stable across phases, but the nav must never link to
   * a page that has not been built — that ships 404s to visitors.
   * Flip to true in the phase that creates the page.
   */
  built: boolean;
}

export const SHEETS: readonly Sheet[] = [
  { n: 0, label: 'Home', path: '/', built: true },
  { n: 1, label: 'Projects', path: '/projects', built: true },
  { n: 2, label: 'About', path: '/about', built: false },
  { n: 3, label: 'Personal Interests', path: '/interests', built: false },
] as const;

/** The sheets the nav is allowed to link to. */
export function builtSheets(): readonly Sheet[] {
  return SHEETS.filter((sheet) => sheet.built);
}

export function sheetNumber(n: number): string {
  return String(n).padStart(2, '0');
}

export function sheetLabel(n: number, total: number): string {
  return `SHEET ${sheetNumber(n)} OF ${sheetNumber(total)}`;
}

/**
 * Resolve a pathname to the sheet it belongs to. Detail pages such as
 * /projects/intake-wedges resolve to their parent sheet.
 */
export function activeSheet(pathname: string): Sheet | undefined {
  const clean = pathname.length > 1 && pathname.endsWith('/')
    ? pathname.slice(0, -1)
    : pathname;

  if (clean === '/') {
    return SHEETS.find((sheet) => sheet.path === '/');
  }

  return SHEETS
    .filter((sheet) => sheet.path !== '/')
    .find((sheet) => clean === sheet.path || clean.startsWith(`${sheet.path}/`));
}
```

- [ ] **Step 4: Run the test and confirm it passes**

```bash
npm test
```

Expected: PASS — 49 tests total.

- [ ] **Step 5: Write the failing test for metadata**

Create `src/lib/meta.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { SITE_NAME, pageTitle, canonicalUrl } from './meta';

describe('pageTitle', () => {
  it('returns the bare site name when no page title is given', () => {
    expect(pageTitle()).toBe(SITE_NAME);
  });

  it('suffixes the site name for a page title', () => {
    expect(pageTitle('Intake Wedges')).toBe(`Intake Wedges · ${SITE_NAME}`);
  });

  it('does not double up when the title is already the site name', () => {
    expect(pageTitle(SITE_NAME)).toBe(SITE_NAME);
  });
});

describe('canonicalUrl', () => {
  it('builds an absolute URL from site, base and path', () => {
    expect(canonicalUrl('https://example.com', '/', '/projects'))
      .toBe('https://example.com/projects');
  });

  it('includes a subpath base', () => {
    expect(canonicalUrl('https://example.com', '/site/', '/projects'))
      .toBe('https://example.com/site/projects');
  });

  it('strips a trailing slash on the site origin', () => {
    expect(canonicalUrl('https://example.com/', '/', '/projects'))
      .toBe('https://example.com/projects');
  });

  it('handles the root path', () => {
    expect(canonicalUrl('https://example.com', '/', '/'))
      .toBe('https://example.com/');
  });

  it('never emits a double slash in the path portion', () => {
    const url = canonicalUrl('https://example.com/', '/site/', '/a');
    expect(url.slice('https://'.length)).not.toContain('//');
  });
});
```

- [ ] **Step 6: Run the test and confirm it fails**

```bash
npm test
```

Expected: FAIL — `Failed to resolve import "./meta"`.

- [ ] **Step 7: Implement `src/lib/meta.ts`**

```ts
import { joinBase } from './paths';

export const SITE_NAME = 'Aaryan Dash';
export const SITE_DESCRIPTION =
  'Mechanical engineering portfolio — CAD, FRC robotics, and design work.';

export function pageTitle(title?: string): string {
  if (!title || title === SITE_NAME) return SITE_NAME;
  return `${title} · ${SITE_NAME}`;
}

export function canonicalUrl(site: string, base: string, path: string): string {
  const origin = site.endsWith('/') ? site.slice(0, -1) : site;
  return `${origin}${joinBase(base, path)}`;
}
```

- [ ] **Step 8: Run the test and confirm it passes**

```bash
npm test
```

Expected: PASS — 57 tests total.

- [ ] **Step 9: Create `src/components/TitleBlock.astro`**

The title block is both the drawing convention and the navigation. It is a `<nav>` with a real landmark and an `aria-current` on the active sheet.

```astro
---
import { SHEETS, builtSheets, sheetLabel, activeSheet } from '../lib/sheets';
import { href } from '../lib/paths';
import { SITE_NAME } from '../lib/meta';

interface Props {
  path: string;
}

const { path } = Astro.props;
const current = activeSheet(path);
const sheets = builtSheets();
---

<nav class="title-block" aria-label="Site sections">
  <a class="title-block__name" href={href('/')}>{SITE_NAME}</a>

  <ul class="title-block__sheets">
    {sheets.map((sheet) => (
      <li>
        <a
          href={href(sheet.path)}
          aria-current={current?.n === sheet.n ? 'page' : undefined}
        >
          <span class="title-block__num">{String(sheet.n).padStart(2, '0')}</span>
          <span class="title-block__label">{sheet.label}</span>
        </a>
      </li>
    ))}
  </ul>

  <p class="title-block__sheet-ref annotation">
    {current ? sheetLabel(current.n, SHEETS.length) : ''}
  </p>
</nav>

<style>
  .title-block {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: var(--space-md);
    padding: var(--space-md) var(--space-lg);
    border-bottom: var(--stroke-thin) solid var(--color-line-bright);
    background-color: var(--color-canvas);
  }

  .title-block__name {
    font-family: var(--font-mono);
    font-weight: 500;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    text-decoration: none;
  }

  .title-block__sheets {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-md);
    list-style: none;
    margin: 0;
    padding: 0;
    margin-inline-start: auto;
  }

  .title-block__sheets a {
    display: inline-flex;
    align-items: baseline;
    gap: var(--space-xs);
    font-family: var(--font-mono);
    font-size: 0.75rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    text-decoration: none;
    color: var(--color-text-muted);
  }

  .title-block__sheets a[aria-current='page'] {
    color: var(--color-accent);
  }

  .title-block__sheets a:hover {
    color: var(--color-text);
  }

  .title-block__num {
    color: var(--color-line-bright);
  }

  .title-block__sheet-ref {
    margin: 0;
    flex-basis: 100%;
    text-align: end;
  }

  @media (max-width: 40rem) {
    .title-block__sheets {
      margin-inline-start: 0;
      flex-basis: 100%;
    }
  }
</style>
```

- [ ] **Step 10: Create `src/layouts/BaseLayout.astro`**

```astro
---
import '../styles/global.css';
import TitleBlock from '../components/TitleBlock.astro';
import { pageTitle, canonicalUrl, SITE_DESCRIPTION } from '../lib/meta';

interface Props {
  title?: string;
  description?: string;
  path: string;
}

const { title, description = SITE_DESCRIPTION, path } = Astro.props;

const site = Astro.site?.toString() ?? 'http://localhost:4321';
const canonical = canonicalUrl(site, import.meta.env.BASE_URL ?? '/', path);
---

<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{pageTitle(title)}</title>
    <meta name="description" content={description} />
    <link rel="canonical" href={canonical} />

    <meta property="og:type" content="website" />
    <meta property="og:title" content={pageTitle(title)} />
    <meta property="og:description" content={description} />
    <meta property="og:url" content={canonical} />
    <meta name="twitter:card" content="summary_large_image" />
  </head>
  <body>
    <a class="skip-link" href="#main">Skip to content</a>
    <TitleBlock path={path} />
    <main id="main">
      <slot />
    </main>
  </body>
</html>

<style>
  .skip-link {
    position: absolute;
    inset-inline-start: -9999px;
    top: var(--space-sm);
    padding: var(--space-sm) var(--space-md);
    background: var(--color-surface);
    border: var(--stroke-thin) solid var(--color-accent);
    font-family: var(--font-mono);
    z-index: 10;
  }

  .skip-link:focus {
    inset-inline-start: var(--space-sm);
  }

  main {
    padding: var(--space-lg);
    max-width: 80rem;
    margin-inline: auto;
  }
</style>
```

- [ ] **Step 11: Verify the build succeeds**

```bash
npm run build
```

Expected: `[build] Complete!`

- [ ] **Step 12: Commit**

```bash
git add -A
git commit -m "feat: add title block navigation, metadata helpers and base layout"
```

---

## Task 5: Home page and the project sheet

**Files:**
- Create: `src/components/PartCard.astro`, `src/components/SpecTable.astro`, `src/components/Gallery.astro`, `src/pages/projects/index.astro`, `src/pages/projects/[...slug].astro`
- Modify: `src/pages/index.astro` (replace the Task 1 placeholder entirely)

**Interfaces:**
- Consumes: `BaseLayout`, `href()`, `getCollection('projects')`
- Produces: routes at `/projects` and `/projects/<id>`. `PartCard` takes `{ project: CollectionEntry<'projects'> }`. `SpecTable` takes `{ specs: { label: string; value: string }[] }`. `Gallery` takes `{ items: { src: ImageMetadata; alt: string; caption: string }[] }`.

Home shows only featured projects and links onward; `/projects` is the full parts bin. The card markup lives in one component consumed by both, so Phase 2 has a single place to attach drag behaviour.

- [ ] **Step 1: Create `src/components/SpecTable.astro`**

```astro
---
interface Props {
  specs: { label: string; value: string }[];
}

const { specs } = Astro.props;
---

{specs.length > 0 && (
  <table class="spec-table">
    <caption class="annotation">Specification</caption>
    <tbody>
      {specs.map((spec) => (
        <tr>
          <th scope="row">{spec.label}</th>
          <td>{spec.value}</td>
        </tr>
      ))}
    </tbody>
  </table>
)}

<style>
  .spec-table {
    width: 100%;
    border-collapse: collapse;
    font-family: var(--font-mono);
    font-size: 0.8125rem;
    background-color: var(--color-surface);
    border: var(--stroke-thin) solid var(--color-line-bright);
  }

  .spec-table caption {
    text-align: start;
    padding-block-end: var(--space-sm);
  }

  .spec-table th,
  .spec-table td {
    padding: var(--space-sm) var(--space-md);
    border-block-end: var(--stroke-hair) solid var(--color-line-bright);
    text-align: start;
  }

  .spec-table tr:last-child th,
  .spec-table tr:last-child td {
    border-block-end: none;
  }

  .spec-table th {
    color: var(--color-text-muted);
    font-weight: 400;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    width: 40%;
  }
</style>
```

- [ ] **Step 2: Create `src/components/Gallery.astro`**

```astro
---
import { Image } from 'astro:assets';

interface Props {
  items: { src: ImageMetadata; alt: string; caption: string }[];
}

const { items } = Astro.props;
---

{items.length > 0 && (
  <ul class="gallery">
    {items.map((item) => (
      <li>
        <figure>
          <Image src={item.src} alt={item.alt} widths={[400, 800, 1200]} loading="lazy" />
          {item.caption && <figcaption class="annotation">{item.caption}</figcaption>}
        </figure>
      </li>
    ))}
  </ul>
)}

<style>
  .gallery {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(18rem, 1fr));
    gap: var(--space-lg);
    list-style: none;
    margin: 0;
    padding: 0;
  }

  figure {
    margin: 0;
  }

  figure img {
    display: block;
    width: 100%;
    border: var(--stroke-thin) solid var(--color-line-bright);
  }

  figcaption {
    margin-block-start: var(--space-sm);
  }
</style>
```

- [ ] **Step 3: Create `src/components/PartCard.astro`**

A part card is a plain link in Phase 1. Phase 2 makes it draggable by adding attributes to this one component — the link behaviour stays untouched, which is how the spec's "drag is the delight, click is the contract" rule survives.

```astro
---
import { Image } from 'astro:assets';
import type { CollectionEntry } from 'astro:content';
import { href } from '../lib/paths';

interface Props {
  project: CollectionEntry<'projects'>;
}

const { project } = Astro.props;
const { data } = project;
---

<li class="part-card">
  <a href={href(`/projects/${project.id}`)}>
    <Image src={data.heroRender} alt={data.heroAlt} widths={[400, 800]} loading="lazy" />
    <span class="part-card__season annotation">{data.season}</span>
    <span class="part-card__title">{data.title}</span>
    <span class="part-card__summary">{data.summary}</span>
  </a>
</li>

<style>
  .part-card a {
    display: grid;
    gap: var(--space-xs);
    padding: var(--space-md);
    border: var(--stroke-thin) solid var(--color-line-bright);
    background-color: var(--color-surface);
    text-decoration: none;
    height: 100%;
  }

  .part-card a:hover {
    border-color: var(--color-accent);
  }

  .part-card img {
    display: block;
    width: 100%;
    margin-block-end: var(--space-sm);
  }

  .part-card__title {
    font-family: var(--font-mono);
    font-size: 1.125rem;
    color: var(--color-text);
  }

  .part-card__summary {
    color: var(--color-text-muted);
    font-size: 0.9375rem;
  }
</style>
```

- [ ] **Step 4: Replace `src/pages/index.astro`**

Home carries the hero and featured work only. The full bin lives at `/projects`, so the two pages are not duplicates of each other.

```astro
---
import { getCollection } from 'astro:content';
import BaseLayout from '../layouts/BaseLayout.astro';
import PartCard from '../components/PartCard.astro';
import { href } from '../lib/paths';
import { SITE_NAME } from '../lib/meta';

const all = await getCollection('projects');
const featured = all
  .filter((project) => project.data.featured)
  .sort((a, b) => a.data.order - b.data.order);

/** Never show an empty home page: fall back to everything if nothing is flagged. */
const shown = featured.length > 0
  ? featured
  : all.sort((a, b) => a.data.order - b.data.order);
---

<BaseLayout path="/">
  <section class="hero">
    <p class="annotation">Mechanical engineering · Portfolio</p>
    <h1>{SITE_NAME}</h1>
    <p class="hero__lede prose">
      I design mechanisms — FRC robot subsystems, competition CAD, and parts that
      have to survive contact with reality.
    </p>
  </section>

  <section aria-labelledby="featured-heading" class="featured">
    <h2 id="featured-heading" class="annotation">Selected work</h2>
    <ul class="featured__list">
      {shown.map((project) => <PartCard project={project} />)}
    </ul>
    <p class="featured__more">
      <a href={href('/projects')}>All projects →</a>
    </p>
  </section>
</BaseLayout>

<style>
  .hero {
    padding-block: var(--space-xl);
    border-block-end: var(--stroke-thin) solid var(--color-line-bright);
  }

  .hero h1 {
    font-size: clamp(2.5rem, 8vw, 5rem);
    margin-block: var(--space-sm) var(--space-md);
    letter-spacing: 0.04em;
  }

  .hero__lede {
    color: var(--color-text-muted);
    font-size: 1.125rem;
  }

  .featured {
    padding-block: var(--space-xl);
  }

  .featured__list {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(20rem, 1fr));
    gap: var(--space-lg);
    list-style: none;
    margin: var(--space-lg) 0 0;
    padding: 0;
  }

  .featured__more {
    margin-block-start: var(--space-lg);
    font-family: var(--font-mono);
  }
</style>
```

- [ ] **Step 5: Create `src/pages/projects/index.astro`**

This route must exist — the title block links to it, and a nav link to a 404 is the most visible possible bug.

```astro
---
import { getCollection } from 'astro:content';
import BaseLayout from '../../layouts/BaseLayout.astro';
import PartCard from '../../components/PartCard.astro';

const projects = (await getCollection('projects')).sort(
  (a, b) => a.data.order - b.data.order,
);
---

<BaseLayout
  title="Projects"
  description="CAD and mechanical design work — FRC robotics subsystems and competition entries."
  path="/projects"
>
  <section aria-labelledby="parts-bin-heading" class="parts-bin">
    <h1 id="parts-bin-heading">Parts bin</h1>
    <p class="parts-bin__note annotation">
      {projects.length} {projects.length === 1 ? 'part' : 'parts'} on file
    </p>
    <ul class="parts-bin__list">
      {projects.map((project) => <PartCard project={project} />)}
    </ul>
  </section>
</BaseLayout>

<style>
  .parts-bin {
    padding-block: var(--space-lg);
  }

  .parts-bin h1 {
    font-size: clamp(2rem, 6vw, 3rem);
    margin-block-end: var(--space-sm);
  }

  .parts-bin__list {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(20rem, 1fr));
    gap: var(--space-lg);
    list-style: none;
    margin: var(--space-lg) 0 0;
    padding: 0;
  }
</style>
```

- [ ] **Step 6: Create `src/pages/projects/[...slug].astro`**

```astro
---
import { getCollection, render } from 'astro:content';
import { Image } from 'astro:assets';
import BaseLayout from '../../layouts/BaseLayout.astro';
import SpecTable from '../../components/SpecTable.astro';
import Gallery from '../../components/Gallery.astro';

export async function getStaticPaths() {
  const projects = await getCollection('projects');
  return projects.map((project) => ({
    params: { slug: project.id },
    props: { project },
  }));
}

const { project } = Astro.props;
const { Content } = await render(project);
const { data } = project;
---

<BaseLayout
  title={data.title}
  description={data.summary}
  path={`/projects/${project.id}`}
>
  <article>
    <header class="sheet-header">
      <p class="annotation">{data.season} · {data.role}</p>
      <h1>{data.title}</h1>
      <p class="sheet-header__summary prose">{data.summary}</p>
    </header>

    <Image
      class="sheet-hero"
      src={data.heroRender}
      alt={data.heroAlt}
      widths={[800, 1200, 1600]}
      loading="eager"
    />

    <div class="sheet-body">
      <aside class="sheet-meta">
        <SpecTable specs={data.specs} />

        <dl class="annotation sheet-meta__lists">
          <dt>Tools</dt>
          <dd>{data.tools.join(', ')}</dd>
          {data.materials.length > 0 && (
            <>
              <dt>Materials</dt>
              <dd>{data.materials.join(', ')}</dd>
            </>
          )}
        </dl>
      </aside>

      <div class="prose sheet-writeup">
        <Content />
      </div>
    </div>

    <Gallery items={data.gallery} />
  </article>
</BaseLayout>

<style>
  .sheet-header {
    padding-block: var(--space-lg);
  }

  .sheet-header h1 {
    font-size: clamp(2rem, 6vw, 3.5rem);
    margin-block: var(--space-sm);
  }

  .sheet-header__summary {
    color: var(--color-text-muted);
    font-size: 1.125rem;
  }

  .sheet-hero {
    display: block;
    width: 100%;
    border: var(--stroke-thin) solid var(--color-line-bright);
  }

  .sheet-body {
    display: grid;
    grid-template-columns: minmax(16rem, 22rem) 1fr;
    gap: var(--space-xl);
    padding-block: var(--space-xl);
    align-items: start;
  }

  .sheet-meta__lists {
    margin-block-start: var(--space-lg);
    display: grid;
    grid-template-columns: auto 1fr;
    gap: var(--space-xs) var(--space-md);
  }

  .sheet-meta__lists dt {
    color: var(--color-line-bright);
  }

  .sheet-meta__lists dd {
    margin: 0;
  }

  .sheet-writeup :global(h2) {
    font-size: 1.25rem;
    margin-block-start: var(--space-lg);
    color: var(--color-accent);
  }

  @media (max-width: 52rem) {
    .sheet-body {
      grid-template-columns: 1fr;
      gap: var(--space-lg);
    }
  }
</style>
```

- [ ] **Step 7: Build and inspect the result in a browser**

```bash
npm run build && npm run preview
```

Open `http://localhost:4321/`. Confirm by eye:
- The graph-paper grid is visible but does not compete with text
- The title block shows `SHEET 00 OF 04` on the home page
- Clicking the project card reaches the project sheet
- The project sheet shows the hero render, spec table, and writeup headings

- [ ] **Step 8: Verify keyboard navigation**

With the preview still running, load the page and press `Tab` repeatedly from the top. Confirm:
- The first stop is the "Skip to content" link, and it becomes visible when focused
- Every nav link and project card receives a visible amber focus ring
- No element is reachable by mouse but skipped by keyboard

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: add home page, parts bin listing and project sheet template"
```

---

## Task 6: Dimension callouts with draw-in motion

**Files:**
- Create: `src/lib/callout.ts`, `src/components/DimensionCallout.astro`
- Modify: `src/pages/projects/[...slug].astro` (add one callout over the hero render)
- Test: `src/lib/callout.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces:
  - `Point = { x: number; y: number }`
  - `leaderPath(anchor: Point, label: Point, elbowRatio?: number): { d: string; elbow: Point; textAnchor: 'start' | 'end' }`
  - `polylineLength(points: Point[]): number`
  - `DimensionCallout` accepting `{ anchor: Point; label: Point; value: string; delayMs?: number }` in a 0–100 viewBox coordinate space

Geometry lives in a tested module because a leader line that misses its anchor by a few percent looks like a bug in the drawing, and eyeballing SVG path strings is how that ships.

- [ ] **Step 1: Write the failing geometry test**

Create `src/lib/callout.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { leaderPath, polylineLength } from './callout';

describe('leaderPath', () => {
  it('starts at the anchor and ends at the label', () => {
    const { d } = leaderPath({ x: 10, y: 80 }, { x: 70, y: 20 });
    expect(d.startsWith('M 10 80')).toBe(true);
    expect(d.endsWith('70 20')).toBe(true);
  });

  it('bends at the label height so the shelf is horizontal', () => {
    const { elbow } = leaderPath({ x: 10, y: 80 }, { x: 70, y: 20 });
    expect(elbow.y).toBe(20);
  });

  it('places the elbow midway by default', () => {
    const { elbow } = leaderPath({ x: 10, y: 80 }, { x: 70, y: 20 });
    expect(elbow.x).toBe(40);
  });

  it('honours a custom elbow ratio', () => {
    const { elbow } = leaderPath({ x: 0, y: 0 }, { x: 100, y: 50 }, 0.25);
    expect(elbow.x).toBe(25);
  });

  it('anchors text to the start when the label is to the right', () => {
    expect(leaderPath({ x: 10, y: 80 }, { x: 70, y: 20 }).textAnchor).toBe('start');
  });

  it('anchors text to the end when the label is to the left', () => {
    expect(leaderPath({ x: 70, y: 80 }, { x: 10, y: 20 }).textAnchor).toBe('end');
  });

  it('emits three points in the path', () => {
    const { d } = leaderPath({ x: 10, y: 80 }, { x: 70, y: 20 });
    expect(d.match(/[ML]/g)).toHaveLength(3);
  });
});

describe('polylineLength', () => {
  it('is zero for a single point', () => {
    expect(polylineLength([{ x: 5, y: 5 }])).toBe(0);
  });

  it('measures a straight horizontal run', () => {
    expect(polylineLength([{ x: 0, y: 0 }, { x: 10, y: 0 }])).toBe(10);
  });

  it('measures a 3-4-5 triangle leg', () => {
    expect(polylineLength([{ x: 0, y: 0 }, { x: 3, y: 4 }])).toBe(5);
  });

  it('sums multiple segments', () => {
    expect(polylineLength([{ x: 0, y: 0 }, { x: 3, y: 4 }, { x: 3, y: 14 }])).toBe(15);
  });
});
```

- [ ] **Step 2: Run the test and confirm it fails**

```bash
npm test
```

Expected: FAIL — `Failed to resolve import "./callout"`.

- [ ] **Step 3: Implement `src/lib/callout.ts`**

```ts
export interface Point {
  x: number;
  y: number;
}

export interface Leader {
  /** SVG path data: anchor → elbow → label. */
  d: string;
  elbow: Point;
  /** Which side the label text should hang off. */
  textAnchor: 'start' | 'end';
}

/**
 * Build a leader line in the drawing convention: a diagonal from the feature
 * being called out, then a horizontal shelf running to the label text.
 *
 * Coordinates are in the callout's own 0–100 viewBox space, so they stay
 * correct at any rendered size.
 */
export function leaderPath(anchor: Point, label: Point, elbowRatio = 0.5): Leader {
  const elbow: Point = {
    x: anchor.x + (label.x - anchor.x) * elbowRatio,
    y: label.y,
  };

  return {
    d: `M ${anchor.x} ${anchor.y} L ${elbow.x} ${elbow.y} L ${label.x} ${label.y}`,
    elbow,
    textAnchor: label.x >= anchor.x ? 'start' : 'end',
  };
}

/** Total length of a polyline — used to seed stroke-dasharray for draw-in. */
export function polylineLength(points: Point[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i += 1) {
    const dx = points[i]!.x - points[i - 1]!.x;
    const dy = points[i]!.y - points[i - 1]!.y;
    total += Math.hypot(dx, dy);
  }
  return total;
}
```

- [ ] **Step 4: Run the test and confirm it passes**

```bash
npm test
```

Expected: PASS — 68 tests total.

- [ ] **Step 5: Create `src/components/DimensionCallout.astro`**

The draw-in uses a CSS animation seeded with the computed path length, triggered by an `IntersectionObserver`. No animation library is needed for this, and no JavaScript is required for the callout to be readable — without JS the line simply renders already-drawn.

```astro
---
import { leaderPath, polylineLength, type Point } from '../lib/callout';

interface Props {
  anchor: Point;
  label: Point;
  value: string;
  delayMs?: number;
}

const { anchor, label, value, delayMs = 0 } = Astro.props;
const leader = leaderPath(anchor, label);
const length = polylineLength([anchor, leader.elbow, label]);
---

<svg
  class="callout"
  viewBox="0 0 100 100"
  preserveAspectRatio="none"
  aria-hidden="true"
  data-callout
  style={`--leader-length: ${length}; --leader-delay: ${delayMs}ms;`}
>
  <path class="callout__line" d={leader.d} vector-effect="non-scaling-stroke" />
  <circle class="callout__dot" cx={anchor.x} cy={anchor.y} r="0.8" />
</svg>

<span
  class="callout__value annotation"
  style={`--label-x: ${label.x}%; --label-y: ${label.y}%;`}
  data-anchor={leader.textAnchor}
>{value}</span>

<style>
  .callout {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    overflow: visible;
    pointer-events: none;
  }

  .callout__line {
    fill: none;
    stroke: var(--color-accent);
    stroke-width: 1;
  }

  .callout__dot {
    fill: var(--color-accent);
  }

  .callout__value {
    position: absolute;
    left: var(--label-x);
    top: var(--label-y);
    transform: translateY(-50%);
    padding-inline: var(--space-xs);
    color: var(--color-accent);
    background-color: var(--color-canvas);
    pointer-events: none;
  }

  .callout__value[data-anchor='end'] {
    transform: translate(-100%, -50%);
  }

  /* Draw-in only runs once the element is scrolled into view and only when
     motion is welcome. Default state is fully drawn, so no-JS is correct. */
  @media (prefers-reduced-motion: no-preference) {
    .callout[data-visible] .callout__line {
      stroke-dasharray: var(--leader-length);
      stroke-dashoffset: var(--leader-length);
      animation: draw-in 600ms ease-out var(--leader-delay) forwards;
    }

    .callout[data-visible] + .callout__value {
      opacity: 0;
      animation: fade-in 300ms ease-out calc(var(--leader-delay) + 400ms) forwards;
    }
  }

  @keyframes draw-in {
    to {
      stroke-dashoffset: 0;
    }
  }

  @keyframes fade-in {
    to {
      opacity: 1;
    }
  }
</style>

<script>
  const callouts = document.querySelectorAll<SVGElement>('[data-callout]');

  if (callouts.length > 0 && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.setAttribute('data-visible', '');
            observer.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.4 },
    );

    for (const callout of callouts) observer.observe(callout);
  }
</script>
```

- [ ] **Step 6: Wire one callout over the hero render**

In `src/pages/projects/[...slug].astro`, add the import:

```astro
import DimensionCallout from '../../components/DimensionCallout.astro';
```

Then replace the standalone `<Image class="sheet-hero" ... />` element with this wrapped version:

```astro
    <div class="sheet-hero-frame">
      <Image
        class="sheet-hero"
        src={data.heroRender}
        alt={data.heroAlt}
        widths={[800, 1200, 1600]}
        loading="eager"
      />
      {data.specs[0] && (
        <DimensionCallout
          anchor={{ x: 42, y: 62 }}
          label={{ x: 78, y: 24 }}
          value={`${data.specs[0].label}: ${data.specs[0].value}`}
          delayMs={200}
        />
      )}
    </div>
```

And add to that file's `<style>` block:

```css
  .sheet-hero-frame {
    position: relative;
  }
```

The anchor coordinates are a starting point — adjust them once you can see the real render, so the leader points at an actual feature.

- [ ] **Step 7: Verify in the browser**

```bash
npm run build && npm run preview
```

Open a project sheet and scroll the hero into view. Confirm the leader line draws itself in and the value fades in after it. Then open DevTools → Rendering → "Emulate CSS prefers-reduced-motion: reduce", reload, and confirm the line and label appear immediately with no animation.

- [ ] **Step 8: Confirm the JavaScript budget is still healthy**

```bash
npm run build
du -ch dist/_astro/*.js 2>/dev/null | tail -1 || echo "no JS emitted"
```

Expected: well under 100kb. The only script is the inline IntersectionObserver.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: add dimension callouts with scroll-triggered draw-in"
```

---

## Task 7: Deploy to GitHub Pages

**Files:**
- Create: `.github/workflows/deploy.yml`

**Interfaces:**
- Consumes: `PUBLIC_SITE_URL` and `PUBLIC_BASE_PATH`, injected by `actions/configure-pages`
- Produces: a live URL

Using `actions/configure-pages` to supply the base path means nothing is hardcoded. When the custom domain is added later, the same workflow keeps working with no edits.

- [ ] **Step 1: Create `.github/workflows/deploy.yml`**

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm test

      - name: Configure Pages
        id: pages
        uses: actions/configure-pages@v5

      - name: Build site
        run: npm run build
        env:
          PUBLIC_SITE_URL: ${{ steps.pages.outputs.origin }}
          PUBLIC_BASE_PATH: ${{ steps.pages.outputs.base_path }}

      - uses: actions/upload-pages-artifact@v3
        with:
          path: ./dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 2: Verify the lockfile is committed**

`npm ci` fails without it.

```bash
git ls-files package-lock.json
```

Expected: `package-lock.json`. If empty, run `npm install` and `git add package-lock.json`.

- [ ] **Step 3: Commit the workflow**

```bash
git add -A
git commit -m "ci: deploy to GitHub Pages via Actions"
```

- [ ] **Step 4: Create the GitHub repository and push**

Requires the `gh` CLI to be authenticated. If `gh auth status` fails, run `gh auth login` in a terminal first.

```bash
gh repo create aaryandash-site --public --source=. --remote=origin
git branch -M main
git push -u origin main
```

- [ ] **Step 5: Enable Pages with the Actions source**

```bash
gh api -X POST repos/:owner/aaryandash-site/pages -f build_type=workflow || \
  echo "If this fails, enable it manually: repo Settings → Pages → Source: GitHub Actions"
```

- [ ] **Step 6: Watch the deployment**

```bash
gh run watch
```

Expected: both `build` and `deploy` jobs succeed.

- [ ] **Step 7: Verify the live site**

```bash
gh api repos/:owner/aaryandash-site/pages --jq .html_url
```

Open the returned URL and confirm:
- Styles load — if the page is unstyled black-on-white text, `.nojekyll` or the base path is wrong
- The project card links resolve rather than 404
- The hero render appears

- [ ] **Step 8: Run a Lighthouse audit against the live URL**

Use the `chrome-devtools` MCP `lighthouse_audit` tool, or Chrome DevTools → Lighthouse. Record the numbers.

Targets from the spec: LCP under 2s on simulated 4G, accessibility score 100. Anything short of that gets fixed now, while the site is four pages, rather than in Phase 5 when it is twenty.

- [ ] **Step 9: Commit any fixes and confirm the plan is complete**

```bash
npm test && npm run build
git status
```

Expected: all tests pass, build succeeds, working tree clean.

---

## Phase 1 Definition of Done

- [ ] A live GitHub Pages URL serves the site
- [ ] 68 unit tests pass in CI on every push
- [ ] One project sheet is complete with a real render and real writeup prose
- [ ] Full keyboard navigation with a working skip link and visible focus states
- [ ] `prefers-reduced-motion` verified by emulation, not assumed
- [ ] Total JavaScript under 100kb
- [ ] Lighthouse accessibility score of 100

## Handoff to Phase 2

Phase 2 builds the build plate and the section scrubber. It will add `@astrojs/react`, `@dnd-kit/core`, and use the `motion` dependency already installed here. The parts-bin markup from Task 5 becomes the drag source, and its links stay in place as the non-drag path.
