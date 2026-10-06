'use server';

import { hubErrors } from '../errors';
import { canManageClients } from '../permissions';
import { createContactSchema, idSchema, updateContactSchema } from '../schemas';
import { getClient } from '../server/clients';
import { createContact, deleteContact, getContact, updateContact } from '../server/client-contacts';
import { requireHubUser } from '../server/session';
import { parseInput, runAction } from './run-action';

// Contacts belong to the client base, so the people who manage clients manage them too.
async function requireClientManager() {
  const user = await requireHubUser();
  if (!canManageClients(user.role)) throw hubErrors.forbidden('upravljanje kontaktima klijenata');
  return user;
}

async function requireContact(contactId: unknown) {
  const contact = await getContact(parseInput(idSchema, contactId));
  if (!contact) throw hubErrors.notFound('Kontakt');
  return contact;
}

export async function createContactAction(input: unknown) {
  return runAction(async () => {
    await requireClientManager();
    const data = parseInput(createContactSchema, input);
    if (!(await getClient(data.client_id))) throw hubErrors.notFound('Klijent');
    return createContact(data);
  });
}

export async function updateContactAction(contactId: unknown, input: unknown) {
  return runAction(async () => {
    await requireClientManager();
    const patch = parseInput(updateContactSchema, input);
    return updateContact(await requireContact(contactId), patch);
  });
}

export async function deleteContactAction(contactId: unknown) {
  return runAction(async () => {
    await requireClientManager();
    const contact = await requireContact(contactId);
    await deleteContact(contact);
    return { id: contact.$id };
  });
}
