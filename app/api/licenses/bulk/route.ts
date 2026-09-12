import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedClinic, getRequestActor } from "@/lib/session";
import { createLicenses, LICENSE_OPTIONAL_FIELDS, type LicenseOptionalField } from "@/lib/models";
import { CATEGORY_TYPES, getCategoryType } from "@/lib/categoryTypes";

const VALID_CATEGORIES = ["Facility", "Staff", "Equipment", "Insurance", "Other"];
const VALID_TYPE_KEYS = CATEGORY_TYPES.map((t) => t.key);

export async function POST(req: NextRequest) {
  const clinic = getAuthenticatedClinic(req);
  if (!clinic) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const body = await req.json();
  const rows = Array.isArray(body.licenses) ? body.licenses : [];

  if (rows.length === 0) {
    return NextResponse.json({ error: "No rows to import." }, { status: 400 });
  }

  const valid: ({
    name: string;
    expiryDate: string;
  } & Partial<Record<LicenseOptionalField, string | null>>)[] = [];
  const errors: { row: number; reason: string }[] = [];

  rows.forEach((row: Record<string, unknown>, i: number) => {
    const name = typeof row.name === "string" ? row.name.trim() : "";
    const expiryDate = typeof row.expiryDate === "string" ? row.expiryDate.trim() : "";

    if (!name || !expiryDate) {
      errors.push({ row: i + 1, reason: "Missing name or expiry date." });
      return;
    }
    if (Number.isNaN(new Date(expiryDate).getTime())) {
      errors.push({ row: i + 1, reason: `Unrecognized expiry date: "${expiryDate}"` });
      return;
    }

    // Every row declares which entity type it is (defaults to
    // License/Permit for older template files that don't have a
    // "type" column). Only the fields that type actually uses get
    // written — a row for equipment_calibration never picks up a
    // stray "authority" value meant for a license row, and vice
    // versa, even if the CSV happens to have both columns present.
    const rawTypeKey = typeof row.typeKey === "string" ? row.typeKey.trim() : "";
    const typeKey = VALID_TYPE_KEYS.includes(rawTypeKey) ? rawTypeKey : "license_permit";
    const typeDef = getCategoryType(typeKey)!;
    const allowedFieldKeys = new Set(typeDef.fields.map((f) => f.key));

    const rawCategory = typeof row.category === "string" ? row.category.trim() : "";
    const category = VALID_CATEGORIES.includes(rawCategory) ? rawCategory : "Other";

    const entry: {
      name: string;
      expiryDate: string;
    } & Partial<Record<LicenseOptionalField, string | null>> = {
      name,
      expiryDate,
      typeKey,
      category,
      notes: typeof row.notes === "string" ? row.notes.trim() : undefined,
    };

    for (const field of LICENSE_OPTIONAL_FIELDS) {
      if (field === "typeKey" || field === "category" || field === "notes") continue;
      if (!allowedFieldKeys.has(field)) continue;
      const raw = row[field];
      if (typeof raw === "string" && raw.trim()) {
        entry[field] = raw.trim();
      }
    }

    valid.push(entry);
  });

  const created = valid.length > 0 ? createLicenses(clinic.id, valid, getRequestActor(req)) : [];

  return NextResponse.json({ created, errors });
}