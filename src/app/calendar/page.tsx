import Link from "next/link";
import { cookies } from "next/headers";
import { db } from "@/db";
import { events } from "@/db/schema";
import { eq, and, gte, lte, ne } from "drizzle-orm";
import { NavBar } from "@/components/NavBar";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ month?: string }>;
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function formatMonthYear(year: number, month: number) {
  return new Date(year, month).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

function prevMonth(year: number, month: number): string {
  const d = new Date(year, month - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function nextMonth(year: number, month: number): string {
  const d = new Date(year, month + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default async function CalendarPage({ searchParams }: Props) {
  const sp = await searchParams;
  const now = new Date();
  let year = now.getFullYear();
  let month = now.getMonth();

  if (sp.month) {
    const [y, m] = sp.month.split("-").map(Number);
    if (y && m) {
      year = y;
      month = m - 1;
    }
  }

  const firstOfMonth = new Date(year, month, 1);
  const startDayOfWeek = firstOfMonth.getDay(); // 0=Sun
  const daysInMonth = getDaysInMonth(year, month);

  // Buffer: start from the Sunday before the 1st, end on the Saturday after the last day
  const firstVisibleDay = new Date(year, month, 1 - startDayOfWeek);
  const lastDayOfWeek = new Date(year, month, daysInMonth).getDay();
  const lastVisibleDay = new Date(year, month, daysInMonth + (6 - lastDayOfWeek), 23, 59, 59);

  const cookieStore = await cookies();
  const isAuthenticated = !!cookieStore.get("frontier_token")?.value;

  const monthEvents = await db.query.events.findMany({
    where: and(
      eq(events.status, "published"),
      gte(events.startsAt, firstVisibleDay),
      lte(events.startsAt, lastVisibleDay),
      ...(!isAuthenticated ? [ne(events.visibility, "citizens")] : []),
    ),
    orderBy: events.startsAt,
  });

  // Group events by date string (YYYY-MM-DD)
  const eventsByDate = new Map<string, typeof monthEvents>();
  for (const event of monthEvents) {
    const dateKey = new Date(event.startsAt).toLocaleDateString("en-CA"); // YYYY-MM-DD
    const existing = eventsByDate.get(dateKey) || [];
    existing.push(event);
    eventsByDate.set(dateKey, existing);
  }

  // Build calendar grid
  const totalCells = Math.ceil((startDayOfWeek + daysInMonth) / 7) * 7;
  const cells: { date: Date; dateKey: string; inMonth: boolean }[] = [];
  for (let i = 0; i < totalCells; i++) {
    const date = new Date(year, month, 1 - startDayOfWeek + i);
    cells.push({
      date,
      dateKey: date.toLocaleDateString("en-CA"),
      inMonth: date.getMonth() === month,
    });
  }

  const todayKey = now.toLocaleDateString("en-CA");
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      <NavBar />

      <main className="mx-auto max-w-5xl px-4 py-8">
        {/* Month header */}
        <div className="flex items-center justify-between mb-6">
          <Link
            href={`/calendar?month=${prevMonth(year, month)}`}
            className="rounded-lg px-3 py-1.5 text-sm text-white/50 hover:text-white hover:bg-white/5 transition-colors"
          >
            &larr; Prev
          </Link>
          <h1 className="text-xl font-bold text-white">
            {formatMonthYear(year, month)}
          </h1>
          <Link
            href={`/calendar?month=${nextMonth(year, month)}`}
            className="rounded-lg px-3 py-1.5 text-sm text-white/50 hover:text-white hover:bg-white/5 transition-colors"
          >
            Next &rarr;
          </Link>
        </div>

        {/* Desktop: calendar grid */}
        <div className="hidden sm:block">
          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-white/8 mb-1">
            {dayNames.map((d) => (
              <div key={d} className="text-center text-xs text-white/30 font-medium py-2">
                {d}
              </div>
            ))}
          </div>

          {/* Cells */}
          <div className="grid grid-cols-7">
            {cells.map((cell, i) => {
              const dayEvents = eventsByDate.get(cell.dateKey) || [];
              const isToday = cell.dateKey === todayKey;
              const show = dayEvents.slice(0, 3);
              const overflow = dayEvents.length - 3;

              return (
                <div
                  key={i}
                  className={`min-h-[100px] border border-white/5 p-1.5 ${
                    cell.inMonth ? "" : "opacity-30"
                  }`}
                >
                  <div className="flex justify-end">
                    <span
                      className={`text-xs w-6 h-6 flex items-center justify-center rounded-full ${
                        isToday
                          ? "ring-2 ring-[#764AE2] text-white font-bold"
                          : "text-white/40"
                      }`}
                    >
                      {cell.date.getDate()}
                    </span>
                  </div>
                  <div className="space-y-0.5 mt-0.5">
                    {show.map((ev) => (
                      <Link
                        key={ev.id}
                        href={`/e/${ev.slug}`}
                        className={`block truncate text-[10px] rounded px-1 py-0.5 leading-tight hover:opacity-80 transition-opacity ${
                          ev.visibility === "citizens"
                            ? "bg-indigo-900/40 text-indigo-300"
                            : "bg-[#764AE2]/20 text-[#938DEE]"
                        }`}
                        title={ev.title}
                      >
                        {ev.visibility === "citizens" && (
                          <span className="mr-0.5">&#128274;</span>
                        )}
                        {ev.title}
                      </Link>
                    ))}
                    {overflow > 0 && (
                      <span className="block text-[10px] text-white/30 px-1">
                        +{overflow} more
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Mobile: list view grouped by date */}
        <div className="sm:hidden space-y-4">
          {monthEvents.length === 0 ? (
            <p className="text-center text-white/30 py-12">No events this month.</p>
          ) : (
            Array.from(eventsByDate.entries()).map(([dateKey, dayEvents]) => (
              <div key={dateKey}>
                <p className="text-xs text-white/40 font-medium mb-1">
                  {new Date(dateKey + "T12:00:00").toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })}
                </p>
                <div className="space-y-1">
                  {dayEvents.map((ev) => (
                    <Link
                      key={ev.id}
                      href={`/e/${ev.slug}`}
                      className="block rounded-lg border border-white/8 bg-white/3 p-3 hover:border-[#764AE2]/60 transition-colors"
                    >
                      <p className="text-sm font-medium text-white">{ev.title}</p>
                      <p className="text-xs text-white/40 mt-0.5">
                        {new Date(ev.startsAt).toLocaleTimeString("en-US", {
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                        {ev.location && ` · ${ev.location}`}
                      </p>
                    </Link>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
