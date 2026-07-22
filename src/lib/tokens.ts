/**
 * Design tokens — the single source of truth for the drawing-set system.
 * CSS custom properties in global.css are generated from these names by hand;
 * keep them in sync.
 */

export const color = {
  /** Page background — near-black, not pure black. */
  canvas: '#0B0D0F',
  /** Raised surfaces: spec tables, cards. */
  surface: '#12161A',
  /**
   * Decorative graph-paper grid. Quiet, but it must actually render — at
   * devicePixelRatio 1 a sub-pixel line of a near-canvas colour antialiases
   * away to nothing. 1.63:1 against the canvas: visible, still substrate.
   */
  line: '#2F383F',
  /** Meaningful borders and dividers. Clears 3:1. */
  lineBright: '#55636D',
  /** Primary body text. */
  text: '#E6EDF3',
  /** Secondary text, annotations, captions. */
  textMuted: '#9AA7B2',
  /**
   * The dimmest colour still legal for text — sheet numbers, de-emphasised
   * annotation. Do NOT reach for `lineBright` here: it is verified for
   * borders at 3:1 and fails the 4.5:1 text threshold.
   */
  textDim: '#778590',
  /** Active or critical annotation. One per viewport, maximum. */
  accent: '#FF6B1A',
  /** Unresolved and inactive states — the underdefined-sketch blue. */
  underdefined: '#4C8DFF',
} as const;

/** Named `font`, not `type` — `type` collides with TypeScript's
    `import { type X }` syntax and produces confusing parse errors. */
export const font = {
  mono: "'IBM Plex Mono', ui-monospace, SFMono-Regular, Menlo, monospace",
  sans: "'IBM Plex Sans Variable', 'IBM Plex Sans', system-ui, sans-serif",
} as const;

export const space = {
  xs: '0.25rem',
  sm: '0.5rem',
  md: '1rem',
  lg: '2rem',
  xl: '4rem',
  xxl: '8rem',
} as const;

/** Hairline widths. The drawing look depends on these staying genuinely thin. */
export const stroke = {
  hair: '0.5px',
  thin: '1px',
  medium: '2px',
} as const;
