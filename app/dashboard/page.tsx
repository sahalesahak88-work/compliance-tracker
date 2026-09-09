import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyToken } from "@/lib/auth";
import {
  getClinicById,
  getLicensesForClinic,
  hasCompletedCategoryOnboarding,
  getEnabledCategoryTypeKeys,
  getCategoriesForClinic,
} from "@/lib/models";
import DashboardClient from "./DashboardClient";

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  const payload = token ? verifyToken(token) : null;

  if (!payload) {
    redirect("/login");
  }

  const clinic = getClinicById(payload.clinicId);
  if (!clinic) {
    redirect("/login");
  }

  // Covers both brand-new signups (redirected here before finishing
  // onboarding, e.g. closed the tab) and pre-existing clinics that
  // signed up before category types existed — neither has a
  // user_category_types row yet, so send them to pick their types.
  if (!hasCompletedCategoryOnboarding(clinic.id)) {
    redirect("/onboarding");
  }

  const licenses = getLicensesForClinic(clinic.id);
  const enabledTypeKeys = getEnabledCategoryTypeKeys(clinic.id);
  const categories = getCategoriesForClinic(clinic.id);

  return (
    <DashboardClient
      clinic={clinic}
      initialLicenses={licenses}
      enabledTypeKeys={enabledTypeKeys}
      initialCategories={categories}
    />
  );
}
