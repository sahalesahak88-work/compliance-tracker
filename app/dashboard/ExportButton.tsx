"use client";

import { useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { getTypeDef, buildDetailLine } from "@/lib/categoryTypes";
import type { License } from "@/lib/models";

function daysUntil(dateStr: string) {
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  return Math.ceil((d.getTime() - t.getTime()) / (1000 * 60 * 60 * 24));
}

function statusLabel(days: number) {
  if (days < 0) return "EXPIRED";
  if (days <= 30) return "CRITICAL";
  if (days <= 60) return "UPCOMING";
  return "HEALTHY";
}

function csvEscape(val: string) {
  if (val.includes(",") || val.includes('"') || val.includes("\n")) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}

// Every entity type has a different "due date" concept (expiry,
// calibration due, service due, renewal date...) — the export should
// say which one it actually is per row, not label everything
// "Expiry Date" the way a License/Permit-only export would.
function dueDateLabel(typeKey: string) {
  const def = getTypeDef(typeKey);
  return def.dueDateLabel || "Due Date";
}

export default function ExportButton({
  licenses,
  clinicName,
}: {
  licenses: License[];
  clinicName: string;
}) {
  const [open, setOpen] = useState(false);

  function exportCSV() {
    const headers = [
      "Name",
      "Type",
      "Category",
      "Details",
      "Due Date Type",
      "Due Date",
      "Status",
      "Notes",
    ];
    const rows = licenses.map((l) => {
      const typeKey = l.typeKey || "license_permit";
      return [
        l.name,
        getTypeDef(typeKey).label,
        l.category,
        buildDetailLine(typeKey, l as unknown as Record<string, unknown>),
        dueDateLabel(typeKey),
        l.expiryDate,
        statusLabel(daysUntil(l.expiryDate)),
        l.notes ?? "",
      ];
    });
    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => csvEscape(String(cell))).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${clinicName.replace(/\s+/g, "_")}_compliance_export_${
      new Date().toISOString().split("T")[0]
    }.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setOpen(false);
  }

  function exportPDF() {
    const doc = new jsPDF();

    doc.setFontSize(16);
    doc.setTextColor(11, 18, 32); // ink
    doc.text("Compliance Status Report", 14, 18);

    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Clinic: ${clinicName}`, 14, 26);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 32);

    const critical = licenses.filter((l) => daysUntil(l.expiryDate) <= 30).length;
    const upcoming = licenses.filter((l) => {
      const d = daysUntil(l.expiryDate);
      return d > 30 && d <= 60;
    }).length;
    const healthy = licenses.length - critical - upcoming;

    doc.setFontSize(10);
    doc.setTextColor(11, 18, 32);
    doc.text(
      `Total items: ${licenses.length}   |   Critical: ${critical}   |   Upcoming: ${upcoming}   |   Healthy: ${healthy}`,
      14,
      40
    );

    autoTable(doc, {
      startY: 46,
      head: [["Name", "Type", "Details", "Due Date", "Status"]],
      body: licenses.map((l) => {
        const typeKey = l.typeKey || "license_permit";
        return [
          l.name,
          getTypeDef(typeKey).label,
          buildDetailLine(typeKey, l as unknown as Record<string, unknown>),
          l.expiryDate,
          statusLabel(daysUntil(l.expiryDate)),
        ];
      }),
      headStyles: { fillColor: [12, 140, 130] }, // brand teal
      styles: { fontSize: 8, cellPadding: 3 },
      didParseCell: (data) => {
        if (data.section === "body" && data.column.index === 4) {
          const status = data.cell.raw as string;
          if (status === "EXPIRED" || status === "CRITICAL") {
            data.cell.styles.textColor = [214, 39, 75];
          } else if (status === "UPCOMING") {
            data.cell.styles.textColor = [194, 118, 12];
          } else {
            data.cell.styles.textColor = [15, 138, 95];
          }
        }
      },
    });

    doc.save(
      `${clinicName.replace(/\s+/g, "_")}_compliance_report_${
        new Date().toISOString().split("T")[0]
      }.pdf`
    );
    setOpen(false);
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="px-3 py-2 rounded-lg border border-line bg-surface text-ink-soft hover:bg-paper text-sm font-medium flex items-center gap-1.5"
      >
        Export
        <span className="text-xs">▾</span>
      </button>
      {open && (
        <div className="absolute right-0 mt-1 w-48 bg-surface border border-line rounded-lg shadow-lg py-1 z-10">
          <button
            onClick={exportPDF}
            className="w-full text-left px-3 py-2 text-sm text-ink hover:bg-paper"
          >
            PDF report (audit-ready)
          </button>
          <button
            onClick={exportCSV}
            className="w-full text-left px-3 py-2 text-sm text-ink hover:bg-paper"
          >
            CSV / Excel
          </button>
        </div>
      )}
    </div>
  );
}
