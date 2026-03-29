import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { events, tickets, orders, waitlist } from "@/db/schema";
import { eq, and, count, sql } from "drizzle-orm";
import { jwtVerify } from "jose";

const secret = new TextEncoder().encode(process.env.JWT_SECRET);

interface Props {
  params: Promise<{ slug: string }>;
}

export async function POST(req: NextRequest, { params }: Props) {
  const { slug } = await params;
  const body = await req.json();
  const { email, firstName, lastName } = body;

  if (!email) {
    return NextResponse.json({ error: "Email required" }, { status: 400 });
  }

  const event = await db.query.events.findFirst({
    where: eq(events.slug, slug),
  });

  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  // Check if event is actually at capacity
  if (event.capacity == null) {
    return NextResponse.json({ error: "Event has no capacity limit" }, { status: 400 });
  }

  const ticketCountResult = await db
    .select({ count: count(tickets.id) })
    .from(tickets)
    .innerJoin(orders, eq(tickets.orderId, orders.id))
    .where(and(eq(tickets.eventId, event.id), eq(orders.status, "completed")));

  const ticketCount = ticketCountResult[0]?.count ?? 0;

  if (ticketCount < event.capacity) {
    return NextResponse.json(
      { error: "Event still has spots — register normally." },
      { status: 400 }
    );
  }

  // Check if already on waitlist
  const existing = await db.query.waitlist.findFirst({
    where: and(eq(waitlist.eventId, event.id), eq(waitlist.email, email)),
  });

  if (existing) {
    return NextResponse.json(
      { error: "Already on waitlist", position: existing.position },
      { status: 409 }
    );
  }

  // Calculate position
  const posResult = await db
    .select({ count: count(waitlist.id) })
    .from(waitlist)
    .where(and(eq(waitlist.eventId, event.id), eq(waitlist.status, "waiting")));

  const position = (posResult[0]?.count ?? 0) + 1;

  // Check JWT for userId
  let userId: string | null = null;
  const token = req.cookies.get("frontier_token")?.value;
  if (token) {
    try {
      const { payload } = await jwtVerify(token, secret);
      userId = payload.sub as string;
    } catch {
      // ignore
    }
  }

  await db.insert(waitlist).values({
    eventId: event.id,
    userId,
    email,
    firstName: firstName || null,
    lastName: lastName || null,
    position,
  });

  return NextResponse.json({ ok: true, position });
}

export async function GET(req: NextRequest, { params }: Props) {
  const { slug } = await params;
  const url = new URL(req.url);
  const email = url.searchParams.get("email");

  if (!email) {
    return NextResponse.json({ error: "email query param required" }, { status: 400 });
  }

  const event = await db.query.events.findFirst({
    where: eq(events.slug, slug),
  });

  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  const entry = await db.query.waitlist.findFirst({
    where: and(eq(waitlist.eventId, event.id), eq(waitlist.email, email)),
  });

  if (!entry) {
    return NextResponse.json({ error: "Not on waitlist" }, { status: 404 });
  }

  const totalResult = await db
    .select({ count: count(waitlist.id) })
    .from(waitlist)
    .where(and(eq(waitlist.eventId, event.id), eq(waitlist.status, "waiting")));

  return NextResponse.json({
    position: entry.position,
    total: totalResult[0]?.count ?? 0,
    status: entry.status,
  });
}
