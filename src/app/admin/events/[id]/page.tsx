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
  ticketTypes: TicketType[];
}

export default function EditEventPage() {
  const params = useParams();
  const router = useRouter();
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
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

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
        });
        setLoading(false);
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
      body: JSON.stringify({
        action: "toggle_publish",
      }),
    });
    if (res.ok) {
      const data = await res.json();
      setEvent((e) => (e ? { ...e, status: data.status } : e));
    }
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
            <Link
              href={`/e/${event.slug}`}
              className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-800 transition-colors"
            >
              View
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8 space-y-10">
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
      </main>
    </div>
  );
}
