import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { eventMessages, events, rsvps, orders, contacts } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { jwtVerify } from "jose";
import { sendEventMessage } from "@/lib/email";

const secret = new TextEncoder().encode(process.env.JWT_SECRET);

interface Props {
  params: Promise<{ id: string; messageId: string }>;
}

async function checkAdmin(req: NextRequest) {
  const token = req.cookies.get("frontier_token")?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    if (payload.role !== "admin") return null;
    return payload;
  } catch {
    return null;
  }
}

async function getRecipients(eventId: string, filter: string) {
  const recipientMap = new Map<string, { email: string; firstName?: string | null }>();

  if (filter === "all" || filter === "going") {
    // Get RSVPs
    const rsvpFilter = filter === "going"
      ? and(eq(rsvps.eventId, eventId), eq(rsvps.status, "going"))
      : eq(rsvps.eventId, eventId);

    const rsvpRows = await db
      .select({ email: rsvps.email, firstName: rsvps.firstName })
      .from(rsvps)
      .where(rsvpFilter);

    for (const r of rsvpRows) {
      recipientMap.set(r.email.toLowerCase(), { email: r.email, firstName: r.firstName });
    }
  }

  if (filter === "all" || filter === "going" || filter === "tickets_only") {
    // Get ticket holders from completed orders
    const orderContacts = await db
      .select({ email: contacts.email, firstName: contacts.firstName })
      .from(orders)
      .innerJoin(contacts, eq(orders.contactId, contacts.id))
      .where(and(eq(orders.eventId, eventId), eq(orders.status, "completed")));

    for (const c of orderContacts) {
      if (!recipientMap.has(c.email.toLowerCase())) {
        recipientMap.set(c.email.toLowerCase(), { email: c.email, firstName: c.firstName });
      }
    }
  }

  return Array.from(recipientMap.values());
}

export async function POST(req: NextRequest, { params }: Props) {
  const admin = await checkAdmin(req);
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: eventId, messageId } = await params;

  // Load message
  const message = await db.query.eventMessages.findFirst({
    where: and(eq(eventMessages.id, messageId), eq(eventMessages.eventId, eventId)),
  });

  if (!message) {
    return NextResponse.json({ error: "Message not found" }, { status: 404 });
  }

  if (message.status === "sent") {
    return NextResponse.json({ error: "Message already sent" }, { status: 400 });
  }

  // Load event
  const event = await db.query.events.findFirst({
    where: eq(events.id, eventId),
  });

  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  // Collect recipients
  const recipients = await getRecipients(eventId, message.recipientFilter);

  try {
    await sendEventMessage({
      recipients,
      event: { title: event.title, slug: event.slug },
      message: { subject: message.subject, body: message.body },
    });

    // Update message status
    await db
      .update(eventMessages)
      .set({
        status: "sent",
        sentAt: new Date(),
        recipientCount: recipients.length,
      })
      .where(eq(eventMessages.id, messageId));

    return NextResponse.json({ ok: true, recipientCount: recipients.length });
  } catch (error) {
    console.error("Failed to send event message:", error);

    await db
      .update(eventMessages)
      .set({ status: "failed" })
      .where(eq(eventMessages.id, messageId));

    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }
}
