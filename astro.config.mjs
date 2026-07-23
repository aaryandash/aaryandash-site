import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

import react from '@astrojs/react';

const SITE = process.env.PUBLIC_SITE_URL ?? 'http://localhost:4321';
const BASE = process.env.PUBLIC_BASE_PATH ?? '/';

export default defineConfig({
  site: SITE,
  base: BASE,
  trailingSlash: 'ignore',
  integrations: [mdx(), sitemap(), react()],
  build: { format: 'directory' },
});