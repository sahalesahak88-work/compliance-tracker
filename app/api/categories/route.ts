import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedClinic } from "@/lib/session";
import { createCategory, getCategoriesForClinic } from "@/lib/models";
import { CATEGORY_TYPES } from "@/lib/categoryTypes";

const VALID_TYPE_KEYS = new Set(CATEGORY_TYPES.map((t) => t.key));

export async function GET(req: NextRequest) {
  const clinic = getAuthenticatedClinic(req);
  if (!clinic) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  const categories = getCategoriesForClinic(clinic.id);
  return NextResponse.json(categories);
}

export async function POST(req: NextRequest) {
  const clinic = getAuthenticatedClinic(req);
  if (!clinic) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const body = await req.json();
  const { typeKey, name } = body;

  if (!typeKey || !VALID_TYPE_KEYS.has(typeKey)) {
    return NextResponse.json({ error: "Unknown category type." }, { status: 400 });
  }
  if (!name || typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "Category name is required." }, { status: 400 });
  }

  const category = createCategory({ clinicId: clinic.id, typeKey, name: name.trim() });
  return NextResponse.json(category);
}
