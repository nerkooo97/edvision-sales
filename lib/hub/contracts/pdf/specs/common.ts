// The parts every contract shares: the line with the number and date, the "Naručilac" column of the party
// table and the signature block. Only the vertical positions differ between the templates.

import { formatDay } from '../../compute';
import type { Patch } from '../engine';
import { at, bold, cell, joinFilled, text, type SpecContext, value } from './helpers';

export interface CommonLayout {
  /** Baseline of the "Broj: ... zaključen u ..." line. */
  header: number;
  /** Baselines of the Naručilac cells; `seatLines` are the two lines used when the address is long. */
  name: number;
  seat: number;
  seatLines: [number, number];
  id: number;
  vat: number;
  representative: number;
  contact: number;
  email: number;
  bank: number;
  /** Baselines of "naziv Naručioca" and "ime i prezime, funkcija" in the signature block (page 4). */
  signatureName: number;
  signatureRepresentative: number;
}

const CLIENT_COLUMN_X = 342.7;
const CLIENT_COLUMN_WIDTH = 195;
const PAGE_CENTER = 297.66;
const SIGNATURE_CENTER = 416.55;

const HEADER_ERASE = { x: 180, width: 236 };
const SIGNATURE_NAME_PLACEHOLDER = at(384.1, 65.2);
const SIGNATURE_REPRESENTATIVE_PLACEHOLDER = at(370.9, 91.3);
const LAST_PAGE = 3;

export function commonPatches({ values, textWidth }: SpecContext, layout: CommonLayout): Patch[] {
  const representative = joinFilled([value(values, 'representative'), value(values, 'representative_role')]);
  const address = value(values, 'address');
  const place = joinFilled([value(values, 'postal_code'), value(values, 'city')], ' ');
  const seat = joinFilled([address, place]);
  const twoLines = textWidth(seat) > CLIENT_COLUMN_WIDTH;

  const clientCell = (baseline: number, placeholder: ReturnType<typeof at>, content: string, isBold = false) =>
    cell(0, CLIENT_COLUMN_X, baseline, [placeholder], content ? [isBold ? bold(content) : text(content)] : null, CLIENT_COLUMN_WIDTH);

  const patches: Patch[] = [
    {
      page: 0,
      erase: [{ ...HEADER_ERASE, baseline: layout.header }],
      run: {
        x: PAGE_CENTER,
        baseline: layout.header,
        align: 'center',
        maxWidth: 400,
        segments: [
          text('Broj: '),
          bold(value(values, 'contract_number')),
          text('   ·   '),
          text(`zaključen u Gračanici, dana ${formatDay(value(values, 'concluded_date'))}`),
        ],
      },
    },
    clientCell(layout.name, at(CLIENT_COLUMN_X, 94.7), value(values, 'company_name'), true),
    clientCell(layout.id, at(CLIENT_COLUMN_X, 34.9), value(values, 'id_number')),
    clientCell(layout.vat, at(CLIENT_COLUMN_X, 127.0), value(values, 'vat_number')),
    clientCell(layout.representative, at(CLIENT_COLUMN_X, 91.3), representative),
    clientCell(
      layout.contact,
      at(CLIENT_COLUMN_X, 88.7),
      joinFilled([value(values, 'contact_name'), value(values, 'contact_phone')])
    ),
    clientCell(layout.email, at(CLIENT_COLUMN_X, 92.7), value(values, 'email')),
    clientCell(
      layout.bank,
      at(CLIENT_COLUMN_X, 75.8),
      joinFilled([value(values, 'bank_account'), value(values, 'bank_name')])
    ),
    {
      page: LAST_PAGE,
      erase: [{ ...SIGNATURE_NAME_PLACEHOLDER, baseline: layout.signatureName }],
      run: {
        x: SIGNATURE_CENTER,
        baseline: layout.signatureName,
        align: 'center',
        maxWidth: 145,
        segments: [bold(value(values, 'company_name'))],
      },
    },
    {
      page: LAST_PAGE,
      erase: [{ ...SIGNATURE_REPRESENTATIVE_PLACEHOLDER, baseline: layout.signatureRepresentative }],
      run: representative
        ? { x: SIGNATURE_CENTER, baseline: layout.signatureRepresentative, align: 'center', maxWidth: 145, segments: [text(representative)] }
        : undefined,
    },
  ];

  // The seat cell is two lines high in the template, so a long address is written on two lines.
  if (twoLines) {
    patches.push({
      page: 0,
      erase: [{ ...at(CLIENT_COLUMN_X, 126.9), baseline: layout.seat }],
      run: { x: CLIENT_COLUMN_X, baseline: layout.seatLines[0], maxWidth: CLIENT_COLUMN_WIDTH, segments: [text(`${address},`)] },
    });
    patches.push({
      page: 0,
      erase: [],
      run: { x: CLIENT_COLUMN_X, baseline: layout.seatLines[1], maxWidth: CLIENT_COLUMN_WIDTH, segments: [text(place)] },
    });
  } else {
    patches.push(clientCell(layout.seat, at(CLIENT_COLUMN_X, 126.9), seat));
  }

  return patches;
}
