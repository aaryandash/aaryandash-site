import { describe, it, expect } from 'vitest';
import { rowSpans, spanAtY, type RowSpan } from './silhouette';

/** Build an RGBA buffer from a grid of alpha values (rows top→bottom). */
function fromAlpha(grid: number[][]): {
  data: Uint8ClampedArray;
  width: number;
  height: number;
} {
  const height = grid.length;
  const width = grid[0].length;
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      data[(y * width + x) * 4 + 3] = grid[y][x];
    }
  }
  return { data, width, height };
}

describe('rowSpans', () => {
  it('spans the full width for a fully opaque image', () => {
    const { data, width, height } = fromAlpha([
      [255, 255, 255, 255],
      [255, 255, 255, 255],
    ]);
    expect(rowSpans(data, width, height, 2)).toEqual([
      [0, 1],
      [0, 1],
    ]);
  });

  it('reports the opaque sub-span of a partially filled row', () => {
    // width 4, only x=1,2 opaque → [1/3, 2/3]
    const { data, width, height } = fromAlpha([[0, 255, 255, 0]]);
    const spans = rowSpans(data, width, height, 1);
    expect(spans[0]![0]).toBeCloseTo(1 / 3, 5);
    expect(spans[0]![1]).toBeCloseTo(2 / 3, 5);
  });

  it('returns null for a fully transparent row', () => {
    const { data, width, height } = fromAlpha([[0, 0, 0, 0]]);
    expect(rowSpans(data, width, height, 1)).toEqual([null]);
  });

  it('treats pixels at or below the alpha threshold as empty', () => {
    // default threshold 8; alpha 8 must NOT count, 9 must
    const { data, width, height } = fromAlpha([[8, 8, 9, 8]]);
    const spans = rowSpans(data, width, height, 1);
    expect(spans[0]![0]).toBeCloseTo(2 / 3, 5); // only x=2 opaque
    expect(spans[0]![1]).toBeCloseTo(2 / 3, 5);
  });

  it('samples the requested number of rows', () => {
    const { data, width, height } = fromAlpha([
      [255],
      [255],
      [255],
      [255],
    ]);
    expect(rowSpans(data, width, height, 2)).toHaveLength(2);
  });

  it('never samples more rows than the image has', () => {
    const { data, width, height } = fromAlpha([[255, 255]]);
    expect(rowSpans(data, width, height, 50)).toHaveLength(1);
  });

  it('returns an empty profile for a zero-sized image', () => {
    expect(rowSpans(new Uint8ClampedArray(0), 0, 0)).toEqual([]);
  });
});

describe('spanAtY', () => {
  const spans: RowSpan[] = [[0, 0.5], [0.2, 0.8], [0.4, 1]];

  it('indexes the top row at y=0', () => {
    expect(spanAtY(spans, 0)).toEqual([0, 0.5]);
  });

  it('indexes the bottom row at y=1', () => {
    expect(spanAtY(spans, 1)).toEqual([0.4, 1]);
  });

  it('clamps out-of-range y', () => {
    expect(spanAtY(spans, 5)).toEqual([0.4, 1]);
    expect(spanAtY(spans, -2)).toEqual([0, 0.5]);
  });

  it('falls back to the nearest non-empty row', () => {
    expect(spanAtY([null, [0.3, 0.7], null], 0)).toEqual([0.3, 0.7]);
  });

  it('falls back to the full width when the silhouette is empty', () => {
    expect(spanAtY([], 0.5)).toEqual([0, 1]);
    expect(spanAtY([null, null], 0.5)).toEqual([0, 1]);
  });
});
