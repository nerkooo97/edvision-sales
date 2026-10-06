// Form helpers for the contract generator: defaults and completeness checks.

import { CLIENT_FIELDS, HEADER_FIELDS } from './party';
import type { ContractTemplate, ContractValues, FieldDef } from './types';

/** Every field of a template's form, in the order they are shown. */
export function allFields(template: ContractTemplate): FieldDef[] {
  return [HEADER_FIELDS, CLIENT_FIELDS, ...template.terms].flatMap((group) => group.fields);
}

/** The values a template starts with (usual package names, 15 days, 2 posts a week...). */
export function defaultValues(template: ContractTemplate): ContractValues {
  const entries = allFields(template)
    .filter((field) => field.defaultValue !== undefined)
    .map((field) => [field.key, field.defaultValue as string]);
  return Object.fromEntries(entries);
}

/** Labels of the required fields that are still empty. */
export function missingRequired(template: ContractTemplate, values: ContractValues): string[] {
  return allFields(template)
    .filter((field) => field.required && !(values[field.key] ?? '').trim())
    .map((field) => field.label);
}
