# Compliance Tracker (MVP)

License & certificate expiry tracking for UAE healthcare SMEs — clinics,
diagnostic centers, and distributors.

## What it does
- Clinic signup/login (DHA/MOH/DOH)
- Add licenses/certificates with expiry dates
- Dashboard with color-coded status (red ≤30 days, yellow 31–90, green 90+)
- Delete licenses
- Email reminder script (90/60/30/7 days before expiry) — run daily via cron

## Getting started

```bash
npm install
npm run dev
```

Visit http://localhost:3000 — you'll be redirected to sign up.

## Tech stack
- Next.js 16 (App Router) + TypeScript + Tailwind CSS
- Node's built-in SQLite module (`node:sqlite`) — no native compilation
  or extra install needed, unlike `better-sqlite3` (works on Node 22.5+;
  it's marked experimental by Node but stable enough for this)
- bcryptjs + JWT for auth (cookie-based sessions)
- Resend for reminder emails
- Gemini API for document auto-extraction

## Setting up document auto-extraction (upload a license, auto-fill the form)
1. Get a free API key at https://aistudio.google.com/app/apikey
2. Add to your `.env` file:
   ```
   GEMINI_API_KEY=your_key_here
   ```
3. On the dashboard, use "Upload to auto-fill" to upload a photo or PDF of
   a license — it'll try to read the name, number, and expiry date and
   pre-fill the add-license form. Always double-check the extracted values
   before saving; a warning is shown reminding you to do this.

Note: Gemini's free tier has rate limits (fine for testing and small
pilots, not meant for many customers at once) — see Google's current
free-tier limits before relying on it for a live product.

## Setting up reminder emails
1. Create a free account at resend.com and get an API key
2. Add a `.env` file in the project root:
   ```
   RESEND_API_KEY=your_key_here
   REMINDER_FROM_EMAIL=reminders@yourdomain.com
   JWT_SECRET=some_long_random_string
   ```
3. Run `npx tsx scripts/send-reminders.ts` daily via cron, or wire the same
   logic into a Vercel Cron Job / API route for a hosted deployment.

## Moving to production
- Swap `better-sqlite3` for Postgres (e.g. Vercel Postgres or Supabase) once
  you need a hosted DB or multiple concurrent writers
- Set a real, secret `JWT_SECRET` env var
- Review data handling against DHA/MOH/DOH requirements before onboarding
  real clinic data — this MVP is a starting point, not a certified system

## Next features to consider
- Equipment maintenance logs
- Insurance claim document generation
- File uploads for the actual license/certificate PDFs
- Multi-user accounts per clinic (admin + staff roles)
