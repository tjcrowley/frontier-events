"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

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
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center px-4 py-12">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute -top-48 left-1/2 -translate-x-1/2 w-[500px] h-[400px] rounded-full opacity-15 blur-3xl"
          style={{ background: "radial-gradient(ellipse, #764AE2, transparent 70%)" }}
        />
      </div>

      <div className="relative w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/">
            <Image src="/logo-white.svg" alt="Frontier Tower" width={140} height={25} className="mx-auto mb-4 opacity-90" />
          </Link>
          <p className="text-white/40 text-sm">Create your account</p>
        </div>

        <div className="rounded-2xl border border-white/8 bg-white/3 p-6 backdrop-blur-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-white/50 mb-1.5">First Name</label>
                <input
                  type="text"
                  required
                  value={form.firstName}
                  onChange={(e) => updateField("firstName", e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-white placeholder-white/20 focus:border-[#764AE2] focus:outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm text-white/50 mb-1.5">Last Name</label>
                <input
                  type="text"
                  required
                  value={form.lastName}
                  onChange={(e) => updateField("lastName", e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-white placeholder-white/20 focus:border-[#764AE2] focus:outline-none transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-white/50 mb-1.5">Email</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => updateField("email", e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-white placeholder-white/20 focus:border-[#764AE2] focus:outline-none transition-colors"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="block text-sm text-white/50 mb-1.5">Password</label>
              <input
                type="password"
                required
                value={form.password}
                onChange={(e) => updateField("password", e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-white placeholder-white/20 focus:border-[#764AE2] focus:outline-none transition-colors"
                placeholder="At least 8 characters"
              />
            </div>

            <div>
              <label className="block text-sm text-white/50 mb-1.5">Confirm Password</label>
              <input
                type="password"
                required
                value={form.confirmPassword}
                onChange={(e) => updateField("confirmPassword", e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-white placeholder-white/20 focus:border-[#764AE2] focus:outline-none transition-colors"
                placeholder="Re-enter your password"
              />
            </div>

            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={form.newsletterOptIn}
                onChange={(e) => updateField("newsletterOptIn", e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-white/20 bg-white/10 accent-[#764AE2] focus:ring-[#764AE2]"
              />
              <span className="text-sm text-white/40 group-hover:text-white/60 transition-colors">
                Send me updates about Frontier Tower events
              </span>
            </label>

            {error && (
              <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg px-4 py-2.5 font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              style={{ background: "linear-gradient(135deg, #938DEE, #764AE2)" }}
            >
              {submitting ? "Creating account…" : "Create Account"}
            </button>
          </form>

          <p className="text-center text-sm text-white/30 mt-5">
            Already have an account?{" "}
            <Link href="/login" className="text-[#938DEE] hover:text-[#A4A7F3] transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
