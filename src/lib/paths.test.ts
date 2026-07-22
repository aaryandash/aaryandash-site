import { describe, it, expect } from 'vitest';
import { joinBase } from './paths';

describe('joinBase', () => {
  it('returns root when base and path are both root', () => {
    expect(joinBase('/', '/')).toBe('/');
  });

  it('joins a path onto a root base', () => {
    expect(joinBase('/', '/projects')).toBe('/projects');
  });

  it('joins a path onto a subpath base', () => {
    expect(joinBase('/aaryandash-site/', '/projects')).toBe('/aaryandash-site/projects');
  });

  it('handles a base without a trailing slash', () => {
    expect(joinBase('/aaryandash-site', '/projects')).toBe('/aaryandash-site/projects');
  });

  it('handles a path without a leading slash', () => {
    expect(joinBase('/aaryandash-site/', 'projects')).toBe('/aaryandash-site/projects');
  });

  it('never produces a double slash', () => {
    expect(joinBase('/base/', '/a/b')).toBe('/base/a/b');
    expect(joinBase('/', '/a')).not.toContain('//');
  });

  it('returns the base itself for a root path under a subpath base', () => {
    expect(joinBase('/aaryandash-site/', '/')).toBe('/aaryandash-site/');
  });
});
