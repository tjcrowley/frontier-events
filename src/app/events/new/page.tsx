"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useFrontier } from "@/components/FrontierProvider";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function NewEventPage() {
  const router = useRouter();
  const { communities, isLoading } = useFrontier();

  const [form, setForm] = useState({
    title: "",
    slug: "",
    description: "",
    location: "",
    startsAt: "",
    endsAt: "",
    capacity: "",
    coverImageUrl: "",
    visibility: "public" as "public" | "citizen",
    floorCommunitySlug: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  function updateField(field: string, value: string) {
    setForm((f) => {
      const updated = { ...f, [field]: value };
      if (field === "title") updated.slug = slugify(value);
      return updated;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    const token =
      typeof window !== "undefined"
        ? sessionStorage.getItem("frontier_token") ??
          document.cookie.match(/frontier_token=([^;]+)/)?.[1]
        : null;

    try {
      const res = await fetch("/api/events/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
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

      router.push(`/e/${data.slug}`);
    } catch {
      setError("Something went wrong");
      setSubmitting(false);
    }
  }

  const COMMUNITY_FLOOR_MAP: Record<string, string> = {
    "tech": "Floor 3 — Tech Lab",
    "arts-music": "Floor 2 — Arts Studio",
    "biolab": "Floor 4 — Bio Lab",
    "social": "Floor 1 — Social Hall",
    "wellness": "Floor 5 — Wellness Studio",
  };

  const myFloors = communities
    .filter((c) => COMMUNITY_FLOOR_MAP[c])
    .map((c) => ({ slug: c, label: COMMUNITY_FLOOR_MAP[c] }));

  const inputClass =
    "w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-white placeholder-white/20 focus:border-[#764AE2] focus:outline-none transition-colors";
  const labelClass = "block text-sm text-white/50 mb-1.5";

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      <header className="border-b border-white/8 bg-[#0A0A0A]/90 backdrop-blur-sm sticky top-0 z-50">
        <div className="mx-auto max-w-3xl px-4 h-14 flex items-center justify-between">
          <Link href="/">
            <Image src="/logo-white.svg" alt="Frontier Tower" width={110} height={20} className="opacity-80" />
          </Link>
          <Link href="/" className="text-sm text-white/30 hover:text-white/60 transition-colors">
            ← All Events
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-10">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-1">
            <span
              className="text-xs font-semibold px-2 py-0.5 rounded"
              style={{ background: "#764AE2/20", color: "#938DEE", border: "1px solid #764AE244" }}
            >
              Citizens Only
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white mt-2">Host an Event</h1>
          <p className="text-white/35 text-sm mt-1">
            Your event goes live after review. Ticket sales are handled automatically.
          </p>
        </div>

        {isLoading ? (
          <div className="text-white/30 text-sm">Loading your profile…</div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Title */}
            <div>
              <label className={labelClass}>Event Title</label>
              <input
                type="text"
                required
                value={form.title}
                onChange={(e) => updateField("title", e.target.value)}
                className={inputClass}
                placeholder="e.g. Vibe Coding Night"
              />
            </div>

            {/* Slug */}
            <div>
              <label className={labelClass}>URL Slug</label>
              <div className="flex items-center rounded-lg border border-white/10 bg-white/5 overflow-hidden focus-within:border-[#764AE2] transition-colors">
                <span className="pl-3 text-white/25 text-sm">/e/</span>
                <input
                  type="text"
                  required
                  value={form.slug}
                  onChange={(e) => updateField("slug", e.target.value)}
                  className="flex-1 bg-transparent px-1 py-2.5 text-white placeholder-white/20 focus:outline-none text-sm"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className={labelClass}>Description</label>
              <textarea
                value={form.description}
                onChange={(e) => updateField("description", e.target.value)}
                rows={4}
                className={inputClass}
                placeholder="What's happening? Who's it for?"
              />
            </div>

            {/* Date/time */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Start</label>
                <input
                  type="datetime-local"
                  required
                  value={form.startsAt}
                  onChange={(e) => updateField("startsAt", e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>End (optional)</label>
                <input
                  type="datetime-local"
                  value={form.endsAt}
                  onChange={(e) => updateField("endsAt", e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>

            {/* Floor + location */}
            <div className="grid gap-4 sm:grid-cols-2">
              {myFloors.length > 0 && (
                <div>
                  <label className={labelClass}>Floor / Space</label>
                  <select
                    value={form.floorCommunitySlug}
                    onChange={(e) => {
                      updateField("floorCommunitySlug", e.target.value);
                      if (e.target.value) {
                        updateField("location", COMMUNITY_FLOOR_MAP[e.target.value] ?? "");
                      }
                    }}
                    className={inputClass}
                  >
                    <option value="">Select a floor</option>
                    {myFloors.map((f) => (
                      <option key={f.slug} value={f.slug}>{f.label}</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className={labelClass}>Location / Room</label>
                <input
                  type="text"
                  value={form.location}
                  onChange={(e) => updateField("location", e.target.value)}
                  className={inputClass}
                  placeholder="e.g. Room 3B"
                />
              </div>
            </div>

            {/* Capacity + visibility */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Capacity (optional)</label>
                <input
                  type="number"
                  min="1"
                  value={form.capacity}
                  onChange={(e) => updateField("capacity", e.target.value)}
                  className={inputClass}
                  placeholder="Leave blank for unlimited"
                />
              </div>
              <div>
                <label className={labelClass}>Visibility</label>
                <select
                  value={form.visibility}
                  onChange={(e) => updateField("visibility", e.target.value)}
                  className={inputClass}
                >
                  <option value="public">Public — anyone can see this</option>
                  <option value="citizen">Citizens Only — members only</option>
                </select>
              </div>
            </div>

            {/* Cover image */}
            <div>
              <label className={labelClass}>Cover Image URL (optional)</label>
              <input
                type="url"
                value={form.coverImageUrl}
                onChange={(e) => updateField("coverImageUrl", e.target.value)}
                className={inputClass}
                placeholder="https://..."
              />
            </div>

            {error && (
              <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <div className="pt-2 flex items-center gap-3">
              <button
                type="submit"
                disabled={submitting}
                className="rounded-xl px-6 py-2.5 font-semibold text-white disabled:opacity-50 transition-all"
                style={{ background: "linear-gradient(135deg, #938DEE, #764AE2)" }}
              >
                {submitting ? "Submitting…" : "Submit Event"}
              </button>
              <span className="text-xs text-white/25">Pending review before going live</span>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}
