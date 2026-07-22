import { joinBase } from './paths';

export const SITE_NAME = 'Aaryan Dash';
export const SITE_DESCRIPTION =
  'Mechanical engineering portfolio — CAD, FRC robotics, and design work.';

export function pageTitle(title?: string): string {
  if (!title || title === SITE_NAME) return SITE_NAME;
  return `${title} · ${SITE_NAME}`;
}

export function canonicalUrl(site: string, base: string, path: string): string {
  const origin = site.endsWith('/') ? site.slice(0, -1) : site;
  return `${origin}${joinBase(base, path)}`;
}
