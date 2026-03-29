import Link from "next/link";
import Image from "next/image";
import { cookies } from "next/headers";
import { db } from "@/db";
import { events } from "@/db/schema";
import { eq, and, gt, ne } from "drizzle-orm";
import { NavBar } from "@/components/NavBar";

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

  const cookieStore = await cookies();
  const isAuthenticated = !!cookieStore.get("frontier_token")?.value;

  const upcomingEvents = await db.query.events.findMany({
    where: and(
      eq(events.status, "published"),
      gt(events.startsAt, now),
      ...(!isAuthenticated ? [ne(events.visibility, "citizens")] : []),
    ),
    orderBy: events.startsAt,
    with: { ticketTypes: true },
  });

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      <NavBar />

      {/* Hero */}
      <div className="relative overflow-hidden border-b border-white/8">
        {/* Purple glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full opacity-20 blur-3xl"
            style={{ background: "radial-gradient(ellipse, #764AE2, transparent 70%)" }}
          />
        </div>
        <div className="relative mx-auto max-w-5xl px-4 py-16 text-center">
          <Image
            src="/logo-white.svg"
            alt="Frontier Tower"
            width={200}
            height={35}
            className="mx-auto mb-6 opacity-90"
            priority
          />
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-white mb-3">
            Events
          </h1>
          <p className="text-white/40 text-lg max-w-md mx-auto">
            Workshops, demos, and community nights at Frontier Tower Makerspace.
          </p>
        </div>
      </div>

      {/* Event grid */}
      <main className="mx-auto max-w-5xl px-4 py-12">
        {upcomingEvents.length === 0 ? (
          <div className="text-center py-24">
            <p className="text-white/30 text-lg">No upcoming events yet.</p>
            <p className="text-white/20 text-sm mt-2">Check back soon.</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-6">
              <p className="text-white/30 text-sm uppercase tracking-widest font-medium">
                Upcoming
              </p>
              <Link
                href="/calendar"
                className="text-sm text-[#938DEE] hover:text-white transition-colors"
              >
                View calendar &rarr;
              </Link>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {upcomingEvents.map((event) => {
                const minPrice = event.ticketTypes.length
                  ? Math.min(...event.ticketTypes.map((t) => t.priceCents))
                  : null;
                const isFree = minPrice === 0;
                const isCitizen = event.visibility === "citizens";

                return (
                  <Link
                    key={event.id}
                    href={`/e/${event.slug}`}
                    className="group block rounded-xl border border-white/8 bg-white/3 overflow-hidden hover:border-[#764AE2]/60 hover:bg-white/5 transition-all duration-200"
                  >
                    {event.coverImageUrl ? (
                      <div className="aspect-video bg-[#111] overflow-hidden">
                        <img
                          src={event.coverImageUrl}
                          alt={event.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90"
                        />
                      </div>
                    ) : (
                      <div
                        className="aspect-video flex items-center justify-center"
                        style={{ background: "linear-gradient(135deg, #1a0f2e, #0A0A0A)" }}
                      >
                        <div
                          className="w-12 h-12 rounded-xl opacity-60"
                          style={{ background: "linear-gradient(135deg, #938DEE, #764AE2)" }}
                        />
                      </div>
                    )}
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h2 className="font-semibold text-white group-hover:text-[#938DEE] transition-colors leading-tight">
                          {event.title}
                        </h2>
                        <div className="flex gap-1 shrink-0">
                          {isCitizen && (
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-[#764AE2]/20 text-[#938DEE] border border-[#764AE2]/30">
                              Members
                            </span>
                          )}
                          {isFree ? (
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-[#47B70B]/15 text-[#47B70B] border border-[#47B70B]/25">
                              Free
                            </span>
                          ) : minPrice != null ? (
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-white/5 text-white/50 border border-white/10">
                              ${(minPrice / 100).toFixed(0)}+
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <p className="text-sm text-white/40 mt-1">{formatDate(event.startsAt)}</p>
                      {event.location && (
                        <p className="text-sm text-white/25 mt-0.5 truncate">{event.location}</p>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
