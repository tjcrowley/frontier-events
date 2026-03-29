import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { events, waitlist } from "@/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { sendWaitlistNotification } from "@/lib/email";

interface Props {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: Props) {
  const { id } = await params;

  const entries = await db.query.waitlist.findMany({
    where: eq(waitlist.eventId, id),
    orderBy: asc(waitlist.position),
  });

  return NextResponse.json(entries);
}

export async function POST(req: NextRequest, { params }: Props) {
  const { id } = await params;
  const body = await req.json();

  if (body.action !== "notify" || !body.waitlistId) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const entry = await db.query.waitlist.findFirst({
    where: and(eq(waitlist.id, body.waitlistId), eq(waitlist.eventId, id)),
  });

  if (!entry) {
    return NextResponse.json({ error: "Waitlist entry not found" }, { status: 404 });
  }

  const event = await db.query.events.findFirst({
    where: eq(events.id, id),
  });

  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  // Update status
  await db
    .update(waitlist)
    .set({ status: "notified", notifiedAt: new Date() })
    .where(eq(waitlist.id, body.waitlistId));

  // Send notification email
  await sendWaitlistNotification({
    email: entry.email,
    firstName: entry.firstName,
    event: {
      title: event.title,
      slug: event.slug,
      startsAt: event.startsAt,
    },
  });

  return NextResponse.json({ ok: true });
}
