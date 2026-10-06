// Turns the raw CSV rows into clean client and contact records (no I/O here).

import { CLIENT_MERGES, CLIENT_OVERRIDES, CONTACT_OVERRIDES, EXCLUDED_CLIENTS } from './decisions.mjs';
import {
  clean,
  fixBihPostal,
  isSameEntity,
  looksLikeStreet,
  normalizeAddress,
  normalizeCity,
  normalizeCompanyName,
  normalizeEmail,
  normalizePersonName,
  normalizePhone,
  normalizePosition,
  normalizePostal,
  normalizeTaxId,
  normalizeWebsite,
  splitCityPostal,
} from './normalize.mjs';
import { CITY_REGIONS, COUNTRY_CODES, REGION_ALIASES, REGION_NOISE, REGIONS } from './places.mjs';

// Column sizes the import will write into (planned hub_clients / hub_client_contacts).
const CLIENT_LIMITS = { name: 300, tax_id: 50, address: 300, postal_code: 20, city: 100, region: 100, phone: 50, email: 320, website: 500, notes: 3000 };
const CONTACT_LIMITS = { first_name: 100, last_name: 100, email: 320, phone: 50, position: 150 };

const SILENT = { warn() {}, fix() {} };

export function createJournal() {
  const fixes = new Map();
  const warnings = [];
  const withoutContact = [];
  return {
    fixes,
    warnings,
    withoutContact,
    forClient(clientId, name) {
      return {
        warn: (message) => {
          if (!warnings.some((w) => w.clientId === clientId && w.message === message)) {
            warnings.push({ clientId, name, message });
          }
        },
        fix: (kind) => fixes.set(kind, (fixes.get(kind) ?? 0) + 1),
      };
    },
  };
}

function resolveRegion(country, city, rawRegion, postalRegion, log) {
  const given = clean(rawRegion);
  if (country !== 'BA') {
    if (postalRegion) return postalRegion;
    return given && !/^\d+$/.test(given) && !REGION_NOISE.has(given.toLowerCase()) ? given : null;
  }
  const fromCity = city ? CITY_REGIONS[city.toLowerCase()] : undefined;
  const fromSource = given ? REGION_ALIASES[given.toLowerCase()] : undefined;
  if (fromCity && fromSource && fromCity !== fromSource) {
    log.warn(`Kanton "${given}" ne odgovara gradu ${city}; uzet ${REGIONS[fromCity]}`);
  }
  const key = fromCity ?? fromSource;
  if (!key && city) log.warn(`Nepoznat kanton za grad ${city}`);
  if (fromCity && !fromSource) log.fix('Kanton određen prema gradu');
  return key ? REGIONS[key] : null;
}

function buildAddress(row, country, log) {
  let cityText = row.grad;
  let addressText = row.adresa;
  if (looksLikeStreet(cityText) && clean(addressText) && !looksLikeStreet(addressText)) {
    [cityText, addressText] = [addressText, cityText];
    log.fix('Zamijenjeni adresa i grad (bili u pogrešnim kolonama)');
  }

  const cityParts = splitCityPostal(cityText);
  const billingCity = splitCityPostal(row.fakturna_grad);
  const postalField = normalizePostal(row.postanski_broj, log);
  if (cityParts.postal) {
    log.fix('Poštanski broj izdvojen iz naziva grada');
    if (postalField.postal && postalField.postal !== cityParts.postal) {
      log.warn(`Dva poštanska broja: ${cityParts.postal} (uz grad) i ${postalField.postal}; uzet ${cityParts.postal}`);
    }
  }

  let postal = cityParts.postal ?? postalField.postal ?? billingCity.postal ?? normalizePostal(row.fakturna_postanski, SILENT).postal;
  if (country === 'BA') postal = fixBihPostal(postal, log);
  const city = normalizeCity(cityParts.city, log) ?? normalizeCity(billingCity.city, SILENT);
  let address = normalizeAddress(addressText, log) ?? normalizeAddress(row.fakturna_adresa, SILENT);
  if (address && city && address.toLowerCase() === city.toLowerCase()) address = null;

  if (country === 'BA' && postal && !/^[78]\d{4}$/.test(postal)) {
    log.warn(`Država je BiH, a poštanski broj ${postal} nije bosanski`);
  }
  const region = resolveRegion(country, city, row.kanton_drzava, postalField.region, log);
  return { address, postal_code: postal, city, region };
}

function buildClient(row, log) {
  const id = Number(row.id);
  const override = CLIENT_OVERRIDES[id] ?? {};
  const country = override.country ?? COUNTRY_CODES[clean(row.drzava)] ?? null;
  if (!country) log.warn(`Nepoznata država "${row.drzava}"`);

  const phone = normalizePhone(row.telefon, country, log);
  if (phone.text) log.warn(`U polju telefon je pisalo "${phone.text}"; izostavljeno`);

  const taxId = normalizeTaxId(row.id_broj, country, log);
  const vatNumber = clean(row.pdv_broj);
  const notes = [];
  if (vatNumber && vatNumber !== taxId && `4${vatNumber}` !== taxId) notes.push(`PDV broj: ${vatNumber}`);
  // Natural persons: the old system kept the ID card number in the address column.
  const idCard = clean(row.adresa)?.match(/broj lk:?\s*(\S+)/i);
  if (idCard) notes.push(`Broj lične karte: ${idCard[1]}`);

  const client = {
    legacy_id: id,
    name: normalizeCompanyName(row.firma, log),
    tax_id: taxId,
    vat_registered: Boolean(vatNumber),
    ...buildAddress(row, country, log),
    country,
    phone: phone.value,
    email: normalizeEmail(row.email_glavnog_kontakta, log),
    website: normalizeWebsite(row.web, log),
    is_active: clean(row.aktivan) !== 'ne',
    notes,
  };
  return Object.assign(client, override);
}

function mergeClients(clients, journal) {
  const mergedInto = new Map();
  for (const { from, into, reason } of CLIENT_MERGES) {
    const source = clients.get(from);
    const target = clients.get(into);
    if (!source || !target) {
      journal.forClient(into, target?.name ?? '?').warn(`Spajanje #${from} -> #${into} nije moguće: klijent ne postoji`);
      continue;
    }
    for (const [key, value] of Object.entries(source)) {
      if (key === 'legacy_id' || key === 'notes') continue;
      if ((target[key] === null || target[key] === false) && value !== null) target[key] = value;
    }
    if (source.tax_id && target.tax_id && source.tax_id !== target.tax_id) {
      target.notes.push(`Drugi ID broj iz duplikata: ${source.tax_id}`);
    }
    target.notes.push(`Spojen duplikat #${from} "${source.name}" (${reason})`);
    mergedInto.set(from, into);
    clients.delete(from);
  }
  return mergedInto;
}

function buildContact(row, client, journal, stats) {
  const log = journal.forClient(client.legacy_id, client.name);
  const fullName = `${row.ime} ${row.prezime}`;
  const email = normalizeEmail(row.email, log);
  const phone = normalizePhone(row.telefon, client.country, log);

  // The company name typed into the person field: not a person, but keep its email/phone on the client.
  if (isSameEntity(fullName, row.firma) || isSameEntity(fullName, client.name)) {
    if (email && !client.email) client.email = email;
    if (phone.value && !client.phone) client.phone = phone.value;
    if (email && client.email !== email) client.notes.push(`Dodatni email: ${email}`);
    if (phone.value && client.phone !== phone.value) client.notes.push(`Dodatni telefon: ${phone.value}`);
    stats.placeholders++;
    return null;
  }

  let position = normalizePosition(row.pozicija, log);
  if (phone.text) {
    if (position) log.warn(`U polju telefon kontakta je pisalo "${phone.text}"; izostavljeno`);
    else {
      position = normalizePosition(phone.text, log);
      log.fix('Pozicija premještena iz polja telefon');
    }
  }

  const contact = {
    legacy_id: Number(row.id),
    client_legacy_id: client.legacy_id,
    first_name: normalizePersonName(row.ime),
    last_name: normalizePersonName(row.prezime),
    email,
    phone: phone.value,
    position,
    is_primary: clean(row.glavni_kontakt) === 'da',
    is_active: clean(row.aktivan) !== 'ne',
  };
  return Object.assign(contact, CONTACT_OVERRIDES[contact.legacy_id] ?? {});
}

const contactName = (contact) => [contact.first_name, contact.last_name].filter(Boolean).join(' ');

// Exactly one primary contact per client, and an active one whenever possible.
function fixPrimaryContacts(contacts, clients, journal) {
  const byClient = Map.groupBy(contacts, (contact) => contact.client_legacy_id);
  for (const [clientId, list] of byClient) {
    const original = list.find((contact) => contact.is_primary);
    const primary =
      list.find((contact) => contact.is_primary && contact.is_active) ??
      list.find((contact) => contact.is_active) ??
      original ??
      list[0];
    for (const contact of list) contact.is_primary = contact === primary;
    if (primary !== original) {
      const client = clients.get(clientId);
      const log = journal.forClient(clientId, client.name);
      log.fix('Glavni kontakt prebačen na drugu osobu');
      log.warn(`Glavni kontakt je sada ${contactName(primary)} (prethodni je neaktivan, nije osoba ili ga nema)`);
    }
  }
}

function dropDuplicateContacts(contacts, journal, clients) {
  const seen = new Set();
  return contacts.filter((contact) => {
    const key = `${contact.client_legacy_id}|${contact.email ?? contactName(contact).toLowerCase()}`;
    if (!seen.has(key)) {
      seen.add(key);
      return true;
    }
    const client = clients.get(contact.client_legacy_id);
    journal.forClient(client.legacy_id, client.name).warn(`Dupli kontakt ${contactName(contact)} izostavljen`);
    return false;
  });
}

function checkLimits(record, limits, log, label) {
  for (const [key, max] of Object.entries(limits)) {
    const value = Array.isArray(record[key]) ? record[key].join('\n') : record[key];
    if (typeof value === 'string' && value.length > max) log.warn(`${label} "${key}" je duže od ${max} znakova`);
  }
}

export function buildImport(clientRows, contactRows) {
  const journal = createJournal();
  const stats = { excludedClients: 0, excludedContacts: 0, placeholders: 0 };

  const clients = new Map();
  for (const row of clientRows) {
    const id = Number(row.id);
    if (EXCLUDED_CLIENTS[id]) {
      stats.excludedClients++;
      continue;
    }
    clients.set(id, buildClient(row, journal.forClient(id, clean(row.firma))));
  }
  const mergedInto = mergeClients(clients, journal);

  let contacts = [];
  for (const row of contactRows) {
    const sourceId = Number(row.klijent_id);
    if (EXCLUDED_CLIENTS[sourceId]) {
      stats.excludedContacts++;
      continue;
    }
    const client = clients.get(mergedInto.get(sourceId) ?? sourceId);
    if (!client) {
      journal.forClient(sourceId, row.firma).warn(`Kontakt #${row.id} pripada nepostojećem klijentu; izostavljen`);
      continue;
    }
    const contact = buildContact(row, client, journal, stats);
    if (contact) contacts.push(contact);
  }
  contacts = dropDuplicateContacts(contacts, journal, clients);
  fixPrimaryContacts(contacts, clients, journal);

  const withContacts = new Set(contacts.map((contact) => contact.client_legacy_id));
  for (const client of clients.values()) {
    const log = journal.forClient(client.legacy_id, client.name);
    if (!withContacts.has(client.legacy_id) && !client.email && !client.phone) {
      journal.withoutContact.push(client);
    }
    checkLimits(client, CLIENT_LIMITS, log, 'Polje');
    client.notes = client.notes.length ? client.notes.join('\n') : null;
  }
  for (const contact of contacts) {
    const client = clients.get(contact.client_legacy_id);
    checkLimits(contact, CONTACT_LIMITS, journal.forClient(client.legacy_id, client.name), 'Kontakt, polje');
  }

  const sortedContacts = contacts.sort(
    (a, b) => a.client_legacy_id - b.client_legacy_id || Number(b.is_primary) - Number(a.is_primary)
  );
  return { clients: [...clients.values()], contacts: sortedContacts, mergedInto, stats, journal };
}
