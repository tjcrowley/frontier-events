"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

interface TicketType {
  id: string;
  name: string;
  description: string | null;
  priceCents: number;
  quantity: number | null;
}

interface Event {
  id: string;
  title: string;
  slug: string;
  startsAt: string;
  location: string | null;
  ticketTypes: TicketType[];
}

export default function CheckoutPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [event, setEvent] = useState<Event | null>(null);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [contact, setContact] = useState({ firstName: "", lastName: "", email: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/events/${slug}`)
      .then((r) => r.json())
      .then((data) => {
        setEvent(data);
        const initial: Record<string, number> = {};
        data.ticketTypes?.forEach((tt: TicketType) => {
          initial[tt.id] = 0;
        });
        setQuantities(initial);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load event");
        setLoading(false);
      });
  }, [slug]);

  const totalCents = event
    ? event.ticketTypes.reduce(
        (sum, tt) => sum + tt.priceCents * (quantities[tt.id] || 0),
        0
      )
    : 0;

  const totalTickets = Object.values(quantities).reduce((a, b) => a + b, 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (totalTickets === 0) {
      setError("Please select at least one ticket");
      return;
    }
    setSubmitting(true);
    setError("");

    const ticketRequests = event!.ticketTypes
      .filter((tt) => (quantities[tt.id] || 0) > 0)
      .map((tt) => ({
        typeId: tt.id,
        quantity: quantities[tt.id],
        attendeeName: `${contact.firstName} ${contact.lastName}`,
        attendeeEmail: contact.email,
      }));

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: event!.id,
          tickets: ticketRequests,
          contact,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Checkout failed");
        setSubmitting(false);
        return;
      }

      if (data.url) {
        window.location.href = data.url;
      } else if (data.redirect) {
        router.push(data.redirect);
      }
    } catch {
      setError("Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-pulse text-slate-400">Loading...</div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <p className="text-red-400">Event not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900">
      <header className="border-b border-slate-800">
        <div className="mx-auto max-w-2xl px-4 py-4">
          <Link
            href={`/e/${slug}`}
            className="text-sm text-slate-400 hover:text-white transition-colors"
          >
            &larr; Back to event
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="text-2xl font-bold text-white mb-1">Checkout</h1>
        <p className="text-slate-400 mb-8">{event.title}</p>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Ticket Selection */}
          <section>
            <h2 className="text-lg font-semibold mb-4">Select Tickets</h2>
            <div className="space-y-3">
              {event.ticketTypes.map((tt) => (
                <div
                  key={tt.id}
                  className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-800/50 p-4"
                >
                  <div>
                    <p className="font-medium text-white">{tt.name}</p>
                    {tt.description && (
                      <p className="text-xs text-slate-400 mt-0.5">{tt.description}</p>
                    )}
                    <p className="text-sm text-indigo-400 mt-1">
                      {tt.priceCents === 0 ? "Free" : `$${(tt.priceCents / 100).toFixed(2)}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        setQuantities((q) => ({
                          ...q,
                          [tt.id]: Math.max(0, (q[tt.id] || 0) - 1),
                        }))
                      }
                      className="w-8 h-8 rounded-full border border-slate-600 text-white hover:bg-slate-700 transition-colors flex items-center justify-center"
                    >
                      -
                    </button>
                    <span className="w-6 text-center font-mono text-white">
                      {quantities[tt.id] || 0}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setQuantities((q) => ({
                          ...q,
                          [tt.id]: (q[tt.id] || 0) + 1,
                        }))
                      }
                      className="w-8 h-8 rounded-full border border-slate-600 text-white hover:bg-slate-700 transition-colors flex items-center justify-center"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Contact Info */}
          <section>
            <h2 className="text-lg font-semibold mb-4">Contact Information</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm text-slate-400 mb-1">First Name</label>
                <input
                  type="text"
                  required
                  value={contact.firstName}
                  onChange={(e) => setContact((c) => ({ ...c, firstName: e.target.value }))}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Last Name</label>
                <input
                  type="text"
                  required
                  value={contact.lastName}
                  onChange={(e) => setContact((c) => ({ ...c, lastName: e.target.value }))}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm text-slate-400 mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={contact.email}
                  onChange={(e) => setContact((c) => ({ ...c, email: e.target.value }))}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>
          </section>

          {/* Summary */}
          {totalTickets > 0 && (
            <section className="rounded-lg border border-slate-700 bg-slate-800/50 p-4">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">
                  {totalTickets} ticket{totalTickets !== 1 ? "s" : ""}
                </span>
                <span className="text-xl font-bold text-white">
                  {totalCents === 0 ? "Free" : `$${(totalCents / 100).toFixed(2)}`}
                </span>
              </div>
            </section>
          )}

          {error && (
            <p className="text-red-400 text-sm">{error}</p>
          )}

          <button
            type="submit"
            disabled={submitting || totalTickets === 0}
            className="w-full rounded-lg bg-indigo-600 px-4 py-3 font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting
              ? "Processing..."
              : totalCents === 0
              ? "Complete Registration"
              : `Pay $${(totalCents / 100).toFixed(2)}`}
          </button>
        </form>
      </main>
    </div>
  );
}
