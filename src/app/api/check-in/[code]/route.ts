import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tickets, checkinLog, ticketTypes } from "@/db/schema";
import { eq, and, count } from "drizzle-orm";

interface Props {
  params: Promise<{ code: string }>;
}

export async function GET(req: NextRequest, { params }: Props) {
  const { code } = await params;

  const ticket = await db.query.tickets.findFirst({
    where: eq(tickets.code, code),
    with: {
      ticketType: true,
    },
  });

  if (!ticket) {
    return NextResponse.json({
      valid: false,
      status: "invalid",
    });
  }

  const headcount = await getHeadcount(ticket.eventId);

  if (ticket.checkedInAt) {
    return NextResponse.json({
      valid: true,
      status: "checked_in",
      attendeeName: ticket.attendeeName,
      ticketType: ticket.ticketType.name,
      checkedInAt: ticket.checkedInAt,
      headcount,
    });
  }

  return NextResponse.json({
    valid: true,
    status: "valid",
    attendeeName: ticket.attendeeName,
    ticketType: ticket.ticketType.name,
    headcount,
  });
}

export async function POST(req: NextRequest, { params }: Props) {
  const { code } = await params;

  const ticket = await db.query.tickets.findFirst({
    where: eq(tickets.code, code),
    with: {
      ticketType: true,
    },
  });

  if (!ticket) {
    return NextResponse.json({ valid: false, status: "invalid" }, { status: 404 });
  }

  if (ticket.checkedInAt) {
    const headcount = await getHeadcount(ticket.eventId);
    return NextResponse.json({
      valid: true,
      status: "checked_in",
      attendeeName: ticket.attendeeName,
      ticketType: ticket.ticketType.name,
      checkedInAt: ticket.checkedInAt,
      headcount,
    });
  }

  const now = new Date();

  await db
    .update(tickets)
    .set({ checkedInAt: now })
    .where(eq(tickets.id, ticket.id));

  await db.insert(checkinLog).values({
    ticketId: ticket.id,
    eventId: ticket.eventId,
    action: "check_in",
    scannedAt: now,
  });

  const headcount = await getHeadcount(ticket.eventId);

  return NextResponse.json({
    valid: true,
    status: "checked_in",
    attendeeName: ticket.attendeeName,
    ticketType: ticket.ticketType.name,
    checkedInAt: now.toISOString(),
    headcount,
  });
}

async function getHeadcount(eventId: string) {
  const [result] = await db
    .select({
      total: count(tickets.id),
      checkedIn: count(tickets.checkedInAt),
    })
    .from(tickets)
    .where(
      and(
        eq(tickets.eventId, eventId),
        eq(tickets.status, "valid")
      )
    );

  return {
    total: result?.total ?? 0,
    checkedIn: result?.checkedIn ?? 0,
  };
}
