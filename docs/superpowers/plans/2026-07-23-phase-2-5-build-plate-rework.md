# Phase 2.5: Build Plate Rework Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reskin the build plate as a real Bambu Lab print bed, make printing the enticing way to open a project (soft gate), replace the home page's project list with a personal hero, and animate the print with a small sweeping A1 toolhead and a progress bar.

**Architecture:** The existing `/projects` React island (`client:visible`, dnd-kit + `motion`) is reshaped: the droppable becomes the transparent Bambu PEI-plate image with an inset "build area", a part drops and prints via a bottom-up clip reveal of its **transparent** image while a small toolhead image sweeps left–right and rises, a progress bar reads out completion, and a Clear-plate button resets the bed for the next part. Pure logic stays in the unit-tested `src/lib/buildPlate.ts`. Touch/no-JS get a plain tappable parts list. The home page loses its project grid and becomes a left-aligned personal hero.

**Tech Stack:** Astro 7, `@astrojs/react` + React 19, `@dnd-kit/core`, `motion` 12, Vitest, `astro:assets`.

**Design:** `docs/superpowers/specs/2026-07-23-phase-2-5-build-plate-rework-design.md`

## Global Constraints

- Node `>=22.12.0`.
- **Soft gate:** every part is a real `<a href>` to its sheet; drag/print is a pointer-only enhancement, never the only path. Do NOT register dnd-kit's KeyboardSensor.
- Home page and project sheets stay **zero module scripts**; the island stays a deferred `client:visible` chunk.
- Motion gated behind `prefers-reduced-motion`; drawing-set aesthetic; nav labels literal.
- No fake placeholder projects. `NOT ISSUED` bays are retired this phase.
- Lighthouse **accessibility 100** on `/` and `/projects`.
- Plate/toolhead images are decorative (`alt=""`); the part print image keeps real `alt`.
- Repo `/home/aaryan/projects/aaryandash-site`, work on branch `phase-2-5-build-plate-rework` (already created), not `main`.
- Source images (already on disk):
  - `/mnt/c/Users/Aaryan/Downloads/textured_plate_transparent.png`
  - `/mnt/c/Users/Aaryan/Downloads/A1toolheadUpscale.png`
  - `/mnt/c/Users/Aaryan/Downloads/IGEM PITCCH Project/BioFilter 3D Print Transparent.png`

---

## File Structure

```
src/
├── assets/
│   ├── plate/
│   │   ├── textured-plate.png        NEW  shared: the Bambu PEI bed
│   │   └── a1-toolhead.png           NEW  shared: the sweeping print head
│   └── projects/pitcch-biofilter/
│       └── print-transparent.png     NEW  biofilter transparent print image
├── lib/
│   ├── projectSchema.ts              + printTransparent field
│   ├── projectSchema.test.ts         + field tests
│   ├── buildPlate.ts                 + toolheadSweep()
│   └── buildPlate.test.ts            + toolheadSweep tests
├── components/
│   └── plate/
│       ├── types.ts                  + print asset + ImageAsset
│       ├── BuildPlate.tsx            props gain plate/toolhead; clear state; mobile list
│       ├── PartChip.tsx              UNCHANGED
│       ├── PartsList.tsx             NEW  mobile/no-JS tappable list + caption
│       ├── Plate.tsx                 renders the bed image + build area
│       ├── PrintReveal.tsx           transparent reveal + toolhead sweep + progress bar
│       ├── ProgressBar.tsx           NEW  0→100% bar
│       ├── SummaryPanel.tsx          + Clear plate button
│       ├── EmptyBay.tsx              DELETED
│       └── plate.css                 reworked styles
└── pages/
    ├── index.astro                   personal hero; no projects
    └── projects/index.astro          resolves plate/toolhead/print images → island
```

Build-area inset (percent of the plate image box, where parts actually print — excludes the top tab and bottom label strip) is a tunable constant, verified visually in Task 4:
`BUILD_AREA = { top: 15, right: 13, bottom: 13, left: 13 }`.

---

## Task 1: Assets + `printTransparent` schema field

**Files:**
- Create: `src/assets/plate/textured-plate.png`, `src/assets/plate/a1-toolhead.png`, `src/assets/projects/pitcch-biofilter/print-transparent.png`
- Modify: `src/lib/projectSchema.ts`, `src/content/projects/pitcch-biofilter.mdx`
- Test: `src/lib/projectSchema.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces: `projectSchema` accepts optional `printTransparent` (an `image()`); biofilter frontmatter exposes `printTransparent`.

- [ ] **Step 1: Copy the three source images into the repo**

```bash
cd /home/aaryan/projects/aaryandash-site
mkdir -p src/assets/plate
cp "/mnt/c/Users/Aaryan/Downloads/textured_plate_transparent.png" src/assets/plate/textured-plate.png
cp "/mnt/c/Users/Aaryan/Downloads/A1toolheadUpscale.png" src/assets/plate/a1-toolhead.png
cp "/mnt/c/Users/Aaryan/Downloads/IGEM PITCCH Project/BioFilter 3D Print Transparent.png" src/assets/projects/pitcch-biofilter/print-transparent.png
ls -la src/assets/plate/ src/assets/projects/pitcch-biofilter/print-transparent.png
```
Expected: three files present.

- [ ] **Step 2: Write the failing schema test**

Add these two tests inside the `describe('projectSchema', …)` block in `src/lib/projectSchema.test.ts`, before the closing `});`:

```ts
  it('treats printTransparent as optional', () => {
    expect(schema.parse(valid).printTransparent).toBeUndefined();
  });

  it('accepts a printTransparent image path', () => {
    const parsed = schema.parse({ ...valid, printTransparent: 'print.png' });
    expect(parsed.printTransparent).toBe('print.png');
  });
```

- [ ] **Step 3: Run the test and confirm the second fails**

```bash
npm test -- projectSchema
```
Expected: `accepts a printTransparent image path` FAILS (field is stripped, `parsed.printTransparent` is undefined). The "optional" test passes vacuously.

- [ ] **Step 4: Add the field to the schema**

In `src/lib/projectSchema.ts`, immediately after the `layerHeightMm` line (line 25), add:

```ts
    /** Transparent print image (PNG with alpha) used for the build-plate
        print reveal, so the part reads as sitting on the bed. Optional;
        the plate falls back to heroRender when absent. */
    printTransparent: image().optional(),
```

- [ ] **Step 5: Run the schema test and confirm it passes**

```bash
npm test -- projectSchema
```
Expected: PASS.

- [ ] **Step 6: Wire the biofilter frontmatter**

In `src/content/projects/pitcch-biofilter.mdx`, add this line immediately after the `heroAlt:` line:

```yaml
printTransparent: '../../assets/projects/pitcch-biofilter/print-transparent.png'
```

- [ ] **Step 7: Full test + build**

```bash
npm test && npm run build
```
Expected: all tests pass; `[build] Complete!` (the new image resolves through the content pipeline).

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: add printTransparent schema field and Bambu plate/toolhead assets"
```

---

## Task 2: Toolhead-sweep pure logic

**Files:**
- Modify: `src/lib/buildPlate.ts`
- Test: `src/lib/buildPlate.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces: `toolheadSweep(elapsedMs: number, periodMs?: number): number` → horizontal position in `0..1` as a triangle wave (0 at the left, 1 at the right, back to 0), for placing the sweeping toolhead across the build area.

- [ ] **Step 1: Write the failing test**

Append to `src/lib/buildPlate.test.ts`:

```ts
import { toolheadSweep } from './buildPlate';

describe('toolheadSweep', () => {
  it('starts at the left edge', () => {
    expect(toolheadSweep(0, 400)).toBeCloseTo(0, 5);
  });

  it('reaches the right edge at the half period', () => {
    expect(toolheadSweep(200, 400)).toBeCloseTo(1, 5);
  });

  it('returns to the left edge at the full period', () => {
    expect(toolheadSweep(400, 400)).toBeCloseTo(0, 5);
  });

  it('is halfway across at a quarter period', () => {
    expect(toolheadSweep(100, 400)).toBeCloseTo(0.5, 5);
  });

  it('repeats across periods', () => {
    expect(toolheadSweep(600, 400)).toBeCloseTo(1, 5); // 600 == 200 mod 400
  });

  it('stays within 0..1', () => {
    for (let t = 0; t <= 1000; t += 37) {
      const x = toolheadSweep(t, 400);
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(1);
    }
  });

  it('throws on a non-positive period', () => {
    expect(() => toolheadSweep(10, 0)).toThrow(/positive/);
  });
});
```

- [ ] **Step 2: Run the test and confirm it fails**

```bash
npm test -- buildPlate
```
Expected: FAIL — `toolheadSweep` is not exported.

- [ ] **Step 3: Implement `toolheadSweep`**

Append to `src/lib/buildPlate.ts`:

```ts
/** Horizontal position (0..1) of the sweeping print head as a triangle wave:
    0 at the left, 1 at the right at the half period, back to 0 at the full
    period. `elapsedMs` is time since the print started. */
export function toolheadSweep(elapsedMs: number, periodMs = 400): number {
  if (periodMs <= 0) throw new Error('periodMs must be positive');
  const phase = ((elapsedMs % periodMs) + periodMs) % periodMs / periodMs; // 0..1
  return phase < 0.5 ? phase * 2 : 2 - phase * 2;
}
```

- [ ] **Step 4: Run the test and confirm it passes**

```bash
npm test -- buildPlate
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add toolheadSweep triangle-wave helper for the print head"
```

---

## Task 3: Home page personal hero

**Files:**
- Modify: `src/pages/index.astro`

**Interfaces:**
- Consumes: `SITE_NAME` from `src/lib/meta.ts`, `href` from `src/lib/paths.ts`
- Produces: a home page with no project list — a left-aligned hero (name, grade/age subheading, editable description, `View projects →`). No new exports.

Note: the photo is optional. This task ships the hero **without** a photo (Aaryan can drop one in later); the layout must not look broken without it. Content values are placeholders Aaryan edits directly.

- [ ] **Step 1: Replace `src/pages/index.astro` with the hero-only home page**

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
import { href } from '../lib/paths';
import { SITE_NAME } from '../lib/meta';

// Editable home content. (Externalized for in-browser editing in Phase 3.)
const subheading = 'Rising junior · mechanical design & CAD';
const description =
  'I design mechanisms — FRC robot subsystems, competition CAD, and parts that have to survive contact with reality. I model in Fusion 360, print on a Bambu A1, and iterate until it works.';
---

<BaseLayout path="/">
  <section class="hero">
    <p class="annotation">Portfolio</p>
    <h1>{SITE_NAME}</h1>
    <p class="hero__sub">{subheading}</p>
    <p class="hero__lede prose">{description}</p>
    <p class="hero__cta">
      <a href={href('/projects')} class="button">View projects →</a>
    </p>
  </section>
</BaseLayout>

<style>
  .hero {
    padding-block: var(--space-xl);
    max-width: 46rem;
  }

  .hero h1 {
    font-size: clamp(2.5rem, 8vw, 5rem);
    margin-block: var(--space-sm) var(--space-xs);
    letter-spacing: 0.04em;
  }

  .hero__sub {
    font-family: var(--font-mono);
    color: var(--color-accent);
    letter-spacing: 0.04em;
    margin-block: 0 var(--space-md);
  }

  .hero__lede {
    color: var(--color-text-muted);
    font-size: 1.125rem;
  }

  .hero__cta {
    margin-block-start: var(--space-lg);
  }

  .button {
    display: inline-block;
    padding: var(--space-sm) var(--space-lg);
    border: var(--stroke-medium) solid var(--color-accent);
    font-family: var(--font-mono);
    letter-spacing: 0.04em;
    text-decoration: none;
    color: var(--color-accent);
    transition: background-color 120ms ease-out, color 120ms ease-out;
  }

  .button:hover {
    background-color: var(--color-accent);
    color: var(--color-canvas);
  }
</style>
```

- [ ] **Step 2: Build and verify the home page has no projects and is zero-JS**

```bash
npm run build
grep -c '<script type="module"' dist/index.html || echo 0
grep -c 'part-card\|featured__list\|PartCard' dist/index.html || echo 0
```
Expected: `0` module scripts; `0` project-grid markup on the home page.

- [ ] **Step 3: Verify in the browser**

```bash
npm run preview
```
Navigate to `http://localhost:4321/`. Confirm: name, amber subheading, description, and a `View projects →` button that navigates to `/projects`. Take a screenshot with chrome-devtools. Stop the preview.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: replace home project grid with a personal hero"
```

---

## Task 4: Real Bambu plate bed, parts shelf, retire bays (static drop)

**Files:**
- Modify: `src/components/plate/types.ts`, `src/components/plate/Plate.tsx`, `src/components/plate/BuildPlate.tsx`, `src/pages/projects/index.astro`, `src/components/plate/plate.css`
- Delete: `src/components/plate/EmptyBay.tsx`

**Interfaces:**
- Consumes: `PartChip`, `getImage` from `astro:assets`, `emptyBayCount` no longer used
- Produces:
  - `ImageAsset = { src: string; width: number; height: number }`
  - `PlateProject` gains `print: ImageAsset` (transparent print image; resolver falls back to hero)
  - `BuildPlate` default export props: `{ projects: PlateProject[]; plate: ImageAsset; toolhead: ImageAsset }`
  - `Plate` props: `{ loaded: PlateProject | null; plate: ImageAsset; toolhead: ImageAsset; done: boolean; onDone: () => void; onClear: () => void }` (toolhead/done/onDone/onClear are consumed starting Tasks 5–7; wire them through now so later tasks are additive). For this task, dropping a part shows its transparent image **statically** in the build area (no animation yet).

- [ ] **Step 1: Update the shared types**

Replace `src/components/plate/types.ts` with:

```ts
export interface ImageAsset {
  src: string;
  width: number;
  height: number;
}

export interface PlateProject {
  id: string;
  title: string;
  season: string;
  href: string;
  heroAlt: string;
  /** Hero render — the shelf card thumbnail. */
  img: ImageAsset;
  /** Transparent print image — the plate reveal. */
  print: ImageAsset;
  leadSpec: { label: string; value: string };
  heightMm: number;
  layerHeightMm: number;
}
```

- [ ] **Step 2: Rewrite `Plate.tsx` to render the bed image + build area**

Replace `src/components/plate/Plate.tsx` with:

```tsx
import { useDroppable } from '@dnd-kit/core';
import type { ImageAsset, PlateProject } from './types';

interface Props {
  loaded: PlateProject | null;
  plate: ImageAsset;
  toolhead: ImageAsset;
  done: boolean;
  onDone: () => void;
  onClear: () => void;
}

// Percent inset of the printable area within the plate image (excludes the
// top tab and bottom label strip). Tuned visually.
export const BUILD_AREA = { top: 15, right: 13, bottom: 13, left: 13 };

export function Plate({ loaded, plate }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: 'build-plate' });

  return (
    <div className="bed-wrap">
      <div ref={setNodeRef} className="bed" data-over={isOver || undefined}>
        <img
          className="bed__plate"
          src={plate.src}
          width={plate.width}
          height={plate.height}
          alt=""
          aria-hidden="true"
        />
        <div
          className="bed__area"
          style={{
            top: `${BUILD_AREA.top}%`,
            right: `${BUILD_AREA.right}%`,
            bottom: `${BUILD_AREA.bottom}%`,
            left: `${BUILD_AREA.left}%`,
          }}
        >
          {loaded ? (
            <img
              className="bed__part"
              src={loaded.print.src}
              alt={loaded.heroAlt}
            />
          ) : (
            <p className="bed__hint">Drop a part here</p>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Update `BuildPlate.tsx` — plate/toolhead props, clear state, retire bays**

Replace `src/components/plate/BuildPlate.tsx` with:

```tsx
import './plate.css';
import { useEffect, useState } from 'react';
import {
  DndContext,
  PointerSensor,
  pointerWithin,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { PartChip } from './PartChip';
import { Plate } from './Plate';
import { PartsList } from './PartsList';
import type { ImageAsset, PlateProject } from './types';

interface Props {
  projects: PlateProject[];
  plate: ImageAsset;
  toolhead: ImageAsset;
}

export default function BuildPlate({ projects, plate, toolhead }: Props) {
  const [dragEnabled, setDragEnabled] = useState(false);
  const [loaded, setLoaded] = useState<PlateProject | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    setDragEnabled(window.matchMedia('(pointer: fine)').matches);
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  function onDragEnd(event: DragEndEvent) {
    if (event.over?.id === 'build-plate') {
      const dropped = projects.find((p) => p.id === event.active.id);
      if (dropped) {
        setDone(false);
        setLoaded(dropped);
      }
    }
  }

  // Coarse pointer (touch) and the pre-mount server render: tappable list.
  if (!dragEnabled) {
    return <PartsList projects={projects} />;
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragEnd={onDragEnd}
    >
      <p className="bench__hint">
        Drag a part onto the plate and print it to open the write-up.
      </p>
      <div className="bench">
        <ul className="shelf">
          {projects.map((p) => (
            <li key={p.id}>
              <PartChip project={p} dragEnabled={dragEnabled} />
            </li>
          ))}
        </ul>
        <Plate
          loaded={loaded}
          plate={plate}
          toolhead={toolhead}
          done={done}
          onDone={() => setDone(true)}
          onClear={() => {
            setLoaded(null);
            setDone(false);
          }}
        />
      </div>
    </DndContext>
  );
}
```

- [ ] **Step 4: Create a minimal `PartsList.tsx` (fleshed out in Task 5)**

Create `src/components/plate/PartsList.tsx`:

```tsx
import type { PlateProject } from './types';

export function PartsList({ projects }: { projects: PlateProject[] }) {
  return (
    <ul className="shelf shelf--list">
      {projects.map((p) => (
        <li key={p.id}>
          <a className="part-chip" href={p.href}>
            <img src={p.img.src} width={p.img.width} height={p.img.height} alt={p.heroAlt} loading="lazy" />
            <span className="part-chip__season">{p.season}</span>
            <span className="part-chip__title">{p.title}</span>
          </a>
        </li>
      ))}
    </ul>
  );
}
```

- [ ] **Step 5: Delete `EmptyBay.tsx`**

```bash
rm src/components/plate/EmptyBay.tsx
```

- [ ] **Step 6: Resolve plate/toolhead/print images in `projects/index.astro`**

Replace `src/pages/projects/index.astro` frontmatter and the `<BuildPlate>` usage. Full file:

```astro
---
import { getCollection } from 'astro:content';
import { getImage } from 'astro:assets';
import BaseLayout from '../../layouts/BaseLayout.astro';
import BuildPlate from '../../components/plate/BuildPlate.tsx';
import EmptyBin from '../../components/EmptyBin.astro';
import { href } from '../../lib/paths';
import plateMeta from '../../assets/plate/textured-plate.png';
import toolheadMeta from '../../assets/plate/a1-toolhead.png';

const projects = (await getCollection('projects')).sort(
  (a, b) => a.data.order - b.data.order,
);

const TARGET_WIDTH = 800;

async function resolve(meta: ImageMetadata, width: number) {
  const height = Math.round(width * (meta.height / meta.width));
  const img = await getImage({ src: meta, width, format: 'webp' });
  return { src: img.src, width, height };
}

const plate = await resolve(plateMeta, 640);
const toolhead = await resolve(toolheadMeta, 160);

const plateProjects = await Promise.all(
  projects.map(async (p) => {
    const printMeta = p.data.printTransparent ?? p.data.heroRender;
    return {
      id: p.id,
      title: p.data.title,
      season: p.data.season,
      href: href(`/projects/${p.id}`),
      heroAlt: p.data.heroAlt,
      img: await resolve(p.data.heroRender, TARGET_WIDTH),
      print: await resolve(printMeta, TARGET_WIDTH),
      leadSpec: p.data.specs[0] ?? { label: '', value: '' },
      heightMm: p.data.heightMm ?? 25,
      layerHeightMm: p.data.layerHeightMm ?? 0.2,
    };
  }),
);
---

<BaseLayout
  title="Projects"
  description="CAD and mechanical design work — printed to open on the build plate."
  path="/projects"
>
  <section aria-labelledby="parts-bin-heading" class="parts-bin">
    <h1 id="parts-bin-heading">Parts bin</h1>

    {plateProjects.length > 0 ? (
      <BuildPlate client:visible projects={plateProjects} plate={plate} toolhead={toolhead} />
    ) : (
      <div class="parts-bin__empty"><EmptyBin /></div>
    )}
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

  .parts-bin__empty {
    margin-block-start: var(--space-lg);
  }
</style>
```

Note: `ImageMetadata` is a global Astro type — no import needed.

- [ ] **Step 7: Rework `plate.css` for the bench, shelf, and bed**

Replace the contents of `src/components/plate/plate.css` with:

```css
/* Shelf of draggable parts */
.shelf {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));
  gap: var(--space-lg);
  list-style: none;
  margin: 0;
  padding: 0;
}

.shelf--list {
  margin-block-start: var(--space-lg);
}

.part-chip {
  display: grid;
  gap: var(--space-xs);
  padding: var(--space-md);
  border: var(--stroke-thin) solid var(--color-line-bright);
  background-color: var(--color-surface);
  text-decoration: none;
  height: 100%;
  touch-action: manipulation;
}

.part-chip:hover {
  border-color: var(--color-accent);
}

.part-chip[data-dragging] {
  border-color: var(--color-accent);
  opacity: 0.9;
  cursor: grabbing;
}

.part-chip img {
  display: block;
  width: 100%;
  margin-block-end: var(--space-sm);
}

.part-chip__season {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-text-muted);
}

.part-chip__title {
  font-family: var(--font-mono);
  font-size: 1.125rem;
  color: var(--color-text);
}

/* Two-column bench: shelf + bed */
.bench__hint {
  margin: var(--space-md) 0 var(--space-lg);
  font-family: var(--font-mono);
  font-size: 0.9375rem;
  letter-spacing: 0.04em;
  color: var(--color-accent);
}

.bench {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-xl);
  align-items: start;
}

.bench .shelf {
  grid-template-columns: repeat(auto-fit, minmax(11rem, 1fr));
}

/* The bed */
.bed-wrap {
  position: sticky;
  top: var(--space-lg);
}

.bed {
  position: relative;
  width: 100%;
  transition: filter 120ms ease-out;
}

.bed[data-over] {
  filter: drop-shadow(0 0 10px color-mix(in srgb, var(--color-accent) 60%, transparent));
}

.bed__plate {
  display: block;
  width: 100%;
  height: auto;
}

.bed__area {
  position: absolute;
  display: grid;
  place-items: center;
  overflow: hidden;
}

.bed__part {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.bed__hint {
  margin: 0;
  font-family: var(--font-mono);
  font-size: 0.8125rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-text-dim);
  text-align: center;
}

@media (max-width: 52rem) {
  .bench {
    grid-template-columns: 1fr;
  }
  .bed-wrap {
    position: static;
  }
}
```

- [ ] **Step 8: Build and verify the static bed + drop**

```bash
npm run build && npm run preview
```
At `http://localhost:4321/projects` (desktop viewport ≥ 900px): the shelf sits left, the gold Bambu plate right, hint "Drop a part here" over the build area. Drag the biofilter chip onto the plate → its transparent render appears **centered within the build area** (not over the tab/label). Adjust `BUILD_AREA` in `Plate.tsx` if the part sits off the printable gold. Verify the drop via the manual PointerEvent sequence (native drag tool is flaky with dnd-kit — see project memory):

```
// chrome-devtools evaluate_script: pointerdown on .part-chip → 16 stepped
// pointermoves to .bed center → pointerup. Then check document.querySelector('.bed__part').
```
Stop the preview.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: real Bambu plate bed, parts shelf, retire NOT ISSUED bays"
```

---

## Task 5: Mobile / no-JS parts list + caption

**Files:**
- Modify: `src/components/plate/PartsList.tsx`, `src/components/plate/plate.css`

**Interfaces:**
- Consumes: `PlateProject`
- Produces: `PartsList` renders the tappable link list plus the enticing caption.

- [ ] **Step 1: Flesh out `PartsList.tsx` with the caption**

Replace `src/components/plate/PartsList.tsx` with:

```tsx
import type { PlateProject } from './types';

export function PartsList({ projects }: { projects: PlateProject[] }) {
  return (
    <div className="parts-list">
      <p className="parts-list__caption">
        View the desktop site to “print” projects!
      </p>
      <ul className="shelf shelf--list">
        {projects.map((p) => (
          <li key={p.id}>
            <a className="part-chip" href={p.href}>
              <img
                src={p.img.src}
                width={p.img.width}
                height={p.img.height}
                alt={p.heroAlt}
                loading="lazy"
              />
              <span className="part-chip__season">{p.season}</span>
              <span className="part-chip__title">{p.title}</span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 2: Style the caption**

Append to `src/components/plate/plate.css`:

```css
.parts-list__caption {
  margin: var(--space-md) 0 0;
  font-family: var(--font-mono);
  font-size: 0.875rem;
  letter-spacing: 0.04em;
  color: var(--color-accent);
}
```

- [ ] **Step 3: Build and verify the mobile fallback**

```bash
npm run build && npm run preview
```
In chrome-devtools, emulate a `390x844x3,mobile,touch` viewport, reload `/projects`. Confirm: no bed, the caption "View the desktop site to “print” projects!", the biofilter as a tappable card, and `document.documentElement.scrollWidth <= clientWidth` is `true`. Stop the preview.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: mobile/no-JS parts list with print-on-desktop caption"
```

---

## Task 6: Toolhead print animation + progress bar

**Files:**
- Create: `src/components/plate/ProgressBar.tsx`, `src/components/plate/PrintReveal.tsx`
- Modify: `src/components/plate/Plate.tsx`, `src/components/plate/plate.css`

**Interfaces:**
- Consumes: `printState`, `totalLayers`, `toolheadSweep` (Task 2), `PlateProject`, `ImageAsset`, `animate` from `motion`
- Produces:
  - `ProgressBar` props `{ progress: number; layer: number; layers: number }`
  - `PrintReveal` props `{ project: PlateProject; toolhead: ImageAsset; onDone: () => void }` — clip-reveals the transparent print image bottom-to-top while a small toolhead sweeps and rises, with a progress bar below. Replaces the static `bed__part` inside the build area.

- [ ] **Step 1: Create `ProgressBar.tsx`**

Create `src/components/plate/ProgressBar.tsx`:

```tsx
interface Props {
  progress: number; // 0..1
  layer: number;
  layers: number;
}

export function ProgressBar({ progress, layer, layers }: Props) {
  const pct = Math.round(progress * 100);
  return (
    <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
      <div className="progress__track">
        <div className="progress__fill" style={{ width: `${pct}%` }} />
      </div>
      <span className="progress__label">
        {pct}% · layer {layer}/{layers}
      </span>
    </div>
  );
}
```

- [ ] **Step 2: Create `PrintReveal.tsx` (transparent reveal + sweeping toolhead)**

Create `src/components/plate/PrintReveal.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { animate } from 'motion';
import { printState, totalLayers, toolheadSweep } from '../../lib/buildPlate';
import { ProgressBar } from './ProgressBar';
import type { ImageAsset, PlateProject } from './types';

const DURATION_MS = 1600;

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

export function PrintReveal({
  project,
  toolhead,
  onDone,
}: {
  project: PlateProject;
  toolhead: ImageAsset;
  onDone: () => void;
}) {
  const layers = totalLayers(project.heightMm, project.layerHeightMm);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (prefersReducedMotion()) {
      setProgress(1);
      onDone();
      return;
    }
    setProgress(0);
    const controls = animate(0, 1, {
      duration: DURATION_MS / 1000,
      ease: 'linear',
      onUpdate: (v) => setProgress(v),
      onComplete: () => onDone(),
    });
    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.id]);

  const frame = printState(progress, layers);
  const elapsedMs = progress * DURATION_MS;
  const sweep = toolheadSweep(elapsedMs); // 0..1 across the build width

  return (
    <div className="reveal">
      <div className="reveal__stage">
        <img
          className="reveal__part"
          src={project.print.src}
          alt={project.heroAlt}
          style={{ clipPath: `inset(${frame.clipTop}% 0 0 0)` }}
        />
        {!frame.done && (
          <img
            className="reveal__toolhead"
            src={toolhead.src}
            alt=""
            aria-hidden="true"
            style={{
              top: `${frame.clipTop}%`,
              left: `${sweep * 100}%`,
            }}
          />
        )}
      </div>
      <ProgressBar progress={progress} layer={frame.layer} layers={layers} />
    </div>
  );
}
```

- [ ] **Step 3: Use `PrintReveal` inside the build area**

In `src/components/plate/Plate.tsx`, add the import at the top:

```tsx
import { PrintReveal } from './PrintReveal';
```

Widen the destructuring on the `Plate` function signature (Task 4 shipped `{ loaded, plate }`) to expose the toolhead and completion callback:

```tsx
export function Plate({ loaded, plate, toolhead, onDone }: Props) {
```

and replace the `loaded ? (...) : (...)` block inside `.bed__area` with:

```tsx
          {loaded ? (
            <PrintReveal project={loaded} toolhead={toolhead} onDone={onDone} />
          ) : (
            <p className="bed__hint">Drop a part here</p>
          )}
```

- [ ] **Step 4: Add reveal, toolhead, and progress styles**

Append to `src/components/plate/plate.css`:

```css
.reveal {
  width: 100%;
  height: 100%;
  display: grid;
  grid-template-rows: 1fr auto;
  gap: var(--space-xs);
}

.reveal__stage {
  position: relative;
  display: grid;
  place-items: center;
  min-height: 0;
}

.reveal__part {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

/* Small print head sweeping the deposition line. */
.reveal__toolhead {
  position: absolute;
  width: 22%;
  height: auto;
  transform: translate(-50%, -82%);
  pointer-events: none;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.5));
}

.progress {
  display: grid;
  gap: 2px;
}

.progress__track {
  height: var(--stroke-medium);
  background-color: var(--color-line);
}

.progress__fill {
  height: 100%;
  background-color: var(--color-accent);
  transition: width 60ms linear;
}

.progress__label {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  letter-spacing: 0.08em;
  color: var(--color-accent);
}
```

- [ ] **Step 5: Build and verify the animation (normal + reduced motion)**

```bash
npm run build && npm run preview
```
At `/projects` (desktop), drop the biofilter onto the plate. Because the native drag is flaky, drive it with the manual PointerEvent sequence in chrome-devtools, install a rAF/mutation recorder to capture frames (see project memory), and confirm:
- The transparent part reveals bottom-to-top; a **small** toolhead sweeps left–right and rises; the progress bar fills 0→100%; the label reads `…% · layer n/125`, ending `100% · layer 125/125`.
- Toolhead disappears at completion.

Then force reduced motion (override `window.matchMedia` for `prefers-reduced-motion` while keeping `pointer: fine`), drop again: the part is fully shown instantly, one progress value (100%), no toolhead. Stop the preview.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: sweeping-toolhead print animation with progress bar"
```

---

## Task 7: Clear plate + summary panel

**Files:**
- Modify: `src/components/plate/SummaryPanel.tsx`, `src/components/plate/Plate.tsx`, `src/components/plate/plate.css`

**Interfaces:**
- Consumes: `PlateProject`, `onClear` from `Plate` (threaded from `BuildPlate` in Task 4)
- Produces: `SummaryPanel` props `{ project: PlateProject; onClear: () => void }` — shows the title, lead spec, `Open project sheet →`, and a `Clear plate` button that empties the bed for the next print.

- [ ] **Step 1: Add the Clear-plate button to `SummaryPanel.tsx`**

Replace `src/components/plate/SummaryPanel.tsx` with:

```tsx
import type { PlateProject } from './types';

export function SummaryPanel({
  project,
  onClear,
}: {
  project: PlateProject;
  onClear: () => void;
}) {
  return (
    <div className="summary-panel">
      <p className="summary-panel__title">{project.title}</p>
      {project.leadSpec.label && (
        <p className="summary-panel__spec">
          <span>{project.leadSpec.label}</span>
          <span>{project.leadSpec.value}</span>
        </p>
      )}
      <div className="summary-panel__actions">
        <a className="summary-panel__link" href={project.href}>
          Open project sheet →
        </a>
        <button type="button" className="summary-panel__clear" onClick={onClear}>
          Clear plate
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Render the summary under the bed on completion**

In `src/components/plate/Plate.tsx`, add the import:

```tsx
import { SummaryPanel } from './SummaryPanel';
```

Widen the destructuring again to expose `done` and `onClear` (Task 6 left it `{ loaded, plate, toolhead, onDone }`):

```tsx
export function Plate({ loaded, plate, toolhead, done, onDone, onClear }: Props) {
```

and inside the `.bed-wrap` div, after the `.bed` div closes but still inside `.bed-wrap`, add the summary:

```tsx
      {loaded && done && (
        <SummaryPanel project={loaded} onClear={onClear} />
      )}
```

`onClear` is already in `Plate`'s props (Task 4). The full `.bed-wrap` return becomes:

```tsx
    <div className="bed-wrap">
      <div ref={setNodeRef} className="bed" data-over={isOver || undefined}>
        {/* ...bed__plate and bed__area unchanged... */}
      </div>
      {loaded && done && (
        <SummaryPanel project={loaded} onClear={onClear} />
      )}
    </div>
```

- [ ] **Step 3: Style the actions and Clear button**

Append to `src/components/plate/plate.css`:

```css
.summary-panel {
  width: 100%;
  margin-block-start: var(--space-md);
  padding: var(--space-md);
  border: var(--stroke-thin) solid var(--color-line-bright);
  background-color: var(--color-canvas);
  display: grid;
  gap: var(--space-sm);
  animation: panel-rise 260ms ease-out both;
}

.summary-panel__title {
  margin: 0;
  font-family: var(--font-mono);
  font-size: 1.125rem;
  color: var(--color-text);
}

.summary-panel__spec {
  margin: 0;
  display: flex;
  justify-content: space-between;
  gap: var(--space-md);
  font-family: var(--font-mono);
  font-size: 0.8125rem;
  color: var(--color-text-muted);
}

.summary-panel__actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-md);
}

.summary-panel__link {
  font-family: var(--font-mono);
  font-size: 0.875rem;
  color: var(--color-accent);
}

.summary-panel__clear {
  font-family: var(--font-mono);
  font-size: 0.8125rem;
  letter-spacing: 0.04em;
  color: var(--color-text-muted);
  background: none;
  border: var(--stroke-thin) solid var(--color-line-bright);
  padding: var(--space-xs) var(--space-sm);
  cursor: pointer;
}

.summary-panel__clear:hover {
  border-color: var(--color-accent);
  color: var(--color-accent);
}

@keyframes panel-rise {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .summary-panel {
    animation: none;
  }
}
```

- [ ] **Step 4: Build and verify the full loop**

```bash
npm run build && npm run preview
```
At `/projects`: drop the biofilter → it prints → summary rises with title, lead spec (`Surface area · 12,850 mm² …`), `Open project sheet →`, and `Clear plate`. Click `Clear plate` → the bed returns to "Drop a part here" and the same part can be dragged and printed again. Verify `Open project sheet →` navigates. Under reduced motion the summary appears instantly. Stop the preview.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: clear-plate button and summary panel on print completion"
```

---

## Task 8: Verify budget, accessibility, mobile, and deploy

**Files:** none created; verification and deploy only.

- [ ] **Step 1: Full test and build**

```bash
npm test && npm run build
```
Expected: all tests pass (Phase 1 + build-plate core + toolheadSweep + schema field), build completes.

- [ ] **Step 2: Confirm zero-JS home/sheets and a deferred island**

```bash
grep -c '<script type="module"' dist/index.html || echo 0
grep -c '<script type="module"' dist/projects/pitcch-biofilter/index.html || echo 0
grep -o 'component-url="/_astro/BuildPlate[^"]*"' dist/projects/index.html | head -1
```
Expected: `0` on home and the sheet; the projects page references the island as a deferred `client:visible` `<astro-island>` chunk.

- [ ] **Step 3: Merge to main and deploy**

```bash
git checkout main
git merge --ff-only phase-2-5-build-plate-rework
git push
RUN=$(gh run list --limit 1 --json databaseId --jq '.[0].databaseId')
gh run watch "$RUN" --exit-status
```
Expected: deploy succeeds.

- [ ] **Step 4: Lighthouse the live pages**

In chrome-devtools, run a mobile navigation Lighthouse audit on:
- `https://aaryandash.github.io/aaryandash-site/`
- `https://aaryandash.github.io/aaryandash-site/projects`

Expected: **Accessibility 100** on both. Fix anything below 100 before finishing.

- [ ] **Step 5: Verify the live interaction end to end**

On the live desktop page: drag → toolhead print → progress bar → summary → `Clear plate` → print again; `Open project sheet →` navigates. Resize to `390x844` mobile/touch: no bed, the "View the desktop site to “print” projects!" caption and tappable parts list, and:

```
document.documentElement.scrollWidth <= document.documentElement.clientWidth
```
Expected: `true`. Confirm the home page shows the personal hero with no projects.

- [ ] **Step 6: Final confirmation**

```bash
npm test && npm run build
git status
```
Expected: tests pass, build clean, working tree clean.

---

## Phase 2.5 Definition of Done

- [ ] Home page is a personal hero (name, grade/age subheading, editable description, `View projects →`); no projects listed; zero-JS.
- [ ] `/projects` (pointer): parts shelf + real Bambu PEI plate; enticing instruction; drag → transparent part prints bottom-up with a **small** sweeping A1 toolhead and a progress bar → summary panel → `Clear plate` → print another. One part at a time.
- [ ] Soft gate: project sheets reachable by direct URL; touch/no-JS show the tappable parts list + "print on desktop" caption.
- [ ] `printTransparent` schema field added and wired to the biofilter; `toolheadSweep` unit-tested; all tests green.
- [ ] Reduced motion resolves instantly (no sweep, bar full, summary immediate).
- [ ] Lighthouse accessibility 100 on `/` and `/projects`; home and sheets zero module scripts; island is a deferred `client:visible` chunk.

## Handoff to Phase 3 (CMS / in-browser editing)

- Externalize home hero content (subheading, description, photo) for editing.
- New-project intake **prompts** for a fuller optional image set: render, transparent, mid-print, **failed print**, fully printed, **iterations (multiple)** — none required. Add dedicated optional schema fields and project-sheet display (failed/iteration shots are strong process evidence for admissions).
- Optional home photo slot.
