"use client";

import { useState, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import type { Clinic, License, Category } from "@/lib/models";
import NotificationBanner from "./NotificationBanner";
import CalendarView from "./CalendarView";
import ExportButton from "./ExportButton";
import ChecklistModal from "./ChecklistModal";
import RowActionsMenu from "./RowActionsMenu";
import ToolbarMenu from "./ToolbarMenu";
import {
  CATEGORY_TYPES as CATEGORY_TYPE_DEFS,
  CATEGORY_TYPE_DOT,
  getTypeDef,
  buildDetailLine,
  type CategoryType as CategoryTypeDef,
} from "@/lib/categoryTypes";

type CategoryFilter = "All" | string; // "All" or a typeKey

type SortOption = "expiry" | "name" | "type";
type Risk = "critical" | "warning" | "good";
type ToastType = "success" | "error" | "info";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface Props {
  clinic: Clinic;
  initialLicenses: License[];
  enabledTypeKeys: string[];
  initialCategories: Category[];
}

function getStatus(expiryDate: string): {
  label: string;
  daysLeft: number;
  risk: Risk;
} {
  const now = new Date();
  const expiry = new Date(expiryDate);
  const daysLeft = Math.ceil(
    (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysLeft < 0) {
    return { label: "Expired", daysLeft, risk: "critical" };
  }
  if (daysLeft <= 30) {
    return { label: `${daysLeft} days left`, daysLeft, risk: "critical" };
  }
  if (daysLeft <= 90) {
    return { label: `${daysLeft} days left`, daysLeft, risk: "warning" };
  }
  return { label: `${daysLeft} days left`, daysLeft, risk: "good" };
}

const RISK_STYLES: Record<Risk, { bar: string; badgeBg: string; badgeText: string }> = {
  critical: { bar: "bg-critical", badgeBg: "bg-critical-soft", badgeText: "text-critical" },
  warning: { bar: "bg-warning", badgeBg: "bg-warning-soft", badgeText: "text-warning" },
  good: { bar: "bg-good", badgeBg: "bg-good-soft", badgeText: "text-good" },
};

const TOAST_STYLES: Record<ToastType, string> = {
  success: "bg-good text-white",
  error: "bg-critical text-white",
  info: "bg-ink text-white",
};

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-ink-faint">
      <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M11 11L14.5 14.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

// Minimal CSV parser — handles quoted fields containing commas.
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === ",") {
        result.push(cur);
        cur = "";
      } else cur += ch;
    }
  }
  result.push(cur);
  return result;
}

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];
  const headers = parseCSVLine(lines[0]).map((h) => h.trim().toLowerCase());
  return lines.slice(1).map((line) => {
    const values = parseCSVLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h] = (values[i] || "").trim();
    });
    return row;
  });
}

// One CSV can carry rows for every enabled entity type — the `type`
// column tells the importer which fields to read for that row
// (matching typeKey values in categoryTypes.ts), so an Equipment row
// doesn't need an "authority" column filled in and a License row
// doesn't need "serialNumber". Unrecognized/blank `type` falls back
// to License/Permit for backward compatibility with older templates.
const CSV_UNIVERSAL_HEADERS = ["name", "type", "category", "expiryDate", "notes"];

function downloadCSVTemplate(availableTypeDefs: CategoryTypeDef[]) {
  const fieldKeys = Array.from(
    new Set(availableTypeDefs.flatMap((t) => t.fields.map((f) => f.key)))
  );
  const headers = [...CSV_UNIVERSAL_HEADERS, ...fieldKeys];

  const exampleRows = availableTypeDefs.map((t) => {
    const row: Record<string, string> = {
      name: `Example ${t.itemNameLabel}`,
      type: t.key,
      category: "Other",
      expiryDate: "2026-12-31",
      notes: "",
    };
    for (const field of t.fields) {
      row[field.key] = field.type === "date" ? "2025-01-01" : "";
    }
    return headers.map((h) => row[h] ?? "").join(",");
  });

  const csv = [headers.join(","), ...exampleRows].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "compliance-import-template.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export default function DashboardClient({
  clinic,
  initialLicenses,
  enabledTypeKeys,
  initialCategories,
}: Props) {
  const router = useRouter();
  const [licenses, setLicenses] = useState<License[]>(initialLicenses);
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<CategoryFilter>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("expiry");
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Types this clinic can create items under. Falls back to
  // License/Permit if a clinic somehow has none enabled.
  const availableTypeKeys = enabledTypeKeys.length > 0 ? enabledTypeKeys : ["license_permit"];
  const availableTypeDefs = CATEGORY_TYPE_DEFS.filter((t) => availableTypeKeys.includes(t.key));

  // ---------- Add form state ----------
  const [typeKey, setTypeKey] = useState<string>(availableTypeKeys[0]);
  const [name, setName] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [notes, setNotes] = useState("");
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [categoryId, setCategoryId] = useState<string>("");
  const [newCategoryMode, setNewCategoryMode] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const activeTypeDef = getTypeDef(typeKey);
  const categoriesForType = categories.filter((c) => c.typeKey === typeKey);

  function setField(key: string, value: string) {
    setFieldValues((prev) => ({ ...prev, [key]: value }));
  }

  function resetAddForm() {
    setName("");
    setExpiryDate("");
    setNotes("");
    setFieldValues({});
    setCategoryId("");
    setNewCategoryMode(false);
    setNewCategoryName("");
  }

  function handleTypeChange(key: string) {
    setTypeKey(key);
    setFieldValues({});
    setCategoryId("");
    setNewCategoryMode(false);
    setNewCategoryName("");
  }

  async function handleCreateCategory() {
    if (!newCategoryName.trim()) return;
    setCreatingCategory(true);
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ typeKey, name: newCategoryName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Couldn't create category.", "error");
        return;
      }
      setCategories((prev) => [...prev, data]);
      setCategoryId(data.id);
      setNewCategoryMode(false);
      setNewCategoryName("");
    } finally {
      setCreatingCategory(false);
    }
  }

  // ---------- Edit form state ----------
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editExpiryDate, setEditExpiryDate] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editFieldValues, setEditFieldValues] = useState<Record<string, string>>({});
  const [editCategoryId, setEditCategoryId] = useState<string>("");
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState("");

  const [renewingId, setRenewingId] = useState<string | null>(null);
  const [renewDate, setRenewDate] = useState("");
  const [renewSubmitting, setRenewSubmitting] = useState(false);
  const [renewError, setRenewError] = useState("");

  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState("");
  const [justAutoFilled, setJustAutoFilled] = useState(false);

  const [importing, setImporting] = useState(false);
  const csvInputRef = useRef<HTMLInputElement>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);

  const [view, setView] = useState<"list" | "calendar">("list");
  const [checklistLicense, setChecklistLicense] = useState<License | null>(null);

  function showToast(message: string, type: ToastType = "info") {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Document auto-extraction is License/Permit-shaped (Gemini pulls
    // license name/number/expiry), so switch the form to that type.
    setTypeKey("license_permit");
    setFieldValues({});
    setCategoryId("");

    setExtracting(true);
    setExtractError("");
    setJustAutoFilled(false);
    setShowForm(true);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/extract-license", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (!res.ok) {
        setExtractError(data.error || "Couldn't read this document.");
        return;
      }

      if (data.name) setName(data.name);
      if (data.number) setField("number", data.number);
      if (data.expiryDate) setExpiryDate(data.expiryDate);
      setJustAutoFilled(true);
    } catch {
      setExtractError("Couldn't read this document. Try again or enter details manually.");
    } finally {
      setExtracting(false);
      e.target.value = "";
    }
  }

  async function handleCSVUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    try {
      const text = await file.text();
      const rows = parseCSV(text);

      if (rows.length === 0) {
        showToast("That file doesn't look like a valid CSV.", "error");
        return;
      }

      // Each row can be a different entity type — read its `type`
      // column (falling back to License/Permit for older template
      // files that don't have one) and only pull the field keys that
      // type actually defines, so a Staff row's "credentialType"
      // never bleeds into a License row and vice versa.
      const payload = rows.map((r) => {
        const rawType = (r.type || r.typekey || "").trim();
        const typeDef = CATEGORY_TYPE_DEFS.find((t) => t.key === rawType) ?? CATEGORY_TYPE_DEFS[0];
        const entry: Record<string, string | undefined> = {
          name: r.name,
          typeKey: typeDef.key,
          category: r.category,
          expiryDate: r.expirydate || r["expiry date"] || r.expiry,
          notes: r.notes,
        };
        for (const field of typeDef.fields) {
          const key = field.key.toLowerCase();
          entry[field.key] = r[key] || r[field.label.toLowerCase()];
        }
        return entry;
      });

      const res = await fetch("/api/licenses/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ licenses: payload }),
      });

      const data = await res.json();

      if (!res.ok) {
        showToast(data.error || "Import failed.", "error");
        return;
      }

      if (data.created.length > 0) {
        setLicenses((prev) => [...prev, ...data.created]);
      }

      if (data.errors.length > 0) {
        showToast(
          `Imported ${data.created.length} items, skipped ${data.errors.length} (check row formatting).`,
          data.created.length > 0 ? "info" : "error"
        );
      } else {
        showToast(`Imported ${data.created.length} items.`, "success");
      }
    } catch {
      showToast("Couldn't read that file. Make sure it's a CSV.", "error");
    } finally {
      setImporting(false);
      e.target.value = "";
    }
  }

  async function handleLogout() {
    await fetch("/api/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  async function handleAddLicense(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    const body: Record<string, string> = {
      name,
      expiryDate,
      notes,
      typeKey,
      categoryId,
    };
    for (const f of activeTypeDef.fields) {
      body[f.key] = fieldValues[f.key] || "";
    }

    const res = await fetch("/api/licenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    setSubmitting(false);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Something went wrong.");
      return;
    }

    const newLicense: License = await res.json();
    setLicenses((prev) => [...prev, newLicense]);
    resetAddForm();
    setShowForm(false);
    showToast(`"${newLicense.name}" added.`, "success");
  }

  function startEdit(license: License) {
    setEditingId(license.id);
    setEditName(license.name);
    setEditExpiryDate(license.expiryDate.slice(0, 10));
    setEditNotes(license.notes || "");
    setEditCategoryId(license.categoryId || "");
    const def = getTypeDef(license.typeKey);
    const values: Record<string, string> = {};
    for (const f of def.fields) {
      const v = (license as unknown as Record<string, string | null>)[f.key];
      values[f.key] = v || "";
    }
    setEditFieldValues(values);
    setEditError("");
  }

  function cancelEdit() {
    setEditingId(null);
    setEditError("");
  }

  async function handleSaveEdit(id: string, license: License) {
    setEditError("");
    if (!editName || !editExpiryDate) {
      setEditError("Name and date are required.");
      return;
    }
    setEditSubmitting(true);

    const def = getTypeDef(license.typeKey);
    const body: Record<string, string> = {
      name: editName,
      expiryDate: editExpiryDate,
      notes: editNotes,
      categoryId: editCategoryId,
    };
    for (const f of def.fields) {
      body[f.key] = editFieldValues[f.key] || "";
    }

    const res = await fetch(`/api/licenses/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    setEditSubmitting(false);

    if (!res.ok) {
      const data = await res.json();
      setEditError(data.error || "Something went wrong.");
      return;
    }

    const updated: License = await res.json();
    setLicenses((prev) => prev.map((l) => (l.id === id ? updated : l)));
    setEditingId(null);
    showToast("Changes saved.", "success");
  }

  function startRenew(license: License) {
    setRenewingId(license.id);
    setRenewDate("");
    setRenewError("");
  }

  function cancelRenew() {
    setRenewingId(null);
    setRenewError("");
  }

  async function handleConfirmRenew(id: string) {
    setRenewError("");
    if (!renewDate) {
      setRenewError("Pick the new date.");
      return;
    }
    setRenewSubmitting(true);

    const res = await fetch(`/api/licenses/${id}/renew`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ expiryDate: renewDate }),
    });

    setRenewSubmitting(false);

    if (!res.ok) {
      const data = await res.json();
      setRenewError(data.error || "Something went wrong.");
      return;
    }

    const updated: License = await res.json();
    setLicenses((prev) => prev.map((l) => (l.id === id ? updated : l)));
    setRenewingId(null);
    showToast(`Renewed until ${new Date(updated.expiryDate).toLocaleDateString()}.`, "success");
  }

  function requestDelete(id: string) {
    setPendingDeleteId(id);
  }

  async function confirmDelete() {
    if (!pendingDeleteId) return;
    const license = licenses.find((l) => l.id === pendingDeleteId);
    setDeleting(true);
    await fetch(`/api/licenses/${pendingDeleteId}`, { method: "DELETE" });
    setLicenses((prev) => prev.filter((l) => l.id !== pendingDeleteId));
    setDeleting(false);
    setPendingDeleteId(null);
    showToast(license ? `"${license.name}" deleted.` : "Item deleted.", "info");
  }

  const riskCounts = useMemo(() => {
    let critical = 0,
      warning = 0,
      good = 0;
    for (const l of licenses) {
      const r = getStatus(l.expiryDate).risk;
      if (r === "critical") critical++;
      else if (r === "warning") warning++;
      else good++;
    }
    return { critical, warning, good, total: licenses.length };
  }, [licenses]);

  const licenseBeingDeleted = licenses.find((l) => l.id === pendingDeleteId);

  const visibleLicenses = useMemo(() => {
    let result = licenses;

    if (activeTab !== "All") {
      result = result.filter((l) => (l.typeKey || "license_permit") === activeTab);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(
        (l) =>
          l.name.toLowerCase().includes(q) ||
          (l.number || "").toLowerCase().includes(q)
      );
    }

    const sorted = [...result];
    if (sortBy === "expiry") {
      sorted.sort(
        (a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime()
      );
    } else if (sortBy === "name") {
      sorted.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === "type") {
      sorted.sort((a, b) =>
        (a.typeKey || "license_permit").localeCompare(b.typeKey || "license_permit")
      );
    }
    return sorted;
  }, [licenses, activeTab, searchQuery, sortBy]);

  const pct = (n: number) => (riskCounts.total > 0 ? (n / riskCounts.total) * 100 : 0);

  return (
    <div className="min-h-screen bg-paper">
      <input
        ref={uploadInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        onChange={handleFileUpload}
        className="hidden"
      />
      <input
        ref={csvInputRef}
        type="file"
        accept=".csv,text/csv"
        onChange={handleCSVUpload}
        className="hidden"
      />

      <header className="bg-surface border-b border-line">
        <div className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-[10px] bg-brand flex items-center justify-center text-white font-semibold text-[15px] shrink-0">
              {clinic.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-[15px] font-semibold text-ink leading-tight tracking-[-0.01em]">
                {clinic.name}
              </h1>
              <p className="text-[12.5px] text-ink-faint leading-tight mt-0.5">
                {clinic.authority} &middot; {clinic.email}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <a
              href="/settings"
              className="text-[13px] font-medium text-ink-faint hover:text-ink transition"
            >
              Settings
            </a>
            <button
              onClick={handleLogout}
              className="text-[13px] font-medium text-ink-faint hover:text-ink transition"
            >
              Log out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12">
        <NotificationBanner licenses={licenses} />

        {/* Compliance status */}
        <div className="bg-surface rounded-2xl border border-line p-7 mb-10">
          <div className="flex items-baseline justify-between mb-5">
            <h2 className="text-[16px] font-semibold text-ink tracking-[-0.01em]">
              Compliance status
            </h2>
            <span className="text-[12.5px] text-ink-faint">{riskCounts.total} tracked</span>
          </div>

          {riskCounts.total === 0 ? (
            <div className="h-2 rounded-full bg-line" />
          ) : (
            <div className="h-2 rounded-full overflow-hidden flex bg-line">
              {riskCounts.critical > 0 && (
                <div className="bg-critical h-full" style={{ width: `${pct(riskCounts.critical)}%` }} />
              )}
              {riskCounts.warning > 0 && (
                <div className="bg-warning h-full" style={{ width: `${pct(riskCounts.warning)}%` }} />
              )}
              {riskCounts.good > 0 && (
                <div className="bg-good h-full" style={{ width: `${pct(riskCounts.good)}%` }} />
              )}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mt-7">
            <div className="flex items-start gap-3">
              <span className="w-2 h-2 rounded-full bg-critical shrink-0 mt-1.5" />
              <div>
                <p className="text-[26px] font-semibold text-ink leading-none tabular-nums tracking-[-0.02em]">
                  {riskCounts.critical}
                </p>
                <p className="text-[12.5px] text-ink-faint mt-1.5">Needs attention · ≤30 days</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="w-2 h-2 rounded-full bg-warning shrink-0 mt-1.5" />
              <div>
                <p className="text-[26px] font-semibold text-ink leading-none tabular-nums tracking-[-0.02em]">
                  {riskCounts.warning}
                </p>
                <p className="text-[12.5px] text-ink-faint mt-1.5">Upcoming · 31–90 days</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="w-2 h-2 rounded-full bg-good shrink-0 mt-1.5" />
              <div>
                <p className="text-[26px] font-semibold text-ink leading-none tabular-nums tracking-[-0.02em]">
                  {riskCounts.good}
                </p>
                <p className="text-[12.5px] text-ink-faint mt-1.5">Healthy · 90+ days</p>
              </div>
            </div>
          </div>
        </div>

        {/* Category-type tabs — only types this clinic enabled at onboarding */}
        <div className="flex flex-wrap items-center gap-2 mb-5">
          {(["All", ...availableTypeKeys] as CategoryFilter[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`inline-flex items-center gap-1.5 text-[13px] font-medium rounded-full px-3.5 py-[7px] transition ${
                activeTab === tab
                  ? "bg-ink text-white"
                  : "bg-surface border border-line text-ink-soft hover:border-line-strong"
              }`}
            >
              {tab !== "All" && (
                <span
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ backgroundColor: activeTab === tab ? "#fff" : CATEGORY_TYPE_DOT[tab] }}
                />
              )}
              {tab === "All" ? "All" : getTypeDef(tab).label}
            </button>
          ))}
        </div>

        {/* Search + sort */}
        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          <div className="relative flex-1">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
              <SearchIcon />
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or number…"
              className="w-full bg-surface border border-line rounded-lg pl-9 pr-3 py-2 text-[14px] focus:outline-none focus:ring-2 focus:ring-brand/25 focus:border-brand transition"
            />
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="bg-surface border border-line rounded-lg px-3 py-2 text-[14px] focus:outline-none focus:ring-2 focus:ring-brand/25 focus:border-brand transition"
          >
            <option value="expiry">Sort by due date</option>
            <option value="name">Sort by name</option>
            <option value="type">Sort by type</option>
          </select>
          <div className="flex items-center gap-1 bg-surface border border-line rounded-lg p-1">
            <button
              onClick={() => setView("list")}
              className={`px-3 py-[5px] rounded-[6px] text-[12.5px] font-medium transition ${
                view === "list" ? "bg-paper text-ink" : "text-ink-faint hover:text-ink-soft"
              }`}
            >
              List
            </button>
            <button
              onClick={() => setView("calendar")}
              className={`px-3 py-[5px] rounded-[6px] text-[12.5px] font-medium transition ${
                view === "calendar" ? "bg-paper text-ink" : "text-ink-faint hover:text-ink-soft"
              }`}
            >
              Calendar
            </button>
          </div>
          <div className="flex items-center gap-2">
            <ExportButton licenses={licenses} clinicName={clinic.name} />
            <ToolbarMenu
              importing={importing}
              onDownloadTemplate={() => downloadCSVTemplate(availableTypeDefs)}
              onImportClick={() => csvInputRef.current?.click()}
              onUploadClick={() => uploadInputRef.current?.click()}
            />
            <button
              onClick={() => setShowForm((s) => !s)}
              className="bg-brand text-white text-[13px] font-medium rounded-lg px-4 h-9 hover:bg-brand-dark transition"
            >
              {showForm ? "Cancel" : "Add item"}
            </button>
          </div>
        </div>

        {extracting && (
          <p className="text-[13px] text-ink-faint mb-4">Reading document…</p>
        )}

        {showForm && (
          <form
            onSubmit={handleAddLicense}
            className="bg-surface rounded-2xl border border-line p-6 mb-6 space-y-4"
          >
            {justAutoFilled && (
              <p className="text-[13px] text-good bg-good-soft rounded-lg px-3 py-2">
                Filled in from your document — please double-check before saving.
              </p>
            )}
            {extractError && (
              <p className="text-[13px] text-warning bg-warning-soft rounded-lg px-3 py-2">
                {extractError}
              </p>
            )}

            {availableTypeDefs.length > 1 && (
              <div>
                <label className="block text-[12.5px] font-medium text-ink-soft mb-1.5">
                  What kind of item is this?
                </label>
                <select
                  value={typeKey}
                  onChange={(e) => handleTypeChange(e.target.value)}
                  className="w-full bg-paper border border-line rounded-lg px-3 py-2 text-[14px] focus:outline-none focus:ring-2 focus:ring-brand/25 focus:border-brand transition"
                >
                  {availableTypeDefs.map((t) => (
                    <option key={t.key} value={t.key}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[12.5px] font-medium text-ink-soft mb-1.5">
                  {activeTypeDef.itemNameLabel}
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-paper border border-line rounded-lg px-3 py-2 text-[14px] focus:outline-none focus:ring-2 focus:ring-brand/25 focus:border-brand transition"
                />
              </div>

              <div>
                <label className="block text-[12.5px] font-medium text-ink-soft mb-1.5">
                  Category
                </label>
                {newCategoryMode ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      autoFocus
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder={`e.g. Lab Equipment`}
                      className="w-full bg-paper border border-line rounded-lg px-3 py-2 text-[14px] focus:outline-none focus:ring-2 focus:ring-brand/25 focus:border-brand transition"
                    />
                    <button
                      type="button"
                      onClick={handleCreateCategory}
                      disabled={creatingCategory || !newCategoryName.trim()}
                      className="shrink-0 bg-brand text-white text-[13px] font-medium rounded-lg px-3 py-2 hover:bg-brand-dark transition disabled:opacity-50"
                    >
                      {creatingCategory ? "…" : "Add"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewCategoryMode(false)}
                      className="shrink-0 text-[13px] text-ink-soft hover:text-ink px-1"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <select
                    value={categoryId}
                    onChange={(e) => {
                      if (e.target.value === "__new__") {
                        setNewCategoryMode(true);
                      } else {
                        setCategoryId(e.target.value);
                      }
                    }}
                    className="w-full bg-paper border border-line rounded-lg px-3 py-2 text-[14px] focus:outline-none focus:ring-2 focus:ring-brand/25 focus:border-brand transition"
                  >
                    <option value="">Uncategorized</option>
                    {categoriesForType.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                    <option value="__new__">+ New category…</option>
                  </select>
                )}
              </div>

              {activeTypeDef.fields.map((f) => (
                <div key={f.key}>
                  <label className="block text-[12.5px] font-medium text-ink-soft mb-1.5">
                    {f.label}
                    {f.required && <span className="text-critical ml-0.5">*</span>}
                  </label>
                  {f.type === "select" ? (
                    <select
                      required={f.required}
                      value={fieldValues[f.key] || f.options?.[0] || ""}
                      onChange={(e) => setField(f.key, e.target.value)}
                      className="w-full bg-paper border border-line rounded-lg px-3 py-2 text-[14px] focus:outline-none focus:ring-2 focus:ring-brand/25 focus:border-brand transition"
                    >
                      {f.options?.map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={f.type}
                      required={f.required}
                      value={fieldValues[f.key] || ""}
                      onChange={(e) => setField(f.key, e.target.value)}
                      placeholder={f.placeholder}
                      className="w-full bg-paper border border-line rounded-lg px-3 py-2 text-[14px] focus:outline-none focus:ring-2 focus:ring-brand/25 focus:border-brand transition"
                    />
                  )}
                </div>
              ))}

              <div>
                <label className="block text-[12.5px] font-medium text-ink-soft mb-1.5">
                  {activeTypeDef.dueDateLabel}
                </label>
                <input
                  type="date"
                  required
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  className="w-full bg-paper border border-line rounded-lg px-3 py-2 text-[14px] focus:outline-none focus:ring-2 focus:ring-brand/25 focus:border-brand transition"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[12.5px] font-medium text-ink-soft mb-1.5">
                  Notes (optional)
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-paper border border-line rounded-lg px-3 py-2 text-[14px] focus:outline-none focus:ring-2 focus:ring-brand/25 focus:border-brand transition"
                />
              </div>
            </div>

            {error && (
              <p className="text-[13px] text-critical bg-critical-soft rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="bg-brand text-white text-[13px] font-medium rounded-lg px-4 py-2.5 hover:bg-brand-dark transition disabled:opacity-50"
            >
              {submitting ? "Adding…" : "Add item"}
            </button>
          </form>
        )}

        {view === "calendar" ? (
          <CalendarView licenses={visibleLicenses} />
        ) : visibleLicenses.length === 0 ? (
          <div className="bg-surface rounded-2xl border border-line p-14 text-center text-ink-faint text-[14px]">
            {licenses.length === 0
              ? "No items added yet. Click \u201cAdd item\u201d to get started."
              : "No items match your search or filters."}
          </div>
        ) : (
          <div className="bg-surface rounded-2xl border border-line divide-y divide-line overflow-hidden">
            {visibleLicenses.map((license) => {
              const status = getStatus(license.expiryDate);
              const risk = RISK_STYLES[status.risk];
              const isEditing = editingId === license.id;
              const isRenewing = renewingId === license.id;
              const itemTypeKey = license.typeKey || "license_permit";
              const itemTypeDef = getTypeDef(itemTypeKey);
              const editTypeDef = getTypeDef(itemTypeKey);
              const categoryName = categories.find((c) => c.id === license.categoryId)?.name;
              const detailLine = buildDetailLine(itemTypeKey, license as unknown as Record<string, unknown>);

              if (isEditing) {
                const editCategoriesForType = categories.filter((c) => c.typeKey === itemTypeKey);
                return (
                  <div key={license.id} className="p-6 bg-paper">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder={editTypeDef.itemNameLabel}
                        className="bg-surface border border-line rounded-lg px-3 py-2 text-[14px] focus:outline-none focus:ring-2 focus:ring-brand/25 focus:border-brand"
                      />
                      <select
                        value={editCategoryId}
                        onChange={(e) => setEditCategoryId(e.target.value)}
                        className="bg-surface border border-line rounded-lg px-3 py-2 text-[14px] focus:outline-none focus:ring-2 focus:ring-brand/25 focus:border-brand"
                      >
                        <option value="">Uncategorized</option>
                        {editCategoriesForType.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                      {editTypeDef.fields.map((f) =>
                        f.type === "select" ? (
                          <select
                            key={f.key}
                            required={f.required}
                            value={editFieldValues[f.key] || f.options?.[0] || ""}
                            onChange={(e) =>
                              setEditFieldValues((prev) => ({ ...prev, [f.key]: e.target.value }))
                            }
                            className="bg-surface border border-line rounded-lg px-3 py-2 text-[14px] focus:outline-none focus:ring-2 focus:ring-brand/25 focus:border-brand"
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
                            onChange={(e) =>
                              setEditFieldValues((prev) => ({ ...prev, [f.key]: e.target.value }))
                            }
                            placeholder={f.required ? `${f.label} (required)` : f.label}
                            className="bg-surface border border-line rounded-lg px-3 py-2 text-[14px] focus:outline-none focus:ring-2 focus:ring-brand/25 focus:border-brand"
                          />
                        )
                      )}
                      <input
                        type="date"
                        value={editExpiryDate}
                        onChange={(e) => setEditExpiryDate(e.target.value)}
                        className="bg-surface border border-line rounded-lg px-3 py-2 text-[14px] focus:outline-none focus:ring-2 focus:ring-brand/25 focus:border-brand"
                      />
                      <input
                        type="text"
                        value={editNotes}
                        onChange={(e) => setEditNotes(e.target.value)}
                        placeholder="Notes"
                        className="sm:col-span-2 bg-surface border border-line rounded-lg px-3 py-2 text-[14px] focus:outline-none focus:ring-2 focus:ring-brand/25 focus:border-brand"
                      />
                    </div>
                    {editError && (
                      <p className="text-[13px] text-critical bg-critical-soft rounded-lg px-3 py-2 mb-4">
                        {editError}
                      </p>
                    )}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleSaveEdit(license.id, license)}
                        disabled={editSubmitting}
                        className="bg-brand text-white text-[13px] font-medium rounded-lg px-4 py-2 hover:bg-brand-dark transition disabled:opacity-50"
                      >
                        {editSubmitting ? "Saving…" : "Save"}
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="text-[13px] text-ink-soft hover:text-ink px-4 py-2"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                );
              }

              if (isRenewing) {
                return (
                  <div key={license.id} className="p-6 bg-paper flex items-center justify-between gap-4 flex-wrap">
                    <div>
                      <p className="text-[15px] font-medium text-ink">{license.name}</p>
                      <p className="text-[13px] text-ink-faint mt-0.5">
                        Currently due {new Date(license.expiryDate).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="date"
                        value={renewDate}
                        onChange={(e) => setRenewDate(e.target.value)}
                        className="bg-surface border border-line rounded-lg px-3 py-2 text-[14px] focus:outline-none focus:ring-2 focus:ring-brand/25 focus:border-brand"
                      />
                      <button
                        onClick={() => handleConfirmRenew(license.id)}
                        disabled={renewSubmitting}
                        className="bg-brand text-white text-[13px] font-medium rounded-lg px-4 py-2 hover:bg-brand-dark transition disabled:opacity-50"
                      >
                        {renewSubmitting ? "Renewing…" : "Confirm renewal"}
                      </button>
                      <button
                        onClick={cancelRenew}
                        className="text-[13px] text-ink-soft hover:text-ink px-2"
                      >
                        Cancel
                      </button>
                    </div>
                    {renewError && (
                      <p className="w-full text-[13px] text-critical bg-critical-soft rounded-lg px-3 py-2">
                        {renewError}
                      </p>
                    )}
                  </div>
                );
              }

              return (
                <div key={license.id} className="flex items-stretch group hover:bg-paper/60 transition-colors">
                  <div className={`w-[3px] shrink-0 ${risk.bar}`} />
                  <div className="flex-1 px-5 py-4 sm:py-4.5 flex items-center justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <p className="text-[15px] font-medium text-ink leading-tight">
                          {license.name}
                        </p>
                        <span
                          className={`text-[11.5px] font-semibold px-2 py-[3px] rounded-full tabular-nums ${risk.badgeBg} ${risk.badgeText} shrink-0`}
                        >
                          {status.label}
                        </span>
                      </div>
                      <p className="text-[12.5px] text-ink-faint mt-1 leading-snug">
                        {detailLine ? `${detailLine} · ` : ""}
                        {itemTypeDef.dueDateLabel} {new Date(license.expiryDate).toLocaleDateString()}
                        {license.notes ? ` · ${license.notes}` : ""}
                      </p>
                      <span className="inline-flex items-center gap-1.5 mt-2 text-[11.5px] text-ink-faint">
                        <span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: CATEGORY_TYPE_DOT[itemTypeKey] }}
                        />
                        {itemTypeDef.label}
                        {categoryName ? ` · ${categoryName}` : ""}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => startRenew(license)}
                        className="text-[12.5px] font-medium text-ink-soft hover:text-brand hover:bg-brand-soft px-2.5 py-1.5 rounded-md transition"
                      >
                        Renew
                      </button>
                      <button
                        onClick={() => setChecklistLicense(license)}
                        className="text-[12.5px] font-medium text-ink-soft hover:text-brand hover:bg-brand-soft px-2.5 py-1.5 rounded-md transition"
                      >
                        Checklist
                      </button>
                      <RowActionsMenu
                        onEdit={() => startEdit(license)}
                        onDelete={() => requestDelete(license.id)}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {pendingDeleteId && (
        <div className="fixed inset-0 bg-ink/40 flex items-center justify-center z-50 px-4">
          <div className="bg-surface rounded-2xl shadow-xl max-w-sm w-full p-6">
            <h3 className="text-[15px] font-semibold text-ink mb-2">Delete this item?</h3>
            <p className="text-[14px] text-ink-faint mb-6">
              {licenseBeingDeleted
                ? `"${licenseBeingDeleted.name}" will be permanently removed. This can't be undone.`
                : "This can't be undone."}
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setPendingDeleteId(null)}
                className="text-[13px] text-ink-soft hover:text-ink px-4 py-2"
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleting}
                className="bg-critical text-white text-[13px] font-medium rounded-lg px-4 py-2 hover:opacity-90 transition disabled:opacity-50"
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {checklistLicense && (
        <ChecklistModal
          licenseName={checklistLicense.name}
          typeKey={checklistLicense.typeKey || "license_permit"}
          onClose={() => setChecklistLicense(null)}
        />
      )}

      {/* Toasts */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 items-end">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`${TOAST_STYLES[t.type]} text-[13px] font-medium rounded-lg px-4 py-2.5 shadow-lg max-w-sm`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </div>
  );
}
