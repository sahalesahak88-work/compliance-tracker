// Client-safe mirror of CATEGORY_TYPES in lib/db.ts (that file imports
// node:sqlite, so it can't be imported from client components). Keep
// the two in sync: the `key` values here must match the typeKey
// values there, and each field `key` here must match a column name
// in LICENSE_OPTIONAL_FIELDS in lib/models.ts.
//
// `expiryDate` is deliberately NOT listed as a per-type field — every
// type shares the same underlying `expiryDate` column as its one
// universal "due date" (labelled differently per type via
// `dueDateLabel`), so reminders/sorting/calendar/export keep working
// unchanged across all 7 types.

export interface TypeFieldDef {
  key: string;
  label: string;
  type: "text" | "date" | "select";
  options?: string[];
  placeholder?: string;
  required?: boolean;
}

export interface CategoryTypeDef {
  key: string;
  label: string;
  itemNameLabel: string;
  dueDateLabel: string;
  fields: TypeFieldDef[];
}

export const CATEGORY_TYPE_DEFS: CategoryTypeDef[] = [
  {
    key: "license_permit",
    label: "License / Permit",
    itemNameLabel: "License / certificate name",
    dueDateLabel: "Expiry date",
    fields: [
      { key: "authority", label: "Issuing authority", type: "select", options: ["DHA", "MOH", "DOH", "FANR", "Other"], required: true },
      { key: "number", label: "License number", type: "text", placeholder: "optional" },
      { key: "issuedDate", label: "Issued date", type: "date" },
    ],
  },
  {
    key: "staff_credential",
    label: "Staff Credential",
    itemNameLabel: "Credential name",
    dueDateLabel: "Expiry date",
    fields: [
      { key: "staffName", label: "Staff member name", type: "text", required: true },
      { key: "credentialType", label: "Credential type", type: "text", placeholder: "e.g. Nursing license" },
      { key: "issuedDate", label: "Issued date", type: "date" },
    ],
  },
  {
    key: "equipment_calibration",
    label: "Equipment — Calibration",
    itemNameLabel: "Equipment name",
    dueDateLabel: "Next calibration due",
    fields: [
      { key: "serialNumber", label: "Serial number", type: "text", placeholder: "optional" },
      { key: "lastCalibratedDate", label: "Last calibrated", type: "date" },
      { key: "vendor", label: "Calibration vendor", type: "text", placeholder: "optional" },
    ],
  },
  {
    key: "equipment_maintenance",
    label: "Equipment — Maintenance",
    itemNameLabel: "Equipment name",
    dueDateLabel: "Next service due",
    fields: [
      { key: "serialNumber", label: "Serial number", type: "text", placeholder: "optional" },
      { key: "lastServicedDate", label: "Last serviced", type: "date" },
      { key: "technician", label: "Technician / vendor", type: "text", placeholder: "optional" },
    ],
  },
  {
    key: "insurance_policy",
    label: "Insurance Policy",
    itemNameLabel: "Policy name",
    dueDateLabel: "Expiry date",
    fields: [
      { key: "policyNumber", label: "Policy number", type: "text", placeholder: "optional" },
      { key: "provider", label: "Provider", type: "text", required: true },
      { key: "coverageType", label: "Coverage type", type: "text", placeholder: "optional" },
      { key: "startDate", label: "Start date", type: "date" },
    ],
  },
  {
    key: "vendor_contract",
    label: "Vendor / Service Contract",
    itemNameLabel: "Contract name",
    dueDateLabel: "Renewal date",
    fields: [
      { key: "vendorName", label: "Vendor name", type: "text", required: true },
      { key: "contractType", label: "Contract type", type: "text", placeholder: "optional" },
      { key: "startDate", label: "Start date", type: "date" },
    ],
  },
  {
    key: "facility_item",
    label: "Facility / Building Item",
    itemNameLabel: "Item name",
    dueDateLabel: "Next inspection due",
    fields: [
      { key: "location", label: "Location", type: "text", placeholder: "optional" },
      { key: "lastInspectedDate", label: "Last inspected", type: "date" },
    ],
  },
];

export function getTypeDef(key: string): CategoryTypeDef {
  return CATEGORY_TYPE_DEFS.find((t) => t.key === key) ?? CATEGORY_TYPE_DEFS[0];
}

export const CATEGORY_TYPE_DOT: Record<string, string> = {
  license_permit: "#4F46E5",
  staff_credential: "#7C3AED",
  equipment_calibration: "#0891B2",
  equipment_maintenance: "#0EA5E9",
  insurance_policy: "#2563EB",
  vendor_contract: "#D97706",
  facility_item: "#64748B",
};

// Builds a short "detail line" for a list row from whichever
// type-specific fields that license actually has values for, e.g.
// "Staff: Dr. Ahmed · Nursing license" or "SN: 88213 · Vendor: Acme".
export function buildDetailLine(
  typeKey: string,
  license: Record<string, unknown>
): string {
  const def = getTypeDef(typeKey);
  const parts: string[] = [];
  for (const field of def.fields) {
    const value = license[field.key];
    if (value && typeof value === "string") {
      parts.push(`${field.label}: ${value}`);
    }
  }
  return parts.join(" · ");
}
