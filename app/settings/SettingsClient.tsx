"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CATEGORY_TYPES } from "@/lib/categoryTypes";

type ClinicWithoutPassword = {
  id: string;
  name: string;
  authority: string;
  email: string;
  createdAt: string;
};

type UserWithoutPassword = {
  id: string;
  clinicId: string;
  name: string;
  email: string;
  role: "owner" | "admin" | "member";
  createdAt: string;
};

const AUTHORITIES = ["DHA", "MOH", "DOH", "FANR", "Other"];

export default function SettingsClient({
  clinic,
  currentUser,
  enabledTypeKeys,
  initialTeamMembers,
}: {
  clinic: ClinicWithoutPassword;
  currentUser: UserWithoutPassword;
  enabledTypeKeys: string[];
  initialTeamMembers: UserWithoutPassword[];
}) {
  const router = useRouter();
  const canManageClinic = currentUser.role === "owner" || currentUser.role === "admin";

  return (
    <div className="min-h-screen bg-paper">
      <header className="bg-surface border-b border-line">
        <div className="max-w-2xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-[10px] bg-brand flex items-center justify-center text-white font-semibold text-[15px] shrink-0">
              {clinic.name.charAt(0).toUpperCase()}
            </div>
            <h1 className="text-[15px] font-semibold text-ink leading-tight tracking-[-0.01em]">
              Settings
            </h1>
          </div>
          <button
            onClick={() => router.push("/dashboard")}
            className="text-[13px] font-medium text-ink-faint hover:text-ink transition"
          >
            Back to dashboard
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-12 space-y-8">
        <ProfileSection clinic={clinic} canManage={canManageClinic} />
        <TeamSection currentUser={currentUser} initialTeamMembers={initialTeamMembers} />
        <CategoryTypesSection enabledTypeKeys={enabledTypeKeys} canManage={canManageClinic} />
        <PasswordSection />
      </main>
    </div>
  );
}

function ProfileSection({
  clinic,
  canManage,
}: {
  clinic: ClinicWithoutPassword;
  canManage: boolean;
}) {
  const [name, setName] = useState(clinic.name);
  const [authority, setAuthority] = useState(clinic.authority);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function handleSave() {
    setSaving(true);
    setMessage(null);

    const res = await fetch("/api/settings/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, authority }),
    });
    const data = await res.json();

    setSaving(false);

    if (!res.ok) {
      setMessage({ type: "error", text: data.error || "Something went wrong." });
      return;
    }
    setMessage({ type: "success", text: "Profile updated." });
  }

  return (
    <section className="bg-surface rounded-2xl border border-line p-7">
      <h2 className="text-[15px] font-semibold text-ink mb-1">Clinic profile</h2>
      <p className="text-[13px] text-ink-faint mb-5">
        Your clinic name and primary regulating authority — shared across
        everyone on your team.
      </p>

      {!canManage && (
        <p className="text-[13px] text-ink-faint bg-paper rounded-lg px-3 py-2 mb-4">
          Only owners and admins can edit the clinic profile.
        </p>
      )}

      <fieldset disabled={!canManage} className="space-y-4 disabled:opacity-60">
        <div>
          <label className="block text-[12.5px] font-medium text-ink-soft mb-1.5">
            Clinic name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-paper border border-line rounded-lg px-3 py-2 text-[14px] focus:outline-none focus:ring-2 focus:ring-brand/25 focus:border-brand transition"
          />
        </div>
        <div>
          <label className="block text-[12.5px] font-medium text-ink-soft mb-1.5">
            Primary authority
          </label>
          <select
            value={authority}
            onChange={(e) => setAuthority(e.target.value)}
            className="w-full bg-paper border border-line rounded-lg px-3 py-2 text-[14px] focus:outline-none focus:ring-2 focus:ring-brand/25 focus:border-brand transition"
          >
            {AUTHORITIES.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[12.5px] font-medium text-ink-soft mb-1.5">
            Clinic login email
          </label>
          <input
            type="email"
            value={clinic.email}
            disabled
            className="w-full bg-paper border border-line rounded-lg px-3 py-2 text-[14px] text-ink-faint cursor-not-allowed"
          />
          <p className="text-[12px] text-ink-faint mt-1">
            Legacy field from before team accounts — no longer used to log in.
          </p>
        </div>
      </fieldset>

      {message && (
        <p
          className={`text-[13px] rounded-lg px-3 py-2 mt-4 ${
            message.type === "success"
              ? "text-good bg-good-soft"
              : "text-critical bg-critical-soft"
          }`}
        >
          {message.text}
        </p>
      )}

      {canManage && (
        <button
          onClick={handleSave}
          disabled={saving || !name.trim()}
          className="bg-brand text-white rounded-lg px-4 py-2 text-[14px] font-medium hover:bg-brand-dark transition disabled:opacity-50 mt-5"
        >
          {saving ? "Saving…" : "Save profile"}
        </button>
      )}
    </section>
  );
}

const ROLE_LABEL: Record<string, string> = {
  owner: "Owner",
  admin: "Admin",
  member: "Member",
};

function TeamSection({
  currentUser,
  initialTeamMembers,
}: {
  currentUser: UserWithoutPassword;
  initialTeamMembers: UserWithoutPassword[];
}) {
  const [members, setMembers] = useState(initialTeamMembers);
  const [showAddForm, setShowAddForm] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const canManageTeam = currentUser.role === "owner" || currentUser.role === "admin";

  async function refreshTeam() {
    const res = await fetch("/api/team");
    if (res.ok) {
      setMembers(await res.json());
    }
  }

  async function handleRoleChange(userId: string, role: string) {
    setMessage(null);
    const res = await fetch(`/api/team/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage({ type: "error", text: data.error || "Couldn't change that role." });
      return;
    }
    await refreshTeam();
  }

  async function handleRemove(userId: string, name: string) {
    if (!confirm(`Remove ${name} from your clinic? They'll lose access immediately.`)) return;
    setMessage(null);
    const res = await fetch(`/api/team/${userId}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      setMessage({ type: "error", text: data.error || "Couldn't remove that teammate." });
      return;
    }
    await refreshTeam();
  }

  return (
    <section className="bg-surface rounded-2xl border border-line p-7">
      <div className="flex items-start justify-between mb-1">
        <div>
          <h2 className="text-[15px] font-semibold text-ink mb-1">Team</h2>
          <p className="text-[13px] text-ink-faint mb-5">
            Everyone with access to this clinic&apos;s compliance data.
          </p>
        </div>
        {canManageTeam && !showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="text-[13px] font-medium text-brand hover:text-brand-dark transition shrink-0"
          >
            + Add teammate
          </button>
        )}
      </div>

      <ul className="space-y-2 mb-2">
        {members.map((m) => (
          <li
            key={m.id}
            className="flex items-center justify-between gap-3 rounded-lg border border-line px-3 py-2.5"
          >
            <div className="min-w-0">
              <div className="text-[14px] font-medium text-ink truncate">
                {m.name}
                {m.id === currentUser.id && (
                  <span className="text-ink-faint font-normal"> (you)</span>
                )}
              </div>
              <div className="text-[12.5px] text-ink-faint truncate">{m.email}</div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {canManageTeam ? (
                <select
                  value={m.role}
                  onChange={(e) => handleRoleChange(m.id, e.target.value)}
                  // An admin (not owner) can't touch an owner's role
                  // at all — the API enforces this too, this just
                  // avoids offering a control their request would get
                  // rejected for.
                  disabled={m.role === "owner" && currentUser.role !== "owner"}
                  className="bg-paper border border-line rounded-md px-2 py-1 text-[12.5px] focus:outline-none focus:ring-2 focus:ring-brand/25 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {currentUser.role === "owner" && <option value="owner">Owner</option>}
                  <option value="admin">Admin</option>
                  <option value="member">Member</option>
                </select>
              ) : (
                <span className="text-[12.5px] text-ink-faint bg-paper rounded-md px-2 py-1">
                  {ROLE_LABEL[m.role]}
                </span>
              )}
              {canManageTeam && members.length > 1 && (
                <button
                  onClick={() => handleRemove(m.id, m.name)}
                  className="text-[12.5px] text-critical hover:text-critical/80 transition"
                >
                  Remove
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>

      {message && (
        <p
          className={`text-[13px] rounded-lg px-3 py-2 mt-3 ${
            message.type === "success"
              ? "text-good bg-good-soft"
              : "text-critical bg-critical-soft"
          }`}
        >
          {message.text}
        </p>
      )}

      {showAddForm && (
        <AddTeammateForm
          onCancel={() => setShowAddForm(false)}
          onAdded={async () => {
            setShowAddForm(false);
            await refreshTeam();
          }}
        />
      )}
    </section>
  );
}

function AddTeammateForm({
  onCancel,
  onAdded,
}: {
  onCancel: () => void;
  onAdded: () => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"admin" | "member">("member");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setError(null);
    setSaving(true);

    const res = await fetch("/api/team", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, role }),
    });
    const data = await res.json();
    setSaving(false);

    if (!res.ok) {
      setError(data.error || "Couldn't add that teammate.");
      return;
    }
    onAdded();
  }

  return (
    <div className="border-t border-line mt-4 pt-4 space-y-3">
      <p className="text-[12.5px] text-ink-faint">
        There&apos;s no email invite system yet — set a starting password here
        and share it with them directly; they can change it once they log in
        (Settings → Change password).
      </p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[12.5px] font-medium text-ink-soft mb-1.5">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-paper border border-line rounded-lg px-3 py-2 text-[14px] focus:outline-none focus:ring-2 focus:ring-brand/25 focus:border-brand transition"
          />
        </div>
        <div>
          <label className="block text-[12.5px] font-medium text-ink-soft mb-1.5">Role</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as "admin" | "member")}
            className="w-full bg-paper border border-line rounded-lg px-3 py-2 text-[14px] focus:outline-none focus:ring-2 focus:ring-brand/25 focus:border-brand transition"
          >
            <option value="member">Member</option>
            <option value="admin">Admin</option>
          </select>
        </div>
      </div>
      <div>
        <label className="block text-[12.5px] font-medium text-ink-soft mb-1.5">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full bg-paper border border-line rounded-lg px-3 py-2 text-[14px] focus:outline-none focus:ring-2 focus:ring-brand/25 focus:border-brand transition"
        />
      </div>
      <div>
        <label className="block text-[12.5px] font-medium text-ink-soft mb-1.5">
          Starting password
        </label>
        <input
          type="text"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="At least 8 characters"
          className="w-full bg-paper border border-line rounded-lg px-3 py-2 text-[14px] focus:outline-none focus:ring-2 focus:ring-brand/25 focus:border-brand transition"
        />
      </div>

      {error && (
        <p className="text-[13px] text-critical bg-critical-soft rounded-lg px-3 py-2">{error}</p>
      )}

      <div className="flex items-center gap-2">
        <button
          onClick={handleSubmit}
          disabled={saving || !name.trim() || !email.trim() || password.length < 8}
          className="bg-brand text-white rounded-lg px-4 py-2 text-[14px] font-medium hover:bg-brand-dark transition disabled:opacity-50"
        >
          {saving ? "Adding…" : "Add teammate"}
        </button>
        <button
          onClick={onCancel}
          className="text-[13px] font-medium text-ink-faint hover:text-ink transition px-2"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function CategoryTypesSection({
  enabledTypeKeys,
  canManage,
}: {
  enabledTypeKeys: string[];
  canManage: boolean;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set(enabledTypeKeys));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  function toggle(key: string) {
    if (!canManage) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        // Always keep at least one type enabled — an empty dashboard
        // with nothing trackable isn't a valid state.
        if (next.size === 1) return next;
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  async function handleSave() {
    setSaving(true);
    setMessage(null);

    const res = await fetch("/api/onboarding/category-types", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ typeKeys: Array.from(selected) }),
    });
    const data = await res.json();

    setSaving(false);

    if (!res.ok) {
      setMessage({ type: "error", text: data.error || "Something went wrong." });
      return;
    }
    setMessage({ type: "success", text: "Saved. Reflected on your dashboard now." });
  }

  return (
    <section className="bg-surface rounded-2xl border border-line p-7">
      <h2 className="text-[15px] font-semibold text-ink mb-1">What you track</h2>
      <p className="text-[13px] text-ink-faint mb-5">
        Turning a type off hides it from your dashboard — items you&apos;ve
        already added under it are kept, not deleted, and come back if you
        re-enable it later. Shared across your whole team.
      </p>

      {!canManage && (
        <p className="text-[13px] text-ink-faint bg-paper rounded-lg px-3 py-2 mb-4">
          Only owners and admins can change this.
        </p>
      )}

      <div className="space-y-2">
        {CATEGORY_TYPES.map((t) => {
          const checked = selected.has(t.key);
          return (
            <label
              key={t.key}
              className={`flex items-start gap-3 rounded-lg border px-3 py-2.5 transition ${
                canManage ? "cursor-pointer" : "cursor-not-allowed opacity-60"
              } ${checked ? "border-brand bg-brand/5" : "border-line bg-paper hover:border-ink-faint"}`}
            >
              <input
                type="checkbox"
                checked={checked}
                disabled={!canManage}
                onChange={() => toggle(t.key)}
                className="mt-0.5 w-4 h-4 accent-brand"
              />
              <div>
                <div className="text-[14px] font-medium text-ink">{t.label}</div>
                <div className="text-[13px] text-ink-faint">{t.description}</div>
              </div>
            </label>
          );
        })}
      </div>

      {message && (
        <p
          className={`text-[13px] rounded-lg px-3 py-2 mt-4 ${
            message.type === "success"
              ? "text-good bg-good-soft"
              : "text-critical bg-critical-soft"
          }`}
        >
          {message.text}
        </p>
      )}

      {canManage && (
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-brand text-white rounded-lg px-4 py-2 text-[14px] font-medium hover:bg-brand-dark transition disabled:opacity-50 mt-5"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
      )}
    </section>
  );
}

function PasswordSection() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function handleSave() {
    setMessage(null);

    if (newPassword !== confirmPassword) {
      setMessage({ type: "error", text: "New password and confirmation don't match." });
      return;
    }

    setSaving(true);
    const res = await fetch("/api/settings/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const data = await res.json();
    setSaving(false);

    if (!res.ok) {
      setMessage({ type: "error", text: data.error || "Something went wrong." });
      return;
    }

    setMessage({ type: "success", text: "Password changed." });
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  }

  return (
    <section className="bg-surface rounded-2xl border border-line p-7">
      <h2 className="text-[15px] font-semibold text-ink mb-1">Your password</h2>
      <p className="text-[13px] text-ink-faint mb-5">
        Changes the password for your account only — at least 8 characters.
      </p>

      <div className="space-y-4">
        <div>
          <label className="block text-[12.5px] font-medium text-ink-soft mb-1.5">
            Current password
          </label>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="w-full bg-paper border border-line rounded-lg px-3 py-2 text-[14px] focus:outline-none focus:ring-2 focus:ring-brand/25 focus:border-brand transition"
          />
        </div>
        <div>
          <label className="block text-[12.5px] font-medium text-ink-soft mb-1.5">
            New password
          </label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full bg-paper border border-line rounded-lg px-3 py-2 text-[14px] focus:outline-none focus:ring-2 focus:ring-brand/25 focus:border-brand transition"
          />
        </div>
        <div>
          <label className="block text-[12.5px] font-medium text-ink-soft mb-1.5">
            Confirm new password
          </label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full bg-paper border border-line rounded-lg px-3 py-2 text-[14px] focus:outline-none focus:ring-2 focus:ring-brand/25 focus:border-brand transition"
          />
        </div>
      </div>

      {message && (
        <p
          className={`text-[13px] rounded-lg px-3 py-2 mt-4 ${
            message.type === "success"
              ? "text-good bg-good-soft"
              : "text-critical bg-critical-soft"
          }`}
        >
          {message.text}
        </p>
      )}

      <button
        onClick={handleSave}
        disabled={saving || !currentPassword || !newPassword || !confirmPassword}
        className="bg-brand text-white rounded-lg px-4 py-2 text-[14px] font-medium hover:bg-brand-dark transition disabled:opacity-50 mt-5"
      >
        {saving ? "Saving…" : "Change password"}
      </button>
    </section>
  );
}
