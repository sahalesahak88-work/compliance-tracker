// THE single source of truth for the 7 fixed category types.
//
// This used to be split across four separate, hand-maintained copies
// that had already drifted apart before anyone noticed:
//   - lib/db.ts            (server, just key/label/fields[] as strings)
//   - lib/categoryTypes.ts (server, this file — had its own field set
//                           including equipmentName/itemName as
//                           separate REQUIRED fields, and a per-type
//                           expiryFieldKey design that was never
//                           actually implemented anywhere)
//   - app/dashboard/categoryTypes.ts (client — the one actually
//                           driving the add/edit forms; treats the
//                           universal `name` column as the equipment/
//                           item name, and the universal `expiryDate`
//                           column as the one due-date field for every
//                           type, labelled differently per type)
//   - app/onboarding/page.tsx (a fourth, hand-typed copy of just the
//                           key/label/hint list, for the onboarding
//                           screen)
//
// This file now reflects what the app ACTUALLY does (universal name +
// universal expiryDate for every type — see the `licenses` table and
// DashboardClient.tsx), not the earlier, abandoned per-type-column
// design. `equipmentName`, `itemName`, `nextCalibrationDue`,
// `nextServiceDue`, `renewalDate`, and `nextInspectionDue` remain as
// columns in the `licenses` table (see lib/db.ts phase17Columns) for
// backward compatibility with any dev.db created before this cleanup,
// but nothing writes to them anymore — the app has always used `name`
// and `expiryDate` for those types in practice.
//
// It's plain data with no node:sqlite import, so it's safe to import
// from both server code (API routes) and client components
// ("use client" files) alike — that's the whole point.

export type FieldType = "text" | "date" | "select";

export interface TypeField {
  key: string; // maps to a column on the licenses table
  label: string;
  type: FieldType;
  options?: string[]; // for type: "select"
  placeholder?: string;
  required?: boolean;
}

export interface CategoryType {
  key: string; // stored as typeKey in the DB
  label: string;
  description: string; // shown on the onboarding screen
  itemNameLabel: string; // what to call the universal `name` field for this type
  dueDateLabel: string; // what to call the universal `expiryDate` field for this type
  dotColor: string;
  // Fields specific to this type, rendered in its add/edit form, IN
  // ADDITION to the universal fields every item has (name, category,
  // expiryDate, notes).
  fields: TypeField[];
  defaultEnabled: boolean;
}

export const CATEGORY_TYPES: CategoryType[] = [
  {
    key: "license_permit",
    label: "License / Permit",
    description: "DHA/MOH/DOH licenses and regulatory permits",
    itemNameLabel: "License / certificate name",
    dueDateLabel: "Expiry date",
    dotColor: "#4F46E5",
    fields: [
      { key: "authority", label: "Issuing authority", type: "select", options: ["DHA", "MOH", "DOH", "FANR", "Other"], required: true },
      { key: "number", label: "License number", type: "text", placeholder: "optional" },
      { key: "issuedDate", label: "Issued date", type: "date" },
    ],
    defaultEnabled: true,
  },
  {
    key: "staff_credential",
    label: "Staff Credential",
    description: "Staff licenses, certifications, and training records",
    itemNameLabel: "Credential name",
    dueDateLabel: "Expiry date",
    dotColor: "#7C3AED",
    fields: [
      { key: "staffName", label: "Staff member name", type: "text", required: true },
      { key: "credentialType", label: "Credential type", type: "text", placeholder: "e.g. Nursing license" },
      { key: "issuedDate", label: "Issued date", type: "date" },
    ],
    defaultEnabled: false,
  },
  {
    key: "equipment_calibration",
    label: "Equipment — Calibration",
    description: "Equipment calibration due dates",
    itemNameLabel: "Equipment name",
    dueDateLabel: "Next calibration due",
    dotColor: "#0891B2",
    fields: [
      { key: "serialNumber", label: "Serial number", type: "text", placeholder: "optional" },
      { key: "lastCalibratedDate", label: "Last calibrated", type: "date" },
      { key: "vendor", label: "Calibration vendor", type: "text", placeholder: "optional" },
    ],
    defaultEnabled: false,
  },
  {
    key: "equipment_maintenance",
    label: "Equipment — Maintenance",
    description: "Equipment servicing and maintenance due dates",
    itemNameLabel: "Equipment name",
    dueDateLabel: "Next service due",
    dotColor: "#0EA5E9",
    fields: [
      { key: "serialNumber", label: "Serial number", type: "text", placeholder: "optional" },
      { key: "lastServicedDate", label: "Last serviced", type: "date" },
      { key: "technician", label: "Technician / vendor", type: "text", placeholder: "optional" },
    ],
    defaultEnabled: false,
  },
  {
    key: "insurance_policy",
    label: "Insurance Policy",
    description: "Insurance policies and coverage renewal dates",
    itemNameLabel: "Policy name",
    dueDateLabel: "Expiry date",
    dotColor: "#2563EB",
    fields: [
      { key: "policyNumber", label: "Policy number", type: "text", placeholder: "optional" },
      { key: "provider", label: "Provider", type: "text", required: true },
      { key: "coverageType", label: "Coverage type", type: "text", placeholder: "optional" },
      { key: "startDate", label: "Start date", type: "date" },
    ],
    defaultEnabled: false,
  },
  {
    key: "vendor_contract",
    label: "Vendor / Service Contract",
    description: "Vendor and service contract renewal dates",
    itemNameLabel: "Contract name",
    dueDateLabel: "Renewal date",
    dotColor: "#D97706",
    fields: [
      { key: "vendorName", label: "Vendor name", type: "text", required: true },
      { key: "contractType", label: "Contract type", type: "text", placeholder: "optional" },
      { key: "startDate", label: "Start date", type: "date" },
    ],
    defaultEnabled: false,
  },
  {
    key: "facility_item",
    label: "Facility / Building Item",
    description: "Facility inspections and building compliance items",
    itemNameLabel: "Item name",
    dueDateLabel: "Next inspection due",
    dotColor: "#64748B",
    fields: [
      { key: "location", label: "Location", type: "text", placeholder: "optional" },
      { key: "lastInspectedDate", label: "Last inspected", type: "date" },
    ],
    defaultEnabled: false,
  },
];

export type CategoryTypeKey = (typeof CATEGORY_TYPES)[number]["key"];

export function getCategoryType(typeKey: string): CategoryType | undefined {
  return CATEGORY_TYPES.find((t) => t.key === typeKey);
}

// Same lookup, but always returns something (falls back to the first
// type) — used by UI code that renders a form and needs a def no
// matter what, rather than needing to handle `undefined`.
export function getTypeDef(typeKey: string): CategoryType {
  return getCategoryType(typeKey) ?? CATEGORY_TYPES[0];
}

export const DEFAULT_ENABLED_TYPE_KEYS = CATEGORY_TYPES.filter(
  (t) => t.defaultEnabled
).map((t) => t.key);

export const CATEGORY_TYPE_DOT: Record<string, string> = Object.fromEntries(
  CATEGORY_TYPES.map((t) => [t.key, t.dotColor])
);

// Builds a short "detail line" for a list row from whichever
// type-specific fields that item actually has values for, e.g.
// "Staff member name: Dr. Ahmed · Credential type: Nursing license"
// or "Serial number: 88213 · Calibration vendor: Acme".
export function buildDetailLine(
  typeKey: string,
  item: Record<string, unknown>
): string {
  const def = getTypeDef(typeKey);
  const parts: string[] = [];
  for (const field of def.fields) {
    const value = item[field.key];
    if (value && typeof value === "string") {
      parts.push(`${field.label}: ${value}`);
    }
  }
  return parts.join(" · ");
}
