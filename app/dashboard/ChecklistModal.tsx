"use client";

import { useState } from "react";
import { RENEWAL_CHECKLISTS, DEFAULT_CHECKLIST } from "./ChecklistData";
import { getTypeDef } from "@/lib/categoryTypes";

export default function ChecklistModal({
  licenseName,
  typeKey,
  onClose,
}: {
  licenseName: string;
  typeKey: string;
  onClose: () => void;
}) {
  const items = RENEWAL_CHECKLISTS[typeKey] ?? DEFAULT_CHECKLIST;
  const typeLabel = getTypeDef(typeKey).label;
  const [checked, setChecked] = useState<Record<number, boolean>>({});

  function toggle(i: number) {
    setChecked((prev) => ({ ...prev, [i]: !prev[i] }));
  }

  const doneCount = Object.values(checked).filter(Boolean).length;

  return (
    <div className="fixed inset-0 bg-ink/40 flex items-center justify-center z-50 px-4">
      <div className="bg-surface rounded-2xl shadow-xl max-w-md w-full p-6 max-h-[85vh] overflow-y-auto">
        <div className="flex items-start justify-between mb-1">
          <div>
            <h3 className="text-[15px] font-semibold text-ink">Renewal checklist</h3>
            <p className="text-[13px] text-ink-faint mt-0.5">{licenseName} · {typeLabel}</p>
          </div>
          <button
            onClick={onClose}
            className="text-ink-faint hover:text-ink text-lg leading-none px-1"
          >
            ×
          </button>
        </div>

        <p className="text-[12px] text-ink-faint mt-3 mb-4">
          {doneCount}/{items.length} prepared
        </p>

        <ul className="space-y-2.5 mb-4">
          {items.map((item, i) => (
            <li key={i} className="flex items-start gap-2.5">
              <button
                onClick={() => toggle(i)}
                className={`mt-0.5 shrink-0 w-4 h-4 rounded border flex items-center justify-center transition ${
                  checked[i]
                    ? "bg-brand border-brand text-white"
                    : "border-line bg-surface"
                }`}
              >
                {checked[i] && (
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M1.5 5L4 7.5L8.5 2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>
              <div>
                <p className={`text-[13px] leading-snug ${checked[i] ? "text-ink-faint line-through" : "text-ink"}`}>
                  {item.text}
                </p>
                {item.note && (
                  <p className="text-[12px] text-ink-faint mt-0.5">{item.note}</p>
                )}
              </div>
            </li>
          ))}
        </ul>

        <p className="text-[11px] text-ink-faint border-t border-line pt-3">
          General guidance based on published DHA/MOHAP/DOH requirements — exact
          documents vary by emirate, facility type, and change periodically.
          Confirm the current list with the issuing authority before submitting.
        </p>
      </div>
    </div>
  );
}
