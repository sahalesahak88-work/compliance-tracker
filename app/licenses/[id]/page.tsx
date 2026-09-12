import { cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { verifyToken } from "@/lib/auth";
import { getClinicById, getLicenseById, getLicenseHistory, getCategoriesForClinic } from "@/lib/models";
import LicenseDetailClient from "./LicenseDetailClient";

export default async function LicenseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
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

  const { id } = await params;
  const license = getLicenseById(id);

  // Same "not found" treatment whether the id doesn't exist at all
  // or belongs to a different clinic — a stale/guessed id from
  // another clinic shouldn't distinguish those two cases.
  if (!license || license.clinicId !== clinic.id) {
    notFound();
  }

  const history = getLicenseHistory(id);
  const categories = getCategoriesForClinic(clinic.id);
  const categoryName = categories.find((c) => c.id === license.categoryId)?.name ?? null;

  return (
    <LicenseDetailClient
      initialLicense={license}
      initialHistory={history}
      categoryName={categoryName}
    />
  );
}
