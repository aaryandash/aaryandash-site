/** Per-row horizontal spans of a transparent image's opaque silhouette, so the
    print head can sweep only across the object at each height instead of the
    whole bed. Framework-agnostic and unit-tested; the reading of pixels from a
    canvas lives in the component. */

/** [xMin, xMax] as 0..1 fractions of the image width, or null for an empty row. */
export type RowSpan = [xMin: number, xMax: number] | null;

/** Sample `sampleRows` evenly spaced rows (top→bottom) of an RGBA bitmap and
    return, for each, the [xMin,xMax] fraction spanning pixels whose alpha is
    greater than `alphaThreshold`, or null when the row has none. */
export function rowSpans(
  data: Uint8ClampedArray | number[],
  width: number,
  height: number,
  sampleRows = 120,
  alphaThreshold = 8,
): RowSpan[] {
  if (width <= 0 || height <= 0) return [];
  const rows = Math.max(1, Math.min(sampleRows, height));
  const xDen = width > 1 ? width - 1 : 1;
  const out: RowSpan[] = [];
  for (let r = 0; r < rows; r++) {
    const y = rows > 1 ? Math.round((r / (rows - 1)) * (height - 1)) : 0;
    const base = y * width * 4;
    let xMin = -1;
    let xMax = -1;
    for (let x = 0; x < width; x++) {
      if (data[base + x * 4 + 3] > alphaThreshold) {
        if (xMin < 0) xMin = x;
        xMax = x;
      }
    }
    out.push(
      xMin < 0
        ? null
        : width > 1
          ? [xMin / xDen, xMax / xDen]
          : [0.5, 0.5],
    );
  }
  return out;
}

/** Span nearest a normalized y (0=top, 1=bottom). Falls back to the nearest
    non-empty row, and to the full width [0,1] when the silhouette is empty —
    so a part with no transparent image simply sweeps the whole frame. */
export function spanAtY(spans: RowSpan[], yFrac: number): [number, number] {
  const FULL: [number, number] = [0, 1];
  if (spans.length === 0) return FULL;
  const p = Math.min(1, Math.max(0, yFrac));
  const idx = Math.round(p * (spans.length - 1));
  if (spans[idx]) return spans[idx] as [number, number];
  for (let d = 1; d < spans.length; d++) {
    if (spans[idx - d]) return spans[idx - d] as [number, number];
    if (spans[idx + d]) return spans[idx + d] as [number, number];
  }
  return FULL;
}
