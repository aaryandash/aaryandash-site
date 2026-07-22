import { describe, it, expect } from 'vitest';
import { hexToRgb, relativeLuminance, contrastRatio } from './contrast';

describe('hexToRgb', () => {
  it('parses a six-digit hex', () => {
    expect(hexToRgb('#FF6B1A')).toEqual([255, 107, 26]);
  });

  it('parses without the leading hash', () => {
    expect(hexToRgb('0B0D0F')).toEqual([11, 13, 15]);
  });

  it('expands a three-digit hex', () => {
    expect(hexToRgb('#FFF')).toEqual([255, 255, 255]);
  });

  it('throws on malformed input', () => {
    expect(() => hexToRgb('#GG0000')).toThrow(/Invalid hex colour/);
    expect(() => hexToRgb('#12345')).toThrow(/Invalid hex colour/);
  });
});

describe('relativeLuminance', () => {
  it('is 0 for black and 1 for white', () => {
    expect(relativeLuminance('#000000')).toBeCloseTo(0, 5);
    expect(relativeLuminance('#FFFFFF')).toBeCloseTo(1, 5);
  });
});

describe('contrastRatio', () => {
  it('gives 21 for black against white', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 2);
  });

  it('gives 1 for a colour against itself', () => {
    expect(contrastRatio('#FF6B1A', '#FF6B1A')).toBeCloseTo(1, 5);
  });

  it('is symmetric in its arguments', () => {
    const a = contrastRatio('#0B0D0F', '#E6EDF3');
    const b = contrastRatio('#E6EDF3', '#0B0D0F');
    expect(a).toBeCloseTo(b, 10);
  });
});
