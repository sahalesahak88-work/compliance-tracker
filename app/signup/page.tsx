"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [authority, setAuthority] = useState("DHA");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, authority, email, password }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Something went wrong.");
      return;
    }

    router.push("/onboarding");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-paper px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="w-10 h-10 rounded-lg bg-brand flex items-center justify-center text-white font-semibold mb-6">
          C
        </div>
        <div className="bg-surface rounded-2xl border border-line p-8">
          <h1 className="text-xl font-semibold text-ink mb-1">Create your account</h1>
          <p className="text-ink-faint text-[14px] mb-6">
            Track licenses and never miss a renewal.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[13px] font-medium text-ink-soft mb-1.5">
                Clinic / business name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-paper border border-line rounded-lg px-3 py-2.5 text-[14px] focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition"
                placeholder="e.g. Al Noor Diagnostic Center"
              />
            </div>

            <div>
              <label className="block text-[13px] font-medium text-ink-soft mb-1.5">
                Regulating authority
              </label>
              <select
                value={authority}
                onChange={(e) => setAuthority(e.target.value)}
                className="w-full bg-paper border border-line rounded-lg px-3 py-2.5 text-[14px] focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition"
              >
                <option value="DHA">DHA (Dubai)</option>
                <option value="MOH">MOH (Federal)</option>
                <option value="DOH">DOH (Abu Dhabi)</option>
              </select>
            </div>

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
                placeholder="you@clinic.ae"
              />
            </div>

            <div>
              <label className="block text-[13px] font-medium text-ink-soft mb-1.5">
                Password
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-paper border border-line rounded-lg px-3 py-2.5 text-[14px] focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition"
                placeholder="At least 6 characters"
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
              {loading ? "Creating account…" : "Create account"}
            </button>
          </form>
        </div>

        <p className="text-[14px] text-ink-faint mt-5 text-center">
          Already have an account?{" "}
          <Link href="/login" className="text-brand font-medium hover:text-brand-dark">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}