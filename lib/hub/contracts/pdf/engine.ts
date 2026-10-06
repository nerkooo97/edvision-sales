// Drawing primitives for filling the contract templates: the template PDF stays as it is, a patch covers
// a placeholder with white and writes the real text in the same spot. Coordinates are PDF points with the
// origin at the bottom left, the same ones the placeholders were measured at (see ./specs).

import { PDFDocument, rgb, type PDFFont, type PDFPage } from 'pdf-lib';

export interface Segment {
  text: string;
  bold?: boolean;
}

export interface EraseBox {
  x: number;
  width: number;
  /** Baseline of the placeholder text; the box reaches a bit below and above it. */
  baseline: number;
}

export interface TextRun {
  x: number;
  baseline: number;
  segments: Segment[];
  /** The text is scaled down (never up) to fit this width, but not below MIN_FONT_SIZE. */
  maxWidth: number;
  align?: 'left' | 'center';
}

/** A placeholder to cover and, when there is text for it, what to write instead. */
export interface Patch {
  /** 0-based page index. */
  page: number;
  erase: EraseBox[];
  run?: TextRun;
}

/**
 * One weight of the font. The font comes in two files, plain Latin and Latin Extended (č, ć, š, đ, ž...),
 * so a text is split into pieces and each piece is written with the file that has its letters.
 */
export interface FontFace {
  latin: PDFFont;
  extended: PDFFont;
  /** Code points the plain Latin file can draw; everything else goes to the extended one. */
  latinCharacters: Set<number>;
}

export interface Fonts {
  regular: FontFace;
  bold: FontFace;
}

export interface DrawResult {
  /** Texts that did not fit even at the smallest size; the PDF is still made, the caller may warn. */
  overflow: string[];
}

export const FONT_SIZE = 10;
export const MIN_FONT_SIZE = 7.5;

// The box starts below the descenders (underscores hang under the baseline) and stops under the cell border above.
const ERASE_BELOW = 3.2;
const ERASE_ABOVE = 8.4;
const ERASE_PADDING_X = 0.6;
const WHITE = rgb(1, 1, 1);
const INK = rgb(0, 0, 0);

export function makeFontFace(latin: PDFFont, extended: PDFFont): FontFace {
  return { latin, extended, latinCharacters: new Set(latin.getCharacterSet()) };
}

interface Piece {
  font: PDFFont;
  text: string;
}

/** Splits a text into pieces that each belong to one font file; characters in neither file become "?". */
function pieces(face: FontFace, text: string): Piece[] {
  const extendedCharacters = new Set(face.extended.getCharacterSet());
  const result: Piece[] = [];
  for (const char of text) {
    const code = char.codePointAt(0) as number;
    let font = face.latin;
    let value = char;
    if (!face.latinCharacters.has(code)) {
      if (extendedCharacters.has(code)) font = face.extended;
      else value = '?';
    }
    const last = result[result.length - 1];
    if (last && last.font === font) last.text += value;
    else result.push({ font, text: value });
  }
  return result;
}

export function textWidth(face: FontFace, text: string, size: number): number {
  return pieces(face, text).reduce((sum, piece) => sum + piece.font.widthOfTextAtSize(piece.text, size), 0);
}

const faceOf = (fonts: Fonts, segment: Segment) => (segment.bold ? fonts.bold : fonts.regular);

function measure(segments: Segment[], size: number, fonts: Fonts): number {
  return segments.reduce((sum, segment) => sum + textWidth(faceOf(fonts, segment), segment.text, size), 0);
}

function erase(page: PDFPage, box: EraseBox) {
  page.drawRectangle({
    x: box.x - ERASE_PADDING_X,
    y: box.baseline - ERASE_BELOW,
    width: box.width + ERASE_PADDING_X * 2,
    height: ERASE_BELOW + ERASE_ABOVE,
    color: WHITE,
    borderWidth: 0,
  });
}

function drawRun(page: PDFPage, run: TextRun, fonts: Fonts, result: DrawResult) {
  const natural = measure(run.segments, FONT_SIZE, fonts);
  let size = natural > run.maxWidth ? Math.max(MIN_FONT_SIZE, (FONT_SIZE * run.maxWidth) / natural) : FONT_SIZE;
  if (measure(run.segments, size, fonts) > run.maxWidth + 0.01) {
    result.overflow.push(run.segments.map((segment) => segment.text).join(''));
    size = MIN_FONT_SIZE;
  }

  let x = run.align === 'center' ? run.x - measure(run.segments, size, fonts) / 2 : run.x;
  for (const segment of run.segments) {
    for (const piece of pieces(faceOf(fonts, segment), segment.text)) {
      page.drawText(piece.text, { x, y: run.baseline, size, font: piece.font, color: INK });
      x += piece.font.widthOfTextAtSize(piece.text, size);
    }
  }
}

/** Applies every patch to the document; the patches of one page are drawn in the order given. */
export function applyPatches(doc: PDFDocument, patches: Patch[], fonts: Fonts): DrawResult {
  const result: DrawResult = { overflow: [] };
  const pages = doc.getPages();

  for (const patch of patches) {
    const page = pages[patch.page];
    if (!page) throw new Error(`Template has no page ${patch.page + 1}`);
    for (const box of patch.erase) erase(page, box);
    if (patch.run) drawRun(page, patch.run, fonts, result);
  }
  return result;
}

/** A cross over an unchecked box (the template draws "☐"; a cross turns it into "☒"). */
export function drawBoxCross(page: PDFPage, x: number, baseline: number) {
  const left = x + 1.3;
  const right = x + 8.1;
  const bottom = baseline - 0.4;
  const top = baseline + 6.4;
  const options = { thickness: 0.7, color: INK };
  page.drawLine({ start: { x: left, y: bottom }, end: { x: right, y: top }, ...options });
  page.drawLine({ start: { x: left, y: top }, end: { x: right, y: bottom }, ...options });
}
