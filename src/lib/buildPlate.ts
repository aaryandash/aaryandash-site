/** Framework-agnostic logic for the build plate. Unit-tested; the React
    components stay thin and call into these. */

/** How many empty `NOT ISSUED` bays to show so the bin reads as a bench
    with open slots rather than a lonely single card. */
export function emptyBayCount(realCount: number, target = 4): number {
  return Math.max(0, target - realCount);
}

/** Layer count for an honest `LAYER n/total` readout. */
export function totalLayers(heightMm: number, layerHeightMm: number): number {
  if (layerHeightMm <= 0) throw new Error('layerHeightMm must be positive');
  return Math.ceil(heightMm / layerHeightMm);
}

export interface PrintFrame {
  /** clip-path inset from the top, in percent: 100 = nothing shown, 0 = full. */
  clipTop: number;
  /** current layer number, 0..layers. */
  layer: number;
  done: boolean;
}

/** Map a 0..1 progress value to a render frame. Progress is clamped. */
export function printState(progress: number, layers: number): PrintFrame {
  const p = Math.min(1, Math.max(0, progress));
  return {
    clipTop: (1 - p) * 100,
    layer: Math.round(p * layers),
    done: p >= 1,
  };
}

/** Horizontal position (0..1) of the sweeping print head as a triangle wave:
    0 at the left, 1 at the right at the half period, back to 0 at the full
    period. `elapsedMs` is time since the print started. */
export function toolheadSweep(elapsedMs: number, periodMs = 400): number {
  if (periodMs <= 0) throw new Error('periodMs must be positive');
  const phase = ((elapsedMs % periodMs) + periodMs) % periodMs / periodMs; // 0..1
  return phase < 0.5 ? phase * 2 : 2 - phase * 2;
}
