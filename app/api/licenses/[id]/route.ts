import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedClinic } from "@/lib/session";
import {
  getLicenseById,
  updateLicense,
  deleteLicense,
  LICENSE_OPTIONAL_FIELDS,
} from "@/lib/models";
import { getCategoryType } from "@/lib/categoryTypes";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const clinic = getAuthenticatedClinic(req);
  if (!clinic) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { id } = await params;
  const license = getLicenseById(id);
  if (!license || license.clinicId !== clinic.id) {
    return NextResponse.json({ error: "License not found." }, { status: 404 });
  }

  const body = await req.json();

  // Same required-field enforcement as creation, checked against the
  // item's existing type (edits don't change typeKey) merged with
  // whatever this request is updating, so a required field already
  // saved on the record doesn't need to be resent to pass.
  const typeDef = getCategoryType(license.typeKey || "license_permit");
  if (typeDef) {
    const missing = typeDef.fields.filter((f) => {
      if (!f.required) return false;
      const incoming = body[f.key];
      const existing = (license as unknown as Record<string, unknown>)[f.key];
      const effective = incoming !== undefined ? incoming : existing;
      return !(typeof effective === "string" && effective.trim());
    });
    if (missing.length > 0) {
      return NextResponse.json(
        { error: `${missing.map((f) => f.label).join(", ")} ${missing.length > 1 ? "are" : "is"} required for ${typeDef.label}.` },
        { status: 400 }
      );
    }
  }

  // Whitelist: only name/expiryDate plus the known Phase 1.7 optional
  // fields can be updated through this route — anything else in the
  // body is dropped rather than passed straight to the SQL builder.
  const update: Record<string, string | null> = {};
  if (typeof body.name === "string") update.name = body.name;
  if (typeof body.expiryDate === "string") update.expiryDate = body.expiryDate;
  for (const field of LICENSE_OPTIONAL_FIELDS) {
    if (body[field] !== undefined) {
      update[field] = body[field] === "" ? null : body[field];
    }
  }

  updateLicense(id, update);
  return NextResponse.json(getLicenseById(id));
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const clinic = getAuthenticatedClinic(req);
  if (!clinic) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { id } = await params;
  const license = getLicenseById(id);
  if (!license || license.clinicId !== clinic.id) {
    return NextResponse.json({ error: "License not found." }, { status: 404 });
  }

  deleteLicense(id);
  return NextResponse.json({ success: true });
}
