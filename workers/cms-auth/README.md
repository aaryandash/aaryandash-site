# CMS Auth Worker (Phase 3b-ii)

OAuth relay that lets the Sveltia CMS at `/admin` sign in with GitHub and commit
to this repo. GitHub Pages can't run the token exchange, so this Cloudflare
Worker does it. Source is the official
[`sveltia-cms-auth`](https://github.com/sveltia/sveltia-cms-auth) worker,
committed verbatim.

## One-time setup (owner)

### 1. Create a GitHub OAuth app
- GitHub → Settings → Developer settings → **OAuth Apps** → **New OAuth App**.
- **Application name:** anything (e.g. `aaryandash-site CMS`).
- **Homepage URL:** `https://aaryandash.github.io/aaryandash-site/`
- **Authorization callback URL:** set a placeholder for now
  (`https://example.com/callback`); you'll replace it in step 3 with the real
  Worker URL.
- Register, then note the **Client ID** and generate a **Client secret**.

### 2. Deploy the Worker
From this directory (`workers/cms-auth/`):

```bash
npx wrangler login              # opens the browser, authorize Cloudflare
npx wrangler secret put GITHUB_CLIENT_ID       # paste the Client ID
npx wrangler secret put GITHUB_CLIENT_SECRET   # paste the Client secret
npx wrangler deploy
```

`deploy` prints the Worker URL:
`https://aaryandash-cms-auth.<your-subdomain>.workers.dev`

### 3. Finish wiring
- In the **GitHub OAuth app**, set **Authorization callback URL** to
  `https://aaryandash-cms-auth.<your-subdomain>.workers.dev/callback`
- In `public/admin/config.yml`, set `backend.base_url` to
  `https://aaryandash-cms-auth.<your-subdomain>.workers.dev`
  (Claude does this once you paste the URL.)
- Commit + push. After the Pages deploy, open
  `https://aaryandash.github.io/aaryandash-site/admin/` → **Sign In with GitHub**.

## Config
- `ALLOWED_DOMAINS` (in `wrangler.toml`) — origins allowed to complete the flow.
  Add `aaryandash.com` here when the custom domain goes live.
- Secrets (`GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`) live only in Cloudflare,
  never in the repo.

## Local editing needs none of this
Running `astro dev` and opening `/admin/index.html` → **Work with Local
Repository** edits files on disk with no auth. The Worker is only for editing the
live site from a browser.
