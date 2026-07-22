export interface Sheet {
  /** Sheet number in the drawing set, zero-indexed. */
  n: number;
  /** Nav label. Deliberately literal — see the spec. */
  label: string;
  /** Root-relative path, before the base path is applied. */
  path: string;
  /**
   * Whether the page exists yet. The full drawing set is declared up front so
   * sheet numbering stays stable across phases, but the nav must never link to
   * a page that has not been built — that ships 404s to visitors.
   * Flip to true in the phase that creates the page.
   */
  built: boolean;
}

export const SHEETS: readonly Sheet[] = [
  { n: 0, label: 'Home', path: '/', built: true },
  { n: 1, label: 'Projects', path: '/projects', built: true },
  { n: 2, label: 'About', path: '/about', built: false },
  { n: 3, label: 'Personal Interests', path: '/interests', built: false },
] as const;

/** The sheets the nav is allowed to link to. */
export function builtSheets(): readonly Sheet[] {
  return SHEETS.filter((sheet) => sheet.built);
}

export function sheetNumber(n: number): string {
  return String(n).padStart(2, '0');
}

export function sheetLabel(n: number, total: number): string {
  return `SHEET ${sheetNumber(n)} OF ${sheetNumber(total)}`;
}

/**
 * Resolve a pathname to the sheet it belongs to. Detail pages such as
 * /projects/intake-wedges resolve to their parent sheet.
 */
export function activeSheet(pathname: string): Sheet | undefined {
  const clean = pathname.length > 1 && pathname.endsWith('/')
    ? pathname.slice(0, -1)
    : pathname;

  if (clean === '/') {
    return SHEETS.find((sheet) => sheet.path === '/');
  }

  return SHEETS
    .filter((sheet) => sheet.path !== '/')
    .find((sheet) => clean === sheet.path || clean.startsWith(`${sheet.path}/`));
}
