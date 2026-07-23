# Phase 3b-i — Content Model + Local CMS Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Externalize the home-page copy to an editable data file and mount a Sveltia CMS admin that edits projects and home content against the local repo — no accounts, no deploy.

**Architecture:** A small Zod-parsed JSON data file (`src/data/home.json`) replaces the hardcoded home hero strings. A static Sveltia CMS admin lives at `public/admin/` (`index.html` + `config.yml`), configured with a GitHub backend plus `local_backend: true` so it edits on-disk files through the browser's File System Access API during development. Project media uses relative per-collection folders (Option B) so uploads keep the Astro image pipeline; a spike proves the relative path round-trips through the build before the config is trusted.

**Tech Stack:** Astro 7, `astro/zod`, Sveltia CMS (loaded from CDN in the admin page), vitest.

## Global Constraints

- Astro **static** build, GitHub Pages, no server adapter. The admin is a client-side SPA; nothing in 3b-i may add a server dependency to the built site.
- Site is served under a base subpath (`/aaryandash-site/`). Admin resolves to `/aaryandash-site/admin/`.
- Repo: `aaryandash/aaryandash-site`, branch `main`.
- Keep the Astro image pipeline: project images live in `src/assets/projects/<slug>/` and are referenced by **relative** frontmatter paths (`../../assets/projects/<slug>/…`) that the schema's `image()` resolves at build.
- `config.yml` must expose **every** field in `src/lib/projectSchema.ts` — a missing widget means a field the owner can't edit.
- Bad content is a build error, not a silent render bug (mirror `projectSchema`'s strictness).
- Auth (`backend.base_url`, GitHub OAuth, Cloudflare Worker) is **out of scope for 3b-i** — deferred to 3b-ii. A placeholder `base_url` is acceptable here because `local_backend: true` bypasses it in development.

---

### Task 1: Externalize home hero to a Zod-parsed data file

**Files:**
- Create: `src/data/home.json`
- Create: `src/lib/homeContent.ts`
- Create: `src/lib/homeContent.test.ts`
- Modify: `src/pages/index.astro:6-9` (replace the hardcoded `subheading`/`description` consts)

**Interfaces:**
- Consumes: nothing.
- Produces: `homeSchema` (Zod object), `type HomeContent`, `parseHome(data: unknown): HomeContent` — consumed by `index.astro` and any later CMS-facing validation.

- [ ] **Step 1: Write the failing test**

Create `src/lib/homeContent.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { parseHome } from './homeContent';

const valid = {
  subheading: 'Rising junior · mechanical design & CAD',
  description: 'I design mechanisms and print them on a Bambu A1.',
};

describe('parseHome', () => {
  it('parses well-formed home content', () => {
    expect(parseHome(valid)).toEqual(valid);
  });

  it('rejects a missing subheading', () => {
    const { subheading, ...rest } = valid;
    expect(() => parseHome(rest)).toThrow();
  });

  it('rejects an empty description', () => {
    expect(() => parseHome({ ...valid, description: '' })).toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /home/aaryan/projects/aaryandash-site && npx vitest run src/lib/homeContent.test.ts`
Expected: FAIL — cannot resolve `./homeContent`.

- [ ] **Step 3: Write the module**

Create `src/lib/homeContent.ts`:

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /home/aaryan/projects/aaryandash-site && npx vitest run src/lib/homeContent.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Create the data file**

Create `src/data/home.json` (values copied verbatim from the current `index.astro`):

```json
{
  "subheading": "Rising junior · mechanical design & CAD",
  "description": "I design mechanisms — FRC robot subsystems, competition CAD, and parts that have to survive contact with reality. I model in Fusion 360, print on a Bambu A1, and iterate until it works."
}
```

- [ ] **Step 6: Wire `index.astro` to the data file**

In `src/pages/index.astro`, replace the frontmatter block (currently lines 6–9, the `subheading` and `description` consts and their comment) so the imports section reads:

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
import { href } from '../lib/paths';
import { SITE_NAME } from '../lib/meta';
import homeData from '../data/home.json';
import { parseHome } from '../lib/homeContent';

const { subheading, description } = parseHome(homeData);
---
```

Leave the `<BaseLayout>…</BaseLayout>` markup and the `<style>` block unchanged — they already read `{subheading}` and `{description}`.

- [ ] **Step 7: Build to verify the page still renders**

Run: `cd /home/aaryan/projects/aaryandash-site && npx astro build`
Expected: `[build] Complete!`, no errors.

Then confirm the copy is present in the built home page:

Run: `grep -o 'Rising junior[^<]*' dist/index.html | head -1`
Expected: `Rising junior · mechanical design & CAD`

- [ ] **Step 8: Commit**

```bash
cd /home/aaryan/projects/aaryandash-site
git add src/data/home.json src/lib/homeContent.ts src/lib/homeContent.test.ts src/pages/index.astro
git commit -m "feat: externalize home hero copy to an editable data file"
```

---

### Task 2: Mount the Sveltia admin with the full collection config

**Files:**
- Create: `public/admin/index.html`
- Create: `public/admin/config.yml`

**Interfaces:**
- Consumes: `src/lib/projectSchema.ts` field list (mirrored as widgets), `src/data/home.json` shape from Task 1.
- Produces: a working `/admin` that loads Sveltia and lists the `projects` and `site` collections.

- [ ] **Step 1: Create the admin page**

Create `public/admin/index.html` (Sveltia loaded from a **pinned** CDN version; the admin is a dev tool, not on the site's critical path):

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="robots" content="noindex" />
    <title>Content Manager</title>
  </head>
  <body>
    <script src="https://unpkg.com/@sveltia/cms@0.55.0/dist/sveltia-cms.js"></script>
  </body>
</html>
```

> If `0.55.0` is not resolvable at run time, replace it with the latest published `@sveltia/cms` version from https://github.com/sveltia/sveltia-cms/releases and note the version used.

- [ ] **Step 2: Create the CMS config**

Create `public/admin/config.yml`. Every `projectSchema` field is mapped to a widget:

```yaml
backend:
  name: github
  repo: aaryandash/aaryandash-site
  branch: main
  # base_url is set in Phase 3b-ii (Cloudflare Worker). local_backend bypasses it in dev.
  base_url: https://cms-auth.invalid

local_backend: true

media_folder: public/uploads
public_folder: /uploads

collections:
  - name: projects
    label: Projects
    label_singular: Project
    folder: src/content/projects
    extension: mdx
    format: frontmatter
    create: true
    slug: '{{slug}}'
    # Relative to the entry file's folder (src/content/projects), so uploads land
    # in src/assets/projects/<slug>/ and frontmatter stores the relative path the
    # Astro image() pipeline resolves. Verified by the Task 3 spike.
    media_folder: '../../assets/projects/{{slug}}'
    public_folder: '../../assets/projects/{{slug}}'
    fields:
      - { name: title, label: Title, widget: string }
      - { name: order, label: Sort order, widget: number, value_type: int, min: 0 }
      - { name: season, label: Season, widget: string }
      - { name: role, label: Role, widget: string }
      - { name: summary, label: Summary (max 200), widget: string, pattern: ['^.{1,200}$', 'Must be 1–200 characters'] }
      - { name: tools, label: Tools, widget: list, min: 1, field: { name: tool, label: Tool, widget: string } }
      - { name: materials, label: Materials, widget: list, required: false, field: { name: material, label: Material, widget: string } }
      - { name: heightMm, label: Print height (mm), widget: number, required: false, value_type: float }
      - { name: layerHeightMm, label: Layer height (mm), widget: number, required: false, value_type: float }
      - { name: printTransparent, label: Transparent print image (PNG), widget: image, required: false }
      - name: specs
        label: Specs
        widget: list
        required: false
        fields:
          - { name: label, label: Label, widget: string }
          - { name: value, label: Value, widget: string }
      - { name: heroRender, label: Hero render, widget: image }
      - { name: heroAlt, label: Hero alt text, widget: string }
      - { name: sectionRender, label: Section render, widget: image, required: false }
      - { name: sectionAlt, label: Section alt text, widget: string, required: false }
      - { name: model, label: 3D model path (.glb), widget: string, required: false }
      - name: gallery
        label: Gallery
        label_singular: Image
        widget: list
        required: false
        summary: '{{fields.title}}'
        fields:
          - { name: src, label: Image, widget: image }
          - { name: title, label: Title, widget: string }
          - { name: alt, label: Alt text (optional), widget: string, required: false }
          - { name: caption, label: Caption (optional), widget: string, required: false }
      - { name: featured, label: Featured, widget: boolean, default: false }
      - { name: body, label: Write-up, widget: markdown }
  - name: site
    label: Site
    files:
      - name: home
        label: Home page
        file: src/data/home.json
        fields:
          - { name: subheading, label: Subheading, widget: string }
          - { name: description, label: Description, widget: text }
```

- [ ] **Step 3: Verify the config is valid YAML**

Run: `cd /home/aaryan/projects/aaryandash-site && node -e "const y=require('yaml');const fs=require('fs');y.parse(fs.readFileSync('public/admin/config.yml','utf8'));console.log('yaml ok')"`
Expected: `yaml ok`.
(If `yaml` is not installed, use: `npx --yes js-yaml public/admin/config.yml > /dev/null && echo "yaml ok"`.)

- [ ] **Step 4: Verify every schema field has a widget**

Cross-check against `src/lib/projectSchema.ts`. Confirm each of these appears as a `name:` in `config.yml`: `title`, `order`, `season`, `role`, `summary`, `tools`, `materials`, `heightMm`, `layerHeightMm`, `printTransparent`, `specs`, `heroRender`, `heroAlt`, `sectionRender`, `sectionAlt`, `model`, `gallery` (with `src`, `title`, `alt`, `caption`), `featured`. Plus `body` for the MDX content.

Run: `cd /home/aaryan/projects/aaryandash-site && for f in title order season role summary tools materials heightMm layerHeightMm printTransparent specs heroRender heroAlt sectionRender sectionAlt model gallery featured body; do grep -q "name: $f" public/admin/config.yml || echo "MISSING: $f"; done; echo "check done"`
Expected: `check done` with no `MISSING:` lines.

- [ ] **Step 5: Verify the admin loads in the browser (dev server)**

Start the dev server in the background: `cd /home/aaryan/projects/aaryandash-site && npx astro dev`

Navigate to `http://localhost:4321/aaryandash-site/admin/` (confirm the port/base from the dev server banner). Using the chrome-devtools MCP:
- Confirm no fatal console error (`list_console_messages`); a warning about the GitHub backend / auth is expected and fine.
- Confirm the Sveltia UI rendered and shows the **Projects** and **Site** collections (check via `evaluate_script` for the collection labels in the DOM, per the project's numeric-first verification default). One screenshot is acceptable here for visual sign-off of the admin shell.

- [ ] **Step 6: Commit**

```bash
cd /home/aaryan/projects/aaryandash-site
git add public/admin/index.html public/admin/config.yml
git commit -m "feat: mount Sveltia CMS admin with full project + home config"
```

---

### Task 3: Media Option B spike — prove relative uploads round-trip the build

**Files:**
- Temporary: a scratch image committed under `src/assets/projects/pitcch-biofilter/` then reverted, OR a throwaway gallery entry — nothing permanent is created by this task.
- Possible modify (only on fallback): `public/admin/config.yml` media settings; `docs/superpowers/specs/2026-07-23-phase-3b-in-browser-cms-design.md` (record the outcome).

**Interfaces:**
- Consumes: the `projects` collection media config from Task 2.
- Produces: a decision (Option B confirmed, or Option A fallback applied) recorded in the spec.

- [ ] **Step 1: Simulate the exact path Sveltia would write**

Sveltia, with `public_folder: '../../assets/projects/{{slug}}'` on the biofilter entry, stores an uploaded image as `../../assets/projects/pitcch-biofilter/<file>`. This is byte-identical to the pattern the existing gallery already uses. Prove the round-trip by adding one **new** gallery item pointing at an existing asset via that exact relative string.

In `src/content/projects/pitcch-biofilter.mdx`, temporarily append a fourth gallery item (reuse an existing image so no binary is needed):

```yaml
  - src: '../../assets/projects/pitcch-biofilter/finished-print.jpg'
    title: 'Spike check'
    caption: ''
```

- [ ] **Step 2: Build and confirm the relative path resolves and optimizes**

Run: `cd /home/aaryan/projects/aaryandash-site && npx astro build`
Expected: `[build] Complete!` with no "Could not find requested image" / unresolved-path error, and the gallery image processed (a `finished-print.<hash>.webp` under `dist/_astro/`).

Run: `ls dist/_astro/ | grep finished-print | head`
Expected: at least one hashed `finished-print` asset.

- [ ] **Step 3: Interpret the result**

- **If the build succeeds:** Option B holds. The relative `public_folder` produces frontmatter that `image()` resolves and optimizes. No config change needed.
- **If the build fails** with an unresolved-image error: Option B does not round-trip. Apply the Option A fallback — set the `projects` collection to `media_folder: public/uploads/projects/{{slug}}` and `public_folder: /uploads/projects/{{slug}}` in `config.yml`, change the `gallery.src` (and any CMS-uploaded image field) rendering to a plain `<img>` in `src/components/Gallery.astro`, and note that hero/print/section images remain pipelined + git-managed. Record which path was taken.

- [ ] **Step 4: Revert the scratch gallery item**

Remove the temporary fourth gallery item added in Step 1 so `pitcch-biofilter.mdx` returns to its committed three-item gallery.

Run: `cd /home/aaryan/projects/aaryandash-site && git checkout src/content/projects/pitcch-biofilter.mdx`
Expected: the scratch entry is gone (`git diff --stat` shows no change to the file).

- [ ] **Step 5: Record the outcome in the spec**

Append a short "Media spike result" note to `docs/superpowers/specs/2026-07-23-phase-3b-in-browser-cms-design.md` under the media section stating **Option B confirmed** (or **Option A applied**, with the config changes made).

- [ ] **Step 6: Commit**

```bash
cd /home/aaryan/projects/aaryandash-site
git add docs/superpowers/specs/2026-07-23-phase-3b-in-browser-cms-design.md
# On fallback also: git add public/admin/config.yml src/components/Gallery.astro
git commit -m "docs: record Phase 3b media spike result (Option B/A)"
```

---

## Self-Review

**Spec coverage:**
- Home hero → `src/data/home.json` + Zod parse — Task 1. ✓
- `public/admin/` mount + `config.yml` with projects + home collections — Task 2. ✓
- Every `projectSchema` field editable (incl. gallery drag-reorder — Sveltia list widgets reorder natively) — Task 2, Step 4 verifies coverage. ✓
- Media Option B + de-risking spike + Option A fallback — Task 3. ✓
- Local-backend editing (`local_backend: true`) — Task 2, config + Step 5 browser check. ✓
- Direct-to-`main`, `base_url`, GitHub OAuth, Cloudflare Worker — correctly **deferred to 3b-ii**, not in this plan. ✓

**Placeholder scan:** No "TBD"/"handle edge cases"/uncoded steps — every code step shows the code; the one runtime unknown (CDN version, dev port) has an explicit fallback instruction. ✓

**Type consistency:** `parseHome`/`homeSchema`/`HomeContent` used consistently across Task 1 and referenced in Task 2. Field names in `config.yml` match `projectSchema` exactly (`heightMm`, `layerHeightMm`, `printTransparent`, `heroRender`, `heroAlt`, `sectionRender`, `sectionAlt`, `gallery.{src,title,alt,caption}`). ✓
