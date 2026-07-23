import { describe, it, expect } from 'vitest';
import { emptyBayCount, totalLayers, printState } from './buildPlate';

describe('emptyBayCount', () => {
  it('fills up to the default target of 4', () => {
    expect(emptyBayCount(1)).toBe(3);
  });

  it('is zero once the target is met', () => {
    expect(emptyBayCount(4)).toBe(0);
  });

  it('never goes negative past the target', () => {
    expect(emptyBayCount(6)).toBe(0);
  });

  it('respects a custom target', () => {
    expect(emptyBayCount(1, 2)).toBe(1);
  });
});

describe('totalLayers', () => {
  it('computes the biofilter at 25mm / 0.2mm as 125 layers', () => {
    expect(totalLayers(25, 0.2)).toBe(125);
  });

  it('rounds a partial top layer up', () => {
    expect(totalLayers(25, 0.3)).toBe(84);
  });

  it('throws on a non-positive layer height', () => {
    expect(() => totalLayers(25, 0)).toThrow(/positive/);
  });
});

describe('printState', () => {
  it('starts fully clipped at progress 0', () => {
    expect(printState(0, 125)).toEqual({ clipTop: 100, layer: 0, done: false });
  });

  it('is fully revealed and done at progress 1', () => {
    expect(printState(1, 125)).toEqual({ clipTop: 0, layer: 125, done: true });
  });

  it('is half revealed at the midpoint', () => {
    const s = printState(0.5, 125);
    expect(s.clipTop).toBeCloseTo(50, 5);
    expect(s.layer).toBe(63);
    expect(s.done).toBe(false);
  });

  it('clamps progress above 1', () => {
    expect(printState(1.5, 125).done).toBe(true);
    expect(printState(1.5, 125).clipTop).toBe(0);
  });

  it('clamps progress below 0', () => {
    expect(printState(-0.3, 125).clipTop).toBe(100);
    expect(printState(-0.3, 125).layer).toBe(0);
  });
});
