import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedClinic, getRequestActor } from "@/lib/session";
import { getLicenseById, renewLicense } from "@/lib/models";

export async function POST(
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
  const { expiryDate } = body;

  if (!expiryDate || Number.isNaN(new Date(expiryDate).getTime())) {
    return NextResponse.json({ error: "A valid new expiry date is required." }, { status: 400 });
  }

  renewLicense(id, expiryDate, getRequestActor(req));
  return NextResponse.json(getLicenseById(id));
}