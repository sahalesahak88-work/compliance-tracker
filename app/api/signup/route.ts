import { NextRequest, NextResponse } from "next/server";
import { createClinic, createUser, getClinicByEmail, getUserByEmail } from "@/lib/models";
import { hashPassword, createToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, authority, email, password } = body;

  if (!name || !authority || !email || !password) {
    return NextResponse.json(
      { error: "All fields are required." },
      { status: 400 }
    );
  }

  // Check both tables: clinics.email is kept as a legacy mirror of
  // the owner's email (see lib/db.ts multi-user migration note), and
  // users.email is the real, authoritative login identity going
  // forward. Either one already existing means this email is taken.
  const existingClinic = getClinicByEmail(email);
  const existingUser = getUserByEmail(email);
  if (existingClinic || existingUser) {
    return NextResponse.json(
      { error: "An account with this email already exists." },
      { status: 409 }
    );
  }

  const hashedPassword = await hashPassword(password);
  const clinic = createClinic({ name, authority, email, hashedPassword });
  // The person who signs up becomes the clinic's first user, as
  // "owner" — they can invite teammates afterward from Settings.
  const user = createUser({
    clinicId: clinic.id,
    name,
    email,
    hashedPassword,
    role: "owner",
  });
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
