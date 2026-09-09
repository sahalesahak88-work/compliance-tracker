import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/session";
import {
  createUser,
  getUsersForClinic,
  getClinicByEmail,
  getUserByEmail,
  type User,
} from "@/lib/models";
import { hashPassword } from "@/lib/auth";
import { type UserRole } from "@/lib/db";

function withoutPassword(user: User) {
  const { password: _password, ...rest } = user;
  return rest;
}

export async function GET(req: NextRequest) {
  const session = getAuthenticatedUser(req);
  if (!session) {
    return NextResponse.json(
      { error: "Not authenticated. If you haven't logged in since this update, please log in again." },
      { status: 401 }
    );
  }

  // Everyone on the team can see who else has access — this isn't a
  // permissions-gated view, just a roster. Only the actions below
  // (add/change role/remove) are role-restricted.
  const users = getUsersForClinic(session.clinic.id).map(withoutPassword);
  return NextResponse.json(users);
}

export async function POST(req: NextRequest) {
  const session = getAuthenticatedUser(req);
  if (!session) {
    return NextResponse.json(
      { error: "Not authenticated. If you haven't logged in since this update, please log in again." },
      { status: 401 }
    );
  }
  const { user: caller, clinic } = session;

  if (caller.role !== "owner" && caller.role !== "admin") {
    return NextResponse.json(
      { error: "Only owners and admins can add teammates." },
      { status: 403 }
    );
  }

  const body = await req.json();
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const role = typeof body.role === "string" ? body.role : "member";

  if (!name || !email || !password) {
    return NextResponse.json(
      { error: "Name, email, and a starting password are all required." },
      { status: 400 }
    );
  }
  if (password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters." },
      { status: 400 }
    );
  }
  // Adding a teammate can only make them an admin or member — the
  // only way to become an owner is signing up (the first user) or
  // being promoted afterward by an existing owner (see PATCH below).
  // This keeps "who can create another owner" to a single, auditable path.
  if (role !== "admin" && role !== "member") {
    return NextResponse.json(
      { error: "New teammates must be added as admin or member." },
      { status: 400 }
    );
  }
  if (getClinicByEmail(email) || getUserByEmail(email)) {
    return NextResponse.json(
      { error: "Someone with this email already has an account." },
      { status: 409 }
    );
  }

  const hashedPassword = await hashPassword(password);
  const newUser = createUser({
    clinicId: clinic.id,
    name,
    email,
    hashedPassword,
    role: role as UserRole,
  });

  return NextResponse.json(withoutPassword(newUser), { status: 201 });
}
