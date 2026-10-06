/**
 * The form of a client name that is compared and stored in hub_clients.name_key (unique index):
 * lowercase, without accents and with single spaces, so "FAB d.o.o." and "fab  d.o.o." are one client.
 * scripts/hub/clients-import/import-clients.mjs computes the same key; keep the two in step.
 */
export function clientNameKey(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}
