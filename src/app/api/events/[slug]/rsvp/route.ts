import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { events, rsvps, orders, contacts } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { jwtVerify } from "jose";

const secret = new TextEncoder().encode(process.env.JWT_SECRET);

interface Props {
  params: Promise<{ slug: string }>;
}

async function getEventBySlug(slug: string) {
  return db.query.events.findFirst({
    where: eq(events.slug, slug),
  });
}

async function getCounts(eventId: string) {
  // Count RSVPs by status
  const rsvpCounts = await db
    .select({
      status: rsvps.status,
      count: sql<number>`count(*)::int`,
    })
    .from(rsvps)
    .where(and(eq(rsvps.eventId, eventId), eq(rsvps.source, "rsvp")))
    .groupBy(rsvps.status);

  // Count unique ticket holder emails (from completed orders)
  const ticketHolderResult = await db
    .select({
      count: sql<number>`count(distinct ${contacts.email})::int`,
    })
    .from(orders)
    .innerJoin(contacts, eq(orders.contactId, contacts.id))
    .where(and(eq(orders.eventId, eventId), eq(orders.status, "completed")));

  const going = rsvpCounts.find((r) => r.status === "going")?.count ?? 0;
  const maybe = rsvpCounts.find((r) => r.status === "maybe")?.count ?? 0;
  const ticketHolders = ticketHolderResult[0]?.count ?? 0;

  // Total = unique going people. Ticket holders are counted as going, deduped by email.
  // Get emails of ticket-sourced RSVPs that are already counted
  const ticketRsvpCount = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(rsvps)
    .where(and(eq(rsvps.eventId, eventId), eq(rsvps.source, "ticket")));

  const total = going + ticketHolders - (ticketRsvpCount[0]?.count ?? 0) + maybe;

  return { going, maybe, ticketHolders, total };
}

export async function GET(req: NextRequest, { params }: Props) {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  const counts = await getCounts(event.id);
  return NextResponse.json(counts);
}

export async function POST(req: NextRequest, { params }: Props) {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  const body = await req.json();
  const { status, email, firstName, lastName } = body;

  if (!status || !email) {
    return NextResponse.json({ error: "Missing status or email" }, { status: 400 });
  }

  if (!["going", "maybe", "not_going"].includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  // Try to get userId from JWT
  let userId: string | undefined;
  const token = req.cookies.get("frontier_token")?.value;
  if (token) {
    try {
      const { payload } = await jwtVerify(token, secret);
      userId = payload.sub as string;
    } catch {
      // Invalid token, continue without userId
    }
  }

  // Upsert RSVP
  await db
    .insert(rsvps)
    .values({
      eventId: event.id,
      userId: userId ?? null,
      email,
      firstName: firstName ?? null,
      lastName: lastName ?? null,
      status,
      source: "rsvp",
    })
    .onConflictDoUpdate({
      target: [rsvps.eventId, rsvps.email],
      set: {
        status,
        userId: userId ?? undefined,
        firstName: firstName ?? undefined,
        lastName: lastName ?? undefined,
        updatedAt: new Date(),
      },
    });

  const counts = await getCounts(event.id);
  return NextResponse.json({ ok: true, counts });
}
