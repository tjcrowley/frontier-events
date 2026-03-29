"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/auth/email/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Login failed");
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
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center px-4">
      {/* Background glow */}
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
          <p className="text-white/40 text-sm">Sign in to your account</p>
        </div>

        <div className="rounded-2xl border border-white/8 bg-white/3 p-6 backdrop-blur-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-white/50 mb-1.5">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-white placeholder-white/20 focus:border-[#764AE2] focus:outline-none focus:bg-white/8 transition-colors"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="block text-sm text-white/50 mb-1.5">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-white placeholder-white/20 focus:border-[#764AE2] focus:outline-none focus:bg-white/8 transition-colors"
                placeholder="••••••••"
              />
            </div>

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
              {submitting ? "Signing in…" : "Sign In"}
            </button>
          </form>

          <p className="text-center text-sm text-white/30 mt-5">
            No account?{" "}
            <Link href="/signup" className="text-[#938DEE] hover:text-[#A4A7F3] transition-colors">
              Sign up
            </Link>
          </p>
        </div>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/8" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-[#0A0A0A] px-3 text-white/20">or</span>
          </div>
        </div>

        <p className="text-center text-xs text-white/20">
          Frontier Tower members — open inside{" "}
          <a href="https://os.frontiertower.io" className="text-[#764AE2] hover:text-[#938DEE] transition-colors">
            Frontier Wallet
          </a>{" "}
          for full access
        </p>
      </div>
    </div>
  );
}
