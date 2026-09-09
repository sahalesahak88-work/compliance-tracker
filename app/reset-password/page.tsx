"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (newPassword !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    setLoading(true);
    const res = await fetch("/api/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, newPassword }),
    });
    setLoading(false);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Something went wrong.");
      return;
    }

    setDone(true);
    setTimeout(() => router.push("/login"), 2000);
  }

  if (!token) {
    return (
      <p className="text-[13px] text-critical bg-critical-soft rounded-lg px-3 py-2">
        This reset link is missing its token. Please request a new one from the{" "}
        <Link href="/forgot-password" className="font-medium underline">
          forgot password
        </Link>{" "}
        page.
      </p>
    );
  }

  if (done) {
    return (
      <p className="text-ink-faint text-[14px]">
        Your password has been reset. Redirecting you to log in…
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-[13px] font-medium text-ink-soft mb-1.5">
          New password
        </label>
        <input
          type="password"
          required
          minLength={8}
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className="w-full bg-paper border border-line rounded-lg px-3 py-2.5 text-[14px] focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition"
        />
      </div>

      <div>
        <label className="block text-[13px] font-medium text-ink-soft mb-1.5">
          Confirm new password
        </label>
        <input
          type="password"
          required
          minLength={8}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="w-full bg-paper border border-line rounded-lg px-3 py-2.5 text-[14px] focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition"
        />
      </div>

      {error && (
        <p className="text-[13px] text-critical bg-critical-soft rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-brand text-white rounded-lg py-2.5 text-[14px] font-medium hover:bg-brand-dark transition disabled:opacity-50"
      >
        {loading ? "Resetting…" : "Reset password"}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-paper px-4">
      <div className="w-full max-w-sm">
        <div className="w-10 h-10 rounded-lg bg-brand flex items-center justify-center text-white font-semibold mb-6">
          C
        </div>
        <div className="bg-surface rounded-2xl border border-line p-8">
          <h1 className="text-xl font-semibold text-ink mb-1">Set a new password</h1>
          <p className="text-ink-faint text-[14px] mb-6">
            Choose a new password for your account.
          </p>
          <Suspense fallback={<p className="text-ink-faint text-[14px]">Loading…</p>}>
            <ResetPasswordForm />
          </Suspense>
        </div>

        <p className="text-[14px] text-ink-faint mt-5 text-center">
          <Link href="/login" className="text-brand font-medium hover:text-brand-dark">
            Back to log in
          </Link>
        </p>
      </div>
    </div>
  );
}
