# Phase 2: Build Plate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn `/projects` into the signature build-plate interaction — drag a part card onto a 3D-printer plate, watch it print in layer by layer, then open its case study — while keeping the site's fast pages fast.

**Architecture:** A React island (`client:visible`) mounted only on `/projects`, built on dnd-kit for pointer drag and `motion` for the print animation. All framework-agnostic logic lives in a unit-tested `src/lib/buildPlate.ts`. The island server-renders as a plain grid of `<a>` links, so no-JS, pre-hydration, and touch users all get a working link grid; drag is a pointer-only enhancement layered on hydration.

**Tech Stack:** Astro 7, `@astrojs/react` + React 19, `@dnd-kit/core`, `motion` 12, Vitest.

**Design:** `docs/superpowers/specs/2026-07-22-phase-2-build-plate-design.md`

## Global Constraints

- Node `>=22.12.0`.
- **Initial/critical JS < 100kb.** The island is `client:visible`, so its bundle loads only when the plate scrolls into view. Home and project sheets stay at zero JS.
- The link is the universal accessible path. Drag is pointer-only; do NOT register dnd-kit's KeyboardSensor (it would hijack Enter from the link).
- Every card is a real `<a href>`; click navigates to the project sheet.
- Nav labels literal; drawing-set aesthetic; motion gated behind `prefers-reduced-motion`.
- No fake placeholder projects on the live site — empty slots are `NOT ISSUED` bays.
- Repo `/home/aaryan/projects/aaryandash-site`, work on a branch, not `main`.

---

## File Structure

```
src/
├── lib/
│   └── buildPlate.ts        + .test   pure logic: bay count, layer math, print frame
├── components/
│   ├── PartCard.astro                 UNCHANGED — home page featured grid
│   └── plate/
│       ├── types.ts                   PlateProject shape shared across island files
│       ├── BuildPlate.tsx             island root: DndContext, bin + plate, state
│       ├── PartChip.tsx               one draggable card, renders as <a>
│       ├── EmptyBay.tsx               NOT ISSUED slot, non-interactive
│       ├── Plate.tsx                  droppable target; idle hint or PrintReveal
│       ├── PrintReveal.tsx            clip-path wipe, nozzle line, LAYER readout
│       ├── SummaryPanel.tsx           slides up on completion, links to sheet
│       └── plate.css                  island styles (bundled with the island)
├── pages/projects/index.astro         resolves images, renders <BuildPlate>
└── content/projects/pitcch-biofilter.mdx  add heightMm / layerHeightMm
```

Island CSS lives in `plate.css` imported by the island, not in the global stylesheet — Astro's scoped styles do not reach into React islands, and keeping it out of `global.css` keeps critical CSS lean.

---

## Task 1: React integration, dependencies, and the tested core

**Files:**
- Modify: `package.json`, `astro.config.mjs`
- Create: `src/lib/buildPlate.ts`, `src/lib/buildPlate.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces:
  - `emptyBayCount(realCount: number, target?: number): number`
  - `totalLayers(heightMm: number, layerHeightMm: number): number`
  - `printState(progress: number, layers: number): { clipTop: number; layer: number; done: boolean }`

- [ ] **Step 1: Install dependencies**

```bash
cd /home/aaryan/projects/aaryandash-site
npx astro add react --yes
npm install @dnd-kit/core@^6.3.1
```

`astro add react` installs `@astrojs/react`, `react`, `react-dom` and adds the integration to `astro.config.mjs`. `motion` is already installed.

- [ ] **Step 2: Verify the integration landed**

```bash
grep -n "react" astro.config.mjs
```
Expected: a `react()` entry in the `integrations` array. If `astro add` failed to edit the config, add it manually:

```js
import react from '@astrojs/react';
// ...
integrations: [mdx(), sitemap(), react()],
```

- [ ] **Step 3: Confirm the project still builds with the integration**

```bash
npm run build
```
Expected: `[build] Complete!` — the React integration is inert until an island is added.

- [ ] **Step 4: Write the failing test for the core logic**

Create `src/lib/buildPlate.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { emptyBayCount, totalLayers, printState } from './buildPlate';

describe('emptyBayCount', () => {
  it('fills up to the default target of 4', () => {
    expect(emptyBayCount(1)).toBe(3);
  });

  it('is zero once the target is met', () => {
    expect(emptyBayCount(4)).toBe(0);
  });

  it('never goes negative past the target', () => {
    expect(emptyBayCount(6)).toBe(0);
  });

  it('respects a custom target', () => {
    expect(emptyBayCount(1, 2)).toBe(1);
  });
});

describe('totalLayers', () => {
  it('computes the biofilter at 25mm / 0.2mm as 125 layers', () => {
    expect(totalLayers(25, 0.2)).toBe(125);
  });

  it('rounds a partial top layer up', () => {
    expect(totalLayers(25, 0.3)).toBe(84);
  });

  it('throws on a non-positive layer height', () => {
    expect(() => totalLayers(25, 0)).toThrow(/positive/);
  });
});

describe('printState', () => {
  it('starts fully clipped at progress 0', () => {
    expect(printState(0, 125)).toEqual({ clipTop: 100, layer: 0, done: false });
  });

  it('is fully revealed and done at progress 1', () => {
    expect(printState(1, 125)).toEqual({ clipTop: 0, layer: 125, done: true });
  });

  it('is half revealed at the midpoint', () => {
    const s = printState(0.5, 125);
    expect(s.clipTop).toBeCloseTo(50, 5);
    expect(s.layer).toBe(63);
    expect(s.done).toBe(false);
  });

  it('clamps progress above 1', () => {
    expect(printState(1.5, 125).done).toBe(true);
    expect(printState(1.5, 125).clipTop).toBe(0);
  });

  it('clamps progress below 0', () => {
    expect(printState(-0.3, 125).clipTop).toBe(100);
    expect(printState(-0.3, 125).layer).toBe(0);
  });
});
```

- [ ] **Step 5: Run the test and confirm it fails**

```bash
npm test
```
Expected: FAIL — `Failed to resolve import "./buildPlate"`.

- [ ] **Step 6: Implement `src/lib/buildPlate.ts`**

```ts
/** Framework-agnostic logic for the build plate. Unit-tested; the React
    components stay thin and call into these. */

/** How many empty `NOT ISSUED` bays to show so the bin reads as a bench
    with open slots rather than a lonely single card. */
export function emptyBayCount(realCount: number, target = 4): number {
  return Math.max(0, target - realCount);
}

/** Layer count for an honest `LAYER n/total` readout. */
export function totalLayers(heightMm: number, layerHeightMm: number): number {
  if (layerHeightMm <= 0) throw new Error('layerHeightMm must be positive');
  return Math.ceil(heightMm / layerHeightMm);
}

export interface PrintFrame {
  /** clip-path inset from the top, in percent: 100 = nothing shown, 0 = full. */
  clipTop: number;
  /** current layer number, 0..layers. */
  layer: number;
  done: boolean;
}

/** Map a 0..1 progress value to a render frame. Progress is clamped. */
export function printState(progress: number, layers: number): PrintFrame {
  const p = Math.min(1, Math.max(0, progress));
  return {
    clipTop: (1 - p) * 100,
    layer: Math.round(p * layers),
    done: p >= 1,
  };
}
```

- [ ] **Step 7: Run the test and confirm it passes**

```bash
npm test
```
Expected: PASS — 74 tests total (62 from Phase 1 + 12 new).

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: add React integration and build-plate core logic"
```

---

## Task 2: The island renders the bin as a link grid (no drag yet)

**Files:**
- Create: `src/components/plate/types.ts`, `src/components/plate/PartChip.tsx`, `src/components/plate/EmptyBay.tsx`, `src/components/plate/BuildPlate.tsx`, `src/components/plate/plate.css`
- Modify: `src/pages/projects/index.astro`, `src/content/projects/pitcch-biofilter.mdx`, `src/lib/projectSchema.ts`

**Interfaces:**
- Consumes: `emptyBayCount` (Task 1), `href` from `src/lib/paths.ts`, `getImage` from `astro:assets`
- Produces:
  - `PlateProject` type
  - `BuildPlate` default export accepting `{ projects: PlateProject[]; bays: number }`

- [ ] **Step 1: Add optional print-geometry fields to the schema**

In `src/lib/projectSchema.ts`, add inside the `z.object({ ... })`, after `materials`:

```ts
    /** Print geometry, for an honest LAYER readout on the build plate.
        Optional; the plate falls back to sensible defaults. */
    heightMm: z.number().positive().optional(),
    layerHeightMm: z.number().positive().optional(),
```

- [ ] **Step 2: Add the values to the biofilter content**

In `src/content/projects/pitcch-biofilter.mdx` frontmatter, after the `materials:` line, add:

```yaml
heightMm: 25
layerHeightMm: 0.2
```

- [ ] **Step 3: Create the shared type**

Create `src/components/plate/types.ts`:

```ts
export interface PlateProject {
  id: string;
  title: string;
  season: string;
  href: string;
  heroAlt: string;
  img: { src: string; width: number; height: number };
  leadSpec: { label: string; value: string };
  heightMm: number;
  layerHeightMm: number;
}
```

- [ ] **Step 4: Create the draggable chip (drag disabled for now)**

Create `src/components/plate/PartChip.tsx`. It renders a real `<a>` so it works with no JS. `attributes` from dnd-kit are intentionally NOT spread — they force `role="button"` and a tabindex that would break the link's native semantics and the accessible path. Only pointer `listeners` are attached, and only when drag is enabled.

```tsx
import { useDraggable } from '@dnd-kit/core';
import type { PlateProject } from './types';

interface Props {
  project: PlateProject;
  dragEnabled: boolean;
}

export function PartChip({ project, dragEnabled }: Props) {
  const { setNodeRef, listeners, transform, isDragging } = useDraggable({
    id: project.id,
    disabled: !dragEnabled,
  });

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 20 }
    : undefined;

  return (
    <a
      ref={setNodeRef}
      href={project.href}
      className="part-chip"
      data-dragging={isDragging || undefined}
      style={style}
      {...(dragEnabled ? listeners : {})}
    >
      <img
        src={project.img.src}
        width={project.img.width}
        height={project.img.height}
        alt={project.heroAlt}
        loading="lazy"
      />
      <span className="part-chip__season">{project.season}</span>
      <span className="part-chip__title">{project.title}</span>
    </a>
  );
}
```

- [ ] **Step 5: Create the empty bay**

Create `src/components/plate/EmptyBay.tsx`. `aria-hidden` because it is decorative filler, not content.

```tsx
export function EmptyBay() {
  return (
    <div className="empty-bay" aria-hidden="true">
      <span className="empty-bay__stamp">Not issued</span>
    </div>
  );
}
```

- [ ] **Step 6: Create the island root (grid only, no DndContext yet)**

Create `src/components/plate/BuildPlate.tsx`:

```tsx
import './plate.css';
import { PartChip } from './PartChip';
import { EmptyBay } from './EmptyBay';
import type { PlateProject } from './types';

interface Props {
  projects: PlateProject[];
  bays: number;
}

export default function BuildPlate({ projects, bays }: Props) {
  return (
    <div className="build-plate build-plate--grid">
      <ul className="bin">
        {projects.map((p) => (
          <li key={p.id}>
            <PartChip project={p} dragEnabled={false} />
          </li>
        ))}
        {Array.from({ length: bays }).map((_, i) => (
          <li key={`bay-${i}`}>
            <EmptyBay />
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 7: Create the island stylesheet**

Create `src/components/plate/plate.css`. Uses the global custom properties defined in `global.css`.

```css
.build-plate--grid .bin,
.build-plate__bin .bin {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
  gap: var(--space-lg);
  list-style: none;
  margin: var(--space-lg) 0 0;
  padding: 0;
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

.empty-bay {
  display: grid;
  place-items: center;
  min-height: 8rem;
  height: 100%;
  border: var(--stroke-thin) dashed var(--color-line-bright);
  background-color: color-mix(in srgb, var(--color-surface) 50%, transparent);
}

.empty-bay__stamp {
  padding: var(--space-xs) var(--space-sm);
  border: var(--stroke-thin) solid var(--color-text-muted);
  font-family: var(--font-mono);
  font-size: 0.75rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--color-text-muted);
}
```

- [ ] **Step 8: Wire the island into the projects page**

Replace `src/pages/projects/index.astro` with:

```astro
---
import { getCollection } from 'astro:content';
import { getImage } from 'astro:assets';
import BaseLayout from '../../layouts/BaseLayout.astro';
import BuildPlate from '../../components/plate/BuildPlate.tsx';
import EmptyBin from '../../components/EmptyBin.astro';
import { emptyBayCount } from '../../lib/buildPlate';
import { href } from '../../lib/paths';

const projects = (await getCollection('projects')).sort(
  (a, b) => a.data.order - b.data.order,
);

const TARGET_WIDTH = 800;

const plateProjects = await Promise.all(
  projects.map(async (p) => {
    const meta = p.data.heroRender;
    const height = Math.round(TARGET_WIDTH * (meta.height / meta.width));
    const img = await getImage({ src: meta, width: TARGET_WIDTH, format: 'webp' });
    return {
      id: p.id,
      title: p.data.title,
      season: p.data.season,
      href: href(`/projects/${p.id}`),
      heroAlt: p.data.heroAlt,
      img: { src: img.src, width: TARGET_WIDTH, height },
      leadSpec: p.data.specs[0] ?? { label: '', value: '' },
      heightMm: p.data.heightMm ?? 25,
      layerHeightMm: p.data.layerHeightMm ?? 0.2,
    };
  }),
);

const bays = emptyBayCount(plateProjects.length);
---

<BaseLayout
  title="Projects"
  description="CAD and mechanical design work — FRC robotics subsystems and competition entries."
  path="/projects"
>
  <section aria-labelledby="parts-bin-heading" class="parts-bin">
    <h1 id="parts-bin-heading">Parts bin</h1>

    {plateProjects.length > 0 ? (
      <BuildPlate client:visible projects={plateProjects} bays={bays} />
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

- [ ] **Step 9: Build and verify the grid renders and links work with no JS**

```bash
npm test && npm run build
```
Expected: tests pass (74), build completes. Then confirm the SSR HTML contains real links:

```bash
grep -o 'class="part-chip" href="[^"]*"' dist/projects/index.html || \
  grep -o 'href="[^"]*pitcch-biofilter[^"]*"' dist/projects/index.html
```
Expected: the biofilter project link is present in the static HTML (proves no-JS works).

- [ ] **Step 10: Verify in the browser**

```bash
npm run preview
```
Navigate to `http://localhost:4321/projects`. Confirm: the biofilter chip plus 3 dashed `NOT ISSUED` bays render in a grid; clicking the chip opens the project sheet. Stop the preview when done.

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "feat: render parts bin as a React island link grid with empty bays"
```

---

## Task 3: Add the plate, drag, and drop detection

**Files:**
- Create: `src/components/plate/Plate.tsx`
- Modify: `src/components/plate/BuildPlate.tsx`, `src/components/plate/plate.css`

**Interfaces:**
- Consumes: `PlateProject`, `PartChip`, `EmptyBay`
- Produces: `Plate` component accepting `{ loaded: PlateProject | null }`; on drop over the plate, `BuildPlate` sets the loaded project and shows its render (static for now — animation arrives in Task 4)

- [ ] **Step 1: Create the plate (droppable, static render for now)**

Create `src/components/plate/Plate.tsx`:

```tsx
import { useDroppable } from '@dnd-kit/core';
import type { PlateProject } from './types';

interface Props {
  loaded: PlateProject | null;
}

export function Plate({ loaded }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: 'build-plate' });

  return (
    <div ref={setNodeRef} className="plate" data-over={isOver || undefined}>
      {loaded ? (
        <img
          className="plate__render"
          src={loaded.img.src}
          width={loaded.img.width}
          height={loaded.img.height}
          alt={loaded.heroAlt}
        />
      ) : (
        <p className="plate__hint">Drag a part onto the plate</p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Rewrite the island root with DndContext and pointer detection**

Replace `src/components/plate/BuildPlate.tsx`:

```tsx
import './plate.css';
import { useEffect, useState } from 'react';
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { PartChip } from './PartChip';
import { EmptyBay } from './EmptyBay';
import { Plate } from './Plate';
import type { PlateProject } from './types';

interface Props {
  projects: PlateProject[];
  bays: number;
}

export default function BuildPlate({ projects, bays }: Props) {
  const [dragEnabled, setDragEnabled] = useState(false);
  const [loaded, setLoaded] = useState<PlateProject | null>(null);

  useEffect(() => {
    setDragEnabled(window.matchMedia('(pointer: fine)').matches);
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  function onDragEnd(event: DragEndEvent) {
    if (event.over?.id === 'build-plate') {
      const dropped = projects.find((p) => p.id === event.active.id);
      if (dropped) setLoaded(dropped);
    }
  }

  const bin = (
    <ul className="bin">
      {projects.map((p) => (
        <li key={p.id}>
          <PartChip project={p} dragEnabled={dragEnabled} />
        </li>
      ))}
      {Array.from({ length: bays }).map((_, i) => (
        <li key={`bay-${i}`}>
          <EmptyBay />
        </li>
      ))}
    </ul>
  );

  // Coarse pointer (touch) and the pre-mount server render: plain grid, no plate.
  if (!dragEnabled) {
    return <div className="build-plate build-plate--grid">{bin}</div>;
  }

  return (
    <DndContext sensors={sensors} onDragEnd={onDragEnd}>
      <div className="build-plate">
        <div className="build-plate__bin">{bin}</div>
        <Plate loaded={loaded} />
      </div>
    </DndContext>
  );
}
```

Note on hydration: the server renders with `dragEnabled = false` (the grid). The client's first render also has `dragEnabled = false`, matching the server, then the effect flips it on fine-pointer devices — so there is no hydration mismatch.

- [ ] **Step 3: Add plate and two-column layout styles**

Append to `src/components/plate/plate.css`:

```css
.build-plate {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-xl);
  align-items: start;
  margin-block-start: var(--space-lg);
}

.build-plate__bin .bin {
  margin-top: 0;
  grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));
}

.plate {
  position: sticky;
  top: var(--space-lg);
  display: grid;
  place-items: center;
  min-height: 24rem;
  padding: var(--space-lg);
  border: var(--stroke-medium) solid var(--color-line-bright);
  background-color: var(--color-surface);
  background-image:
    linear-gradient(to right, var(--color-line) var(--grid-line), transparent var(--grid-line)),
    linear-gradient(to bottom, var(--color-line) var(--grid-line), transparent var(--grid-line));
  background-size: var(--grid-size) var(--grid-size);
  transition: border-color 120ms ease-out;
}

.plate[data-over] {
  border-color: var(--color-accent);
}

.plate__hint {
  margin: 0;
  font-family: var(--font-mono);
  font-size: 0.8125rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-text-dim);
}

.plate__render {
  display: block;
  max-width: 100%;
  max-height: 32rem;
  object-fit: contain;
}

@media (max-width: 52rem) {
  .build-plate {
    grid-template-columns: 1fr;
  }
  .plate {
    position: static;
  }
}
```

- [ ] **Step 4: Build, then verify drag and click in the browser**

```bash
npm run build && npm run preview
```
At `http://localhost:4321/projects` on a desktop viewport:
- The layout is two columns: bin left, plate right with the "Drag a part onto the plate" hint.
- Drag the biofilter chip onto the plate → the render appears on the plate; the plate border highlights amber while hovering over it.
- Click the chip (no movement) → navigates to the project sheet (the 8px activation constraint lets the click through).

Use the chrome-devtools MCP to drive the drag: take a snapshot, then use the drag tool from the chip element to the plate element, and screenshot the result. Stop the preview when done.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add build plate droppable with dnd-kit pointer drag"
```

---

## Task 4: The print-in animation

**Files:**
- Create: `src/components/plate/PrintReveal.tsx`
- Modify: `src/components/plate/Plate.tsx`, `src/components/plate/plate.css`

**Interfaces:**
- Consumes: `printState`, `totalLayers` (Task 1), `PlateProject`, `animate` from `motion`
- Produces: `PrintReveal` component accepting `{ project: PlateProject }`, replacing the static render inside `Plate`

- [ ] **Step 1: Create the print reveal**

Create `src/components/plate/PrintReveal.tsx`. The reveal re-runs whenever a different part is dropped (keyed on `project.id`). Reduced motion jumps straight to done.

```tsx
import { useEffect, useState } from 'react';
import { animate } from 'motion';
import { printState, totalLayers } from '../../lib/buildPlate';
import type { PlateProject } from './types';

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

export function PrintReveal({ project }: { project: PlateProject }) {
  const layers = totalLayers(project.heightMm, project.layerHeightMm);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (prefersReducedMotion()) {
      setProgress(1);
      return;
    }
    setProgress(0);
    const controls = animate(0, 1, {
      duration: 1.6,
      ease: 'linear',
      onUpdate: (v) => setProgress(v),
    });
    return () => controls.stop();
  }, [project.id]);

  const frame = printState(progress, layers);

  return (
    <figure className="reveal">
      <img
        className="reveal__img"
        src={project.img.src}
        width={project.img.width}
        height={project.img.height}
        alt={project.heroAlt}
        style={{ clipPath: `inset(${frame.clipTop}% 0 0 0)` }}
      />
      {!frame.done && (
        <div className="reveal__nozzle" style={{ top: `${frame.clipTop}%` }} aria-hidden="true" />
      )}
      <figcaption className="reveal__readout">
        LAYER {frame.layer}/{layers}
      </figcaption>
    </figure>
  );
}
```

- [ ] **Step 2: Use the reveal inside the plate**

In `src/components/plate/Plate.tsx`, add the import and replace the static `<img>` branch:

```tsx
import { useDroppable } from '@dnd-kit/core';
import { PrintReveal } from './PrintReveal';
import type { PlateProject } from './types';

interface Props {
  loaded: PlateProject | null;
}

export function Plate({ loaded }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: 'build-plate' });

  return (
    <div ref={setNodeRef} className="plate" data-over={isOver || undefined}>
      {loaded ? (
        <PrintReveal project={loaded} />
      ) : (
        <p className="plate__hint">Drag a part onto the plate</p>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Add reveal styles**

Append to `src/components/plate/plate.css`:

```css
.reveal {
  position: relative;
  margin: 0;
  width: 100%;
  display: grid;
  place-items: center;
}

.reveal__img {
  display: block;
  max-width: 100%;
  max-height: 30rem;
  object-fit: contain;
  /* The unclipped region carries a faint layer-line texture. */
  background-image: repeating-linear-gradient(
    to bottom,
    transparent 0,
    transparent 3px,
    color-mix(in srgb, var(--color-accent) 8%, transparent) 3px,
    color-mix(in srgb, var(--color-accent) 8%, transparent) 4px
  );
}

.reveal__nozzle {
  position: absolute;
  left: 0;
  right: 0;
  height: var(--stroke-medium);
  background-color: var(--color-accent);
  box-shadow: 0 0 8px 1px color-mix(in srgb, var(--color-accent) 60%, transparent);
  pointer-events: none;
}

.reveal__readout {
  margin-block-start: var(--space-sm);
  font-family: var(--font-mono);
  font-size: 0.75rem;
  letter-spacing: 0.1em;
  color: var(--color-accent);
}
```

- [ ] **Step 4: Build and verify the animation, normal and reduced-motion**

```bash
npm run build && npm run preview
```
At `/projects`, drag the chip onto the plate:
- The render prints in bottom-to-top; the amber nozzle line tracks the reveal edge; `LAYER n/125` counts up and finishes at `125/125`.

Then, in chrome-devtools, emulate `prefers-reduced-motion: reduce` (Rendering panel), reload, and drop again: the part must appear complete instantly, with the readout at `125/125` and no nozzle line. Stop the preview when done.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add layer-by-layer print-in animation to the build plate"
```

---

## Task 5: Summary panel and completion

**Files:**
- Create: `src/components/plate/SummaryPanel.tsx`
- Modify: `src/components/plate/Plate.tsx`, `src/components/plate/BuildPlate.tsx`, `src/components/plate/PrintReveal.tsx`, `src/components/plate/plate.css`

**Interfaces:**
- Consumes: `PlateProject`
- Produces: `SummaryPanel` accepting `{ project: PlateProject }`; `PrintReveal` gains an `onDone: () => void` callback so the panel appears when the print finishes

- [ ] **Step 1: Create the summary panel**

Create `src/components/plate/SummaryPanel.tsx`:

```tsx
import type { PlateProject } from './types';

export function SummaryPanel({ project }: { project: PlateProject }) {
  return (
    <div className="summary-panel">
      <p className="summary-panel__title">{project.title}</p>
      {project.leadSpec.label && (
        <p className="summary-panel__spec">
          <span>{project.leadSpec.label}</span>
          <span>{project.leadSpec.value}</span>
        </p>
      )}
      <a className="summary-panel__link" href={project.href}>
        Open project sheet →
      </a>
    </div>
  );
}
```

- [ ] **Step 2: Give PrintReveal an onDone callback**

In `src/components/plate/PrintReveal.tsx`, change the signature and fire the callback when the print completes:

```tsx
export function PrintReveal({
  project,
  onDone,
}: {
  project: PlateProject;
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
      duration: 1.6,
      ease: 'linear',
      onUpdate: (v) => setProgress(v),
      onComplete: () => onDone(),
    });
    return () => controls.stop();
  }, [project.id]);
```

The rest of the component is unchanged.

- [ ] **Step 3: Track completion in the island and pass it down**

In `src/components/plate/BuildPlate.tsx`, add a `done` state, reset it on each drop, and pass both down. Replace the `loaded` state block and `onDragEnd`:

```tsx
  const [loaded, setLoaded] = useState<PlateProject | null>(null);
  const [done, setDone] = useState(false);

  // ... dragEnabled effect and sensors unchanged ...

  function onDragEnd(event: DragEndEvent) {
    if (event.over?.id === 'build-plate') {
      const dropped = projects.find((p) => p.id === event.active.id);
      if (dropped) {
        setDone(false);
        setLoaded(dropped);
      }
    }
  }
```

And update the `<Plate ... />` usage in the returned JSX:

```tsx
        <Plate loaded={loaded} done={done} onDone={() => setDone(true)} />
```

- [ ] **Step 4: Thread the props through Plate**

Replace `src/components/plate/Plate.tsx`:

```tsx
import { useDroppable } from '@dnd-kit/core';
import { PrintReveal } from './PrintReveal';
import { SummaryPanel } from './SummaryPanel';
import type { PlateProject } from './types';

interface Props {
  loaded: PlateProject | null;
  done: boolean;
  onDone: () => void;
}

export function Plate({ loaded, done, onDone }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: 'build-plate' });

  return (
    <div ref={setNodeRef} className="plate" data-over={isOver || undefined}>
      {loaded ? (
        <>
          <PrintReveal project={loaded} onDone={onDone} />
          {done && <SummaryPanel project={loaded} />}
        </>
      ) : (
        <p className="plate__hint">Drag a part onto the plate</p>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Add summary-panel styles with a reduced-motion-safe slide-up**

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

.summary-panel__link {
  font-family: var(--font-mono);
  font-size: 0.875rem;
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

- [ ] **Step 6: Build and verify the full interaction**

```bash
npm run build && npm run preview
```
At `/projects`: drag the chip onto the plate → it prints in → the summary panel rises with the title, the lead spec (`Surface area · 12,850 mm² (≈2× the 6,509 mm² reference)`), and an "Open project sheet →" link that navigates correctly. Under emulated reduced motion, the panel appears immediately with no slide. Stop the preview.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: reveal a summary panel linking to the sheet when a print finishes"
```

---

## Task 6: Verify budget, accessibility, mobile, and deploy

**Files:** none created; verification and deploy only.

- [ ] **Step 1: Full test and build**

```bash
npm test && npm run build
```
Expected: 74 tests pass, build completes.

- [ ] **Step 2: Confirm the island JS is a separate, deferred chunk**

```bash
grep -rl "build-plate\|dnd-kit\|BuildPlate" dist/_astro/*.js | head
ls -1 dist/_astro/*.js
du -ch dist/_astro/*.js | tail -1
```
Expected: island code is in its own `_astro/*.js` chunk(s). Because the island is `client:visible`, the home page and project-sheet HTML must NOT reference these chunks in a render-blocking way. Confirm the home page ships no module scripts:

```bash
grep -c '<script type="module"' dist/index.html || echo 0
```
Expected: `0` on the home page — it stays zero-JS.

- [ ] **Step 3: Merge to main and deploy**

```bash
git checkout main
git merge --ff-only <feature-branch>
git push
```
Then wait for the Pages deploy:

```bash
RUN=$(gh run list --limit 1 --json databaseId --jq '.[0].databaseId')
gh run watch "$RUN" --exit-status
```
Expected: deploy succeeds.

- [ ] **Step 4: Lighthouse the live projects page**

Navigate chrome-devtools to `https://aaryandash.github.io/aaryandash-site/projects` and run a mobile Lighthouse navigation audit.
Expected: Accessibility 100. Investigate and fix anything below 100 before finishing (Phase 1 precedent: a low-contrast token slipped past unit tests and was caught here).

- [ ] **Step 5: Verify the live interaction end to end**

On the live desktop page: drag → print → summary → open sheet. Resize to a 390px mobile viewport and confirm the plate is gone and the plain link grid remains, with the chip still navigating on tap. Confirm no horizontal overflow:

```
document.documentElement.scrollWidth <= document.documentElement.clientWidth
```
Expected: `true`.

- [ ] **Step 6: Final confirmation**

```bash
npm test && npm run build
git status
```
Expected: tests pass, build clean, working tree clean.

---

## Phase 2 Definition of Done

- [ ] `/projects` shows the bin (real chip + 3 `NOT ISSUED` bays) and, on pointer devices, the build plate.
- [ ] Drag → print-in (`LAYER n/125`) → summary panel → "Open project sheet →" works end to end.
- [ ] Click a chip navigates to the sheet; the 8px activation constraint keeps click and drag distinct.
- [ ] Touch and no-JS both fall back to the working link grid; no plate.
- [ ] Reduced motion resolves the print and panel instantly.
- [ ] `buildPlate.ts` fully unit-tested (74 tests total); Lighthouse accessibility 100 on `/projects`.
- [ ] Home page ships zero module scripts; the island bundle is a deferred `client:visible` chunk.

## Handoff to later phases

- The section-view scrubber remains deferred until an aligned section-cut render exists.
- The `model` schema field (added in Phase 1) is still unused; the "View in 3D" viewer is a later phase.
- When a second real project is added, the bays drop from 3 to 2 automatically via `emptyBayCount`.
