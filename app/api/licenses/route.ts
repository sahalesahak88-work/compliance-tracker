import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedClinic, getRequestActor } from "@/lib/session";
import { createLicense, getLicensesForClinic, LICENSE_OPTIONAL_FIELDS } from "@/lib/models";
import { getCategoryType } from "@/lib/categoryTypes";

export async function GET(req: NextRequest) {
  const clinic = getAuthenticatedClinic(req);
  if (!clinic) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  const licenses = getLicensesForClinic(clinic.id);
  return NextResponse.json(licenses);
}

export async function POST(req: NextRequest) {
  const clinic = getAuthenticatedClinic(req);
  if (!clinic) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const body = await req.json();
  const { name, expiryDate } = body;

  if (!name || !expiryDate) {
    return NextResponse.json(
      { error: "Item name and expiry/due date are required." },
      { status: 400 }
    );
  }

  // Enforce each type's required fields server-side too — the add
  // form already marks these and sets the HTML `required` attribute,
  // but that's client-side only and this endpoint can be called
  // directly, so the check has to live here as well.
  const typeKey = typeof body.typeKey === "string" ? body.typeKey : "license_permit";
  const typeDef = getCategoryType(typeKey);
  if (typeDef) {
    const missing = typeDef.fields.filter(
      (f) => f.required && !(typeof body[f.key] === "string" && body[f.key].trim())
    );
    if (missing.length > 0) {
      return NextResponse.json(
        { error: `${missing.map((f) => f.label).join(", ")} ${missing.length > 1 ? "are" : "is"} required for ${typeDef.label}.` },
        { status: 400 }
      );
    }
  }

  // Pick out only the known optional fields from the request body —
  // whatever the client sent for the selected category type (e.g.
  // staffName + credentialType for a Staff Credential, or
  // equipmentName + serialNumber for Equipment). Anything else in
  // the body is ignored rather than trusted directly.
  const optionalData: Record<string, string | null> = {};
  for (const field of LICENSE_OPTIONAL_FIELDS) {
    if (body[field] !== undefined) {
      optionalData[field] = body[field] === "" ? null : body[field];
    }
  }

  const license = createLicense(
    {
      clinicId: clinic.id,
      name,
      expiryDate,
      ...optionalData,
    },
    getRequestActor(req)
  );

  return NextResponse.json(license);
}
