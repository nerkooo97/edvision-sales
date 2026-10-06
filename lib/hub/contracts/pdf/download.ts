// Browser side of the generator: reads the template and the fonts from /public, builds the PDF and
// hands it to the browser as a download. Nothing is sent to the server and nothing is stored.

import { getContractTemplate } from '../templates';
import type { ContractTemplateId, ContractValues } from '../types';
import { buildContractPdf, type GeneratedContract } from './generate';

// Carlito (metric-compatible with the templates' Calibri), one file for plain Latin and one for Latin Extended.
const FONT_URLS = {
  regular: { latin: '/fonts/carlito/carlito-latin-400-normal.woff', extended: '/fonts/carlito/carlito-latin-ext-400-normal.woff' },
  bold: { latin: '/fonts/carlito/carlito-latin-700-normal.woff', extended: '/fonts/carlito/carlito-latin-ext-700-normal.woff' },
};

async function fetchBytes(url: string): Promise<ArrayBuffer> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Fajl nije moguće učitati: ${url}`);
  return response.arrayBuffer();
}

/** "Ugovor o održavanju - FAB d.o.o. - 12-2026.pdf", without characters a file name cannot hold. */
export function contractFileName(templateId: ContractTemplateId, values: ContractValues): string {
  const title = getContractTemplate(templateId).title.replace(':', ' -');
  const parts = [title, values.company_name, values.contract_number]
    .map((part) => (part ?? '').replace(/[\\/:*?"<>|]/g, '').trim())
    .filter(Boolean);
  return `${parts.join(' - ')}.pdf`;
}

export async function downloadContractPdf(
  templateId: ContractTemplateId,
  values: ContractValues
): Promise<GeneratedContract> {
  const template = getContractTemplate(templateId);
  const [templateBytes, regularLatin, regularExtended, boldLatin, boldExtended] = await Promise.all([
    fetchBytes(`/templates/${encodeURIComponent(template.source)}`),
    fetchBytes(FONT_URLS.regular.latin),
    fetchBytes(FONT_URLS.regular.extended),
    fetchBytes(FONT_URLS.bold.latin),
    fetchBytes(FONT_URLS.bold.extended),
  ]);

  const generated = await buildContractPdf(templateId, values, {
    templateBytes,
    regular: { latin: regularLatin, extended: regularExtended },
    bold: { latin: boldLatin, extended: boldExtended },
  });

  const blob = new Blob([generated.bytes as BlobPart], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = contractFileName(templateId, values);
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);

  return generated;
}
