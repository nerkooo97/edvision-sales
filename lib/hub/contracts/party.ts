// "Naručilac" (the client) and the contract header: the same on every template.

import type { HubClient, HubClientContact } from '../types';
import type { ContractValues, FieldGroup } from './types';

export const CONTRACT_PLACE = 'Gračanica';

export const HEADER_FIELDS: FieldGroup = {
  title: 'Ugovor',
  fields: [
    { key: 'contract_number', label: 'Broj ugovora', kind: 'text', placeholder: 'npr. 12-2026', maxLength: 30, required: true },
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

const contactName = (contact: HubClientContact) => [contact.first_name, contact.last_name].filter(Boolean).join(' ');

/**
 * Fills the "Naručilac" part from a saved client and its contacts. Only fields the client really has
 * are set, so nothing already typed is overwritten with an empty value. A BiH VAT number is the
 * 13-digit ID without its leading 4; the primary contact is the contact person, and also the
 * representative when the contact list has a director (or owner) by position.
 */
export function prefillFromClient(client: HubClient, contacts: HubClientContact[]): ContractValues {
  const idNumber = (client.tax_id ?? '').replace(/D/g, '');
  const hasBihId = idNumber.length === ID_NUMBER_LENGTH;
  const active = contacts.filter((contact) => contact.is_active);
  const primary = active.find((contact) => contact.is_primary) ?? active[0];
  const representative = active.find((contact) => /direktor|ceo|vlasni|owner|osniva/i.test(contact.position ?? ''));

  const candidates: ContractValues = {
    company_name: client.name,
    address: client.address ?? '',
    postal_code: client.postal_code ?? '',
    city: client.city ?? '',
    id_number: hasBihId ? idNumber : '',
    vat_number: hasBihId && client.vat_registered ? idNumber.slice(1) : '',
    representative: representative ? contactName(representative) : '',
    representative_role: representative?.position ?? '',
    contact_name: primary ? contactName(primary) : '',
    contact_phone: primary?.phone ?? client.phone ?? '',
    email: client.email ?? primary?.email ?? '',
  };
  return Object.fromEntries(Object.entries(candidates).filter(([, value]) => value !== ''));
}
