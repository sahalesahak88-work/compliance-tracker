import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

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
