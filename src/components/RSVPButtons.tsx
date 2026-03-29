"use client";

import { useState, useEffect } from "react";

interface RSVPCounts {
  going: number;
  maybe: number;
  ticketHolders: number;
  total: number;
}

interface Props {
  eventSlug: string;
  eventId: string;
  initialCounts: RSVPCounts;
}

type RSVPStatus = "going" | "maybe" | "not_going";

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
    return payload;
  } catch {
    return null;
  }
}

export function RSVPButtons({ eventSlug, initialCounts }: Props) {
  const [counts, setCounts] = useState<RSVPCounts>(initialCounts);
  const [myStatus, setMyStatus] = useState<RSVPStatus | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<RSVPStatus | null>(null);
  const [formEmail, setFormEmail] = useState("");
  const [formFirstName, setFormFirstName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [confirmation, setConfirmation] = useState<string | null>(null);

  // Check if logged in and get existing RSVP
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userFirstName, setUserFirstName] = useState<string | null>(null);

  useEffect(() => {
    const token = sessionStorage.getItem("frontier_token");
    if (token) {
      const payload = decodeJwtPayload(token);
      if (payload) {
        setUserEmail(payload.email as string);
        setUserFirstName(payload.firstName as string | null);
      }
    }

    fetch(`/api/events/${eventSlug}/rsvp/mine`).then(async (r) => {
      if (r.ok) {
        const data = await r.json();
        if (data.status) setMyStatus(data.status);
      }
    });
  }, [eventSlug]);

  async function submitRsvp(status: RSVPStatus, email: string, firstName?: string) {
    setSubmitting(true);

    // Optimistic update
    const oldCounts = { ...counts };
    const oldStatus = myStatus;

    setCounts((prev) => {
      const next = { ...prev };
      // Remove from old status
      if (oldStatus === "going") next.going--;
      else if (oldStatus === "maybe") next.maybe--;
      // Add to new status
      if (status === "going") next.going++;
      else if (status === "maybe") next.maybe++;
      next.total = next.going + next.ticketHolders + next.maybe;
      return next;
    });
    setMyStatus(status);

    try {
      const res = await fetch(`/api/events/${eventSlug}/rsvp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, email, firstName }),
      });

      if (res.ok) {
        const data = await res.json();
        setCounts(data.counts);
        setShowForm(false);
        setPendingStatus(null);

        if (status === "going") setConfirmation("You are going! 🎉");
        else if (status === "maybe") setConfirmation("Maybe see you there!");
        else setConfirmation("Got it, you're not going.");

        setTimeout(() => setConfirmation(null), 3000);
      } else {
        // Revert on error
        setCounts(oldCounts);
        setMyStatus(oldStatus);
      }
    } catch {
      setCounts(oldCounts);
      setMyStatus(oldStatus);
    }

    setSubmitting(false);
  }

  function handleClick(status: RSVPStatus) {
    if (userEmail) {
      submitRsvp(status, userEmail, userFirstName ?? undefined);
    } else {
      setPendingStatus(status);
      setShowForm(true);
    }
  }

  function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pendingStatus && formEmail) {
      submitRsvp(pendingStatus, formEmail, formFirstName || undefined);
    }
  }

  const totalGoing = counts.going + counts.ticketHolders;

  return (
    <div className="mb-4">
      {/* Attendance pill */}
      {(totalGoing > 0 || counts.maybe > 0) && (
        <div className="mb-3 text-sm text-slate-300">
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-700/50 px-3 py-1">
            ✓ {totalGoing} going{counts.maybe > 0 && ` · ${counts.maybe} maybe`}
          </span>
        </div>
      )}

      {/* RSVP Buttons */}
      <div className="flex gap-2 mb-2">
        {(["going", "maybe", "not_going"] as const).map((status) => (
          <button
            key={status}
            onClick={() => handleClick(status)}
            disabled={submitting}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              myStatus === status
                ? "bg-indigo-600 text-white"
                : "bg-slate-700 text-slate-300 hover:bg-slate-600"
            } disabled:opacity-50`}
          >
            {status === "going" ? "Going" : status === "maybe" ? "Maybe" : "Not Going"}
          </button>
        ))}
      </div>

      {/* Confirmation message */}
      {confirmation && (
        <p className="text-sm text-green-400 mb-2">{confirmation}</p>
      )}

      {/* Inline email form for non-logged-in users */}
      {showForm && (
        <form onSubmit={handleFormSubmit} className="mt-2 space-y-2">
          <input
            type="email"
            required
            placeholder="Your email"
            value={formEmail}
            onChange={(e) => setFormEmail(e.target.value)}
            className="w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-1.5 text-sm text-white placeholder-slate-400 focus:border-indigo-500 focus:outline-none"
          />
          <input
            type="text"
            placeholder="First name (optional)"
            value={formFirstName}
            onChange={(e) => setFormFirstName(e.target.value)}
            className="w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-1.5 text-sm text-white placeholder-slate-400 focus:border-indigo-500 focus:outline-none"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
            >
              {submitting ? "Saving..." : "Confirm"}
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); setPendingStatus(null); }}
              className="rounded-lg bg-slate-700 px-4 py-1.5 text-sm text-slate-300 hover:bg-slate-600"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
