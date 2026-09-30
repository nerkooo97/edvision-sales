import { hubErrors } from '../errors';
import { canManageClients } from '../permissions';
import type { HubClient, HubProject, HubUser } from '../types';
import { createClient, findClientByName, getClient } from './clients';

/** The project fields that describe the client; on a linked project they come from the saved client. */
export interface ClientFields {
  client_id?: string | null;
  client_name?: string;
  client_contact?: string | null;
  client_email?: string | null;
  client_phone?: string | null;
}

const CLIENT_TEXT_FIELDS = ['client_name', 'client_contact', 'client_email', 'client_phone'] as const;

/** What to write to the project so it points at `client`: linked, name copied, contact details cleared. */
function linkedTo(client: HubClient): Required<ClientFields> {
  return {
    client_id: client.$id,
    client_name: client.name,
    client_contact: null,
    client_email: null,
    client_phone: null,
  };
}

/**
 * Works out the client-related columns of a project write.
 *
 * - client_id set        -> link to that saved client (name copied, contact fields cleared)
 * - client_id null       -> unlink; the typed fields in the same request describe a one-off client
 * - save_client = true   -> save the typed details as a new client and link it
 * - nothing about client -> no client columns are touched
 *
 * `current` is the project being edited (undefined when creating).
 */
export async function resolveClientLink(
  user: HubUser,
  input: ClientFields & { save_client?: boolean },
  current?: HubProject
): Promise<ClientFields> {
  const { save_client: saveClient, ...fields } = input;

  if (typeof input.client_id === 'string') {
    const client = await getClient(input.client_id);
    if (!client) throw hubErrors.notFound('Klijent');
    if (!client.is_active && current?.client_id !== client.$id) {
      throw hubErrors.validation('Odabrani klijent je neaktivan.');
    }
    return linkedTo(client);
  }

  const touchesClientFields = CLIENT_TEXT_FIELDS.some((field) => fields[field] !== undefined);

  // A linked project reads its client's data from the saved client, so it cannot be edited here.
  if (current?.client_id && input.client_id === undefined && touchesClientFields) {
    throw hubErrors.validation('Podaci klijenta se mijenjaju u bazi klijenata.');
  }

  if (saveClient) {
    if (!canManageClients(user.role)) throw hubErrors.forbidden('spremanje klijenta u bazu');

    // Details may be only partly in the request when editing; the rest comes from the project itself.
    const name = (fields.client_name ?? current?.client_name ?? '').trim();
    if (!name) throw hubErrors.validation('Naziv klijenta je obavezan.');

    const existing = await findClientByName(name);
    if (existing) {
      throw hubErrors.validation(`Klijent „${existing.name}“ već postoji u bazi. Odaberite ga s liste.`);
    }

    const client = await createClient({
      name,
      contact_person: fields.client_contact ?? current?.client_contact ?? null,
      email: fields.client_email ?? current?.client_email ?? null,
      phone: fields.client_phone ?? current?.client_phone ?? null,
      address: null,
      city: null,
      tax_id: null,
      website: null,
      notes: null,
      is_active: true,
    });
    return linkedTo(client);
  }

  return fields;
}

/** save_client is an instruction, not a column, so it must be removed before a project is written. */
export function withoutSaveClient<T extends { save_client?: boolean }>(input: T): Omit<T, 'save_client'> {
  const copy = { ...input };
  delete copy.save_client;
  return copy;
}
