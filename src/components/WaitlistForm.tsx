"use client";

import { useState } from "react";

interface Props {
  eventSlug: string;
  eventId: string;
}

export function WaitlistForm({ eventSlug }: Props) {
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [position, setPosition] = useState<number | null>(null);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch(`/api/events/${eventSlug}/waitlist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, firstName: firstName || undefined }),
      });
      const data = await res.json();

      if (res.ok) {
        setPosition(data.position);
      } else if (res.status === 409) {
        // Already on waitlist
        setPosition(data.position);
      } else {
        setError(data.error || "Something went wrong");
      }
    } catch {
      setError("Something went wrong");
    }
    setSubmitting(false);
  }

  if (position != null) {
    return (
      <div className="text-center py-2">
        <p className="text-sm text-indigo-400 font-medium">
          You are #{position} on the waitlist
        </p>
        <p className="text-xs text-slate-400 mt-1">
          We&apos;ll email you when a spot opens up.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <input
        type="email"
        required
        placeholder="Your email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-white placeholder-slate-400 focus:border-indigo-500 focus:outline-none"
      />
      <input
        type="text"
        placeholder="First name (optional)"
        value={firstName}
        onChange={(e) => setFirstName(e.target.value)}
        className="w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-white placeholder-slate-400 focus:border-indigo-500 focus:outline-none"
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors"
      >
        {submitting ? "Joining..." : "Join Waitlist"}
      </button>
    </form>
  );
}
