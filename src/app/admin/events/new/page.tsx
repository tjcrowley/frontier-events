"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function NewEventPage() {
  const router = useRouter();
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
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  function updateField(field: string, value: string) {
    setForm((f) => {
      const updated = { ...f, [field]: value };
      if (field === "title") {
        updated.slug = slugify(value);
      }
      return updated;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/admin/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          capacity: form.capacity ? parseInt(form.capacity) : null,
          startsAt: new Date(form.startsAt).toISOString(),
          endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to create event");
        setSubmitting(false);
        return;
      }

      router.push(`/admin/events/${data.id}`);
    } catch {
      setError("Something went wrong");
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-900">
      <header className="border-b border-slate-800">
        <div className="mx-auto max-w-2xl px-4 py-4">
          <Link
            href="/admin/events"
            className="text-sm text-slate-400 hover:text-white transition-colors"
          >
            &larr; Back to Events
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Create Event</h1>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm text-slate-400 mb-1">Event Title</label>
            <input
              type="text"
              required
              value={form.title}
              onChange={(e) => updateField("title", e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
              placeholder="Soldering Workshop"
            />
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-1">Slug</label>
            <input
              type="text"
              required
              value={form.slug}
              onChange={(e) => updateField("slug", e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white font-mono text-sm placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => updateField("description", e.target.value)}
              rows={5}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
              placeholder="Event description (supports markdown)"
            />
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-1">Location</label>
            <input
              type="text"
              value={form.location}
              onChange={(e) => updateField("location", e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
              placeholder="Frontier Tower, Room 301"
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
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                placeholder="Leave blank for unlimited"
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
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
              placeholder="https://..."
            />
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-indigo-600 px-4 py-3 font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? "Creating..." : "Create Event"}
          </button>
        </form>
      </main>
    </div>
  );
}
