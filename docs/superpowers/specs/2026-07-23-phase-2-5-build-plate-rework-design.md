# Phase 2.5: Build Plate Rework — Design

**Date:** 2026-07-23
**Status:** Approved (pending written-spec review)
**Builds on:** Phase 2 (`2026-07-22-phase-2-build-plate-design.md`), now live.

## Goal

Turn the build plate from a stylized square into a believable Bambu Lab
print bed, make **printing the intended way to open a project**, strip
projects off the home page, and give the home page a proper personal hero.
Everything stays fast and accessible — the print interaction is a pointer
enhancement, never a wall.

## Decisions (resolved in brainstorming)

1. **Soft gate.** On the projects page, printing is *the* way in and the
   copy entices it ("print it to open the write-up"). But every project
   sheet is still a real page at its own URL — reachable by direct link,
   search engines, phone/no-JS/keyboard users. No one hits a dead end.
2. **Real plate.** The drop target is the transparent Bambu **textured PEI
   plate** image (gold-on-near-black), not a CSS square.
3. **Toolhead print animation.** A **small** Bambu A1 toolhead image sweeps
   left–right and rises as the print builds; the transparent part image
   fills in beneath it; a **progress bar** is the primary readout (the big
   `LAYER n/125` text is retired, a tiny layer count may remain).
4. **One part at a time + Clear plate.** Printing one part fills the plate;
   a **Clear plate** button empties it so another part can be dragged on.
5. **Home page has no projects** — it becomes a personal hero.
6. **Transparent print image per project** drives the reveal so the part
   looks like it is sitting on the bed.

## Home page

Left-aligned hero (Ryan-Lee-style), replacing the current "Selected work"
section entirely:

- **Optional photo** of Aaryan, above the text. Optional — omitted
  gracefully if none is set.
- **Name:** `AARYAN DASH`.
- **Subheading:** a grade / age line (e.g. "Rising junior · 16 · mechanical
  design").
- **Description:** 2–3 editable sentences about him.
- **`View projects →`** button (primary CTA to `/projects`).

Content lives inline in `src/pages/index.astro` as clearly-marked editable
values for now; **externalizing it for in-browser editing is Phase 3.** The
`featured` project machinery and `PartCard` on the home page are removed
(the `featured` schema field and `PartCard.astro` may stay for possible
reuse but are no longer rendered on `/`).

## Projects page — the bench

Heading + an **enticing instruction line**, e.g.
_"Drag a part onto the plate and print it to open the write-up."_
Below it, two zones on pointer devices:

- **Parts shelf** (left): the draggable part card(s). One real part today
  (biofilter). The **`NOT ISSUED` bays are retired**; if a single part
  looks lonely, at most one faint "more coming" ghost slot is shown.
- **The plate** (right): the Bambu textured-PEI image as the droppable
  target. An idle "drop here" hint sits over the bed's build area. The
  build area is an inset region of the plate image (excluding the top tab
  and the bottom `PLA/ABS/PETG … HOT SURFACE` label strip) — parts render
  only within it.

## The print interaction

Drag a part onto the plate → it prints:

1. The **transparent part image** is revealed bottom-to-top via a clip, up
   to the current print height (same honest geometry as Phase 2:
   `totalLayers(heightMm, layerHeightMm)` → 125 layers for the biofilter).
2. A **small A1 toolhead image** is positioned at the top edge of the
   revealed region (the deposition line) and **sweeps horizontally back and
   forth** while that line **rises**. Vertical position derives from the
   clip; horizontal sweep is a triangle/sine oscillation over elapsed time.
3. A **progress bar** beneath the plate fills 0→100%. A tiny `layer n/125`
   may sit near it, but the bar is the primary indicator.
4. On completion → the **summary panel** rises (title, lead spec,
   **Open project sheet →**) **and a `Clear plate` button** appears.
   `Clear plate` empties the bed back to the idle hint so another part can
   be printed. One part prints at a time.

Reduced motion: the part resolves to fully printed instantly, no toolhead
sweep, bar shown full, summary + Clear plate present immediately (extends
the Phase 2 reduced-motion path).

## Mobile / no-JS fallback

No plate on touch/coarse-pointer or pre-hydration/no-JS. Instead: a simple
**tappable list of parts** (real `<a>` links) → project sheets, framed as
3D prints, with a caption:
> **"View the desktop site to \"print\" projects!"**

This is the soft gate's safety net and keeps the page fully usable and
indexable everywhere.

## Images & schema

**New shared UI assets** (not per-project; imported by the projects page and
passed to the island as resolved URLs, like the Phase 2 hero handling):

- `src/assets/plate/textured-plate.png` ← `Downloads/textured_plate_transparent.png`
- `src/assets/plate/a1-toolhead.png` ← `Downloads/A1toolheadUpscale.png`

**New per-project asset + schema field** (the only schema change this phase):

- Add `printTransparent: image().optional()` to `projectSchema.ts` — the
  transparent print image that drives the reveal. Falls back to `heroRender`
  when absent, so existing/other projects still print something.
- Biofilter: add
  `src/assets/projects/pitcch-biofilter/print-transparent.png`
  ← `Downloads/IGEM PITCCH Project/BioFilter 3D Print Transparent.png`, and
  reference it in the mdx frontmatter.

**Deferred to Phase 3** (noted so it is not lost): the new-project intake
should *prompt* for a fuller image set — render, transparent, mid-print,
**failed print**, fully printed, and **iterations (multiple)** — **none
required**. Those get dedicated optional schema fields, project-sheet
display (failed/iterations shots are strong admissions material — they show
process), and the CMS prompting *in Phase 3*, not now.

## Components (island)

Reworked under `src/components/plate/`:

- `BuildPlate.tsx` — adds `done`→`Clear plate` reset; still owns
  `dragEnabled` / `loaded` / `done` state; renders the mobile list when
  `!dragEnabled`.
- `Plate.tsx` — renders the Bambu plate image as the bed; `PrintReveal`
  and summary layer on top of the build-area region.
- `PrintReveal.tsx` — transparent-image clip reveal + toolhead sweep + rise;
  `onDone` callback preserved.
- `Toolhead.tsx` *(new)* — the small sweeping A1 toolhead image.
- `ProgressBar.tsx` *(new)* — the 0→100% bar.
- `SummaryPanel.tsx` — unchanged content; `Clear plate` button lives here or
  adjacent in `Plate`.
- `PartsList.tsx` *(new)* — the mobile/no-JS tappable list + caption.
- `EmptyBay.tsx` — **removed** (bays retired); optional single ghost slot
  folded into the shelf if needed.
- `plate.css` — new plate/toolhead/bar/clear/shelf styles.

Pure logic in `src/lib/buildPlate.ts` (unit-tested): keep `emptyBayCount`
(may become unused → remove if so), `totalLayers`, `printState`; **add** a
toolhead-sweep helper mapping elapsed time → horizontal offset (0..1),
tested.

## Accessibility & progressive enhancement

- Every part is still a real `<a href>`; the sheet is the universal path.
- Drag stays pointer-only; no dnd-kit KeyboardSensor.
- Plate/toolhead images are decorative (`alt=""` / `aria-hidden`); the part
  image keeps its real `alt`.
- Instruction and caption copy are real text, not images.
- Reduced motion fully honored (instant resolve, no sweep, bar full).
- Lighthouse accessibility must stay **100** on `/` and `/projects`.

## Out of scope (later phases)

- In-browser editing / CMS and the full image-intake prompting → **Phase 3**.
- Section-view scrubber, `model` / "View in 3D" viewer → later.
- Custom domain.

## Definition of done

- Home page: personal hero (optional photo, name, grade/age subheading,
  editable description, `View projects →`); no projects listed.
- `/projects` (pointer): parts shelf + real Bambu plate; enticing
  instruction; drag → toolhead prints the transparent image with a rising
  small toolhead and a progress bar → summary + **Clear plate** → print
  another.
- Soft gate intact: sheets reachable by direct URL; mobile/no-JS show the
  tappable parts list with the "view desktop site to print" caption.
- `printTransparent` schema field added; biofilter wired to its transparent
  image; toolhead-sweep logic unit-tested; all tests green.
- Reduced motion instant; Lighthouse a11y 100 on `/` and `/projects`; home
  and sheets stay zero-JS; the island remains a deferred `client:visible`
  chunk.
