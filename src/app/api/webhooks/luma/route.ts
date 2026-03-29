import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { events, contacts, rsvps, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { verifyLumaWebhook, type LumaGuest } from "@/lib/luma";

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-luma-signature") ?? "";

  // Verify webhook signature
  const valid = await verifyLumaWebhook(rawBody, signature);
  if (!valid) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: { type: string; data: unknown };
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { type, data } = payload;

  // ── guest_registered / guest_updated ──────────────────────────────────
  if (type === "guest_registered" || type === "guest_updated") {
    const guest = data as LumaGuest;

    if (!guest.email) {
      return NextResponse.json({ ok: true, skipped: "no email" });
    }

    const email = guest.email.toLowerCase();
    const firstName = guest.name?.split(" ")[0] ?? null;
    const lastName = guest.name?.split(" ").slice(1).join(" ") || null;

    // Find event by luma_event_id
    const event = await db.query.events.findFirst({
      where: eq(events.lumaEventId, guest.event_api_id),
    });

    if (!event) {
      console.log(`[luma webhook] Unknown luma event id: ${guest.event_api_id}`);
      return NextResponse.json({ ok: true, skipped: "event not found" });
    }

    // Upsert contact
    const existing = await db.query.contacts.findFirst({
      where: and(
        eq(contacts.orgId, event.orgId),
        eq(contacts.email, email)
      ),
    });

    if (!existing) {
      await db.insert(contacts).values({
        orgId: event.orgId,
        email,
        firstName,
        lastName,
        source: "luma",
      }).onConflictDoNothing();
    } else if (firstName || lastName) {
      await db.update(contacts)
        .set({ firstName: firstName ?? existing.firstName, lastName: lastName ?? existing.lastName, updatedAt: new Date() })
        .where(eq(contacts.id, existing.id));
    }

    // Find user if they have an account
    const user = await db.query.users.findFirst({ where: eq(users.email, email) });

    // Upsert RSVP — declined guests set to not_going, others going
    const rsvpStatus =
      guest.status === "declined" ? "not_going" : "going";

    await db.insert(rsvps).values({
      eventId: event.id,
      userId: user?.id ?? null,
      email,
      firstName,
      lastName,
      status: rsvpStatus,
      source: "luma",
    }).onConflictDoUpdate({
      target: [rsvps.eventId, rsvps.email],
      set: { status: rsvpStatus, updatedAt: new Date() },
    });

    console.log(`[luma webhook] ${type}: ${email} → ${rsvpStatus} for event ${event.id}`);
  }

  return NextResponse.json({ ok: true });
}
