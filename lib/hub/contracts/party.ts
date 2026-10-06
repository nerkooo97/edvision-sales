// "Naručilac" (the client) and the contract header: the same on every template.

import type { HubClient, HubClientContact } from '../types';
import type { ContractValues, FieldGroup } from './types';

export const CONTRACT_PLACE = 'Gračanica';

// The contract number is not a form field: the database gives it when the contract is saved.
export const HEADER_FIELDS: FieldGroup = {
  title: 'Ugovor',
  fields: [
    { key: 'concluded_date', label: `Datum zaključenja (${CONTRACT_PLACE})`, kind: 'date', required: true },
  ],
};

export const CLIENT_FIELDS: FieldGroup = {
  title: 'Naručilac',
  fields: [
    { key: 'company_name', label: 'Puni naziv pravnog lica', kind: 'text', maxLength: 300, wide: true, required: true },
    { key: 'address', label: 'Ulica i broj', kind: 'text', maxLength: 200, required: true },
    { key: 'postal_code', label: 'Poštanski broj', kind: 'text', maxLength: 10, required: true },
    { key: 'city', label: 'Grad', kind: 'text', maxLength: 100, required: true },
    { key: 'id_number', label: 'ID broj', kind: 'text', placeholder: '13 cifara', maxLength: 13, required: true },
    { key: 'vat_number', label: 'PDV broj', kind: 'text', placeholder: '12 cifara / nije u sistemu PDV-a', maxLength: 40 },
    { key: 'representative', label: 'Zastupa (ime i prezime)', kind: 'text', maxLength: 150, required: true },
    { key: 'representative_role', label: 'Funkcija', kind: 'text', placeholder: 'npr. direktor', maxLength: 100 },
    { key: 'contact_name', label: 'Kontakt osoba', kind: 'text', maxLength: 150 },
    { key: 'contact_phone', label: 'Telefon kontakt osobe', kind: 'text', maxLength: 50 },
    { key: 'email', label: 'E-mail za komunikaciju', kind: 'text', maxLength: 320, required: true },
    { key: 'bank_account', label: 'Broj računa', kind: 'text', maxLength: 40 },
    { key: 'bank_name', label: 'Banka', kind: 'text', maxLength: 100 },
  ],
};

const ID_NUMBER_LENGTH = 13;
const NOT_IN_VAT_SYSTEM = 'Nije u sistemu PDV-a';

// Only exact titles count: "direktor prodaje" or "finansije" must not end up as the legal representative.
const REPRESENTATIVE_POSITION = /^((generalni|izvr[sš]ni) )?(direktor|ceo|vlasnik|owner|osniva[cč])$/i;

const contactName = (contact: HubClientContact) => [contact.first_name, contact.last_name].filter(Boolean).join(' ');

/** Every key the client part of the form holds; choosing another client clears all of them first. */
export const CLIENT_FIELD_KEYS = CLIENT_FIELDS.fields.map((field) => field.key);

const isRepresentative = (contact: HubClientContact) => REPRESENTATIVE_POSITION.test((contact.position ?? '').trim());

/**
 * Fills the "Naručilac" part from a saved client and its contacts. Only fields the client really has
 * are set; the rest stays empty for manual entry.
 *  - A BiH VAT number is the 13-digit ID without its leading 4; a BiH client outside the VAT system gets
 *    the sentence the template asks for. Foreign tax numbers are left for manual entry.
 *  - The primary contact is the contact person. The representative is a contact whose position is exactly
 *    director, CEO, owner or founder (the primary contact first).
 *  - The e-mail is the client's own, then the primary contact's, then any other contact's.
 */
export function prefillFromClient(client: HubClient, contacts: HubClientContact[]): ContractValues {
  const idNumber = (client.tax_id ?? '').replace(/\D/g, '');
  const hasBihId = idNumber.length === ID_NUMBER_LENGTH;
  const active = contacts.filter((contact) => contact.is_active);
  const primary = active.find((contact) => contact.is_primary) ?? active[0];
  const representative = primary && isRepresentative(primary) ? primary : active.find(isRepresentative);

  let vatNumber = '';
  if (hasBihId) {
    if (client.vat_registered) vatNumber = idNumber.slice(1);
    else if (client.country === 'BA') vatNumber = NOT_IN_VAT_SYSTEM;
  }

  const candidates: ContractValues = {
    company_name: client.name,
    address: client.address ?? '',
    postal_code: client.postal_code ?? '',
    city: client.city ?? '',
    id_number: hasBihId ? idNumber : '',
    vat_number: vatNumber,
    representative: representative ? contactName(representative) : '',
    representative_role: representative?.position?.trim() ?? '',
    contact_name: primary ? contactName(primary) : '',
    contact_phone: primary?.phone ?? client.phone ?? '',
    email: client.email ?? primary?.email ?? active.find((contact) => contact.email)?.email ?? '',
  };
  return Object.fromEntries(Object.entries(candidates).filter(([, value]) => value !== ''));
}
