// Minimal CSV reader/writer for the client import (quoted fields, "" escapes, CRLF line endings).

export function parseCsv(text) {
  const records = [];
  let record = [];
  let field = '';
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ',') {
      record.push(field);
      field = '';
    } else if (char === '\n') {
      record.push(field.replace(/\r$/, ''));
      records.push(record);
      record = [];
      field = '';
    } else {
      field += char;
    }
  }
  if (field || record.length) {
    record.push(field);
    records.push(record);
  }

  const [header, ...rows] = records.filter((r) => r.length > 1);
  const keys = header.map((key) => key.replace(/^﻿/, '').trim());
  return rows.map((row) => Object.fromEntries(keys.map((key, i) => [key, row[i] ?? ''])));
}

// Semicolon-separated with a BOM, so Excel with local (BiH) settings opens it with UTF-8 characters intact.
export function toCsv(rows, columns) {
  const escape = (value) => {
    const text = value === null || value === undefined ? '' : String(value);
    return /[";\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const lines = [columns.join(';'), ...rows.map((row) => columns.map((column) => escape(row[column])).join(';'))];
  return `﻿${lines.join('\r\n')}\r\n`;
}
