import { notFound } from "next/navigation";
import Link from "next/link";
import { cookies } from "next/headers";
import { db } from "@/db";
import { events, rsvps, orders, contacts, tickets } from "@/db/schema";
import { eq, and, sql, count } from "drizzle-orm";
import type { Metadata } from "next";
import { NavBar } from "@/components/NavBar";
import { RSVPButtons } from "@/components/RSVPButtons";
import { WaitlistForm } from "@/components/WaitlistForm";

export const dynamic = "force-dynamic";

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatPrice(cents: number): string {
  if (cents === 0) return "Free";
  return `$${(cents / 100).toFixed(2)}`;
}

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const event = await db.query.events.findFirst({
    where: eq(events.slug, slug),
  });

  if (!event) return { title: "Event Not Found" };

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  return {
    title: `${event.title} | Frontier Events`,
    description: event.description?.slice(0, 160) ?? "",
    openGraph: {
      title: event.title,
      description: event.description?.slice(0, 160) ?? "",
      type: "website",
      url: `${appUrl}/e/${event.slug}`,
      ...(event.coverImageUrl && {
        images: [{ url: event.coverImageUrl }],
      }),
    },
  };
}

export default async function EventPage({ params }: Props) {
  const { slug } = await params;

  const event = await db.query.events.findFirst({
    where: eq(events.slug, slug),
    with: {
      ticketTypes: true,
    },
  });

  if (!event || event.status !== "published") {
    notFound();
  }

  // Check if user is authenticated for citizens-only events
  const cookieStore = await cookies();
  const isAuthenticated = !!cookieStore.get("frontier_token")?.value;

  if (event.visibility === "citizens" && !isAuthenticated) {
    // Show teaser for citizens-only events
    return (
      <div className="min-h-screen bg-slate-900">
        <NavBar />
        <main className="mx-auto max-w-4xl px-4 py-8">
          {event.coverImageUrl && (
            <div className="rounded-lg overflow-hidden mb-8 aspect-[2.5/1] bg-slate-800">
              <img
                src={event.coverImageUrl}
                alt={event.title}
                className="w-full h-full object-cover opacity-50"
              />
            </div>
          )}
          <h1 className="text-3xl font-bold text-white mb-4">{event.title}</h1>
          <p className="text-slate-400 mb-8">
            This event is for Frontier Tower members only.
          </p>
          <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-6 text-center">
            <p className="text-white font-semibold mb-2">
              Sign in to see event details
            </p>
            <p className="text-slate-400 text-sm mb-4">
              Create an account or sign in to access this event.
            </p>
            <div className="flex justify-center gap-3">
              <Link
                href="/login"
                className="rounded-lg border border-slate-600 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 transition-colors"
              >
                Log In
              </Link>
              <Link
                href="/signup"
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 transition-colors"
              >
                Sign Up
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Fetch RSVP counts
  const rsvpCounts = await db
    .select({
      status: rsvps.status,
      count: sql<number>`count(*)::int`,
    })
    .from(rsvps)
    .where(and(eq(rsvps.eventId, event.id), eq(rsvps.source, "rsvp")))
    .groupBy(rsvps.status);

  const ticketHolderResult = await db
    .select({
      count: sql<number>`count(distinct ${contacts.email})::int`,
    })
    .from(orders)
    .innerJoin(contacts, eq(orders.contactId, contacts.id))
    .where(and(eq(orders.eventId, event.id), eq(orders.status, "completed")));

  const ticketRsvpCount = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(rsvps)
    .where(and(eq(rsvps.eventId, event.id), eq(rsvps.source, "ticket")));

  const goingCount = rsvpCounts.find((r) => r.status === "going")?.count ?? 0;
  const maybeCount = rsvpCounts.find((r) => r.status === "maybe")?.count ?? 0;
  const ticketHolders = ticketHolderResult[0]?.count ?? 0;
  const totalCount = goingCount + ticketHolders - (ticketRsvpCount[0]?.count ?? 0) + maybeCount;

  const initialCounts = { going: goingCount, maybe: maybeCount, ticketHolders, total: totalCount };

  // Check if sold out for waitlist
  let isSoldOut = false;
  if (event.capacity != null) {
    const ticketCountResult = await db
      .select({ count: count(tickets.id) })
      .from(tickets)
      .innerJoin(orders, eq(tickets.orderId, orders.id))
      .where(and(eq(tickets.eventId, event.id), eq(orders.status, "completed")));
    isSoldOut = (ticketCountResult[0]?.count ?? 0) >= event.capacity;
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.title,
    startDate: new Date(event.startsAt).toISOString(),
    ...(event.endsAt && { endDate: new Date(event.endsAt).toISOString() }),
    location: {
      "@type": "Place",
      name: event.location,
    },
    description: event.description,
    ...(event.coverImageUrl && { image: event.coverImageUrl }),
    url: `${appUrl}/e/${event.slug}`,
    organizer: {
      "@type": "Organization",
      name: "Frontier Tower Makerspace",
    },
    offers: event.ticketTypes.map((tt) => ({
      "@type": "Offer",
      name: tt.name,
      price: (tt.priceCents / 100).toFixed(2),
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
      url: `${appUrl}/e/${event.slug}/checkout`,
    })),
  };

  return (
    <div className="min-h-screen bg-slate-900">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <NavBar />

      <main className="mx-auto max-w-4xl px-4 py-8">
        <div className="mb-4">
          <Link href="/" className="text-sm text-slate-400 hover:text-white transition-colors">
            &larr; All Events
          </Link>
        </div>

        {event.coverImageUrl && (
          <div className="rounded-lg overflow-hidden mb-8 aspect-[2.5/1] bg-slate-800">
            <img
              src={event.coverImageUrl}
              alt={event.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <h1 className="text-3xl font-bold text-white mb-4">{event.title}</h1>

            <div className="flex flex-wrap gap-4 mb-6 text-sm text-slate-300">
              <div className="flex items-center gap-2">
                <span className="text-indigo-400">📅</span>
                {formatDate(event.startsAt)}
              </div>
              {event.endsAt && (
                <div className="flex items-center gap-2">
                  <span className="text-indigo-400">→</span>
                  {formatDate(event.endsAt)}
                </div>
              )}
              {event.location && (
                <div className="flex items-center gap-2">
                  <span className="text-indigo-400">📍</span>
                  {event.location}
                </div>
              )}
            </div>

            {event.description && (
              <div className="prose prose-invert prose-slate max-w-none">
                {event.description.split("\n").map((paragraph, i) => (
                  <p key={i} className="text-slate-300 mb-4 leading-relaxed">
                    {paragraph}
                  </p>
                ))}
              </div>
            )}
          </div>

          <div className="lg:col-span-1">
            <div className="sticky top-8 rounded-lg border border-slate-700 bg-slate-800/50 p-6">
              <RSVPButtons
                eventSlug={event.slug}
                eventId={event.id}
                initialCounts={initialCounts}
              />

              <h2 className="font-semibold text-lg mb-4">Tickets</h2>

              {event.ticketTypes.length === 0 ? (
                <p className="text-slate-500 text-sm">No tickets available yet.</p>
              ) : (
                <div className="space-y-3">
                  {event.ticketTypes.map((tt) => (
                    <div
                      key={tt.id}
                      className="flex items-center justify-between py-2 border-b border-slate-700 last:border-0"
                    >
                      <div>
                        <p className="font-medium text-white">{tt.name}</p>
                        {tt.description && (
                          <p className="text-xs text-slate-400 mt-0.5">{tt.description}</p>
                        )}
                      </div>
                      <span className="font-semibold text-indigo-400">
                        {formatPrice(tt.priceCents)}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {isSoldOut ? (
                <div className="mt-6">
                  <div className="mb-3 text-center">
                    <span className="inline-block rounded-full bg-red-900/30 text-red-400 px-3 py-1 text-sm font-medium">
                      Sold Out
                    </span>
                  </div>
                  <p className="text-sm text-slate-400 text-center mb-3">
                    Join the waitlist to be notified if a spot opens up.
                  </p>
                  <WaitlistForm eventSlug={event.slug} eventId={event.id} />
                </div>
              ) : event.ticketTypes.length > 0 ? (
                <Link
                  href={`/e/${event.slug}/checkout`}
                  className="mt-6 block w-full rounded-lg bg-indigo-600 px-4 py-3 text-center font-semibold text-white hover:bg-indigo-500 transition-colors"
                >
                  Get Tickets
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
