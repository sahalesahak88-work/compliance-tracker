import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";

// In production, set a real secret via environment variable.
// This fallback is only for local development.
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-in-production";

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(
  password: string,
  hashed: string
): Promise<boolean> {
  return bcrypt.compare(password, hashed);
}

export function createToken(clinicId: string, userId: string): string {
  return jwt.sign({ clinicId, userId }, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): { clinicId: string; userId: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { clinicId: string; userId: string };
  } catch {
    return null;
  }
}

// Forgot-password tokens. The raw token goes in the emailed link and
// is never persisted; only its sha256 hash is stored (see the
// password_resets table in lib/db.ts), the same reason passwords are
// hashed rather than stored plain — a database leak alone shouldn't
// let anyone reset an account.
export function generateResetToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function hashResetToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}
