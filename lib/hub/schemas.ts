// Zod schemas for everything the client sends to Hub server actions.
// Rule: undefined = "leave unchanged", '' or null = "clear the value" (stored as null).

import { z } from 'zod';
import {
  PROJECT_PRIORITIES,
  PROJECT_STATUSES,
  PROJECT_TYPES,
  TASK_STATUSES,
} from './constants';
import { AD_AMOUNT_MAX, AD_PLATFORMS, isMonthKey } from './ad-budget';
import { toStoredDate } from './dates';
import { CONTRACT_MAX_MONTHS, MAX_CONTRACT_WEEKS, MAX_WEEKLY_QUOTA } from './retainer';
import { HUB_ROLES } from './roles';

export const idSchema = z.string().regex(/^[A-Za-z0-9_][A-Za-z0-9._-]{0,35}$/, 'Neispravan identifikator.');

const msg = (label: string, max: number) => `${label}: najviše ${max} znakova.`;

const requiredText = (label: string, max: number) =>
  z.string().trim().min(1, `${label} je obavezno polje.`).max(max, msg(label, max));

const optionalText = (label: string, max: number) =>
  z
    .string()
    .trim()
    .max(max, msg(label, max))
    .transform((value) => (value === '' ? null : value))
    .nullable()
    .optional();

const optionalEmail = z
  .union([z.literal(''), z.email('Neispravan email.').max(320)])
  .transform((value) => (value === '' ? null : value))
  .nullable()
  .optional();

// Only http(s) links are allowed so a stored value can never become a javascript: URL.
const optionalUrl = (label: string) =>
  z
    .union([z.literal(''), z.url({ protocol: /^https?$/, error: `${label}: neispravan link.` }).max(2000)])
    .transform((value) => (value === '' ? null : value))
    .nullable()
    .optional();

/** Accepts YYYY-MM-DD (as sent by <input type="date">), stores an ISO datetime at UTC midnight. */
const optionalDate = z
  .union([z.literal(''), z.iso.date('Neispravan datum.')])
  .transform((value) => (value === '' ? null : toStoredDate(value)))
  .nullable()
  .optional();

const projectFields = {
  name: requiredText('Naziv projekta', 200),
  description: optionalText('Opis', 5000),
  client_name: requiredText('Naziv klijenta', 300),
  client_contact: optionalText('Kontakt osoba', 200),
  client_email: optionalEmail,
  client_phone: optionalText('Telefon', 50),
  type: z.enum(PROJECT_TYPES),
  budget: z.number().min(0, 'Budžet ne može biti negativan.').max(1_000_000_000),
  priority: z.enum(PROJECT_PRIORITIES),
  lead_id: idSchema,
  client_id: idSchema.nullable().optional(),
  /** Not a column: asks the server to save the typed client details as a new saved client and link it. */
  save_client: z.boolean().optional(),
  member_ids: z.array(idSchema).max(50),
  team_ids: z.array(idSchema).max(20),
  contract_number: optionalText('Broj ugovora', 100),
  contract_url: optionalUrl('Link na ugovor'),
  proposal_url: optionalUrl('Link na ponudu'),
  invoice_number: optionalText('Broj fakture', 100),
  offer_date: optionalDate,
  agreement_date: optionalDate,
  start_date: optionalDate,
  planned_deadline: optionalDate,
  completion_date: optionalDate,
  invoice_date: optionalDate,
  notes: optionalText('Napomene', 5000),
  contract_start_date: optionalDate,
  contract_months: z.number().int().min(1).max(CONTRACT_MAX_MONTHS).nullable().optional(),
  monthly_fee: z.number().min(0).max(1_000_000).nullable().optional(),
  weekly_quota: z.number().int().min(1).max(MAX_WEEKLY_QUOTA).nullable().optional(),
  extra_post_price: z.number().min(0).max(1_000_000).nullable().optional(),
};

export const createProjectSchema = z.object({
  ...projectFields,
  member_ids: projectFields.member_ids.default([]),
  team_ids: projectFields.team_ids.default([]),
  status: z.enum(PROJECT_STATUSES).default('offer_sent'),
});

/** Status is deliberately absent: it changes only through changeProjectStatus. */
export const updateProjectSchema = z.object(projectFields).partial().strict();

const clientFields = {
  name: requiredText('Naziv klijenta', 300),
  contact_person: optionalText('Kontakt osoba', 200),
  email: optionalEmail,
  phone: optionalText('Telefon', 50),
  address: optionalText('Adresa', 300),
  city: optionalText('Grad', 100),
  tax_id: optionalText('JIB/PDV broj', 50),
  website: optionalText('Web stranica', 500),
  notes: optionalText('Napomene', 3000),
  is_active: z.boolean(),
};

export const createClientSchema = z.object({ ...clientFields, is_active: clientFields.is_active.default(true) });
export const updateClientSchema = z.object(clientFields).partial().strict();

export const changeStatusSchema = z.object({ status: z.enum(PROJECT_STATUSES) });

const taskFields = {
  title: requiredText('Naziv zadatka', 300),
  description: optionalText('Opis zadatka', 3000),
  assignee_id: idSchema,
  status: z.enum(TASK_STATUSES),
  priority: z.enum(PROJECT_PRIORITIES),
  deadline: optionalDate,
  comment: optionalText('Komentar', 1000),
};

export const createTaskSchema = z.object({
  ...taskFields,
  status: taskFields.status.default('todo'),
  priority: taskFields.priority.default('medium'),
});

export const updateTaskSchema = z.object(taskFields).partial().strict();

export const deliverySchema = z.object({
  week: z.number().int().min(1).max(MAX_CONTRACT_WEEKS),
  delivered: z.number().int().min(0, 'Broj objava ne može biti negativan.').max(1000),
});

export const adBudgetSchema = z.object({
  month: z.string().refine(isMonthKey, 'Neispravan mjesec.'),
  platform: z.enum(AD_PLATFORMS),
  planned: z.number().min(0, 'Iznos ne može biti negativan.').max(AD_AMOUNT_MAX),
  spent: z.number().min(0, 'Iznos ne može biti negativan.').max(AD_AMOUNT_MAX),
});

export const commentSchema = z.object({ text: requiredText('Komentar', 3000) });

export const teamSchema = z.object({
  name: requiredText('Naziv tima', 100),
  description: optionalText('Opis tima', 500),
  member_ids: z.array(idSchema).max(100).default([]),
});

export const roleSchema = z.enum(HUB_ROLES).nullable();

export const projectFiltersSchema = z
  .object({
    status: z.enum(PROJECT_STATUSES).optional(),
    lead_id: idSchema.optional(),
    client_id: idSchema.optional(),
    /** Only projects where this user is lead, member, or belongs to an assigned team. */
    participant_id: idSchema.optional(),
    limit: z.number().int().min(1).max(500).optional(),
    offset: z.number().int().min(0).optional(),
  })
  .strict();

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type CreateClientInput = z.infer<typeof createClientSchema>;
export type UpdateClientInput = z.infer<typeof updateClientSchema>;
export type AdBudgetInput = z.infer<typeof adBudgetSchema>;
export type DeliveryInput = z.infer<typeof deliverySchema>;
export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type TeamInput = z.infer<typeof teamSchema>;
export type ProjectFilters = z.infer<typeof projectFiltersSchema>;
