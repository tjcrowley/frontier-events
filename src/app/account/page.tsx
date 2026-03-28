"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useFrontier } from "@/components/FrontierProvider";

interface UserEvent {
  id: string;
  title: string;
  slug: string;
  startsAt: string;
  status: string;
}

export default function AccountPage() {
  const {
    walletAddress,
    email,
    firstName,
    lastName,
    role,
    subscriptionStatus,
    newsletterOptIn,
    isLoading,
    setNewsletterOptIn,
  } = useFrontier();

  const [events, setEvents] = useState<UserEvent[]>([]);
  const [togglingNewsletter, setTogglingNewsletter] = useState(false);

  useEffect(() => {
    if (!walletAddress) return;
    // Load user's created events if admin
    if (role === "admin") {
      fetch("/api/admin/events", {
        headers: {
          Authorization: `Bearer ${sessionStorage.getItem("frontier_token")}`,
        },
      })
        .then((r) => r.json())
        .then((data) => {
          if (Array.isArray(data)) setEvents(data);
        })
        .catch(() => {});
    }
  }, [walletAddress, role]);

  async function toggleNewsletter() {
    setTogglingNewsletter(true);
    const newValue = !newsletterOptIn;
    try {
      const token = sessionStorage.getItem("frontier_token");
      const res = await fetch("/api/auth/newsletter", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ optIn: newValue }),
      });
      if (res.ok) {
        setNewsletterOptIn(newValue);
      }
    } catch (error) {
      console.error("Newsletter toggle error:", error);
    }
    setTogglingNewsletter(false);
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-pulse text-slate-400">Loading...</div>
      </div>
    );
  }

  if (!walletAddress) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <p className="text-slate-400">Please open in Frontier Wallet.</p>
      </div>
    );
  }

  const truncatedWallet = `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`;

  return (
    <div className="min-h-screen bg-slate-900">
      <header className="border-b border-slate-800">
        <div className="mx-auto max-w-2xl px-4 py-4">
          <Link href="/" className="text-sm text-slate-400 hover:text-white transition-colors">
            &larr; Home
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-8 space-y-8">
        <h1 className="text-2xl font-bold">Account</h1>

        <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-6 space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-slate-700 flex items-center justify-center text-2xl text-slate-400">
              {firstName?.[0]?.toUpperCase() || "?"}
            </div>
            <div>
              <p className="text-lg font-semibold text-white">
                {firstName} {lastName}
              </p>
              <p className="text-sm text-slate-400">{email}</p>
            </div>
          </div>

          <div className="grid gap-3 text-sm pt-2">
            <div className="flex justify-between">
              <span className="text-slate-400">Wallet</span>
              <span className="text-white font-mono">{truncatedWallet}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Role</span>
              <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-indigo-900/30 text-indigo-400">
                {role}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Subscription</span>
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                subscriptionStatus === "active"
                  ? "bg-green-900/30 text-green-400"
                  : "bg-slate-700 text-slate-300"
              }`}>
                {subscriptionStatus || "none"}
              </span>
            </div>
          </div>
        </div>

        {/* Newsletter Toggle */}
        <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-white">Newsletter</p>
              <p className="text-sm text-slate-400">
                Receive updates about Frontier Tower events
              </p>
            </div>
            <button
              onClick={toggleNewsletter}
              disabled={togglingNewsletter}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                newsletterOptIn ? "bg-[#764AE2]" : "bg-slate-600"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  newsletterOptIn ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>
        </div>

        {/* User's Events */}
        {events.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-3">Your Events</h2>
            <div className="space-y-2">
              {events.map((event) => (
                <Link
                  key={event.id}
                  href={`/admin/events/${event.id}`}
                  className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-800/50 p-4 hover:border-indigo-600 transition-colors"
                >
                  <div>
                    <p className="font-medium text-white">{event.title}</p>
                    <p className="text-sm text-slate-400">
                      {new Date(event.startsAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <span className={`text-xs rounded-full px-2 py-0.5 ${
                    event.status === "published"
                      ? "bg-green-900/30 text-green-400"
                      : "bg-slate-700 text-slate-300"
                  }`}>
                    {event.status}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
