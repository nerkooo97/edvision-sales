// Contract generator: how a contract template describes the fields of its form.
// Templates are plain data, so one form component renders all of them.

export type FieldKind = 'text' | 'number' | 'money' | 'date' | 'select';

export interface FieldOption {
  value: string;
  label: string;
}

export interface FieldDef {
  key: string;
  label: string;
  kind: FieldKind;
  placeholder?: string;
  defaultValue?: string;
  /** Shown after the input, e.g. "KM bez PDV-a" or "dana". */
  unit?: string;
  options?: FieldOption[];
  maxLength?: number;
  /** Takes the full width of the form row. */
  wide?: boolean;
  required?: boolean;
}

export interface FieldGroup {
  title: string;
  fields: FieldDef[];
}

/** A value worked out from the form, shown read-only under the fields. */
export interface ComputedRow {
  label: string;
  value: string;
}

export type ContractValues = Record<string, string>;

export const CONTRACT_TEMPLATE_IDS = ['web_maintenance', 'meta', 'google_ads', 'meta_google_ads'] as const;
export type ContractTemplateId = (typeof CONTRACT_TEMPLATE_IDS)[number];

export interface ContractTemplate {
  id: ContractTemplateId;
  title: string;
  description: string;
  /** File in public/templates this template is based on. */
  source: string;
  /** Contract length in months; fixed by the template. */
  months: number;
  /** "Osnovni uslovi ugovora": the part that differs between templates. */
  terms: FieldGroup[];
  computed: (values: ContractValues) => ComputedRow[];
}
