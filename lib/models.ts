import db, { type UserRole } from "./db";
import { randomUUID } from "crypto";

export interface Clinic {
  id: string;
  name: string;
  authority: string;
  email: string;
  password: string; // hashed
  createdAt: string;
}

// A clinic can have several users (owner/admin/member) sharing the
// same clinic data — see the "multi-user" migration note in
// lib/db.ts. This is the authoritative account/login record; the
// Clinic type above stays for clinic-level identity (name, authority)
// and is what license rows are scoped to (clinicId), same as before.
export interface User {
  id: string;
  clinicId: string;
  name: string;
  email: string;
  password: string; // hashed
  role: UserRole;
  createdAt: string;
}

export interface License {
  id: string;
  clinicId: string;
  name: string;
  category: string;
  authority: string;
  number: string | null;
  issuedDate: string | null;
  expiryDate: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  reminded90: number;
  reminded60: number;
  reminded30: number;
  reminded7: number;
  // Phase 1.7 — category type + user-created category this item
  // belongs to, plus the nullable type-specific fields. `expiryDate`
  // above stays the single universal "due date" for every type (what
  // reminders/sorting/calendar key off), so e.g. a Facility item's
  // "next inspection due" is stored in expiryDate too, not a
  // separate column — keeps the existing reminder/calendar/export
  // code working unchanged for every type.
  typeKey: string;
  categoryId: string | null;
  staffName: string | null;
  credentialType: string | null;
  equipmentName: string | null;
  serialNumber: string | null;
  lastCalibratedDate: string | null;
  lastServicedDate: string | null;
  technician: string | null;
  vendor: string | null;
  policyNumber: string | null;
  provider: string | null;
  coverageType: string | null;
  vendorName: string | null;
  contractType: string | null;
  startDate: string | null;
  itemName: string | null;
  location: string | null;
  lastInspectedDate: string | null;
}

// Every optional/type-specific column on `licenses` beyond the core
// id/clinicId/name/expiryDate/createdAt/updatedAt/reminded* fields.
// createLicense and updateLicense build their SQL from this list so
// adding a new type-specific field later only means adding it here
// (and as a column in lib/db.ts) — no other code needs to change.
export const LICENSE_OPTIONAL_FIELDS = [
  "category",
  "authority",
  "number",
  "issuedDate",
  "notes",
  "typeKey",
  "categoryId",
  "staffName",
  "credentialType",
  "equipmentName",
  "serialNumber",
  "lastCalibratedDate",
  "lastServicedDate",
  "technician",
  "vendor",
  "policyNumber",
  "provider",
  "coverageType",
  "vendorName",
  "contractType",
  "startDate",
  "itemName",
  "location",
  "lastInspectedDate",
] as const;
export type LicenseOptionalField = (typeof LICENSE_OPTIONAL_FIELDS)[number];

// ---------- Clinic queries ----------

export function createClinic(data: {
  name: string;
  authority: string;
  email: string;
  hashedPassword: string;
}): Clinic {
  const id = randomUUID();
  db.prepare(
    `INSERT INTO clinics (id, name, authority, email, password)
     VALUES (?, ?, ?, ?, ?)`
  ).run(id, data.name, data.authority, data.email, data.hashedPassword);
  return getClinicById(id)!;
}

export function getClinicByEmail(email: string): Clinic | undefined {
  const row = db
    .prepare(`SELECT * FROM clinics WHERE email = ?`)
    .get(email);
  return row ? (JSON.parse(JSON.stringify(row)) as Clinic) : undefined;
}

export function getClinicById(id: string): Clinic | undefined {
  const row = db
    .prepare(`SELECT * FROM clinics WHERE id = ?`)
    .get(id);
  return row ? (JSON.parse(JSON.stringify(row)) as Clinic) : undefined;
}

// Clinic name + issuing authority are the only profile fields users
// can change — email is the login identifier and password has its
// own dedicated function below, both kept separate from this so a
// name/authority edit can never accidentally touch credentials.
export function updateClinicProfile(
  id: string,
  data: { name: string; authority: string }
): void {
  db.prepare(`UPDATE clinics SET name = ?, authority = ? WHERE id = ?`).run(
    data.name,
    data.authority,
    id
  );
}

export function updateClinicPassword(id: string, hashedPassword: string): void {
  db.prepare(`UPDATE clinics SET password = ? WHERE id = ?`).run(hashedPassword, id);
}

// ---------- User queries (multi-user / team) ----------

export function createUser(data: {
  clinicId: string;
  name: string;
  email: string;
  hashedPassword: string;
  role: UserRole;
}): User {
  const id = randomUUID();
  db.prepare(
    `INSERT INTO users (id, clinicId, name, email, password, role)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(id, data.clinicId, data.name, data.email, data.hashedPassword, data.role);
  return getUserById(id)!;
}

export function getUserByEmail(email: string): User | undefined {
  const row = db.prepare(`SELECT * FROM users WHERE email = ?`).get(email);
  return row ? (JSON.parse(JSON.stringify(row)) as User) : undefined;
}

export function getUserById(id: string): User | undefined {
  const row = db.prepare(`SELECT * FROM users WHERE id = ?`).get(id);
  return row ? (JSON.parse(JSON.stringify(row)) as User) : undefined;
}

export function getUsersForClinic(clinicId: string): User[] {
  const rows = db
    .prepare(`SELECT * FROM users WHERE clinicId = ? ORDER BY createdAt ASC`)
    .all(clinicId);
  return JSON.parse(JSON.stringify(rows)) as User[];
}

// Owners are the only role that can manage team/billing without
// restriction, so the app must never end up with zero of them for a
// clinic. Role changes and removals both check this before acting.
export function countOwners(clinicId: string): number {
  const row = db
    .prepare(`SELECT COUNT(*) as count FROM users WHERE clinicId = ? AND role = 'owner'`)
    .get(clinicId) as { count: number };
  return row.count;
}

export function updateUserRole(id: string, role: UserRole): void {
  db.prepare(`UPDATE users SET role = ? WHERE id = ?`).run(role, id);
}

export function updateUserProfile(id: string, name: string): void {
  db.prepare(`UPDATE users SET name = ? WHERE id = ?`).run(name, id);
}

export function updateUserPassword(id: string, hashedPassword: string): void {
  db.prepare(`UPDATE users SET password = ? WHERE id = ?`).run(hashedPassword, id);
}

export function deleteUser(id: string): void {
  db.prepare(`DELETE FROM users WHERE id = ?`).run(id);
}

// ---------- License queries ----------

export function createLicense(
  data: {
    clinicId: string;
    name: string;
    expiryDate: string;
  } & Partial<Record<LicenseOptionalField, string | null>>
): License {
  const id = randomUUID();

  const presentFields = LICENSE_OPTIONAL_FIELDS.filter((f) => data[f] !== undefined);
  const columns = ["id", "clinicId", "name", "expiryDate", ...presentFields];
  const placeholders = columns.map(() => "?").join(", ");
  const values = [
    id,
    data.clinicId,
    data.name,
    data.expiryDate,
    ...presentFields.map((f) => data[f] ?? null),
  ];

  db.prepare(
    `INSERT INTO licenses (${columns.join(", ")}) VALUES (${placeholders})`
  ).run(...(values as (string | null)[]));

  return getLicenseById(id)!;
}

// Bulk insert used by CSV import. Wrapped in a transaction so a
// failure partway through doesn't leave a half-imported batch.
export function createLicenses(
  clinicId: string,
  rows: ({
    name: string;
    expiryDate: string;
  } & Partial<Record<LicenseOptionalField, string | null>>)[]
): License[] {
  const created: License[] = [];
  db.exec("BEGIN");
  try {
    for (const row of rows) {
      created.push(createLicense({ clinicId, ...row }));
    }
    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
  return created;
}

export function getLicenseById(id: string): License | undefined {
  const row = db
    .prepare(`SELECT * FROM licenses WHERE id = ?`)
    .get(id);
  return row ? (JSON.parse(JSON.stringify(row)) as License) : undefined;
}

export function getLicensesForClinic(clinicId: string): License[] {
  const rows = db
    .prepare(`SELECT * FROM licenses WHERE clinicId = ? ORDER BY expiryDate ASC`)
    .all(clinicId);
  return JSON.parse(JSON.stringify(rows)) as License[];
}

export function updateLicense(
  id: string,
  data: Partial<{ name: string; expiryDate: string } & Record<LicenseOptionalField, string | null>>
): void {
  const fields = Object.keys(data);
  if (fields.length === 0) return;
  const setClause = fields.map((f) => `${f} = ?`).join(", ");
  const values = fields.map((f) => (data as Record<string, unknown>)[f]);
  db.prepare(
    `UPDATE licenses SET ${setClause}, updatedAt = datetime('now') WHERE id = ?`
  ).run(...(values as (string | number | null)[]), id);
}

// Renewing a license means: give it a new expiry date and clear the
// 90/60/30/7-day reminder flags so the email reminder script treats
// it as a fresh countdown instead of thinking those reminders were
// already sent for the old expiry date.
export function renewLicense(id: string, newExpiryDate: string): void {
  db.prepare(
    `UPDATE licenses
     SET expiryDate = ?, updatedAt = datetime('now'),
         reminded90 = 0, reminded60 = 0, reminded30 = 0, reminded7 = 0
     WHERE id = ?`
  ).run(newExpiryDate, id);
}

export function deleteLicense(id: string): void {
  db.prepare(`DELETE FROM licenses WHERE id = ?`).run(id);
}

// Get every license across all clinics that is expiring within
// `days` days and hasn't had that specific reminder sent yet.
// Used by the reminder cron job.
export function getLicensesNeedingReminder(
  days: 90 | 60 | 30 | 7
): (License & { clinicEmail: string; clinicName: string })[] {
  const column = `reminded${days}`;
  const rows = db
    .prepare(
      `SELECT licenses.*, clinics.email as clinicEmail, clinics.name as clinicName
       FROM licenses
       JOIN clinics ON clinics.id = licenses.clinicId
       WHERE ${column} = 0
       AND date(licenses.expiryDate) <= date('now', '+${days} days')
       AND date(licenses.expiryDate) >= date('now')`
    )
    .all();
  return JSON.parse(JSON.stringify(rows)) as (License & {
    clinicEmail: string;
    clinicName: string;
  })[];
}

export function markReminded(id: string, days: 90 | 60 | 30 | 7): void {
  const column = `reminded${days}`;
  db.prepare(`UPDATE licenses SET ${column} = 1 WHERE id = ?`).run(id);
}

// ---------- Phase 1.7: category types ----------

export interface UserCategoryType {
  id: number;
  clinicId: string;
  typeKey: string;
  enabled: number;
  createdAt: string;
}

// Replace this clinic's enabled type set with exactly `typeKeys`.
// Used both at onboarding (first save) and later from the settings
// page (adding/removing enabled types), so it's idempotent: existing
// rows are upserted rather than duplicated, and any enabled row not
// in the new list is disabled (not deleted, so history/data under
// that type isn't orphaned if the user re-enables it later).
export function setEnabledCategoryTypes(clinicId: string, typeKeys: string[]): void {
  db.exec("BEGIN");
  try {
    db.prepare(`UPDATE user_category_types SET enabled = 0 WHERE clinicId = ?`).run(clinicId);
    for (const typeKey of typeKeys) {
      db.prepare(
        `INSERT INTO user_category_types (clinicId, typeKey, enabled)
         VALUES (?, ?, 1)
         ON CONFLICT (clinicId, typeKey) DO UPDATE SET enabled = 1`
      ).run(clinicId, typeKey);
    }
    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}

export function getEnabledCategoryTypeKeys(clinicId: string): string[] {
  const rows = db
    .prepare(`SELECT typeKey FROM user_category_types WHERE clinicId = ? AND enabled = 1`)
    .all(clinicId) as { typeKey: string }[];
  return rows.map((r) => r.typeKey);
}

// Whether this clinic has completed the onboarding step at all (has
// any row, enabled or not). Used to decide whether to redirect a
// freshly logged-in clinic to /onboarding.
export function hasCompletedCategoryOnboarding(clinicId: string): boolean {
  const row = db
    .prepare(`SELECT id FROM user_category_types WHERE clinicId = ? LIMIT 1`)
    .get(clinicId);
  return !!row;
}

// ---------- Phase 1.7: user-named categories ----------

export interface Category {
  id: string;
  clinicId: string;
  typeKey: string;
  name: string;
  createdAt: string;
}

export function createCategory(data: { clinicId: string; typeKey: string; name: string }): Category {
  const id = randomUUID();
  db.prepare(
    `INSERT INTO categories (id, clinicId, typeKey, name) VALUES (?, ?, ?, ?)`
  ).run(id, data.clinicId, data.typeKey, data.name);
  return getCategoryById(id)!;
}

export function getCategoryById(id: string): Category | undefined {
  const row = db.prepare(`SELECT * FROM categories WHERE id = ?`).get(id);
  return row ? (JSON.parse(JSON.stringify(row)) as Category) : undefined;
}

export function getCategoriesForClinic(clinicId: string): Category[] {
  const rows = db
    .prepare(`SELECT * FROM categories WHERE clinicId = ? ORDER BY createdAt ASC`)
    .all(clinicId);
  return JSON.parse(JSON.stringify(rows)) as Category[];
}

export function deleteCategory(id: string): void {
  db.prepare(`DELETE FROM categories WHERE id = ?`).run(id);
}