import { NextRequest, NextResponse } from "next/server";
import { getValidPasswordReset, markPasswordResetUsed, updateUserPassword } from "@/lib/models";
import { hashPassword, hashResetToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const token = typeof body.token === "string" ? body.token : "";
  const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";

  if (!token || !newPassword) {
    return NextResponse.json(
      { error: "Reset token and new password are both required." },
      { status: 400 }
    );
  }
  if (newPassword.length < 8) {
    return NextResponse.json(
      { error: "New password must be at least 8 characters." },
      { status: 400 }
    );
  }

  const reset = getValidPasswordReset(hashResetToken(token));
  if (!reset) {
    return NextResponse.json(
      { error: "This reset link is invalid or has expired. Please request a new one." },
      { status: 400 }
    );
  }

  const hashed = await hashPassword(newPassword);
  updateUserPassword(reset.userId, hashed);
  markPasswordResetUsed(reset.id);

  return NextResponse.json({ ok: true });
}
