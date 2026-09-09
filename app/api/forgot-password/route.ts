import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { getUserByEmail, createPasswordReset } from "@/lib/models";
import { generateResetToken, hashResetToken } from "@/lib/auth";

const FROM_EMAIL = process.env.REMINDER_FROM_EMAIL || "reminders@yourdomain.com";
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

// Always responds with the same generic message whether or not the
// email is registered — returning a different response for "unknown
// email" is a classic account-enumeration leak, so a non-existent
// email and a real one look identical to the caller.
const GENERIC_MESSAGE =
  "If an account exists for that email, we've sent a password reset link.";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const email = typeof body.email === "string" ? body.email.trim() : "";

  if (!email) {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }

  const user = getUserByEmail(email);

  if (user) {
    const token = generateResetToken();
    const tokenHash = hashResetToken(token);
    const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS).toISOString();

    createPasswordReset({ userId: user.id, tokenHash, expiresAt });

    const origin = process.env.APP_URL || req.nextUrl.origin;
    const resetUrl = `${origin}/reset-password?token=${token}`;

    // Best-effort send — matches scripts/send-reminders.ts: if
    // RESEND_API_KEY isn't configured (e.g. local dev), this will
    // fail and get logged, but the caller still sees the generic
    // success message so behavior doesn't leak whether sending
    // actually worked. Resend is constructed here rather than at
    // module scope because its constructor throws on a missing key,
    // which would otherwise break `next build`'s route data
    // collection for this file even when no key is configured yet.
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: FROM_EMAIL,
        to: user.email,
        subject: "Reset your Compliance Tracker password",
        html: `
          <p>Hi ${user.name},</p>
          <p>
            We received a request to reset your Compliance Tracker password.
            Click the link below to choose a new one — it expires in 1 hour:
          </p>
          <p><a href="${resetUrl}">${resetUrl}</a></p>
          <p>If you didn't request this, you can safely ignore this email.</p>
          <p>— Your Compliance Tracker</p>
        `,
      });
    } catch (err) {
      console.error(`Failed to send password reset email to ${user.email}:`, err);
    }
  }

  return NextResponse.json({ message: GENERIC_MESSAGE });
}
