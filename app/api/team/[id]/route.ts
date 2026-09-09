import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/session";
import { getUserById, updateUserRole, deleteUser, countOwners, getUsersForClinic } from "@/lib/models";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
      { error: "Only owners and admins can change roles." },
      { status: 403 }
    );
  }

  const { id } = await params;
  const target = getUserById(id);
  if (!target || target.clinicId !== clinic.id) {
    return NextResponse.json({ error: "Team member not found." }, { status: 404 });
  }

  const body = await req.json();
  const newRole = typeof body.role === "string" ? body.role : "";
  if (newRole !== "owner" && newRole !== "admin" && newRole !== "member") {
    return NextResponse.json({ error: "Invalid role." }, { status: 400 });
  }

  // Only an existing owner can promote someone to owner, or change an
  // existing owner's role — an admin managing the team can't touch
  // ownership itself, only admin/member.
  if ((target.role === "owner" || newRole === "owner") && caller.role !== "owner") {
    return NextResponse.json(
      { error: "Only an owner can change ownership." },
      { status: 403 }
    );
  }

  // Never leave a clinic with zero owners.
  if (target.role === "owner" && newRole !== "owner" && countOwners(clinic.id) <= 1) {
    return NextResponse.json(
      { error: "Can't remove the last owner — promote someone else first." },
      { status: 400 }
    );
  }

  updateUserRole(target.id, newRole);
  return NextResponse.json({ id: target.id, role: newRole });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
      { error: "Only owners and admins can remove teammates." },
      { status: 403 }
    );
  }

  const { id } = await params;
  const target = getUserById(id);
  if (!target || target.clinicId !== clinic.id) {
    return NextResponse.json({ error: "Team member not found." }, { status: 404 });
  }

  if (target.role === "owner" && caller.role !== "owner") {
    return NextResponse.json(
      { error: "Only an owner can remove another owner." },
      { status: 403 }
    );
  }
  if (target.role === "owner" && countOwners(clinic.id) <= 1) {
    return NextResponse.json(
      { error: "Can't remove the last owner — promote someone else first." },
      { status: 400 }
    );
  }
  if (getUsersForClinic(clinic.id).length <= 1) {
    return NextResponse.json(
      { error: "Can't remove the only remaining account on this clinic." },
      { status: 400 }
    );
  }

  deleteUser(target.id);
  return NextResponse.json({ ok: true });
}
