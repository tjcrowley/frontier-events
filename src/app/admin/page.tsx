import Link from "next/link";
import { db } from "@/db";
import { events, tickets, orders } from "@/db/schema";
import { eq, gte, count, ne } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const allEvents = await db.query.events.findMany({
    where: ne(events.status, "deleted"),
  });

  const upcomingEvents = allEvents.filter(
    (e) => new Date(e.startsAt) > now
  );

  const [ticketsSoldToday] = await db
    .select({ count: count(tickets.id) })
    .from(tickets)
    .innerJoin(orders, eq(tickets.orderId, orders.id))
    .where(gte(orders.createdAt, todayStart));

  return (
    <div className="min-h-screen bg-slate-900">
      <header className="border-b border-slate-800">
        <div className="mx-auto max-w-5xl px-4 py-4 flex items-center justify-between">
          <Link href="/admin" className="text-lg font-bold text-white">
            Admin
          </Link>
          <nav className="flex gap-4 text-sm">
            <Link href="/" className="text-slate-400 hover:text-white transition-colors">
              Public Site
            </Link>
            <Link href="/scanner" className="text-slate-400 hover:text-white transition-colors">
              Scanner
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-3 mb-8">
          <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-5">
            <p className="text-sm text-slate-400">Total Events</p>
            <p className="text-3xl font-bold text-white mt-1">{allEvents.length}</p>
          </div>
          <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-5">
            <p className="text-sm text-slate-400">Upcoming</p>
            <p className="text-3xl font-bold text-white mt-1">{upcomingEvents.length}</p>
          </div>
          <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-5">
            <p className="text-sm text-slate-400">Tickets Sold Today</p>
            <p className="text-3xl font-bold text-white mt-1">{ticketsSoldToday?.count ?? 0}</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-3 mb-8">
          <Link
            href="/admin/events/new"
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors"
          >
            + New Event
          </Link>
          <Link
            href="/admin/events"
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 transition-colors"
          >
            All Events
          </Link>
        </div>

        {/* Upcoming Events */}
        <h2 className="text-lg font-semibold mb-3">Upcoming Events</h2>
        {upcomingEvents.length === 0 ? (
          <p className="text-slate-500 text-sm">No upcoming events.</p>
        ) : (
          <div className="space-y-2">
            {upcomingEvents.map((event) => (
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
                    {event.location && ` · ${event.location}`}
                  </p>
                </div>
                <span className="text-slate-500 text-sm">→</span>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
