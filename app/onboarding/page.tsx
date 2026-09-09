"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CATEGORY_TYPES, DEFAULT_ENABLED_TYPE_KEYS } from "@/lib/categoryTypes";

// lib/categoryTypes.ts is plain data (no node:sqlite import), so it's
// safe to import directly here — this used to be a fourth hand-typed
// copy of the same key/label list, kept "in sync manually" (i.e. not
// actually kept in sync — see that file's header comment).
const CATEGORY_TYPE_OPTIONS = CATEGORY_TYPES.map((t) => ({
  key: t.key,
  label: t.label,
  hint: t.description,
}));

const DEFAULT_ENABLED = new Set(DEFAULT_ENABLED_TYPE_KEYS);

export default function OnboardingPage() {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set(DEFAULT_ENABLED));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function toggle(key: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  async function handleContinue() {
    setError("");
    setLoading(true);

    const res = await fetch("/api/onboarding/category-types", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ typeKeys: Array.from(selected) }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Something went wrong.");
      return;
    }

    router.push("/dashboard");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-paper px-4 py-10">
      <div className="w-full max-w-lg">
        <div className="w-10 h-10 rounded-lg bg-brand flex items-center justify-center text-white font-semibold mb-6">
          C
        </div>
        <div className="bg-surface rounded-2xl border border-line p-8">
          <h1 className="text-xl font-semibold text-ink mb-1">
            What do you need to track?
          </h1>
          <p className="text-ink-faint text-[14px] mb-6">
            Pick the types of items relevant to your clinic. You can change
            this anytime from settings — unselected types won&apos;t clutter
            your dashboard.
          </p>

          <div className="space-y-2">
            {CATEGORY_TYPE_OPTIONS.map((option) => {
              const checked = selected.has(option.key);
              return (
                <label
                  key={option.key}
                  className={`flex items-start gap-3 rounded-lg border px-3 py-2.5 cursor-pointer transition ${
                    checked
                      ? "border-brand bg-brand/5"
                      : "border-line bg-paper hover:border-ink-faint"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(option.key)}
                    className="mt-0.5 w-4 h-4 accent-brand"
                  />
                  <div>
                    <div className="text-[14px] font-medium text-ink">
                      {option.label}
                    </div>
                    <div className="text-[13px] text-ink-faint">
                      {option.hint}
                    </div>
                  </div>
                </label>
              );
            })}
          </div>

          {error && (
            <p className="text-[13px] text-critical bg-critical-soft rounded-lg px-3 py-2 mt-4">
              {error}
            </p>
          )}

          <button
            onClick={handleContinue}
            disabled={loading}
            className="w-full bg-brand text-white rounded-lg py-2.5 text-[14px] font-medium hover:bg-brand-dark transition disabled:opacity-50 mt-6"
          >
            {loading ? "Saving…" : "Continue to dashboard"}
          </button>
        </div>
      </div>
    </div>
  );
}
