import { describe, it, expect } from 'vitest';
import { SHEETS, builtSheets, sheetNumber, sheetLabel, activeSheet } from './sheets';

describe('sheetNumber', () => {
  it('zero-pads to two digits', () => {
    expect(sheetNumber(0)).toBe('00');
    expect(sheetNumber(3)).toBe('03');
  });

  it('leaves two-digit numbers alone', () => {
    expect(sheetNumber(12)).toBe('12');
  });
});

describe('sheetLabel', () => {
  it('formats as a drawing sheet reference', () => {
    expect(sheetLabel(1, 4)).toBe('SHEET 01 OF 04');
  });
});

describe('SHEETS', () => {
  it('uses the literal Personal Interests label, not a clever synonym', () => {
    const labels = SHEETS.map((s) => s.label);
    expect(labels).toContain('Personal Interests');
  });

  it('numbers sheets consecutively from zero', () => {
    SHEETS.forEach((sheet, index) => {
      expect(sheet.n).toBe(index);
    });
  });

  it('gives every sheet a root-relative path', () => {
    for (const sheet of SHEETS) {
      expect(sheet.path.startsWith('/')).toBe(true);
    }
  });
});

describe('builtSheets', () => {
  it('excludes sheets whose pages do not exist yet', () => {
    const paths = builtSheets().map((s) => s.path);
    expect(paths).not.toContain('/interests');
  });

  it('includes the sheets Phase 1 actually ships', () => {
    const paths = builtSheets().map((s) => s.path);
    expect(paths).toContain('/');
    expect(paths).toContain('/projects');
  });

  it('never links to a sheet marked unbuilt', () => {
    for (const sheet of builtSheets()) {
      expect(sheet.built).toBe(true);
    }
  });
});

describe('activeSheet', () => {
  it('matches the home sheet exactly', () => {
    expect(activeSheet('/')?.label).toBe('Home');
  });

  it('does not match home for a deeper path', () => {
    expect(activeSheet('/projects')?.label).toBe('Projects');
  });

  it('matches a project detail page to its parent sheet', () => {
    expect(activeSheet('/projects/intake-wedges')?.label).toBe('Projects');
  });

  it('tolerates a trailing slash', () => {
    expect(activeSheet('/projects/')?.label).toBe('Projects');
  });

  it('returns undefined for an unknown path', () => {
    expect(activeSheet('/nowhere')).toBeUndefined();
  });
});
