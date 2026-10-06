// Human-readable summary (Bosnian) of what the preparation did, for review before the import.

import { CLIENT_MERGES, EXCLUDED_CLIENTS } from './decisions.mjs';

const count = (items, predicate) => items.filter(predicate).length;

export function buildReport({ input, clients, contacts, stats, journal }) {
  const lines = [];
  const add = (...items) => lines.push(...items);

  add(
    '# Priprema klijenata za import',
    '',
    `Generisano: ${new Date().toISOString().slice(0, 16).replace('T', ' ')} (UTC)`,
    '',
    '## Rezultat',
    '',
    '| | Ulaz (CSV) | Spremno za import |',
    '|---|---:|---:|',
    `| Klijenti | ${input.clients} | ${clients.length} |`,
    `| Kontakti | ${input.contacts} | ${contacts.length} |`,
    '',
    `- Izbačeno klijenata koji to nisu: ${stats.excludedClients} (i njihovih kontakata: ${stats.excludedContacts})`,
    `- Spojeno duplikata: ${CLIENT_MERGES.length}`,
    `- Preskočeno "kontakata" koji su zapravo naziv firme: ${stats.placeholders} (njihov email/telefon ostaje na klijentu)`,
    `- Klijenti bez ijedne kontakt osobe: ${count(clients, (c) => !contacts.some((k) => k.client_legacy_id === c.legacy_id))}`,
    `- Klijenti u PDV sistemu: ${count(clients, (c) => c.vat_registered)}`,
    `- Neaktivni kontakti (uvoze se, označeni kao neaktivni): ${count(contacts, (c) => !c.is_active)}`,
    ''
  );

  add('## Ručne odluke (`scripts/hub/clients-import/decisions.mjs`)', '', '**Izbačeno:**', '');
  for (const [id, reason] of Object.entries(EXCLUDED_CLIENTS)) add(`- #${id}: ${reason}`);
  add('', '**Spojeni duplikati** (prvi se utapa u drugi):', '');
  for (const { from, into, reason } of CLIENT_MERGES) add(`- #${from} → #${into}: ${reason}`);
  add('');

  add('## Automatske ispravke', '', '| Ispravka | Broj |', '|---|---:|');
  for (const [kind, total] of [...journal.fixes].sort((a, b) => b[1] - a[1])) add(`| ${kind} | ${total} |`);
  add('');

  add('## Raspodjela', '');
  const tally = (key) => {
    const totals = new Map();
    for (const client of clients) totals.set(client[key] ?? '(prazno)', (totals.get(client[key] ?? '(prazno)') ?? 0) + 1);
    return [...totals].sort((a, b) => b[1] - a[1]).map(([value, total]) => `${value}: ${total}`).join(', ');
  };
  add(`- Država: ${tally('country')}`, `- Kanton/regija: ${tally('region')}`, '');

  add(
    `## Klijenti bez ikakvog kontakta (${journal.withoutContact.length})`,
    '',
    'Nemaju kontakt osobu, telefon ni email. Uvoze se, ali ih vrijedi dopuniti ili deaktivirati.',
    '',
    journal.withoutContact.map((client) => `#${client.legacy_id} ${client.name}`).join(' · '),
    ''
  );

  const byClient = Map.groupBy(journal.warnings, (warning) => warning.clientId);
  add(`## Za provjeru (${journal.warnings.length} napomena kod ${byClient.size} klijenata)`, '');
  add('Ovo skripta nije mogla sama riješiti ili je bitno da vidiš. Broj je ID iz starog sistema.', '');
  for (const [clientId, warnings] of [...byClient].sort((a, b) => a[0] - b[0])) {
    add(`- **#${clientId} ${warnings[0].name ?? ''}**`);
    for (const { message } of warnings) add(`  - ${message}`);
  }
  add('');
  return lines.join('\n');
}
