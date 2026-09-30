// Bosnian UI labels for the English keys stored in the database.

import type { ProjectPriority, ProjectStatus, ProjectType, TaskStatus } from './constants';
import type { HubRole } from './roles';

export const STATUS_LABELS: Record<ProjectStatus, string> = {
  offer_sent: 'Poslata ponuda',
  agreed: 'Dogovoreno',
  in_progress: 'U radu',
  completed: 'Završeno',
  ready_to_invoice: 'Za fakturisanje',
  invoiced: 'Fakturisano',
};

/** Tailwind classes per status, using semantic tokens where they exist and palette colours for stages. */
export const STATUS_STYLES: Record<ProjectStatus, string> = {
  offer_sent: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
  agreed: 'bg-blue-500/15 text-blue-700 dark:text-blue-400',
  in_progress: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-400',
  completed: 'bg-purple-500/15 text-purple-700 dark:text-purple-400',
  ready_to_invoice: 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-400',
  invoiced: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
};

export const PRIORITY_LABELS: Record<ProjectPriority, string> = {
  low: 'Niska',
  medium: 'Srednja',
  high: 'Visoka',
  urgent: 'Urgentna',
};

export const PRIORITY_STYLES: Record<ProjectPriority, string> = {
  low: 'text-muted-foreground',
  medium: 'text-blue-600 dark:text-blue-400',
  high: 'text-amber-600 dark:text-amber-400',
  urgent: 'text-destructive',
};

export const TYPE_LABELS: Record<ProjectType, string> = {
  website: 'Web stranica',
  application: 'Aplikacija',
  marketing_campaign: 'Marketing kampanja',
  hosting: 'Hosting',
  graphic_design: 'Grafički dizajn',
  maintenance: 'Održavanje',
  google_ads: 'Google Ads',
  seo: 'SEO optimizacija',
  social_media: 'Društvene mreže (Meta)',
  other: 'Drugo',
};

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  todo: 'Nije početo',
  in_progress: 'U toku',
  done: 'Završeno',
};

export const ROLE_DISPLAY_NAMES: Record<HubRole, string> = {
  admin: 'Administrator',
  account_manager: 'Account Manager',
  project_lead: 'Voditelj projekta',
  team_member: 'Član tima',
  finance: 'Finansije',
  viewer: 'Posmatrač',
};

/** Bosnian names of project fields, used when the activity log lists what changed. */
export const PROJECT_FIELD_LABELS: Record<string, string> = {
  name: 'naziv',
  description: 'opis',
  client_name: 'klijent',
  client_contact: 'kontakt osoba',
  client_email: 'email klijenta',
  client_phone: 'telefon klijenta',
  type: 'tip',
  budget: 'budžet',
  priority: 'prioritet',
  lead_id: 'voditelj',
  client_id: 'klijent',
  member_ids: 'članovi',
  team_ids: 'timovi',
  contract_number: 'broj ugovora',
  contract_url: 'link na ugovor',
  proposal_url: 'link na ponudu',
  invoice_number: 'broj fakture',
  offer_date: 'datum ponude',
  agreement_date: 'datum dogovora',
  start_date: 'početak rada',
  planned_deadline: 'planirani rok',
  completion_date: 'stvarni završetak',
  invoice_date: 'datum fakture',
  notes: 'napomene',
  contract_start_date: 'početak ugovora',
  contract_months: 'trajanje ugovora',
  monthly_fee: 'mjesečna naknada',
  weekly_quota: 'objava sedmično',
  extra_post_price: 'cijena dodatne objave',
};

export const ROLE_DESCRIPTIONS: Record<HubRole, string> = {
  admin: 'Sve: projekti, statusi, korisnici, timovi i brisanje.',
  account_manager: 'Kreira i uređuje sve projekte; postavlja ponudu, dogovoreno i za fakturisanje.',
  project_lead: 'Kreira projekte; upravlja svojim projektima; postavlja u radu i završeno.',
  team_member: 'Radi na svojim projektima; mijenja status svojih zadataka; postavlja u radu.',
  finance: 'Postavlja fakturisano; unosi broj i datum fakture.',
  viewer: 'Samo pregled, bez izmjena i komentara.',
};

/** Top border colour of each Kanban column. */
export const STATUS_ACCENTS: Record<ProjectStatus, string> = {
  offer_sent: 'border-t-amber-500',
  agreed: 'border-t-blue-500',
  in_progress: 'border-t-indigo-500',
  completed: 'border-t-purple-500',
  ready_to_invoice: 'border-t-cyan-500',
  invoiced: 'border-t-emerald-500',
};

/** Solid fill of each status, used for the progress bar segments on the timeline. */
export const STATUS_BAR_COLORS: Record<ProjectStatus, string> = {
  offer_sent: 'bg-amber-500',
  agreed: 'bg-blue-500',
  in_progress: 'bg-indigo-500',
  completed: 'bg-purple-500',
  ready_to_invoice: 'bg-cyan-500',
  invoiced: 'bg-emerald-500',
};
