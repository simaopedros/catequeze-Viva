/**
 * CSV formula injection prevention and export helpers.
 * Escape cells that Excel/LibreOffice would interpret as formulas.
 */

const FORMULA_PREFIX = /^[=+\-@\t\r]/;

export function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  let str = String(value);
  if (FORMULA_PREFIX.test(str)) {
    str = `'${str}`;
  }
  // Escape quotes for CSV
  if (/[",\n\r]/.test(str)) {
    str = `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function toCsvRow(values: unknown[]): string {
  return values.map(escapeCsvCell).join(',');
}

export const MAX_CSV_IMPORT_ROWS = 2000;
export const MAX_CSV_IMPORT_CHARS = 1_500_000;
