"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { EventMessaging } from "@/components/EventMessaging";

interface TicketType {
  id: string;
  name: string;
  description: string | null;
  priceCents: number;
  quantity: number | null;
}

interface WaitlistEntry {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  position: number;
  status: string;
  notifiedAt: string | null;
  createdAt: string;
}

interface EventData {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  location: string | null;
  startsAt: string;
  endsAt: string | null;
  capacity: number | null;
  coverImageUrl: string | null;
  visibility: string;
  status: string;
  recurringType: string | null;
  recurringParentId: string | null;
  recurringEndsAt: string | null;
  lumaEventId: string | null;
  lumaSyncedAt: string | null;
  ticketTypes: TicketType[];
}

export default function EditEventPage() {
  const params = useParams();
  const id = params.id as string;

  const [event, setEvent] = useState<EventData | null>(null);
  const [form, setForm] = useState({
    title: "",
    slug: "",
    description: "",
    location: "",
    startsAt: "",
    endsAt: "",
    capacity: "",
    coverImageUrl: "",
    visibility: "public",
    recurringType: "",
    recurringEndsAt: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  // RSVP counts
  const [rsvpCounts, setRsvpCounts] = useState<{ going: number; maybe: number; ticketHolders: number; total: number } | null>(null);
  // Messages
  const [messages, setMessages] = useState<Array<{ id: string; subject: string; body: string; recipientFilter: string; recipientCount: number | null; status: string; sentAt: string | null; createdAt: string }>>([]);

  // Recurrence
  const [generating, setGenerating] = useState(false);
  const [generateResult, setGenerateResult] = useState<string | null>(null);

  // Waitlist
  const [waitlistEntries, setWaitlistEntries] = useState<WaitlistEntry[]>([]);
  const [notifying, setNotifying] = useState<string | null>(null);

  // Luma sync
  const [syncingLuma, setSyncingLuma] = useState(false);
  const [lumaError, setLumaError] = useState("");

  // Ticket type form
  const [newTicketType, setNewTicketType] = useState({
    name: "",
    description: "",
    priceCents: "",
    quantity: "",
  });
  const [addingTicketType, setAddingTicketType] = useState(false);

  useEffect(() => {
    fetch(`/api/admin/events/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setEvent(data);
        setForm({
          title: data.title,
          slug: data.slug,
          description: data.description ?? "",
          location: data.location ?? "",
          startsAt: toLocalDatetime(data.startsAt),
          endsAt: data.endsAt ? toLocalDatetime(data.endsAt) : "",
          capacity: data.capacity?.toString() ?? "",
          coverImageUrl: data.coverImageUrl ?? "",
          visibility: data.visibility ?? "public",
          recurringType: data.recurringType ?? "",
          recurringEndsAt: data.recurringEndsAt ? toLocalDatetime(data.recurringEndsAt).slice(0, 10) : "",
        });
        setLoading(false);

        // Fetch RSVP counts
        fetch(`/api/events/${data.slug}/rsvp`)
          .then((r) => r.json())
          .then(setRsvpCounts)
          .catch(() => {});

        // Fetch messages
        fetch(`/api/admin/events/${id}/messages`)
          .then((r) => r.json())
          .then(setMessages)
          .catch(() => {});

        // Fetch waitlist
        fetch(`/api/admin/events/${id}/waitlist`)
          .then((r) => r.json())
          .then((data) => { if (Array.isArray(data)) setWaitlistEntries(data); })
          .catch(() => {});
      })
      .catch(() => {
        setError("Failed to load event");
        setLoading(false);
      });
  }, [id]);

  function toLocalDatetime(isoString: string): string {
    const d = new Date(isoString);
    const offset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - offset).toISOString().slice(0, 16);
  }

  function updateField(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const res = await fetch(`/api/admin/events/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          capacity: form.capacity ? parseInt(form.capacity) : null,
          startsAt: new Date(form.startsAt).toISOString(),
          endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : null,
          recurringType: form.recurringType || null,
          recurringEndsAt: form.recurringEndsAt ? new Date(form.recurringEndsAt).toISOString() : null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to save");
      }
    } catch {
      setError("Something went wrong");
    }
    setSaving(false);
  }

  async function togglePublish() {
    const res = await fetch(`/api/admin/events/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "toggle_publish" }),
    });
    if (res.ok) {
      const data = await res.json();
      setEvent((e) =>
        e
          ? {
              ...e,
              status: data.status,
              lumaEventId: data.lumaEventId ?? e.lumaEventId,
              lumaSyncedAt: data.lumaSyncedAt ?? e.lumaSyncedAt,
            }
          : e
      );
    }
  }

  async function syncToLuma() {
    setSyncingLuma(true);
    setLumaError("");
    try {
      const res = await fetch(`/api/admin/events/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sync_luma" }),
      });
      const data = await res.json();
      if (res.ok) {
        setEvent((e) =>
          e ? { ...e, lumaEventId: data.lumaEventId, lumaSyncedAt: new Date().toISOString() } : e
        );
      } else {
        setLumaError(data.error ?? "Sync failed");
      }
    } catch {
      setLumaError("Network error");
    }
    setSyncingLuma(false);
  }

  async function generateInstances() {
    setGenerating(true);
    setGenerateResult(null);
    try {
      const res = await fetch(`/api/admin/events/${id}/generate-instances`, {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok) {
        setGenerateResult(`Created ${data.created} recurring instances`);
      } else {
        setGenerateResult(data.error || "Failed to generate instances");
      }
    } catch {
      setGenerateResult("Something went wrong");
    }
    setGenerating(false);
  }

  async function notifyWaitlistEntry(entryId: string) {
    setNotifying(entryId);
    try {
      const res = await fetch(`/api/admin/events/${id}/waitlist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "notify", waitlistId: entryId }),
      });
      if (res.ok) {
        setWaitlistEntries((entries) =>
          entries.map((e) =>
            e.id === entryId ? { ...e, status: "notified", notifiedAt: new Date().toISOString() } : e
          )
        );
      }
    } catch {
      // ignore
    }
    setNotifying(null);
  }

  async function notifyNext() {
    const next = waitlistEntries.find((e) => e.status === "waiting");
    if (next) await notifyWaitlistEntry(next.id);
  }

  async function addTicketType(e: React.FormEvent) {
    e.preventDefault();
    setAddingTicketType(true);

    try {
      const res = await fetch("/api/admin/ticket-types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: id,
          name: newTicketType.name,
          description: newTicketType.description || null,
          priceCents: parseInt(newTicketType.priceCents) || 0,
          quantity: newTicketType.quantity ? parseInt(newTicketType.quantity) : null,
        }),
      });

      if (res.ok) {
        const tt = await res.json();
        setEvent((e) => (e ? { ...e, ticketTypes: [...e.ticketTypes, tt] } : e));
        setNewTicketType({ name: "", description: "", priceCents: "", quantity: "" });
      }
    } catch {
      setError("Failed to add ticket type");
    }
    setAddingTicketType(false);
  }

  async function deleteTicketType(ttId: string) {
    const res = await fetch(`/api/admin/ticket-types/${ttId}`, { method: "DELETE" });
    if (res.ok) {
      setEvent((e) =>
        e ? { ...e, ticketTypes: e.ticketTypes.filter((tt) => tt.id !== ttId) } : e
      );
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

  const waitingCount = waitlistEntries.filter((e) => e.status === "waiting").length;

  return (
    <div className="min-h-screen bg-slate-900">
      <header className="border-b border-slate-800">
        <div className="mx-auto max-w-3xl px-4 py-4 flex items-center justify-between">
          <Link
            href="/admin/events"
            className="text-sm text-slate-400 hover:text-white transition-colors"
          >
            &larr; Back to Events
          </Link>
          <div className="flex gap-2">
            <button
              onClick={togglePublish}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                event.status === "published"
                  ? "bg-yellow-900/30 text-yellow-400 hover:bg-yellow-900/50"
                  : "bg-green-900/30 text-green-400 hover:bg-green-900/50"
              }`}
            >
              {event.status === "published" ? "Unpublish" : "Publish"}
            </button>
            {/* Luma sync button */}
            <button
              onClick={syncToLuma}
              disabled={syncingLuma}
              title={event.lumaEventId ? `Synced to Luma${event.lumaSyncedAt ? ` · ${new Date(event.lumaSyncedAt).toLocaleDateString()}` : ""}` : "Push to Luma"}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50 ${
                event.lumaEventId
                  ? "bg-purple-900/30 text-purple-400 hover:bg-purple-900/50"
                  : "bg-slate-800 text-slate-400 hover:bg-slate-700"
              }`}
            >
              {syncingLuma ? "Syncing…" : event.lumaEventId ? "✓ Luma" : "→ Luma"}
            </button>
            <Link
              href={`/e/${event.slug}`}
              className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-800 transition-colors"
            >
              View
            </Link>
          </div>
        </div>
      </header>
      {lumaError && (
        <div className="bg-red-900/20 border-b border-red-800 px-4 py-2 text-sm text-red-400 text-center">
          Luma sync error: {lumaError}
        </div>
      )}

      <main className="mx-auto max-w-3xl px-4 py-8 space-y-10">
        {/* RSVP Summary */}
        {rsvpCounts && (rsvpCounts.going > 0 || rsvpCounts.maybe > 0 || rsvpCounts.ticketHolders > 0) && (
          <div className="flex gap-4 text-sm">
            <span className="rounded-full bg-green-900/30 text-green-400 px-3 py-1">
              {rsvpCounts.going + rsvpCounts.ticketHolders} going
            </span>
            {rsvpCounts.maybe > 0 && (
              <span className="rounded-full bg-yellow-900/30 text-yellow-400 px-3 py-1">
                {rsvpCounts.maybe} maybe
              </span>
            )}
            {rsvpCounts.ticketHolders > 0 && (
              <span className="rounded-full bg-indigo-900/30 text-indigo-400 px-3 py-1">
                {rsvpCounts.ticketHolders} tickets
              </span>
            )}
          </div>
        )}

        {/* Recurring instance note */}
        {event.recurringParentId && (
          <div className="rounded-lg border border-indigo-800/50 bg-indigo-900/20 p-4 text-sm text-indigo-300">
            This is a recurring instance of{" "}
            <Link href={`/admin/events/${event.recurringParentId}`} className="underline hover:text-white">
              the parent event
            </Link>.
          </div>
        )}

        {/* Event Form */}
        <section>
          <h1 className="text-2xl font-bold mb-6">Edit Event</h1>

          <form onSubmit={handleSave} className="space-y-5">
            <div>
              <label className="block text-sm text-slate-400 mb-1">Event Title</label>
              <input
                type="text"
                required
                value={form.title}
                onChange={(e) => updateField("title", e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-1">Slug</label>
              <input
                type="text"
                required
                value={form.slug}
                onChange={(e) => updateField("slug", e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white font-mono text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-1">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => updateField("description", e.target.value)}
                rows={5}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-1">Location</label>
              <input
                type="text"
                value={form.location}
                onChange={(e) => updateField("location", e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Starts At</label>
                <input
                  type="datetime-local"
                  required
                  value={form.startsAt}
                  onChange={(e) => updateField("startsAt", e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Ends At</label>
                <input
                  type="datetime-local"
                  value={form.endsAt}
                  onChange={(e) => updateField("endsAt", e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Capacity</label>
                <input
                  type="number"
                  value={form.capacity}
                  onChange={(e) => updateField("capacity", e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Visibility</label>
                <select
                  value={form.visibility}
                  onChange={(e) => updateField("visibility", e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white focus:border-indigo-500 focus:outline-none"
                >
                  <option value="public">Public</option>
                  <option value="unlisted">Unlisted</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-1">Cover Image URL</label>
              <input
                type="url"
                value={form.coverImageUrl}
                onChange={(e) => updateField("coverImageUrl", e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white focus:border-indigo-500 focus:outline-none"
              />
            </div>

            {error && <p className="text-red-400 text-sm">{error}</p>}

            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-indigo-600 px-6 py-2.5 font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </form>
        </section>

        {/* Recurrence */}
        {!event.recurringParentId && (
          <section>
            <h2 className="text-xl font-bold mb-4">Recurrence</h2>
            <div className="grid gap-4 sm:grid-cols-2 mb-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Repeat</label>
                <select
                  value={form.recurringType}
                  onChange={(e) => updateField("recurringType", e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white focus:border-indigo-500 focus:outline-none"
                >
                  <option value="">None</option>
                  <option value="weekly">Weekly</option>
                  <option value="biweekly">Bi-weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
              {form.recurringType && (
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Ends on</label>
                  <input
                    type="date"
                    value={form.recurringEndsAt}
                    onChange={(e) => updateField("recurringEndsAt", e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              )}
            </div>
            {form.recurringType && form.recurringEndsAt && (
              <div>
                <button
                  type="button"
                  onClick={generateInstances}
                  disabled={generating}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors"
                >
                  {generating ? "Generating..." : "Generate Instances"}
                </button>
                {generateResult && (
                  <p className="text-sm text-slate-300 mt-2">{generateResult}</p>
                )}
              </div>
            )}
          </section>
        )}

        {/* Ticket Types */}
        <section>
          <h2 className="text-xl font-bold mb-4">Ticket Types</h2>

          {event.ticketTypes.length > 0 && (
            <div className="space-y-2 mb-6">
              {event.ticketTypes.map((tt) => (
                <div
                  key={tt.id}
                  className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-800/50 p-4"
                >
                  <div>
                    <p className="font-medium text-white">{tt.name}</p>
                    {tt.description && (
                      <p className="text-xs text-slate-400">{tt.description}</p>
                    )}
                    <p className="text-sm text-indigo-400 mt-0.5">
                      {tt.priceCents === 0 ? "Free" : `$${(tt.priceCents / 100).toFixed(2)}`}
                      {tt.quantity != null && (
                        <span className="text-slate-500 ml-2">
                          · {tt.quantity} available
                        </span>
                      )}
                    </p>
                  </div>
                  <button
                    onClick={() => deleteTicketType(tt.id)}
                    className="text-sm text-red-400 hover:text-red-300 transition-colors"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}

          <form
            onSubmit={addTicketType}
            className="rounded-lg border border-dashed border-slate-700 p-4 space-y-3"
          >
            <p className="text-sm font-medium text-slate-300">Add Ticket Type</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                type="text"
                required
                placeholder="Name (e.g. General Admission)"
                value={newTicketType.name}
                onChange={(e) =>
                  setNewTicketType((t) => ({ ...t, name: e.target.value }))
                }
                className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
              />
              <input
                type="text"
                placeholder="Description (optional)"
                value={newTicketType.description}
                onChange={(e) =>
                  setNewTicketType((t) => ({ ...t, description: e.target.value }))
                }
                className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
              />
              <input
                type="number"
                placeholder="Price in cents (0 = free)"
                value={newTicketType.priceCents}
                onChange={(e) =>
                  setNewTicketType((t) => ({ ...t, priceCents: e.target.value }))
                }
                className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
              />
              <input
                type="number"
                placeholder="Quantity (blank = unlimited)"
                value={newTicketType.quantity}
                onChange={(e) =>
                  setNewTicketType((t) => ({ ...t, quantity: e.target.value }))
                }
                className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={addingTicketType}
              className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-medium text-white hover:bg-slate-600 disabled:opacity-50 transition-colors"
            >
              {addingTicketType ? "Adding..." : "Add Ticket Type"}
            </button>
          </form>
        </section>

        {/* Waitlist */}
        <section>
          <h2 className="text-xl font-bold mb-4">
            Waitlist
            {waitlistEntries.length > 0 && (
              <span className="ml-2 text-sm font-normal text-slate-400">
                {waitingCount} waiting
              </span>
            )}
          </h2>

          {waitlistEntries.length === 0 ? (
            <p className="text-sm text-slate-500">No one on the waitlist yet.</p>
          ) : (
            <>
              {waitingCount > 0 && (
                <button
                  type="button"
                  onClick={notifyNext}
                  disabled={notifying !== null}
                  className="mb-4 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors"
                >
                  Notify Next
                </button>
              )}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700 text-left text-slate-400">
                      <th className="pb-2 pr-4">#</th>
                      <th className="pb-2 pr-4">Name</th>
                      <th className="pb-2 pr-4">Email</th>
                      <th className="pb-2 pr-4">Status</th>
                      <th className="pb-2 pr-4">Joined</th>
                      <th className="pb-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {waitlistEntries.map((entry) => (
                      <tr key={entry.id} className="border-b border-slate-800">
                        <td className="py-2 pr-4 text-slate-400">{entry.position}</td>
                        <td className="py-2 pr-4 text-white">
                          {[entry.firstName, entry.lastName].filter(Boolean).join(" ") || "—"}
                        </td>
                        <td className="py-2 pr-4 text-slate-300">{entry.email}</td>
                        <td className="py-2 pr-4">
                          <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                            entry.status === "waiting"
                              ? "bg-yellow-900/30 text-yellow-400"
                              : entry.status === "notified"
                              ? "bg-blue-900/30 text-blue-400"
                              : entry.status === "converted"
                              ? "bg-green-900/30 text-green-400"
                              : "bg-slate-700 text-slate-400"
                          }`}>
                            {entry.status}
                          </span>
                        </td>
                        <td className="py-2 pr-4 text-slate-500">
                          {new Date(entry.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-2">
                          {entry.status === "waiting" && (
                            <button
                              onClick={() => notifyWaitlistEntry(entry.id)}
                              disabled={notifying === entry.id}
                              className="text-xs text-indigo-400 hover:text-indigo-300 disabled:opacity-50"
                            >
                              {notifying === entry.id ? "..." : "Notify"}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>

        {/* Event Messaging */}
        <EventMessaging eventId={id} initialMessages={messages} />
      </main>
    </div>
  );
}
