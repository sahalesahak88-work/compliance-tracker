import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyToken } from "@/lib/auth";
import { getClinicById, getUserById, getEnabledCategoryTypeKeys, getUsersForClinic } from "@/lib/models";
import SettingsClient from "./SettingsClient";

export default async function SettingsPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  const payload = token ? verifyToken(token) : null;

  // payload.userId is missing for a session token issued before the
  // multi-user migration — settings (team management especially)
  // needs to know exactly which user is logged in, not just which
  // clinic, so those sessions are sent back to log in again rather
  // than guessed at.
  if (!payload?.userId) {
    redirect("/login");
  }

  const currentUser = getUserById(payload.userId);
  const clinic = currentUser ? getClinicById(currentUser.clinicId) : undefined;
  if (!currentUser || !clinic) {
    redirect("/login");
  }

  const enabledTypeKeys = getEnabledCategoryTypeKeys(clinic.id);
  const teamMembers = getUsersForClinic(clinic.id).map(({ password: _password, ...rest }) => rest);

  // Never pass password hashes down to a client component — they'd
  // get serialized into the page's HTML/RSC payload.
  const { password: _clinicPassword, ...clinicWithoutPassword } = clinic;
  const { password: _userPassword, ...currentUserWithoutPassword } = currentUser;

  return (
    <SettingsClient
      clinic={clinicWithoutPassword}
      currentUser={currentUserWithoutPassword}
      enabledTypeKeys={enabledTypeKeys}
      initialTeamMembers={teamMembers}
    />
  );
}
