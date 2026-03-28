import Link from "next/link";
import { db } from "@/db";
import { events, tickets } from "@/db/schema";
import { eq, count, ne } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function AdminEventsPage() {
  const allEvents = await db.query.events.findMany({
    where: ne(events.status, "deleted"),
    orderBy: events.startsAt,
    with: { ticketTypes: true },
  });

  // Get ticket counts per event
  const ticketCounts = await db
    .select({
      eventId: tickets.eventId,
      soldCount: count(tickets.id),
    })
    .from(tickets)
    .groupBy(tickets.eventId);

  const countMap = new Map(ticketCounts.map((r) => [r.eventId, r.soldCount]));

  return (
    <div className="min-h-screen bg-slate-900">
      <header className="border-b border-slate-800">
        <div className="mx-auto max-w-5xl px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="text-sm text-slate-400 hover:text-white transition-colors">
              &larr; Admin
            </Link>
            <h1 className="text-lg font-bold text-white">Events</h1>
          </div>
          <Link
            href="/admin/events/new"
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors"
          >
            + New Event
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        {allEvents.length === 0 ? (
          <div className="text-center py-20 text-slate-500">
            <p className="text-lg">No events yet.</p>
            <Link
              href="/admin/events/new"
              className="text-indigo-400 hover:text-indigo-300 text-sm mt-2 inline-block"
            >
              Create your first event
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-700 text-sm text-slate-400">
                  <th className="pb-3 font-medium">Title</th>
                  <th className="pb-3 font-medium">Date</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium text-right">Tickets Sold</th>
                  <th className="pb-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {allEvents.map((event) => (
                  <tr key={event.id} className="border-b border-slate-800">
                    <td className="py-3">
                      <p className="font-medium text-white">{event.title}</p>
                      {event.location && (
                        <p className="text-xs text-slate-500">{event.location}</p>
                      )}
                    </td>
                    <td className="py-3 text-sm text-slate-300">
                      {new Date(event.startsAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>
                    <td className="py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          event.status === "published"
                            ? "bg-green-900/30 text-green-400"
                            : event.status === "draft"
                            ? "bg-slate-700 text-slate-300"
                            : "bg-red-900/30 text-red-400"
                        }`}
                      >
                        {event.status}
                      </span>
                    </td>
                    <td className="py-3 text-sm text-slate-300 text-right">
                      {countMap.get(event.id) ?? 0}
                    </td>
                    <td className="py-3 text-right">
                      <div className="flex gap-2 justify-end">
                        <Link
                          href={`/admin/events/${event.id}`}
                          className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
                        >
                          Edit
                        </Link>
                        <Link
                          href={`/e/${event.slug}`}
                          className="text-sm text-slate-400 hover:text-slate-300 transition-colors"
                        >
                          View
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
