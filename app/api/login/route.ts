import { NextRequest, NextResponse } from "next/server";
import { getUserByEmail, getClinicById } from "@/lib/models";
import { verifyPassword, createToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { email, password } = body;

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password are required." },
      { status: 400 }
    );
  }

  // users is the authoritative login table now (multi-user) — every
  // clinic, including ones that existed before this change, has a
  // matching "owner" user backfilled automatically. See the
  // migration note at the top of lib/db.ts.
  const user = getUserByEmail(email);
  if (!user) {
    return NextResponse.json(
      { error: "Invalid email or password." },
      { status: 401 }
    );
  }

  const valid = await verifyPassword(password, user.password);
  if (!valid) {
    return NextResponse.json(
      { error: "Invalid email or password." },
      { status: 401 }
    );
  }

  const clinic = getClinicById(user.clinicId);
  if (!clinic) {
    return NextResponse.json(
      { error: "Invalid email or password." },
      { status: 401 }
    );
  }

  const token = createToken(clinic.id, user.id);
  const response = NextResponse.json({
    id: clinic.id,
    name: clinic.name,
    email: user.email,
  });
  response.cookies.set("token", token, {
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });
  return response;
}
