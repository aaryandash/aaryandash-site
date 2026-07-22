import { describe, it, expect } from 'vitest';
import { color, font, space } from './tokens';
import { contrastRatio } from './contrast';

describe('colour tokens meet WCAG AA on the dark canvas', () => {
  it('body text clears 4.5:1', () => {
    expect(contrastRatio(color.text, color.canvas)).toBeGreaterThanOrEqual(4.5);
  });

  it('muted text clears 4.5:1', () => {
    expect(contrastRatio(color.textMuted, color.canvas)).toBeGreaterThanOrEqual(4.5);
  });

  it('accent clears 4.5:1 — it is used for annotation text, not just decoration', () => {
    expect(contrastRatio(color.accent, color.canvas)).toBeGreaterThanOrEqual(4.5);
  });

  it('underdefined blue clears 4.5:1', () => {
    expect(contrastRatio(color.underdefined, color.canvas)).toBeGreaterThanOrEqual(4.5);
  });

  it('meaningful borders clear the 3:1 non-text threshold', () => {
    expect(contrastRatio(color.lineBright, color.canvas)).toBeGreaterThanOrEqual(3);
  });
});

describe('the decorative grid stays quiet', () => {
  it('grid line contrast is under 2:1 so it reads as substrate, not content', () => {
    expect(contrastRatio(color.line, color.canvas)).toBeLessThan(2);
  });
});

describe('token shape', () => {
  it('every colour is a valid six-digit hex', () => {
    for (const value of Object.values(color)) {
      expect(value).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  it('exposes the font stacks used by the drawing system', () => {
    expect(font.mono).toContain('IBM Plex Mono');
    expect(font.sans).toContain('IBM Plex Sans');
  });

  it('space scale is ascending', () => {
    const values = Object.values(space).map((v) => parseFloat(v));
    const sorted = [...values].sort((a, b) => a - b);
    expect(values).toEqual(sorted);
  });
});
