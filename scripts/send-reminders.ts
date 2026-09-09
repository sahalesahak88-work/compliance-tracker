// This script checks all licenses across all clinics and sends
// reminder emails at 90/60/30/7 days before expiry.
//
// Run it once a day using a scheduler:
//   - On a server: a cron job, e.g. `0 8 * * * node scripts/send-reminders.js`
//   - On Vercel: a Vercel Cron Job pointed at an API route that calls this logic
//
// Requires RESEND_API_KEY in your environment (get one free at resend.com).

import { Resend } from "resend";
import {
  getLicensesNeedingReminder,
  markReminded,
} from "../lib/models";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.REMINDER_FROM_EMAIL || "reminders@yourdomain.com";

const THRESHOLDS: (90 | 60 | 30 | 7)[] = [90, 60, 30, 7];

async function sendReminders() {
  for (const days of THRESHOLDS) {
    const licenses = getLicensesNeedingReminder(days);

    for (const license of licenses) {
      const urgency = days <= 30 ? "urgent" : "upcoming";

      try {
        await resend.emails.send({
          from: FROM_EMAIL,
          to: license.clinicEmail,
          subject: `${urgency === "urgent" ? "⚠️ Urgent: " : ""}${license.name} expires in ${days} days`,
          html: `
            <p>Hi ${license.clinicName},</p>
            <p>
              Your <strong>${license.name}</strong>${license.number ? ` (#${license.number})` : ""}
              is set to expire on <strong>${new Date(license.expiryDate).toLocaleDateString()}</strong>
              — that's ${days} days from now.
            </p>
            <p>Please start the renewal process to avoid a compliance gap.</p>
            <p>— Your Compliance Tracker</p>
          `,
        });

        markReminded(license.id, days);
        console.log(`Sent ${days}-day reminder for "${license.name}" to ${license.clinicEmail}`);
      } catch (err) {
        console.error(`Failed to send reminder for license ${license.id}:`, err);
      }
    }
  }
}

sendReminders()
  .then(() => {
    console.log("Reminder run complete.");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Reminder run failed:", err);
    process.exit(1);
  });
