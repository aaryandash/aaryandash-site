# Phase 3b — In-Browser CMS (Sveltia + Cloudflare Worker)

**Date:** 2026-07-23
**Status:** Approved design
**Depends on:** Phase 3a (titled/reorderable gallery) — merged

## Goal

Let the site owner edit all project content and the home-page copy from a
browser, without touching the git repository or a terminal. Editing must be a
"just change it and save" experience: open `/admin`, edit fields, save, and the
live site rebuilds. Adding images (including new-project photos) must work
through the same UI.

## Constraints

- The site is a **static** Astro build deployed to **GitHub Pages** (no server,
  no adapter). A CMS admin must therefore be a client-side SPA plus a small
  external piece for the OAuth token exchange.
- Images currently flow through Astro's image pipeline: they live in
  `src/assets/**` and are referenced by **relative** path in frontmatter via the
  collection schema's `image()` helper, which resolves them at build for
  optimization (responsive `widths`, webp). The build plate depends on the
  build-time **dimensions** that `image()` produces. The CMS must preserve this
  pipeline.
- The owner is the only editor. Mistakes are cheap to fix. No multi-user or
  review workflow is needed.

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| CMS | **Sveltia CMS** | Static SPA admin, Decap-compatible config, native drag-reorder list widget, active maintenance. |
| Auth relay | **Cloudflare Worker** (`sveltia-cms-auth`) + GitHub OAuth app | GitHub Pages can't run OAuth server code; the Worker does the token exchange on the free Workers tier. |
| Image handling | **Option B** — Sveltia media into `src/assets`, relative `public_folder` | Keeps the image pipeline and the build-plate dimensions intact. Fragility is absorbed by a de-risking spike, not exposed to the owner. |
| Home hero | **`src/data/home.json`** data file, Zod-parsed | Lighter than a whole content collection for one page's copy. |
| Commit workflow | **Direct to `main`** | Solo editor; PR/editorial friction defeats the "just edit it" goal. |
| Hero photo | **Deferred** | Rides on the image decision; not needed for the first cut. |

## Two-Phase Split

The work splits so that everything requiring an external account lands last.

### 3b-i — Content model + CMS, editable locally

All code. No accounts, no deploy. Verified end-to-end using Sveltia's **local
backend** (edits files on disk through the browser's File System Access API).
Delivers the full editing UI running against real local files.

### 3b-ii — Go-live auth

The GitHub OAuth app and the Cloudflare Worker. Flipping the CMS backend from
local to the GitHub backend (one `base_url` in `config.yml`) makes the same UI
edit the live repository and commit to `main`.

## Architecture

```
public/admin/index.html   Loads Sveltia CMS (single script).
public/admin/config.yml    Backend, media rules, collection definitions.
src/data/home.json         { subheading, description } — the editable home copy.
src/lib/homeContent.ts     Zod schema + parse for home.json (unit-tested).
src/pages/index.astro      Imports parsed home content instead of hardcoding it.
workers/cms-auth/          OAuth-relay Worker (index.js + wrangler.toml). Dormant
                           until 3b-ii.
```

Note the GitHub Pages base path: the project site is served under a subpath
(e.g. `/aaryandash-site/`), so the admin resolves to `/aaryandash-site/admin/`.
`config.yml` paths and the admin script must account for the base.

## Components

### Admin mount (`public/admin/`)
- `index.html`: minimal page that loads the Sveltia CMS script and points it at
  `config.yml`.
- `config.yml`: the single source of truth for what is editable.

### `config.yml` — collections

**projects** — a folder collection over `src/content/projects/*.mdx`, frontmatter
format. Every field in `projectSchema` is mapped to a widget:

- `title`, `season`, `role`, `heroAlt`, `sectionAlt` — string
- `summary` — string (max 200, mirror the schema)
- `order` — number (integer, ≥ 0)
- `heightMm`, `layerHeightMm` — number, optional
- `tools`, `materials` — list of strings
- `specs` — list of objects `{ label, value }`
- `heroRender`, `printTransparent`, `sectionRender` — image widget
- `model` — string (path), optional
- `gallery` — **list widget**, drag-reorder enabled, each item
  `{ src (image), title (required), alt (optional), caption (optional) }`
- `featured` — boolean
- body — markdown

**site/home** — a file collection editing `src/data/home.json`, fields:
`subheading`, `description`.

### Home content externalization
- `src/data/home.json` holds `{ subheading, description }`.
- `src/lib/homeContent.ts` exports a Zod schema and a parse that fails the build
  on malformed content (same philosophy as `projectSchema` — bad content is a
  build error, not a silent render bug).
- `src/pages/index.astro` imports the parsed content; the hardcoded strings are
  removed.

### OAuth Worker (`workers/cms-auth/`)
- The official `sveltia-cms-auth` Worker source, committed with a `wrangler.toml`
  (`name`, `main`, `compatibility_date`).
- Secrets `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` are set at deploy time, not
  committed.
- `ALLOWED_DOMAINS` restricts which site origin the Worker will authenticate.

## Media strategy (Option B) and its spike

Configure per-collection media so uploads land beside the content and frontmatter
receives a **relative** path the pipeline can resolve:

- `media_folder: "src/assets/projects/{{slug}}"` (where files are written)
- `public_folder`: a **relative** path (e.g. `../../assets/projects/{{slug}}`)
  so the value stored in frontmatter resolves through `image()` at build.

**Risk:** Sveltia/Decap `public_folder` is conventionally an absolute URL;
relative-path resolution through Astro's `image()` from a CMS-written string is
the fragile part and must be proven.

**Spike (first implementation task):** upload an image via the CMS (or hand-write
the exact relative path Sveltia would produce) into a real project entry, run the
Astro build, and confirm the image optimizes and renders with no unresolved-path
error. If it round-trips, Option B stands. If it cannot, fall back to **Option A**:

- Uploads go to `public/uploads/…`, frontmatter stores absolute `/uploads/…`.
- Gallery images render with a plain `<img>` (no pipeline optimization).
- Hero render, transparent print, and section images stay pipelined and
  git-managed (they need exact dimensions and manual prep anyway).

The fallback is documented so the outcome is deterministic either way.

**Media spike result (2026-07-23): Option B confirmed.** A gallery item whose
`src` is the exact relative string Sveltia's `public_folder`
(`../../assets/projects/{{slug}}/…`) produces was added to a real entry and the
Astro build resolved and optimized it (jpg + four `webp` variants under
`dist/_astro/`), with no unresolved-path error. The image pipeline and the
build-plate dimensions are preserved; the Option A fallback was not needed.

## Data flow

```
Edit in /admin
  → Sveltia commits the file
      (3b-i: local disk via File System Access API)
      (3b-ii: main branch via GitHub backend, token from the Worker)
  → GitHub Pages rebuilds
  → change is live (~1 min)
```

## Error handling

- Malformed `home.json` fails the build via the Zod parse (loud, not silent).
- Image-path resolution failure is caught by the spike before it can reach
  `main`; the Option A fallback removes the failure mode entirely.
- Auth failures (3b-ii) surface in the Sveltia login flow; the Worker's
  `ALLOWED_DOMAINS` prevents it authenticating an unexpected origin.

## Testing

- **Unit:** `homeContent.ts` Zod parse — valid input parses, malformed input
  throws.
- **Build:** green after `index.astro` externalization and `home.json` addition.
- **Local-backend integration (3b-i):** with Sveltia's local backend, edit a
  project (including reordering the gallery) and the home copy; confirm the
  on-disk files change as expected and a rebuild renders the changes. Verify by
  file diff and numeric/DOM checks; reserve a browser screenshot for final visual
  sign-off only.
- **Config sanity:** every `projectSchema` field has a corresponding widget in
  `config.yml` (checklist against the schema).

## Out of scope (deferred)

- Hero photo on the home page.
- Editorial / PR review workflow.
- Custom domain (`aaryandash.com`).
- New-project scaffolding wizard.
- Retrofitting image optimization onto Option A uploads (only relevant if the
  spike forces the fallback).

## Owner action checklist (3b-ii only)

1. Create a **GitHub OAuth app**; note the client ID and client secret.
2. Sign up for **Cloudflare** (free Workers tier).
3. From `workers/cms-auth/`: `npx wrangler login`, set the two secrets
   (`wrangler secret put GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET`),
   `npx wrangler deploy`.
4. Copy the Worker URL. Set the GitHub OAuth app **Authorization callback URL**
   to `https://<worker>.<subdomain>.workers.dev/callback`.
5. Put the Worker base URL into `config.yml` `backend.base_url`.

Exact commands and values are provided when 3b-ii is reached.
