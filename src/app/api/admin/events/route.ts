import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { events, tickets } from "@/db/schema";
import { eq, ne, count } from "drizzle-orm";

export async function GET() {
  const allEvents = await db.query.events.findMany({
    where: ne(events.status, "deleted"),
    orderBy: events.startsAt,
    with: { ticketTypes: true },
  });

  const ticketCounts = await db
    .select({
      eventId: tickets.eventId,
      soldCount: count(tickets.id),
    })
    .from(tickets)
    .groupBy(tickets.eventId);

  const countMap = new Map(ticketCounts.map((r) => [r.eventId, r.soldCount]));

  const result = allEvents.map((e) => ({
    ...e,
    ticketsSold: countMap.get(e.id) ?? 0,
  }));

  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const [event] = await db
      .insert(events)
      .values({
        orgId: body.orgId || process.env.DEFAULT_ORG_ID || "00000000-0000-0000-0000-000000000000",
        title: body.title || body.name,
        slug: body.slug,
        description: body.description || null,
        location: body.location || null,
        startsAt: new Date(body.startsAt),
        endsAt: body.endsAt ? new Date(body.endsAt) : null,
        capacity: body.capacity ?? null,
        coverImageUrl: body.coverImageUrl || null,
        visibility: body.visibility ?? "public",
        status: "draft",
      })
      .returning();

    return NextResponse.json(event, { status: 201 });
  } catch (error) {
    console.error("Create event error:", error);
    return NextResponse.json({ error: "Failed to create event" }, { status: 500 });
  }
}
