// Database setup using Node's built-in SQLite module (node:sqlite).
// Available natively in Node 22.5+ — no native compilation needed,
// unlike better-sqlite3, so it avoids requiring Visual Studio Build
// Tools on Windows.
// The database file (dev.db) is created automatically on first run.
// To move to Postgres later, this file is the only place that needs
// to change — everywhere else calls the exported functions in models.ts.

import { DatabaseSync } from "node:sqlite";
import path from "path";
import { randomUUID } from "crypto";

const dbPath = path.join(process.cwd(), "dev.db");
const db = new DatabaseSync(dbPath);

// WAL mode lets one process write while others read/wait instead of
// immediately throwing "database is locked" — matters because Next.js
// build spawns several parallel workers, and every route file that
// imports lib/db.ts opens this same file concurrently. busy_timeout
// gives a writer a grace period (5s) to wait for a lock to clear
// rather than failing on the first collision, which is what was
// happening during `next build` on Windows with many workers.
db.exec("PRAGMA journal_mode = WAL");
db.exec("PRAGMA busy_timeout = 5000");

// Enable foreign key constraints (off by default in SQLite)
db.exec("PRAGMA foreign_keys = ON");

// Create tables if they don't already exist
db.exec(`
  CREATE TABLE IF NOT EXISTS clinics (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    authority TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    createdAt TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    clinicId TEXT NOT NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'member',
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (clinicId) REFERENCES clinics(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS licenses (
    id TEXT PRIMARY KEY,
    clinicId TEXT NOT NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'Other',
    authority TEXT NOT NULL DEFAULT 'Other',
    number TEXT,
    issuedDate TEXT,
    expiryDate TEXT NOT NULL,
    notes TEXT,
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
    reminded90 INTEGER NOT NULL DEFAULT 0,
    reminded60 INTEGER NOT NULL DEFAULT 0,
    reminded30 INTEGER NOT NULL DEFAULT 0,
    reminded7 INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (clinicId) REFERENCES clinics(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS user_category_types (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    clinicId TEXT NOT NULL,
    typeKey TEXT NOT NULL,
    enabled INTEGER NOT NULL DEFAULT 1,
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (clinicId) REFERENCES clinics(id) ON DELETE CASCADE,
    UNIQUE (clinicId, typeKey)
  );

  CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    clinicId TEXT NOT NULL,
    typeKey TEXT NOT NULL,
    name TEXT NOT NULL,
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (clinicId) REFERENCES clinics(id) ON DELETE CASCADE
  );

  -- Forgot-password flow. We never store the raw token — only a
  -- sha256 hash of it (see lib/auth.ts hashResetToken) — so a leaked
  -- database row alone can't be used to reset anyone's password.
  -- Rows are never deleted; a used or superseded row just gets
  -- usedAt set, which is enough for getValidPasswordReset to reject
  -- it and gives us a paper trail if this ever needs auditing.
  CREATE TABLE IF NOT EXISTS password_resets (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    tokenHash TEXT NOT NULL UNIQUE,
    expiresAt TEXT NOT NULL,
    usedAt TEXT,
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
  );

  -- Renewal/edit history for the per-item detail page. One row per
  -- meaningful action (create/update/renew) rather than per raw SQL
  -- UPDATE, so a PATCH that changes nothing doesn't create noise.
  -- 'changes' is a JSON string of { field: { from, to } } for
  -- update/renew rows, and null for the initial create row. 'userId'/
  -- 'userName' are best-effort: routes attach them when the caller's
  -- token resolves to a specific user (see getAuthenticatedUser),
  -- and both stay null for an old pre-multi-user token -- the history
  -- entry itself still gets recorded either way. 'userName' is a
  -- snapshot taken at the time of the action (not a live join to
  -- 'users') so the log stays readable even if that person is later
  -- removed from the team.
  CREATE TABLE IF NOT EXISTS license_history (
    id TEXT PRIMARY KEY,
    licenseId TEXT NOT NULL,
    action TEXT NOT NULL,
    changes TEXT,
    userId TEXT,
    userName TEXT,
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (licenseId) REFERENCES licenses(id) ON DELETE CASCADE
  );
`);

// Migration: add the `category` column for any dev.db created before
// this field existed. CREATE TABLE IF NOT EXISTS above only affects
// brand-new databases, so this ALTER runs once for older ones. The
// try/catch just swallows the "duplicate column" error that fires on
// every database that already has it (including brand-new ones).
try {
  db.exec(`ALTER TABLE licenses ADD COLUMN category TEXT NOT NULL DEFAULT 'Other'`);
} catch {
  // column already exists — nothing to do
}

// Migration: add the `authority` column (DHA/MOH/DOH/FANR/Other) for
// any dev.db created before this field existed. Same pattern as the
// category migration above.
try {
  db.exec(`ALTER TABLE licenses ADD COLUMN authority TEXT NOT NULL DEFAULT 'Other'`);
} catch {
  // column already exists — nothing to do
}

// Migration (Phase 1.7): extend `licenses` with type-specific nullable
// columns so it can hold items from any category type, not just
// License/Permit. Table stays named `licenses` for now (rename to
// `tracked_items` deferred, see handoff). Each ALTER is wrapped
// individually so a dev.db that already has some of these columns
// (partial prior run) doesn't get stuck on the first duplicate.
//
// NOTE: equipmentName, itemName, nextCalibrationDue, nextServiceDue,
// renewalDate, and nextInspectionDue are kept here for backward
// compatibility with any dev.db from before the categoryTypes cleanup,
// but the app has never actually written to them — every type uses
// the universal `name` and `expiryDate` columns instead (see
// lib/categoryTypes.ts header comment). Safe to leave as always-null
// columns; not worth a destructive migration to drop them.
const phase17Columns: [string, string][] = [
  ["typeKey", `TEXT NOT NULL DEFAULT 'license_permit'`],
  ["categoryId", `TEXT`],
  ["staffName", `TEXT`],
  ["credentialType", `TEXT`],
  ["equipmentName", `TEXT`],
  ["serialNumber", `TEXT`],
  ["lastCalibratedDate", `TEXT`],
  ["nextCalibrationDue", `TEXT`],
  ["lastServicedDate", `TEXT`],
  ["nextServiceDue", `TEXT`],
  ["technician", `TEXT`],
  ["vendor", `TEXT`],
  ["policyNumber", `TEXT`],
  ["provider", `TEXT`],
  ["coverageType", `TEXT`],
  ["vendorName", `TEXT`],
  ["contractType", `TEXT`],
  ["startDate", `TEXT`],
  ["renewalDate", `TEXT`],
  ["itemName", `TEXT`],
  ["location", `TEXT`],
  ["lastInspectedDate", `TEXT`],
  ["nextInspectionDue", `TEXT`],
];
for (const [column, definition] of phase17Columns) {
  try {
    db.exec(`ALTER TABLE licenses ADD COLUMN ${column} ${definition}`);
  } catch {
    // column already exists — nothing to do
  }
}

// Migration (multi-user): backfill a `users` row for every existing
// clinic that predates the users table, so every clinic that could
// already log in keeps working exactly as before — as the clinic's
// "owner" — without anyone needing to re-signup. clinics.email /
// clinics.password are kept as-is going forward too (not dropped:
// SQLite ALTER TABLE can't cleanly drop a NOT NULL UNIQUE column, and
// it isn't worth a destructive rebuild) but are no longer read for
// login — the `users` table is now the single source of truth for
// authentication. See lib/models.ts for the User type and queries.
{
  const orphanedClinics = db
    .prepare(
      `SELECT c.id, c.name, c.email, c.password, c.createdAt
       FROM clinics c
       WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.email = c.email)`
    )
    .all() as {
    id: string;
    name: string;
    email: string;
    password: string;
    createdAt: string;
  }[];

  if (orphanedClinics.length > 0) {
    const insertUser = db.prepare(
      `INSERT INTO users (id, clinicId, name, email, password, role, createdAt)
       VALUES (?, ?, ?, ?, ?, 'owner', ?)`
    );
    for (const clinic of orphanedClinics) {
      insertUser.run(
        randomUUID(),
        clinic.id,
        clinic.name,
        clinic.email,
        clinic.password,
        clinic.createdAt
      );
    }
  }
}

export const LICENSE_CATEGORIES = ["Facility", "Staff", "Equipment", "Insurance", "Other"] as const;
export type LicenseCategory = (typeof LICENSE_CATEGORIES)[number];

export const LICENSE_AUTHORITIES = ["DHA", "MOH", "DOH", "FANR", "Other"] as const;
export type LicenseAuthority = (typeof LICENSE_AUTHORITIES)[number];

// owner: full control, can manage team/billing, can't be removed if
//        they're the clinic's last owner.
// admin: can manage team (add/remove members, change roles below
//        owner) and edit clinic profile, same license access as everyone.
// member: full license/document access, no team or clinic-profile management.
export const USER_ROLES = ["owner", "admin", "member"] as const;
export type UserRole = (typeof USER_ROLES)[number];

// ---------- Phase 1.7: category types ----------
// The 7 fixed category types themselves now live in a single place,
// lib/categoryTypes.ts — it's plain data with no node:sqlite import,
// so unlike this file it can be imported from client components too.
// Re-exported here so existing `import { CATEGORY_TYPES } from
// "@/lib/db"` call sites keep working without every file needing to
// be touched (this file previously had its own, simpler, drifted
// copy of this same list — see that file's header comment for the
// full history of how many copies of this list used to exist).
export {
  CATEGORY_TYPES,
  DEFAULT_ENABLED_TYPE_KEYS,
  getCategoryType,
  getTypeDef,
  type CategoryType,
  type CategoryTypeKey,
} from "./categoryTypes";

export default db;
