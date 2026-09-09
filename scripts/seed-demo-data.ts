// One-off script to populate a clinic with realistic test data across
// all 7 category types, so the dashboard/table/search/filter/sort can
// be checked at a believable volume instead of the handful of items
// used during development. Safe to re-run — it only ever inserts new
// rows, never deletes, so running it twice just doubles the data
// (delete dev.db first, or delete the seeded items from the UI, if
// you want a clean slate).
//
// Usage:
//   npx tsx scripts/seed-demo-data.ts you@example.com
//
// The email must belong to an existing user (sign up in the app
// first if you haven't). The script also enables all 7 category
// types for that clinic, since seeded items span every type and
// won't show up in the dashboard for a type that's toggled off in
// Settings.

import { getUserByEmail, createLicense, setEnabledCategoryTypes, getEnabledCategoryTypeKeys } from "../lib/models";
import { CATEGORY_TYPES } from "../lib/categoryTypes";

const email = process.argv[2];
if (!email) {
  console.error("Usage: npx tsx scripts/seed-demo-data.ts you@example.com");
  process.exit(1);
}

const user = getUserByEmail(email);
if (!user) {
  console.error(`No user found for ${email}. Sign up in the app first, then re-run this.`);
  process.exit(1);
}
const clinicId = user.clinicId;

// Relative-day helper — negative values land in the past, so we can
// seed a realistic mix of overdue / due-soon (red, ≤30 days) /
// upcoming (yellow, 31-90 days) / not-urgent (green, 90+ days) items,
// matching the dashboard's color-coded status logic.
function daysFromNow(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

// Enable every category type for this clinic — otherwise seeded
// items of a type the clinic hasn't turned on in Settings won't
// appear in the dashboard.
const alreadyEnabled = new Set(getEnabledCategoryTypeKeys(clinicId));
const allTypeKeys = CATEGORY_TYPES.map((t) => t.key);
setEnabledCategoryTypes(clinicId, Array.from(new Set([...alreadyEnabled, ...allTypeKeys])));

type SeedItem = {
  name: string;
  expiryDate: string;
  typeKey: string;
  fields?: Record<string, string>;
};

const items: SeedItem[] = [
  // ---- License / Permit ----
  {
    name: "Facility Operating License",
    expiryDate: daysFromNow(12),
    typeKey: "license_permit",
    fields: { authority: "DHA", number: "DHA-FL-48213", issuedDate: daysFromNow(-718) },
  },
  {
    name: "Radiology Center License",
    expiryDate: daysFromNow(55),
    typeKey: "license_permit",
    fields: { authority: "MOH", number: "MOH-RAD-1187", issuedDate: daysFromNow(-310) },
  },
  {
    name: "Pharmacy Trading License",
    expiryDate: daysFromNow(210),
    typeKey: "license_permit",
    fields: { authority: "DOH", number: "DOH-PHM-3342", issuedDate: daysFromNow(-155) },
  },
  {
    name: "Radiation Safety Permit",
    expiryDate: daysFromNow(-5),
    typeKey: "license_permit",
    fields: { authority: "FANR", number: "FANR-RS-0091", issuedDate: daysFromNow(-370) },
  },
  {
    name: "Fire & Safety NOC",
    expiryDate: daysFromNow(340),
    typeKey: "license_permit",
    fields: { authority: "Other", number: "CD-NOC-7723", issuedDate: daysFromNow(-25) },
  },

  // ---- Staff Credential ----
  {
    name: "DHA Physician License",
    expiryDate: daysFromNow(20),
    typeKey: "staff_credential",
    fields: { staffName: "Dr. Ahmed Al Mansoori", credentialType: "Physician License", issuedDate: daysFromNow(-345) },
  },
  {
    name: "Nursing License",
    expiryDate: daysFromNow(75),
    typeKey: "staff_credential",
    fields: { staffName: "Fatima Hassan", credentialType: "Registered Nurse License", issuedDate: daysFromNow(-290) },
  },
  {
    name: "Radiology Board Certification",
    expiryDate: daysFromNow(400),
    typeKey: "staff_credential",
    fields: { staffName: "Dr. Sara Khan", credentialType: "Board Certification", issuedDate: daysFromNow(-30) },
  },
  {
    name: "MOH Lab Technician License",
    expiryDate: daysFromNow(-10),
    typeKey: "staff_credential",
    fields: { staffName: "Omar Saeed", credentialType: "Lab Technician License", issuedDate: daysFromNow(-400) },
  },
  {
    name: "BLS / ACLS Certification",
    expiryDate: daysFromNow(5),
    typeKey: "staff_credential",
    fields: { staffName: "Dr. Yusuf Ibrahim", credentialType: "BLS/ACLS", issuedDate: daysFromNow(-360) },
  },

  // ---- Equipment — Calibration ----
  {
    name: "Siemens MRI Scanner (Avanto)",
    expiryDate: daysFromNow(15),
    typeKey: "equipment_calibration",
    fields: { serialNumber: "SN-MRI-2291", lastCalibratedDate: daysFromNow(-350), vendor: "Siemens Healthineers" },
  },
  {
    name: "Philips Digital X-Ray Unit",
    expiryDate: daysFromNow(100),
    typeKey: "equipment_calibration",
    fields: { serialNumber: "SN-XR-1042", lastCalibratedDate: daysFromNow(-260), vendor: "Philips Gulf" },
  },
  {
    name: "GE Ultrasound Machine",
    expiryDate: daysFromNow(-3),
    typeKey: "equipment_calibration",
    fields: { serialNumber: "SN-US-8834", lastCalibratedDate: daysFromNow(-368), vendor: "GE Healthcare" },
  },
  {
    name: "Roche Blood Chemistry Analyzer",
    expiryDate: daysFromNow(250),
    typeKey: "equipment_calibration",
    fields: { serialNumber: "SN-BA-5567", lastCalibratedDate: daysFromNow(-115), vendor: "Roche Diagnostics" },
  },

  // ---- Equipment — Maintenance ----
  {
    name: "Central Autoclave Sterilizer",
    expiryDate: daysFromNow(8),
    typeKey: "equipment_maintenance",
    fields: { serialNumber: "SN-AC-3321", lastServicedDate: daysFromNow(-172), technician: "MedTech Services LLC" },
  },
  {
    name: "HVAC / Air Handling Unit",
    expiryDate: daysFromNow(60),
    typeKey: "equipment_maintenance",
    fields: { serialNumber: "SN-HVAC-771", lastServicedDate: daysFromNow(-120), technician: "Emirates Facilities Mgmt" },
  },
  {
    name: "Backup Diesel Generator",
    expiryDate: daysFromNow(300),
    typeKey: "equipment_maintenance",
    fields: { serialNumber: "SN-GEN-119", lastServicedDate: daysFromNow(-65), technician: "Al Futtaim Power Solutions" },
  },
  {
    name: "Dental Chair Unit 3",
    expiryDate: daysFromNow(-1),
    typeKey: "equipment_maintenance",
    fields: { serialNumber: "SN-DC-045", lastServicedDate: daysFromNow(-190), technician: "Dentsply Sirona Service" },
  },

  // ---- Insurance Policy ----
  {
    name: "Clinical Malpractice Insurance",
    expiryDate: daysFromNow(25),
    typeKey: "insurance_policy",
    fields: { policyNumber: "OIC-MP-88213", provider: "Oman Insurance Company", coverageType: "Malpractice Liability", startDate: daysFromNow(-340) },
  },
  {
    name: "Property & Fire Insurance",
    expiryDate: daysFromNow(150),
    typeKey: "insurance_policy",
    fields: { policyNumber: "AXA-PF-4471", provider: "AXA Gulf", coverageType: "Property & Fire", startDate: daysFromNow(-215) },
  },
  {
    name: "Employee Health Insurance (Group)",
    expiryDate: daysFromNow(6),
    typeKey: "insurance_policy",
    fields: { policyNumber: "DAM-GH-1029", provider: "Daman", coverageType: "Group Health", startDate: daysFromNow(-359) },
  },
  {
    name: "Equipment All-Risk Insurance",
    expiryDate: daysFromNow(280),
    typeKey: "insurance_policy",
    fields: { policyNumber: "RSA-AR-6631", provider: "RSA Middle East", coverageType: "Equipment All-Risk", startDate: daysFromNow(-85) },
  },

  // ---- Vendor / Service Contract ----
  {
    name: "IT Support & EMR Hosting",
    expiryDate: daysFromNow(40),
    typeKey: "vendor_contract",
    fields: { vendorName: "Injazat Data Systems", contractType: "IT Support & Hosting", startDate: daysFromNow(-325) },
  },
  {
    name: "Biomedical Waste Disposal",
    expiryDate: daysFromNow(12),
    typeKey: "vendor_contract",
    fields: { vendorName: "Bee'ah Enviro Services", contractType: "Waste Disposal", startDate: daysFromNow(-353) },
  },
  {
    name: "Cleaning & Housekeeping Services",
    expiryDate: daysFromNow(190),
    typeKey: "vendor_contract",
    fields: { vendorName: "Farnek Services", contractType: "Facility Cleaning", startDate: daysFromNow(-175) },
  },
  {
    name: "Laundry & Linen Services",
    expiryDate: daysFromNow(-7),
    typeKey: "vendor_contract",
    fields: { vendorName: "Al Boom Laundry", contractType: "Linen Supply", startDate: daysFromNow(-372) },
  },

  // ---- Facility / Building Item ----
  {
    name: "Fire Extinguisher Inspection",
    expiryDate: daysFromNow(18),
    typeKey: "facility_item",
    fields: { location: "Ground Floor Corridor", lastInspectedDate: daysFromNow(-347) },
  },
  {
    name: "Elevator Safety Inspection",
    expiryDate: daysFromNow(85),
    typeKey: "facility_item",
    fields: { location: "Main Building", lastInspectedDate: daysFromNow(-280) },
  },
  {
    name: "Emergency Exit Signage Check",
    expiryDate: daysFromNow(320),
    typeKey: "facility_item",
    fields: { location: "All Floors", lastInspectedDate: daysFromNow(-45) },
  },
  {
    name: "Water Tank Cleaning",
    expiryDate: daysFromNow(-2),
    typeKey: "facility_item",
    fields: { location: "Rooftop", lastInspectedDate: daysFromNow(-182) },
  },
];

let created = 0;
for (const item of items) {
  createLicense({
    clinicId,
    name: item.name,
    expiryDate: item.expiryDate,
    typeKey: item.typeKey,
    ...(item.fields ?? {}),
  });
  created++;
}

console.log(`Seeded ${created} items across ${CATEGORY_TYPES.length} category types for ${email}.`);
console.log("Log in and check the dashboard — you should see a realistic mix of overdue, due-soon, upcoming, and not-urgent items.");
