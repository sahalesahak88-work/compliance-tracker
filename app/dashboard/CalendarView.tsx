"use client";

import { useMemo, useState } from "react";

type License = {
  id: string;
  name: string;
  category: string;
  expiryDate: string;
};

function riskColor(daysLeft: number) {
  if (daysLeft < 0) return "bg-critical";
  if (daysLeft <= 30) return "bg-critical";
  if (daysLeft <= 60) return "bg-warning";
  return "bg-good";
}

export default function CalendarView({ licenses }: { licenses: License[] }) {
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });

  const year = cursor.getFullYear();
  const month = cursor.getMonth();

  const licensesByDay = useMemo(() => {
    const map = new Map<number, License[]>();
    for (const lic of licenses) {
      const d = new Date(lic.expiryDate);
      if (d.getFullYear() === year && d.getMonth() === month) {
        const day = d.getDate();
        if (!map.has(day)) map.set(day, []);
        map.get(day)!.push(lic);
      }
    }
    return map;
  }, [licenses, year, month]);

  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  const isCurrentMonth =
    today.getFullYear() === year && today.getMonth() === month;

  const cells: (number | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const monthLabel = cursor.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  function shiftMonth(delta: number) {
    setCursor(new Date(year, month + delta, 1));
  }

  function daysUntil(dateStr: string) {
    const d = new Date(dateStr);
    d.setHours(0, 0, 0, 0);
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return Math.ceil((d.getTime() - t.getTime()) / (1000 * 60 * 60 * 24));
  }

  return (
    <div className="bg-surface border border-line rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-ink font-semibold text-lg">{monthLabel}</h3>
        <div className="flex gap-2">
          <button
            onClick={() => shiftMonth(-1)}
            className="h-8 w-8 rounded-lg border border-line text-ink-soft hover:bg-paper flex items-center justify-center"
          >
            ‹
          </button>
          <button
            onClick={() => setCursor(new Date(new Date().getFullYear(), new Date().getMonth(), 1))}
            className="px-3 h-8 rounded-lg border border-line text-ink-soft hover:bg-paper text-sm"
          >
            Today
          </button>
          <button
            onClick={() => shiftMonth(1)}
            className="h-8 w-8 rounded-lg border border-line text-ink-soft hover:bg-paper flex items-center justify-center"
          >
            ›
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-1">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div
            key={d}
            className="text-center text-xs font-medium text-ink-faint py-1"
          >
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (day === null) {
            return <div key={`empty-${i}`} className="aspect-square" />;
          }
          const dayLicenses = licensesByDay.get(day) ?? [];
          const isToday = isCurrentMonth && today.getDate() === day;

          return (
            <div
              key={day}
              className={`aspect-square rounded-lg border p-1 flex flex-col overflow-hidden ${
                isToday
                  ? "border-brand bg-brand/5"
                  : "border-line bg-paper"
              }`}
            >
              <span
                className={`text-xs font-medium ${
                  isToday ? "text-brand" : "text-ink-soft"
                }`}
              >
                {day}
              </span>
              <div className="flex flex-col gap-0.5 mt-0.5 overflow-hidden">
                {dayLicenses.slice(0, 2).map((lic) => (
                  <div
                    key={lic.id}
                    title={`${lic.name} — expires ${lic.expiryDate}`}
                    className={`text-[10px] leading-tight text-white rounded px-1 truncate ${riskColor(
                      daysUntil(lic.expiryDate)
                    )}`}
                  >
                    {lic.name}
                  </div>
                ))}
                {dayLicenses.length > 2 && (
                  <span className="text-[10px] text-ink-faint px-1">
                    +{dayLicenses.length - 2} more
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-4 mt-4 pt-4 border-t border-line text-xs text-ink-faint">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-critical" /> Critical / expired
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-warning" /> Upcoming
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-good" /> Healthy
        </span>
      </div>
    </div>
  );
}