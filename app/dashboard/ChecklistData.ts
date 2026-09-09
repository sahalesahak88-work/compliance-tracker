export type ChecklistItem = {
  text: string;
  note?: string;
};

// Keyed by the same typeKey used everywhere else (categoryTypes.ts,
// lib/models.ts License.typeKey) — NOT the old free-text `category`
// field. Each entity type gets its own renewal checklist because the
// paperwork a license renewal needs has nothing to do with what an
// equipment calibration or insurance renewal needs.
export const RENEWAL_CHECKLISTS: Record<string, ChecklistItem[]> = {
  license_permit: [
    { text: "Valid trade license (DED / ADDED)", note: "Must not be expired at time of submission" },
    { text: "Civil Defense fire & life safety NOC" },
    { text: "Updated facility layout / floor plan approval" },
    { text: "Medical waste disposal contract (authority-approved vendor)" },
    { text: "Malpractice / facility liability insurance certificate" },
    { text: "FANR radiation clearance", note: "Only if the facility operates X-ray, CT, or nuclear medicine equipment" },
    { text: "No outstanding fines or violations on the facility record" },
    { text: "EMR system compliance (NABIDH / Malaffi / Riayati depending on emirate)" },
    { text: "Submit via authority portal", note: "DHA: Sheryan · MOH: MOHAP eServices · DOH: TAMM" },
  ],
  staff_credential: [
    { text: "Good Standing Certificate", note: "Must be dated within the last 6 months" },
    { text: "Continuing Medical Education (CME/CPD) hours completed", note: "DHA: ongoing CME · MOH: 20hrs nurses / 10hrs technicians" },
    { text: "Malpractice insurance certificate (current)" },
    { text: "Medical fitness certificate", note: "Required if practitioner is 60 (MOH) or 65 (DHA) or older" },
    { text: "No outstanding professional fines or violations" },
    { text: "Passport & Emirates ID copies up to date" },
    { text: "Employer confirmation of continued employment at the facility" },
    { text: "Submit 2–3 months before expiry", note: "Portal and lead time vary by authority" },
  ],
  equipment_calibration: [
    { text: "FANR authorization renewed", note: "Required for any radiation-generating equipment" },
    { text: "Calibration certificate from an accredited vendor" },
    { text: "Radiation Safety Officer (RSO) assignment active" },
    { text: "Equipment registration list updated with authority" },
    { text: "Calibration due date logged for the next cycle" },
  ],
  equipment_maintenance: [
    { text: "Manufacturer service/maintenance contract active" },
    { text: "Service report retained from the last visit" },
    { text: "Equipment registration list updated with authority" },
    { text: "Any parts replaced during service documented" },
    { text: "Next service date logged for the following cycle" },
  ],
  insurance_policy: [
    { text: "Malpractice / professional indemnity policy renewed" },
    { text: "Facility liability insurance renewed" },
    { text: "Coverage matches current staff roster and scope of services" },
    { text: "Updated certificate submitted to relevant authority portal" },
  ],
  vendor_contract: [
    { text: "Review vendor performance against SLA before renewing" },
    { text: "Confirm pricing/terms for the new contract period" },
    { text: "Updated contract signed by both parties" },
    { text: "Insurance/compliance certificates from vendor still current" },
  ],
  facility_item: [
    { text: "Confirm inspecting body and required documentation" },
    { text: "Book inspection ahead of the due date" },
    { text: "Address any findings from the previous inspection" },
    { text: "Retain inspection report/certificate for records" },
  ],
};

export const DEFAULT_CHECKLIST: ChecklistItem[] = [
  { text: "Confirm exact renewal requirements with the issuing authority" },
  { text: "Gather any authority-specific supporting documents" },
  { text: "Pay applicable renewal fees" },
  { text: "Retain proof of renewal for your records" },
];
