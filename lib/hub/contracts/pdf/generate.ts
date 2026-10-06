// Fills a contract template: the template PDF is loaded as it is, the placeholders are covered and the
// real text is written over them (see ./engine and ./specs). Pure with respect to I/O: the caller
// provides the bytes of the template and the fonts, so the same code runs in the browser and in tests.

import fontkit from '@pdf-lib/fontkit';
import { PDFDocument } from 'pdf-lib';
import type { ContractTemplateId, ContractValues } from '../types';
import { applyPatches, drawBoxCross, FONT_SIZE, makeFontFace, textWidth, type Fonts } from './engine';
import { buildSpec } from './specs';

type Bytes = Uint8Array | ArrayBuffer;

export interface FontFiles {
  latin: Bytes;
  extended: Bytes;
}

export interface PdfAssets {
  templateBytes: Bytes;
  regular: FontFiles;
  bold: FontFiles;
}

export interface GeneratedContract {
  bytes: Uint8Array;
  /** Texts that had to be set smaller than the template's own size and still did not fit. */
  overflow: string[];
}

async function embedFace(doc: PDFDocument, files: FontFiles) {
  const [latin, extended] = await Promise.all([
    doc.embedFont(files.latin, { subset: true }),
    doc.embedFont(files.extended, { subset: true }),
  ]);
  return makeFontFace(latin, extended);
}

export async function buildContractPdf(
  templateId: ContractTemplateId,
  values: ContractValues,
  assets: PdfAssets
): Promise<GeneratedContract> {
  const doc = await PDFDocument.load(assets.templateBytes);
  doc.registerFontkit(fontkit);
  const fonts: Fonts = {
    regular: await embedFace(doc, assets.regular),
    bold: await embedFace(doc, assets.bold),
  };

  const spec = buildSpec(templateId, {
    values,
    textWidth: (text, bold) => textWidth(bold ? fonts.bold : fonts.regular, text, FONT_SIZE),
  });

  const { overflow } = applyPatches(doc, spec.patches, fonts);
  const pages = doc.getPages();
  for (const cross of spec.crosses) drawBoxCross(pages[cross.page], cross.x, cross.baseline);

  return { bytes: await doc.save(), overflow };
}
