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
