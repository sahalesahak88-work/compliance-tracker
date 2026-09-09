import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/session";
import { updateClinicProfile } from "@/lib/models";
import { LICENSE_AUTHORITIES } from "@/lib/db";

export async function PATCH(req: NextRequest) {
  const session = getAuthenticatedUser(req);
  if (!session) {
    return NextResponse.json(
      { error: "Not authenticated. If you haven't logged in since this update, please log in again." },
      { status: 401 }
    );
  }
  const { user, clinic } = session;

  // Clinic name/authority affect every teammate's dashboard, so only
  // owner/admin can change them — a regular member editing them out
  // from under the rest of the team would be surprising.
  if (user.role !== "owner" && user.role !== "admin") {
    return NextResponse.json(
      { error: "Only owners and admins can edit the clinic profile." },
      { status: 403 }
    );
  }

  const body = await req.json();
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const authority = typeof body.authority === "string" ? body.authority.trim() : "";

  if (!name) {
    return NextResponse.json({ error: "Clinic name is required." }, { status: 400 });
  }
  if (!LICENSE_AUTHORITIES.includes(authority as (typeof LICENSE_AUTHORITIES)[number])) {
    return NextResponse.json({ error: "Unrecognized authority." }, { status: 400 });
  }

  updateClinicProfile(clinic.id, { name, authority });
  return NextResponse.json({ name, authority });
}
