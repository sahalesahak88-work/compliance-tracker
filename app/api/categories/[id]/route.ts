import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedClinic } from "@/lib/session";
import { getCategoryById, deleteCategory } from "@/lib/models";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const clinic = getAuthenticatedClinic(req);
  if (!clinic) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { id } = await params;
  const category = getCategoryById(id);
  if (!category || category.clinicId !== clinic.id) {
    return NextResponse.json({ error: "Category not found." }, { status: 404 });
  }

  deleteCategory(id);
  return NextResponse.json({ success: true });
}
