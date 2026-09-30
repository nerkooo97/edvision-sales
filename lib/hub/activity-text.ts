import { PROJECT_STATUSES, type ProjectStatus } from './constants';
import { PROJECT_FIELD_LABELS, STATUS_LABELS } from './labels';
import type { HubActivity } from './types';

const isStatus = (value: string): value is ProjectStatus => (PROJECT_STATUSES as readonly string[]).includes(value);

const statusLabel = (value: string) => (isStatus(value) ? STATUS_LABELS[value] : value);

/** Turns a stored activity (English keys) into a readable Bosnian sentence, without the actor's name. */
export function describeActivity(activity: Pick<HubActivity, 'type' | 'details'>): string {
  const { type, details } = activity;

  switch (type) {
    case 'project_created':
      return details ? `Projekat kreiran (${details})` : 'Projekat kreiran';
    case 'project_updated': {
      const fields = details
        .split(',')
        .map((field) => PROJECT_FIELD_LABELS[field.trim()] ?? field.trim())
        .filter(Boolean);
      return fields.length ? `Ažurirano: ${fields.join(', ')}` : 'Podaci projekta ažurirani';
    }
    case 'status_changed': {
      const [from, to] = details.split('->').map((part) => part.trim());
      return `Status promijenjen: ${statusLabel(from)} → ${statusLabel(to)}`;
    }
    case 'task_created':
      return `Dodan zadatak „${details}“`;
    case 'task_updated':
      return `Izmijenjen zadatak „${details}“`;
    case 'task_deleted':
      return `Obrisan zadatak „${details}“`;
    case 'comment_added':
      return 'Dodan komentar';
    case 'delivery_logged':
      return `Evidentirana isporuka: ${details}`;
    case 'ad_budget_updated':
      return `Oglasni budžet: ${details}`;
  }
}
