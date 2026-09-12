"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { License, LicenseHistoryEntry } from "@/lib/models";
import { getTypeDef, CATEGORY_TYPE_DOT } from "@/lib/categoryTypes";

type Risk = "critical" | "warning" | "good";

function getStatus(expiryDate: string): { label: string; risk: Risk } {
  const now = new Date();
  const expiry = new Date(expiryDate);
  const daysLeft = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (daysLeft < 0) return { label: "Expired", risk: "critical" };
  if (daysLeft <= 30) return { label: `${daysLeft} days left`, risk: "critical" };
  if (daysLeft <= 90) return { label: `${daysLeft} days left`, risk: "warning" };
  return { label: `${daysLeft} days left`, risk: "good" };
}

const RISK_STYLES: Record<Risk, { badgeBg: string; badgeText: string }> = {
  critical: { badgeBg: "bg-critical-soft", badgeText: "text-critical" },
  warning: { badgeBg: "bg-warning-soft", badgeText: "text-warning" },
  good: { badgeBg: "bg-good-soft", badgeText: "text-good" },
};

// Maps a raw field key from an update/renewal diff to a human label
// and a formatter, so the history timeline reads like "Expiry date
// changed from 12 Jan 2026 to 12 Jan 2027" instead of raw column
// names and ISO strings.
function fieldLabel(typeKey: string, key: string): string {
  if (key === "name") return getTypeDef(typeKey).itemNameLabel;
  if (key === "expiryDate") return getTypeDef(typeKey).dueDateLabel;
  if (key === "notes") return "Notes";
  if (key === "categoryId") return "Category";
  const typeField = getTypeDef(typeKey).fields.find((f) => f.key === key);
  return typeField?.label ?? key;
}

function formatValue(key: string, value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return d.toLocaleDateString();
  }
  return String(value);
}

function historyLine(entry: LicenseHistoryEntry, typeKey: string): string {
  if (entry.action === "created") return "Item created.";
  const changes = entry.changes ? (JSON.parse(entry.changes) as Record<string, { from: unknown; to: unknown }>) : {};
  const parts = Object.entries(changes).map(
    ([key, { from, to }]) => `${fieldLabel(typeKey, key)} changed from ${formatValue(key, from)} to ${formatValue(key, to)}`
  );
  if (parts.length === 0) return entry.action === "renewed" ? "Renewed." : "Updated.";
  const prefix = entry.action === "renewed" ? "Renewed — " : "";
  return prefix + parts.join("; ");
}

export default function LicenseDetailClient({
  initialLicense,
  initialHistory,
  categoryName,
}: {
  initialLicense: License;
  initialHistory: LicenseHistoryEntry[];
  categoryName: string | null;
}) {
  const router = useRouter();
  const [license, setLicense] = useState(initialLicense);
  const [history, setHistory] = useState(initialHistory);

  const [isEditing, setIsEditing] = useState(false);
  const [isRenewing, setIsRenewing] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const typeKey = license.typeKey || "license_permit";
  const typeDef = getTypeDef(typeKey);
  const status = getStatus(license.expiryDate);
  const risk = RISK_STYLES[status.risk];

  const [editName, setEditName] = useState(license.name);
  const [editExpiryDate, setEditExpiryDate] = useState(license.expiryDate.slice(0, 10));
  const [editNotes, setEditNotes] = useState(license.notes ?? "");
  const [editFieldValues, setEditFieldValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const f of typeDef.fields) {
      initial[f.key] = (license as unknown as Record<string, string | null>)[f.key] ?? "";
    }
    return initial;
  });
  const [renewDate, setRenewDate] = useState("");

  async function refresh() {
    const res = await fetch(`/api/licenses/${license.id}`);
    if (!res.ok) return;
    const data = await res.json();
    setLicense(data.license);
    setHistory(data.history);
  }

  async function handleSaveEdit() {
    setError("");
    setSubmitting(true);
    const res = await fetch(`/api/licenses/${license.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: editName,
        expiryDate: editExpiryDate,
        notes: editNotes,
        ...editFieldValues,
      }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Something went wrong.");
      return;
    }
    setIsEditing(false);
    await refresh();
  }

  async function handleConfirmRenew() {
    if (!renewDate) return;
    setError("");
    setSubmitting(true);
    const res = await fetch(`/api/licenses/${license.id}/renew`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ expiryDate: renewDate }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Something went wrong.");
      return;
    }
    setIsRenewing(false);
    setRenewDate("");
    await refresh();
  }

  async function handleDelete() {
    setDeleting(true);
    await fetch(`/api/licenses/${license.id}`, { method: "DELETE" });
    router.push("/dashboard");
  }

  return (
    <div className="min-h-screen bg-paper">
      <header className="border-b border-line bg-surface">
        <div className="max-w-3xl mx-auto px-6 py-4">
          <Link href="/dashboard" className="text-[13px] text-ink-faint hover:text-ink">
            ← Back to dashboard
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8">
        <div className="bg-surface rounded-2xl border border-line p-6 mb-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <span className="inline-flex items-center gap-1.5 text-[12.5px] text-ink-faint mb-2">
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: CATEGORY_TYPE_DOT[typeKey] }}
                />
                {typeDef.label}
                {categoryName ? ` · ${categoryName}` : ""}
              </span>
              <h1 className="text-xl font-semibold text-ink">{license.name}</h1>
            </div>
            <span
              className={`text-[12px] font-semibold px-2.5 py-1 rounded-full tabular-nums ${risk.badgeBg} ${risk.badgeText}`}
            >
              {status.label}
            </span>
          </div>

          {!isEditing && !isRenewing && (
            <>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 mt-6 text-[14px]">
                <div>
                  <dt className="text-ink-faint text-[12.5px]">{typeDef.dueDateLabel}</dt>
                  <dd className="text-ink mt-0.5">{new Date(license.expiryDate).toLocaleDateString()}</dd>
                </div>
                {typeDef.fields.map((f) => (
                  <div key={f.key}>
                    <dt className="text-ink-faint text-[12.5px]">{f.label}</dt>
                    <dd className="text-ink mt-0.5">
                      {formatValue(f.key, (license as unknown as Record<string, unknown>)[f.key])}
                    </dd>
                  </div>
                ))}
                <div className="sm:col-span-2">
                  <dt className="text-ink-faint text-[12.5px]">Notes</dt>
                  <dd className="text-ink mt-0.5">{license.notes || "—"}</dd>
                </div>
              </dl>

              <div className="flex items-center gap-2 mt-6">
                <button
                  onClick={() => setIsRenewing(true)}
                  className="bg-brand text-white text-[13px] font-medium rounded-lg px-4 py-2 hover:bg-brand-dark transition"
                >
                  Renew
                </button>
                <button
                  onClick={() => setIsEditing(true)}
                  className="text-[13px] font-medium text-ink-soft hover:text-brand hover:bg-brand-soft px-4 py-2 rounded-lg transition"
                >
                  Edit
                </button>
                <button
                  onClick={() => setPendingDelete(true)}
                  className="text-[13px] font-medium text-critical hover:bg-critical-soft px-4 py-2 rounded-lg transition ml-auto"
                >
                  Delete
                </button>
              </div>
            </>
          )}

          {isEditing && (
            <div className="mt-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder={typeDef.itemNameLabel}
                  className="bg-paper border border-line rounded-lg px-3 py-2 text-[14px] focus:outline-none focus:ring-2 focus:ring-brand/25 focus:border-brand"
                />
                <input
                  type="date"
                  value={editExpiryDate}
                  onChange={(e) => setEditExpiryDate(e.target.value)}
                  className="bg-paper border border-line rounded-lg px-3 py-2 text-[14px] focus:outline-none focus:ring-2 focus:ring-brand/25 focus:border-brand"
                />
                {typeDef.fields.map((f) =>
                  f.type === "select" ? (
                    <select
                      key={f.key}
                      required={f.required}
                      value={editFieldValues[f.key] || f.options?.[0] || ""}
                      onChange={(e) => setEditFieldValues((prev) => ({ ...prev, [f.key]: e.target.value }))}
                      className="bg-paper border border-line rounded-lg px-3 py-2 text-[14px] focus:outline-none focus:ring-2 focus:ring-brand/25 focus:border-brand"
                    >
                      {f.options?.map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      key={f.key}
                      type={f.type}
                      required={f.required}
                      value={editFieldValues[f.key] || ""}
                      onChange={(e) => setEditFieldValues((prev) => ({ ...prev, [f.key]: e.target.value }))}
                      placeholder={f.required ? `${f.label} (required)` : f.label}
                      className="bg-paper border border-line rounded-lg px-3 py-2 text-[14px] focus:outline-none focus:ring-2 focus:ring-brand/25 focus:border-brand"
                    />
                  )
                )}
                <input
                  type="text"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Notes"
                  className="sm:col-span-2 bg-paper border border-line rounded-lg px-3 py-2 text-[14px] focus:outline-none focus:ring-2 focus:ring-brand/25 focus:border-brand"
                />
              </div>
              {error && (
                <p className="text-[13px] text-critical bg-critical-soft rounded-lg px-3 py-2 mb-4">{error}</p>
              )}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSaveEdit}
                  disabled={submitting}
                  className="bg-brand text-white text-[13px] font-medium rounded-lg px-4 py-2 hover:bg-brand-dark transition disabled:opacity-50"
                >
                  {submitting ? "Saving…" : "Save"}
                </button>
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setError("");
                  }}
                  className="text-[13px] text-ink-soft hover:text-ink px-4 py-2"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {isRenewing && (
            <div className="mt-6">
              <p className="text-[13px] text-ink-faint mb-3">
                Currently due {new Date(license.expiryDate).toLocaleDateString()}
              </p>
              <div className="flex items-center gap-2 flex-wrap">
                <input
                  type="date"
                  value={renewDate}
                  onChange={(e) => setRenewDate(e.target.value)}
                  className="bg-paper border border-line rounded-lg px-3 py-2 text-[14px] focus:outline-none focus:ring-2 focus:ring-brand/25 focus:border-brand"
                />
                <button
                  onClick={handleConfirmRenew}
                  disabled={submitting || !renewDate}
                  className="bg-brand text-white text-[13px] font-medium rounded-lg px-4 py-2 hover:bg-brand-dark transition disabled:opacity-50"
                >
                  {submitting ? "Renewing…" : "Confirm renewal"}
                </button>
                <button
                  onClick={() => {
                    setIsRenewing(false);
                    setError("");
                  }}
                  className="text-[13px] text-ink-soft hover:text-ink px-2"
                >
                  Cancel
                </button>
              </div>
              {error && (
                <p className="text-[13px] text-critical bg-critical-soft rounded-lg px-3 py-2 mt-3">{error}</p>
              )}
            </div>
          )}
        </div>

        <div className="bg-surface rounded-2xl border border-line p-6">
          <h2 className="text-[14px] font-semibold text-ink mb-4">History</h2>
          {history.length === 0 ? (
            <p className="text-[13px] text-ink-faint">No history yet.</p>
          ) : (
            <ol className="space-y-4">
              {history.map((entry) => (
                <li key={entry.id} className="flex gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-brand mt-1.5 shrink-0" />
                  <div>
                    <p className="text-[13.5px] text-ink leading-snug">{historyLine(entry, typeKey)}</p>
                    <p className="text-[12px] text-ink-faint mt-0.5">
                      {new Date(entry.createdAt).toLocaleString()}
                      {entry.userName ? ` · ${entry.userName}` : ""}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      </main>

      {pendingDelete && (
        <div className="fixed inset-0 bg-ink/40 flex items-center justify-center z-50 px-4">
          <div className="bg-surface rounded-2xl shadow-xl max-w-sm w-full p-6">
            <h3 className="text-[15px] font-semibold text-ink mb-2">Delete this item?</h3>
            <p className="text-[14px] text-ink-faint mb-6">
              &quot;{license.name}&quot; will be permanently removed. This can&apos;t be undone.
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setPendingDelete(false)}
                className="text-[13px] text-ink-soft hover:text-ink px-4 py-2"
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="bg-critical text-white text-[13px] font-medium rounded-lg px-4 py-2 hover:opacity-90 transition disabled:opacity-50"
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
