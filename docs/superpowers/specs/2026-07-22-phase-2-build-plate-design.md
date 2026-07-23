# Phase 2: Build Plate — Design

**Date:** 2026-07-22
**Owner:** Aaryan Dash
**Status:** Draft for review
**Parent spec:** `docs/superpowers/specs/2026-07-22-cad-portfolio-design.md`

## Scope

This phase builds **the build plate only**. The section-view scrubber — the other
Phase 2 feature in the parent spec — is deferred until an aligned section-cut render
exists for a project. The current slice maps are a different projection and cannot be
revealed under a divider without sliding two mismatched images over each other.

## Purpose

Turn the `/projects` page from a static grid into the site's signature interaction: a
parts bin of draggable project cards and a 3D-printer build plate. Dragging a part onto
the plate "prints" it in layer by layer, then surfaces a summary that links to the full
project sheet. The interaction is simultaneously the navigation, the personality, and a
demonstration of engineering instinct.

## Decisions locked in brainstorming

1. **Build plate only this session.** Scrubber deferred (needs an aligned render).
2. **Stack: React + dnd-kit + motion**, per the parent spec.
3. **Budget reconciliation: lazy hydration.** The island hydrates with `client:visible`,
   so its bundle loads only when the plate scrolls into view. The parent spec's
   "total JavaScript under 100kb" is scoped to **critical/initial-load JS**. Home and
   project sheets stay at zero JS; `/projects` initial load stays zero JS until the
   plate is scrolled to.
4. **Live-site seeding: real card + empty bays.** The bin shows the real project card
   plus drawing-styled empty slots stamped `NOT ISSUED`. Bays are not fake projects —
   they read as open slots on a workshop bench and vanish as real projects are added.
   Dev-only seed cards are used to build and verify the multi-card feel but never ship.

## Interaction model

| Input | Behaviour |
|---|---|
| **Drag** a card onto the plate | Part prints in layer by layer, then a summary panel slides up with title, lead spec, and "Open project sheet →" |
| **Click** a card | Navigate straight to the full project sheet (the contract) |
| **Keyboard** (Tab + Enter) | Navigate to the sheet. The link is the universal accessible path; drag is a pointer-only enhancement |
| **Touch / mobile** | No plate. Plain link grid, exactly as today |
| **No JavaScript** | Plain link grid (the island's server-rendered output) |
| **Reduced motion** | Print animation resolves instantly to the finished state |

Before any drop, the plate sits idle: an empty build surface with a monospace hint
("Drag a part onto the plate") and the grid texture, so a first-time pointer user
understands the affordance. After a print completes, dropping a different part clears
and reprints.

Click-versus-drag is disambiguated by a dnd-kit `PointerSensor` activation constraint
(an ~8px movement threshold): movement under the threshold lets the `<a>` click through
to navigation; movement over it starts a drag and suppresses navigation. This is the
standard dnd-kit pattern and needs no custom click handling.

Keyboard drag is deliberately **not** wired to dnd-kit's KeyboardSensor, because
activating drag on Enter/Space would hijack link activation. Keyboard users get the
guaranteed link path instead. Only the `PointerSensor` is registered.

## Architecture

The `/projects` page server-renders the React island's initial HTML through Astro, so
the cards exist as real `<a>` links in the delivered HTML — working with no JS and
before hydration. `client:visible` hydration then layers drag and animation on top.

```
src/
├── lib/
│   └── buildPlate.ts        + .test   pure logic, framework-agnostic
├── components/
│   ├── PartCard.astro                 unchanged — home page featured grid
│   └── plate/
│       ├── BuildPlate.tsx             island root: DndContext, bin + plate, state
│       ├── PartChip.tsx               one draggable card, renders as <a>
│       ├── Plate.tsx                  droppable target + print reveal
│       ├── PrintReveal.tsx            clip-path wipe, nozzle line, LAYER readout
│       ├── SummaryPanel.tsx           slides up on completion, links to sheet
│       └── EmptyBay.tsx               NOT ISSUED slot, non-interactive
└── pages/projects/index.astro         resolves images, renders <BuildPlate>
```

### buildPlate.ts — the tested core

Framework-agnostic pure functions, unit-tested in the Node environment like every
Phase 1 lib module. The React components stay thin and call into these.

- `emptyBayCount(realCount: number, target = 4): number` — `max(0, target - realCount)`.
- `totalLayers(heightMm: number, layerHeightMm: number): number` — `ceil(h / layer)`;
  the biofilter's 25mm / 0.2mm gives 125, driving an honest `LAYER n/125` readout.
- `printState(progress: number, layers: number): { clipTop: number; layer: number; done: boolean }`
  — maps a 0..1 progress value to the clip-path inset percentage (100→0), the current
  layer number (0→layers), and whether the print has finished. Pure, exhaustively
  testable at the boundaries (0, 1, midpoint, clamping outside 0..1).

### Data flow

`/projects/index.astro`:
1. `getCollection('projects')`, sort by `order`.
2. For each, resolve the hero image to a plain URL with dimensions via Astro's
   `getImage()` — a React island cannot consume Astro's `<Image>`, so it needs a
   serializable `{ src, width, height }`.
3. Compute `emptyBayCount`.
4. Render `<BuildPlate client:visible projects={…} bays={n} />`, passing serializable
   props only (ids, titles, summaries, lead spec, image URLs, hrefs).

### Print animation

`motion` animates a single progress value 0→1 over ~1.6s on drop. That value drives,
via `printState`:
- the hero render's `clip-path: inset(clipTop% 0 0 0)` — revealing bottom to top,
- a horizontal nozzle line positioned at the reveal edge,
- a faint layer-line texture in the printed region,
- the `LAYER n/125` monospace readout.

On `prefers-reduced-motion: reduce`, progress is set to 1 immediately — the part
appears complete with no motion. On completion, `SummaryPanel` slides up (motion) and
receives focus for keyboard continuity.

### Mobile / pointer detection

On mount the island checks `window.matchMedia('(pointer: fine)')`. Coarse pointers
render the plain link grid with no plate and no draggable behaviour — identical to the
SSR output, so touch users get exactly today's experience. Fine pointers get the full
plate.

## Testing

- **Unit (Vitest, node):** `buildPlate.ts` in full — bay counts, layer math, and
  `printState` at boundaries and out-of-range inputs. Same pattern and rigor as Phase 1.
- **In-browser (chrome-devtools MCP):** the interaction itself — drag a chip onto the
  plate and confirm the print reveal and summary panel; confirm click navigates; confirm
  the reduced-motion path resolves instantly; confirm the mobile viewport shows the grid
  with no plate; Lighthouse on `/projects` to confirm accessibility 100 and that initial
  load ships no island JS.

Interaction (drag/drop) is verified in-browser rather than unit-tested, because the
value lives in pointer behaviour and animation that a jsdom test cannot meaningfully
exercise. The logic that *can* be isolated is extracted into `buildPlate.ts` and tested
there.

## Dependencies added

- `@astrojs/react`, `react`, `react-dom` — island runtime
- `@dnd-kit/core` — pointer drag and droppable
- `motion` — already installed in Phase 1

## Out of scope

- Section-view scrubber (deferred — needs an aligned section-cut render).
- Any change to the home page or project sheets — they stay zero-JS.
- Fake placeholder project cards on the live site.

## Definition of done

- `/projects` shows the bin (real card + `NOT ISSUED` bays) and the plate on pointer devices.
- Drag → print-in → summary panel works; click → sheet; keyboard/Tab+Enter → sheet.
- Mobile and no-JS both fall back to the working link grid.
- Reduced-motion resolves instantly.
- `buildPlate.ts` fully unit-tested; Lighthouse accessibility 100 on `/projects`.
- Initial `/projects` load ships no island JS (verified: bundle loads on scroll).
