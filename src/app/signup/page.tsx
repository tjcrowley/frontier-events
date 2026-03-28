"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    newsletterOptIn: false,
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function updateField(field: string, value: string | boolean) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match");
      setSubmitting(false);
      return;
    }

    if (form.password.length < 8) {
      setError("Password must be at least 8 characters");
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/email/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email,
          password: form.password,
          firstName: form.firstName,
          lastName: form.lastName,
          newsletterOptIn: form.newsletterOptIn,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Signup failed");
        setSubmitting(false);
        return;
      }

      // Store JWT
      sessionStorage.setItem("frontier_token", data.token);
      document.cookie = `frontier_token=${data.token}; path=/; max-age=86400; SameSite=Lax`;

      router.push("/");
    } catch {
      setError("Something went wrong");
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="text-2xl font-bold text-white">
            Frontier Events
          </Link>
          <p className="text-slate-400 mt-2">Create your account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-slate-400 mb-1">
                First Name
              </label>
              <input
                type="text"
                required
                value={form.firstName}
                onChange={(e) => updateField("firstName", e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">
                Last Name
              </label>
              <input
                type="text"
                required
                value={form.lastName}
                onChange={(e) => updateField("lastName", e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-1">Email</label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => updateField("email", e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-1">
              Password
            </label>
            <input
              type="password"
              required
              value={form.password}
              onChange={(e) => updateField("password", e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
              placeholder="At least 8 characters"
            />
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-1">
              Confirm Password
            </label>
            <input
              type="password"
              required
              value={form.confirmPassword}
              onChange={(e) => updateField("confirmPassword", e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
              placeholder="Re-enter your password"
            />
          </div>

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.newsletterOptIn}
              onChange={(e) => updateField("newsletterOptIn", e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-slate-600 bg-slate-800 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-sm text-slate-300">
              Send me updates about Frontier Tower events
            </span>
          </label>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? "Creating account..." : "Create Account"}
          </button>
        </form>

        <p className="text-center text-sm text-slate-400 mt-6">
          Already have an account?{" "}
          <Link href="/login" className="text-indigo-400 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
