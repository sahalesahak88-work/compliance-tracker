"use client";

import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Something went wrong.");
      return;
    }

    // The API always returns the same generic message whether or not
    // the email is registered, so this screen never reveals which
    // case happened either.
    setSent(true);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-paper px-4">
      <div className="w-full max-w-sm">
        <div className="w-10 h-10 rounded-lg bg-brand flex items-center justify-center text-white font-semibold mb-6">
          C
        </div>
        <div className="bg-surface rounded-2xl border border-line p-8">
          {sent ? (
            <>
              <h1 className="text-xl font-semibold text-ink mb-1">Check your email</h1>
              <p className="text-ink-faint text-[14px]">
                If an account exists for <span className="text-ink-soft">{email}</span>, we&apos;ve
                sent a link to reset your password. It expires in 1 hour.
              </p>
            </>
          ) : (
            <>
              <h1 className="text-xl font-semibold text-ink mb-1">Reset your password</h1>
              <p className="text-ink-faint text-[14px] mb-6">
                Enter your email and we&apos;ll send you a link to reset your password.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-[13px] font-medium text-ink-soft mb-1.5">
                    Email
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
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
                  {loading ? "Sending…" : "Send reset link"}
                </button>
              </form>
            </>
          )}
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
