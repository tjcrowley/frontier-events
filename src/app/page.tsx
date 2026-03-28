import Link from "next/link";
import { db } from "@/lib/db";
import { events, ticketTypes, tickets } from "@/lib/db/schema";
import { eq, and, gt, sql, count } from "drizzle-orm";

export const dynamic = "force-dynamic";

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default async function HomePage() {
  const now = new Date();

  const upcomingEvents = await db.query.events.findMany({
    where: and(eq(events.status, "published"), gt(events.startsAt, now)),
    orderBy: events.startsAt,
    with: {
      ticketTypes: true,
    },
  });

  return (
    <div className="min-h-screen bg-slate-900">
      <header className="border-b border-slate-800">
        <div className="mx-auto max-w-5xl px-4 py-6 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-white">
            Frontier Events
          </Link>
          <nav className="flex gap-4 text-sm">
            <Link href="/admin" className="text-slate-400 hover:text-white transition-colors">
              Admin
            </Link>
            <Link href="/scanner" className="text-slate-400 hover:text-white transition-colors">
              Scanner
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-12">
        <h1 className="text-3xl font-bold mb-2">Upcoming Events</h1>
        <p className="text-slate-400 mb-8">at Frontier Tower Makerspace</p>

        {upcomingEvents.length === 0 ? (
          <div className="text-center py-20 text-slate-500">
            <p className="text-lg">No upcoming events yet.</p>
            <p className="text-sm mt-2">Check back soon!</p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {upcomingEvents.map((event) => {
              const minPrice = event.ticketTypes.length
                ? Math.min(...event.ticketTypes.map((t) => t.priceCents))
                : null;
              const totalCapacity = event.ticketTypes.reduce(
                (sum, t) => sum + (t.capacity ?? 0),
                0
              );

              return (
                <Link
                  key={event.id}
                  href={`/e/${event.slug}`}
                  className="group block rounded-lg border border-slate-800 bg-slate-800/50 overflow-hidden hover:border-indigo-600 transition-colors"
                >
                  {event.coverImageUrl ? (
                    <div className="aspect-video bg-slate-700 overflow-hidden">
                      <img
                        src={event.coverImageUrl}
                        alt={event.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  ) : (
                    <div className="aspect-video bg-gradient-to-br from-indigo-900 to-slate-800 flex items-center justify-center">
                      <span className="text-4xl opacity-50">🎪</span>
                    </div>
                  )}
                  <div className="p-4">
                    <h2 className="font-semibold text-lg text-white group-hover:text-indigo-400 transition-colors">
                      {event.name}
                    </h2>
                    <p className="text-sm text-slate-400 mt-1">
                      {formatDate(event.startsAt)}
                    </p>
                    <p className="text-sm text-slate-500 mt-0.5">{event.location}</p>
                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-sm font-medium text-indigo-400">
                        {minPrice === 0
                          ? "Free"
                          : minPrice != null
                          ? `From $${(minPrice / 100).toFixed(2)}`
                          : ""}
                      </span>
                      {totalCapacity > 0 && (
                        <span className="text-xs text-slate-500">
                          {totalCapacity} spots
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
