import { NextRequest } from "next/server";
import { verifyToken } from "./auth";
import { getClinicById, getUserById, Clinic, User } from "./models";

// Reads the "token" cookie from the request, verifies it, and returns
// the associated clinic — or null if not authenticated. Clinic-scoped
// data (licenses, categories, etc.) is shared by every user at that
// clinic, so routes that only need "which clinic's data" keep using
// this — unaffected by which teammate is actually logged in.
export function getAuthenticatedClinic(req: NextRequest): Clinic | null {
  const token = req.cookies.get("token")?.value;
  if (!token) return null;

  const payload = verifyToken(token);
  if (!payload) return null;

  const clinic = getClinicById(payload.clinicId);
  return clinic ?? null;
}

// Same as above, but also resolves the specific logged-in user (and
// their role) — needed for anything that's per-person rather than
// per-clinic: changing your own password, or team-management routes
// that need to check the caller's role. Returns null for tokens
// issued before the multi-user migration (no userId in the payload)
// — those users just need to log in again to pick up a real session.
export function getAuthenticatedUser(
  req: NextRequest
): { user: User; clinic: Clinic } | null {
  const token = req.cookies.get("token")?.value;
  if (!token) return null;

  const payload = verifyToken(token);
  if (!payload?.userId) return null;

  const user = getUserById(payload.userId);
  if (!user) return null;

  const clinic = getClinicById(user.clinicId);
  if (!clinic) return null;

  return { user, clinic };
}
