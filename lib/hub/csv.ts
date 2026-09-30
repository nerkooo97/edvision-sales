// CSV built for Excel in a Bosnian locale: semicolon separated, quoted, and safe against formula injection.

export type CsvCell = string | number | null | undefined;

const SEPARATOR = ';';

/**
 * A text cell that starts with = + - @ (or a control character) is executed as a formula by spreadsheet
 * programs. Project names and notes are user-typed, so such cells get a leading apostrophe.
 */
function escapeCell(cell: CsvCell): string {
  if (cell === null || cell === undefined) return '""';

  let text = String(cell);
  if (typeof cell === 'string' && /^[=+\-@\t\r]/.test(text)) text = `'${text}`;

  return `"${text.replace(/"/g, '""')}"`;
}

export function toCsv(headers: string[], rows: CsvCell[][]): string {
  return [headers, ...rows].map((row) => row.map(escapeCell).join(SEPARATOR)).join('\r\n');
}
