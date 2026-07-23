# CAD Portfolio & Personal Site — Design

**Date:** 2026-07-22
**Owner:** Aaryan Dash
**Status:** Approved, ready for implementation planning

## Purpose

A personal website presenting mechanical-engineering CAD work (FRC robotics subsystems, a Princeton CAD competition entry, 3D-printed and machined parts) alongside personal identity content. Primary audience is college admissions readers — Georgia Tech in particular — with a secondary audience of peers, teammates, and competition contacts.

Success means: an admissions reader lands on the site, understands within fifteen seconds that this person designs real mechanisms, can open any project and follow the engineering reasoning, and comes away with a specific impression of a person rather than a template.

## Constraints

1. Hosted free from GitHub (GitHub Pages) for now. Must remain portable to another host without a rewrite.
2. All content editable through a web UI, never by hand-editing the repository.
3. Must work fully on mobile and via keyboard. No content reachable only by mouse gesture.
4. Maintained by a high-school student across a two-year window. Nothing that requires a paid tier, a subscription that can lapse, or a service whose free terms are load-bearing.

## Core concept

The site is presented as **an engineering drawing set**.

This is explicitly *not* a blueprint pastiche — no white-on-cyan, no 1940s costume. It draws on the modern drawing package and the CAD sketch environment: hairline geometry, monospace annotation, dimensioned callouts with leader lines, revision blocks, and a **title block** that doubles as site navigation.

The personal register is carried by the *structure* of this language rather than by ornament. Evangelion's interface design — monospace labels, schematic overlays, technical annotation — is the reference, but it is never quoted directly and no protected material appears anywhere on the site. A viewer who recognizes the register feels it; a viewer who does not simply reads precision. That dual-read is the central design bet: it is what lets the site carry real personality without costing credibility with an admissions audience.

Two aesthetic directions considered and rejected as the *global* skin, both retained for the personal section:

- **Ink and brush** (Vagabond / Berserk): beautiful, but reads art-student rather than engineer.
- **Pixel workshop** (Stardew / Terraria): memorable and warm, but undercuts the precision signal the CAD work depends on.

## Site map

Each page is a "sheet." The title block displays `SHEET n OF m` and acts as the primary nav.

| Sheet | Route | Content |
|---|---|---|
| 00 · Home | `/` | Constraint-solve hero, then the parts bin |
| 01 · Parts Bin | `/projects` | All projects as draggable part cards + build plate |
| 02 · Project sheet | `/projects/[slug]` | One per project |
| 03 · About | `/about` | Résumé as a drawing sheet, tool inventory, PDF download |
| 04 · Personal Interests | `/interests` | Personal content, deliberately off-system |

Contact lives permanently in the title block footer: email, GitHub, LinkedIn. Values are set in site config, not hard-coded into templates.

### Home

An underdefined 2D sketch — loose geometry rendered in underdefined-blue — resolves as the visitor scrolls. Constraints snap on one at a time until the sketch is fully defined and reads as the name "AARYAN DASH" in black. Each snap carries a 40ms scale-punch. Below the fold, the parts bin begins.

If `prefers-reduced-motion` is set, the sketch renders already-solved with no animation.

### Project sheet

Fixed structure per project:

1. Hero render with animated dimension callouts on leader lines
2. Spec table — material, process, quantity, mass, tolerance, iteration count
3. Section-view scrubber
4. Process gallery — CAD screenshots, print/machining photos, assembled shots
5. Writeup — the constraint, what was tried, what failed, what shipped

The writeup is the substance. Renders establish competence; the failure-and-iteration narrative is what distinguishes this from a gallery of pretty parts.

## Signature interaction: the build plate

The parts bin sits left, a 3D-printer build plate sits right. Dragging a part card onto the plate causes the part to **print in**: a horizontal nozzle line sweeps bottom-to-top revealing the render beneath, faint layer lines visible in its wake, a monospace readout ticking `LAYER 47/210`. On completion, the case study slides up beneath the plate.

**Implementation:** a `clip-path` wipe over a static render plus a moving highlight line and a layer-line texture overlay. No 3D engine, no model loading. This is faster on a phone than a real three.js scene and looks better at this scale.

**Access rules — non-negotiable:**

- Every part card is also an ordinary link to its project sheet. Drag is the delight; click is the contract.
- Keyboard users get real drag-and-drop through `dnd-kit`'s keyboard sensor, with the same print animation.
- Below the mobile breakpoint the plate collapses and cards become a standard grid.

The interaction is chosen because it is load-bearing rather than decorative: it is simultaneously the navigation, the personality, and a demonstration of engineering instinct, and it scales as projects are added.

## Secondary interaction: section-view scrubber

Two renders per project — exterior and section cut — composited with a draggable divider. Sweeping the divider reveals internals and fades in the corresponding writeup paragraph. Falls back to a labeled before/after toggle on touch and for reduced-motion users.

Requires a section-view export per project from Onshape. Roughly two minutes of CAD work per part.

## Visual system

**Typography**
- IBM Plex Mono — annotation, dimensions, labels, title block, spec tables
- IBM Plex Sans — body copy and writeups
- Both are free, open-licensed, self-hosted, and drawn for a technology context

**Color**
- Canvas: near-black `#0B0D0F` with a faint graph grid; a paper-light theme available via toggle
- Line: hairline strokes at 0.5–1px
- Accent: amber `#FF6B1A` for active and critical annotation
- Secondary: underdefined-sketch blue for unresolved and inactive states

**Restraint rule:** no more than one accent element per viewport. The linework carries the design; the accent marks only what is active or critical.

## Motion

Every animation corresponds to a mechanical event. Nothing moves as decoration.

| Trigger | Motion |
|---|---|
| Callout enters | Leader line draws in via `stroke-dasharray` |
| Dimension enters | Numeric value counts up to target |
| Scrubber drag | Section plane sweeps, internals reveal |
| Navigation | Title block flips sheets |
| Constraint resolve | 40ms scale-punch on the marker |
| Part dropped on plate | Layer-by-layer print reveal |

All motion is gated behind `prefers-reduced-motion`, interruptible, and never blocks access to content. No animation delays first meaningful paint.

## Personal Interests

The nav label is plain and literal — "Personal Interests" — deliberately. Navigation exists to tell visitors where they are going, and a clever label taxes every reader, including the admissions audience skimming quickly. Wit belongs inside the page, not on the signpost.

Within the page, the header carries a small drawing-annotation stamp reading `NOT TO SCALE` — a real notation meaning a view is not dimensioned. Annotation-sized, secondary to the plain header, and safe to remove without affecting anything else.

The section deliberately breaks the drawing-set system. Crossing into it should feel like flipping the drawing over and finding doodles on the back — the rupture is the point, and it only works because the rest of the site is disciplined.

- **Manga** — Vagabond, Berserk, Hunter × Hunter, The Climber — ink and brush treatment, panel-gutter layout
- **Anime** — Evangelion, Naruto, Hunter × Hunter — presented as personal commentary, not fan art
- **Games** — Stardew Valley, Terraria — pixel UI, sprite hover states
- **Music** — a curated list of artists and tracks, hand-edited through the CMS

All Personal Interests content is CMS-managed as simple ordered lists with an optional note per entry. No third-party API integration in the initial build; a Spotify integration may be considered later but is out of scope here, since a live API dependency violates constraint 4.

## Technical stack

- **Astro** — static output, zero JS by default. Chosen because the animation budget only works if the baseline page ships no framework runtime.
- **React islands** — used only where interaction lives: build plate, section scrubber, edit-mode overlay. Three islands total.
- **Motion** — animation library
- **dnd-kit** — drag and drop, chosen specifically for its keyboard sensor
- **MDX + content collections** — one file per project

**Project frontmatter schema:**

```yaml
title: string
slug: string
order: number
season: string          # e.g. "FRC 2025" or "Princeton CAD 2026"
role: string
tools: string[]         # Onshape, Fusion 360, Inventor, Bambu Studio
materials: string[]
specs: { label: string, value: string }[]
heroRender: image
sectionRender: image
gallery: { src: image, alt: string, caption: string }[]
featured: boolean
```

Images run through Astro's built-in pipeline to WebP/AVIF with responsive sizes and lazy loading.

## Editing

**Sveltia CMS** mounted at `/admin`. GitHub OAuth login, one collection per content type, split-pane live preview, `+ New Project` on the projects collection.

**Edit-mode overlay** on the live site: when authenticated, pencil affordances appear beside every editable block and a `+` appears on the parts bin. Clicking a pencil deep-links to that entry's form in the CMS with live preview attached. This gives the "click the thing on my site that I want to change" experience without coupling the stack to a specific framework or putting a third-party service in the login path.

**Publish flow:** edit → commit to repository → GitHub Actions build → live in approximately 90 seconds.

**One-time setup:** a Cloudflare Worker handling the GitHub OAuth handshake, since GitHub Pages cannot perform it server-side. Free tier, deployed once, no ongoing maintenance.

## Hosting

GitHub Pages, built and deployed by GitHub Actions on push to `main`.

A custom domain is strongly recommended before college applications — `aaryandash.github.io` on an application is a materially worse first impression than `aaryandash.com`, and the domain costs roughly $12/year while hosting stays free. The domain is a DNS change, not an architectural one, and can be added at any point.

## Non-negotiable quality bar

- **Performance:** LCP under 2s on simulated 4G. Total JavaScript under 100kb.
- **Accessibility:** full keyboard navigation, visible focus states, real descriptive alt text on every render, semantic heading order, and no content reachable only by pointer gesture.
- **Metadata:** per-page OG images and descriptions, so the link previews correctly when pasted into an application or a message.
- **Resilience:** the site must render usefully with JavaScript disabled. Islands enhance; they do not gate content.

## Build order

Each phase ends deployed and working.

1. **Foundation** — Astro skeleton, design system, title block nav, one project sheet end-to-end, GitHub Actions deploy. Ends with a live URL that can be sent to someone.
2. **Parts bin** — build plate interaction, section scrubber, remaining projects.
3. **Editing** — Sveltia CMS, OAuth worker, edit-mode overlay.
4. **Personal Interests** — personal section.
5. **Polish** — performance pass, accessibility audit, SEO and metadata, light theme.

## Owner responsibilities outside the build

Content preparation cannot be automated and gates phase 2:

- Organize CAD source files per project
- Export a hero render and a section view per project
- Gather 2–3 process photographs per project
- Write, for each project, the constraint faced, approaches attempted, failures, and final solution

This is the difference between an impressive portfolio and a well-built empty shell.

## Interactive 3D (Phase 2)

Each project sheet may offer an optional interactive 3D view of the part, using
the `<model-viewer>` web component loading a `.glb`.

The rule that makes this affordable: **the static render is always the default
and the LCP element.** The 3D viewer is loaded only on an explicit "View in 3D"
action, which lazy-loads the viewer library and the model. This preserves the
zero-JS baseline on initial load, keeps the no-JavaScript fallback (the render),
and keeps the performance budget intact for the common case — an admissions
reader skimming on a phone never pays for the viewer unless they ask for it.

Constraints:
- Static render loads first, every time. The viewer never blocks paint.
- Viewer library and model are lazy-loaded on interaction only.
- Each `.glb` should be decimated to stay under ~2MB.
- A project with no `.glb` simply shows the render and no button — the field is
  optional in the schema.

Rejected alternatives: an Onshape iframe embed (requires a public document,
carries external branding, and breaks the drawing-set aesthetic) and raw
three.js (heavier and more build effort for no gain over `model-viewer` at this
scale).

## Explicitly out of scope

- Raw three.js hand-rolled viewers. `<model-viewer>` covers the need; see the
  Interactive 3D section.
- Live Spotify or third-party API integration.
- Blog or writing section.
- Analytics.
- Contact form. A `mailto:` link requires no backend and no spam handling.
