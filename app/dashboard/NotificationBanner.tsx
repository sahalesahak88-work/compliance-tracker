"use client";

import { useMemo, useState } from "react";

type License = {
  id: string;
  name: string;
  category: string;
  expiryDate: string;
};

function daysUntil(dateStr: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(dateStr);
  expiry.setHours(0, 0, 0, 0);
  return Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export default function NotificationBanner({ licenses }: { licenses: License[] }) {
  const [dismissed, setDismissed] = useState(false);

  const { expired, expiringSoon } = useMemo(() => {
    const expired: License[] = [];
    const expiringSoon: License[] = [];
    for (const lic of licenses) {
      const d = daysUntil(lic.expiryDate);
      if (d < 0) expired.push(lic);
      else if (d <= 7) expiringSoon.push(lic);
    }
    return { expired, expiringSoon };
  }, [licenses]);

  if (dismissed || (expired.length === 0 && expiringSoon.length === 0)) {
    return null;
  }

  const isCritical = expired.length > 0;
  const total = expired.length + expiringSoon.length;

  const message = isCritical
    ? `${expired.length} license${expired.length !== 1 ? "s" : ""} expired${
        expiringSoon.length > 0
          ? `, ${expiringSoon.length} more expiring this week`
          : ""
      }`
    : `${total} license${total !== 1 ? "s" : ""} expiring this week`;

  return (
    <div
      className={`flex items-center justify-between gap-4 rounded-xl border px-4 py-3 mb-4 ${
        isCritical
          ? "bg-critical-soft border-critical/30 text-critical"
          : "bg-warning-soft border-warning/30 text-warning"
      }`}
    >
      <div className="flex items-center gap-3">
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
            isCritical ? "bg-critical text-white" : "bg-warning text-white"
          }`}
        >
          !
        </span>
        <div>
          <p className="font-medium text-sm">{message}</p>
          <p className="text-xs opacity-80">
            {[...expired, ...expiringSoon]
              .slice(0, 3)
              .map((l) => l.name)
              .join(", ")}
            {total > 3 ? ` +${total - 3} more` : ""}
          </p>
        </div>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="text-xs font-medium opacity-70 hover:opacity-100 shrink-0"
      >
        Dismiss
      </button>
    </div>
  );
}