import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedClinic } from "@/lib/session";
import {
  setEnabledCategoryTypes,
  getEnabledCategoryTypeKeys,
} from "@/lib/models";
import { CATEGORY_TYPES } from "@/lib/categoryTypes";

const VALID_KEYS = new Set(CATEGORY_TYPES.map((t) => t.key));

export async function GET(req: NextRequest) {
  const clinic = getAuthenticatedClinic(req);
  if (!clinic) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  const enabled = getEnabledCategoryTypeKeys(clinic.id);
  return NextResponse.json({ enabled });
}

export async function POST(req: NextRequest) {
  const clinic = getAuthenticatedClinic(req);
  if (!clinic) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const body = await req.json();
  const typeKeys: unknown = body?.typeKeys;

  if (!Array.isArray(typeKeys) || typeKeys.some((k) => typeof k !== "string")) {
    return NextResponse.json(
      { error: "typeKeys must be an array of strings." },
      { status: 400 }
    );
  }

  const invalid = typeKeys.filter((k) => !VALID_KEYS.has(k));
  if (invalid.length > 0) {
    return NextResponse.json(
      { error: `Unknown category type key(s): ${invalid.join(", ")}` },
      { status: 400 }
    );
  }

  setEnabledCategoryTypes(clinic.id, typeKeys as string[]);
  return NextResponse.json({ enabled: typeKeys });
}
