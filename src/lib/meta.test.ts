import { describe, it, expect } from 'vitest';
import { SITE_NAME, pageTitle, canonicalUrl } from './meta';

describe('pageTitle', () => {
  it('returns the bare site name when no page title is given', () => {
    expect(pageTitle()).toBe(SITE_NAME);
  });

  it('suffixes the site name for a page title', () => {
    expect(pageTitle('Intake Wedges')).toBe(`Intake Wedges · ${SITE_NAME}`);
  });

  it('does not double up when the title is already the site name', () => {
    expect(pageTitle(SITE_NAME)).toBe(SITE_NAME);
  });
});

describe('canonicalUrl', () => {
  it('builds an absolute URL from site, base and path', () => {
    expect(canonicalUrl('https://example.com', '/', '/projects'))
      .toBe('https://example.com/projects');
  });

  it('includes a subpath base', () => {
    expect(canonicalUrl('https://example.com', '/site/', '/projects'))
      .toBe('https://example.com/site/projects');
  });

  it('strips a trailing slash on the site origin', () => {
    expect(canonicalUrl('https://example.com/', '/', '/projects'))
      .toBe('https://example.com/projects');
  });

  it('handles the root path', () => {
    expect(canonicalUrl('https://example.com', '/', '/'))
      .toBe('https://example.com/');
  });

  it('never emits a double slash in the path portion', () => {
    const url = canonicalUrl('https://example.com/', '/site/', '/a');
    expect(url.slice('https://'.length)).not.toContain('//');
  });
});
