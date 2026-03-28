"use client";

import { useState } from "react";
import { useFrontier } from "./FrontierProvider";

export function NewsletterModal() {
  const {
    showNewsletterModal,
    setShowNewsletterModal,
    firstName,
    setNewsletterOptIn,
  } = useFrontier();
  const [checked, setChecked] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (!showNewsletterModal) return null;

  async function handleContinue() {
    if (checked) {
      setSubmitting(true);
      try {
        const token = sessionStorage.getItem("frontier_token");
        await fetch("/api/auth/newsletter", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ optIn: true }),
        });
        setNewsletterOptIn(true);
      } catch (error) {
        console.error("Newsletter opt-in error:", error);
      }
      setSubmitting(false);
    }
    setShowNewsletterModal(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0A0A0A]/90 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-md rounded-2xl border border-slate-800 bg-[#0A0A0A] p-8 shadow-2xl">
        <h2 className="text-2xl font-bold text-white mb-2">
          Welcome to Frontier Events{firstName ? `, ${firstName}` : ""}!
        </h2>
        <p className="text-slate-400 mb-6">
          We&apos;re glad you&apos;re here. Stay in the loop on what&apos;s happening at Frontier Tower.
        </p>

        <label className="flex items-start gap-3 cursor-pointer mb-8">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-slate-600 bg-slate-800 text-[#764AE2] focus:ring-[#764AE2]"
          />
          <span className="text-sm text-slate-300">
            Stay updated on Frontier Tower events?
          </span>
        </label>

        <button
          onClick={handleContinue}
          disabled={submitting}
          className="w-full rounded-lg px-4 py-3 font-semibold text-white transition-colors disabled:opacity-50"
          style={{ backgroundColor: "#764AE2" }}
        >
          {submitting ? "Saving..." : "Continue"}
        </button>
      </div>
    </div>
  );
}
