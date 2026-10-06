// Minimal .xlsx reader for the contract import, with no dependencies: an .xlsx file is a ZIP archive of
// XML parts. Reads cell values (shared strings, numbers, cached formula results) and each cell's fill
// colour, which the source spreadsheet uses to mark rows.

import { readFileSync } from 'node:fs';
import { inflateRawSync } from 'node:zlib';

function unzip(buffer) {
  // The end-of-central-directory record sits in the last 64 KB; it points at the central directory.
  let eocd = buffer.length - 22;
  while (eocd >= 0 && buffer.readUInt32LE(eocd) !== 0x06054b50) eocd--;
  if (eocd < 0) throw new Error('Not a ZIP/XLSX file');

  const entries = new Map();
  let offset = buffer.readUInt32LE(eocd + 16);
  const count = buffer.readUInt16LE(eocd + 10);
  for (let i = 0; i < count; i++) {
    const method = buffer.readUInt16LE(offset + 10);
    const compressedSize = buffer.readUInt32LE(offset + 20);
    const nameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const localHeader = buffer.readUInt32LE(offset + 42);
    const name = buffer.toString('utf8', offset + 46, offset + 46 + nameLength);

    const dataStart = localHeader + 30 + buffer.readUInt16LE(localHeader + 26) + buffer.readUInt16LE(localHeader + 28);
    const data = buffer.subarray(dataStart, dataStart + compressedSize);
    entries.set(name, () => (method === 8 ? inflateRawSync(data) : data).toString('utf8'));
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

const decode = (text) =>
  text.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');

function readFills(stylesXml) {
  const fills = [...stylesXml.match(/<fills[\s\S]*?<\/fills>/)[0].matchAll(/<fill>([\s\S]*?)<\/fill>/g)].map(
    (match) => /fgColor rgb="(\w+)"/.exec(match[1])?.[1] ?? null
  );
  const cellStyles = stylesXml.match(/<cellXfs[\s\S]*?<\/cellXfs>/)[0];
  return [...cellStyles.matchAll(/<xf ([^>]*)/g)].map((match) => fills[Number(/fillId="(\d+)"/.exec(match[1])?.[1] ?? 0)]);
}

/** Excel day number (1900 date system) -> "YYYY-MM-DD". */
export function excelDate(serial) {
  const date = new Date(Date.UTC(1899, 11, 30) + Number(serial) * 86_400_000);
  return date.toISOString().slice(0, 10);
}

/**
 * Reads every sheet: { [sheetName]: rows }, each row { number, cells: { A: { value, fill } } }.
 * Formula cells give their cached result, exactly what Excel last showed.
 */
export function readWorkbook(file) {
  const parts = unzip(readFileSync(file));
  const read = (name) => parts.get(name)?.() ?? '';

  const sharedStrings = [...read('xl/sharedStrings.xml').matchAll(/<si>([\s\S]*?)<\/si>/g)].map((match) =>
    decode([...match[1].matchAll(/<t[^>]*>([^<]*)<\/t>/g)].map((text) => text[1]).join(''))
  );
  const fillOfStyle = readFills(read('xl/styles.xml'));

  const relations = new Map(
    [...read('xl/_rels/workbook.xml.rels').matchAll(/<Relationship [^>]*Id="(\w+)"[^>]*Target="([^"]+)"/g)].map((m) => [m[1], m[2]])
  );
  const sheets = {};
  for (const sheet of read('xl/workbook.xml').matchAll(/<sheet [^>]*name="([^"]+)"[^>]*r:id="(\w+)"/g)) {
    const xml = read(`xl/${relations.get(sheet[2]).replace(/^\/?xl\//, '')}`);
    sheets[decode(sheet[1])] = [...xml.matchAll(/<row [^>]*r="(\d+)"[^>]*>([\s\S]*?)<\/row>/g)].map((row) => {
      const cells = {};
      for (const cell of row[2].matchAll(/<c r="([A-Z]+)\d+"([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
        const type = /t="(\w+)"/.exec(cell[2])?.[1];
        const style = Number(/s="(\d+)"/.exec(cell[2])?.[1] ?? 0);
        const raw = /<v>([^<]*)<\/v>/.exec(cell[3] ?? '')?.[1];
        const inline = /<is>[\s\S]*?<t[^>]*>([^<]*)<\/t>/.exec(cell[3] ?? '')?.[1];
        let value = null;
        if (type === 's') value = sharedStrings[Number(raw)];
        else if (type === 'inlineStr') value = decode(inline ?? '');
        else if (raw !== undefined) value = type === 'str' ? decode(raw) : Number(raw);
        cells[cell[1]] = { value: typeof value === 'string' ? value.trim() || null : value, fill: fillOfStyle[style] };
      }
      return { number: Number(row[1]), cells };
    });
  }
  return sheets;
}
