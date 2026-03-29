import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { events } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  lumaConfigured,
  lumaCreateEvent,
  lumaUpdateEvent,
  eventToLumaInput,
} from "@/lib/luma";

interface Props {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: Props) {
  const { id } = await params;

  const event = await db.query.events.findFirst({
    where: eq(events.id, id),
    with: { ticketTypes: true },
  });

  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  return NextResponse.json(event);
}

export async function PUT(req: NextRequest, { params }: Props) {
  const { id } = await params;
  const body = await req.json();

  try {
    const [updated] = await db
      .update(events)
      .set({
        title: body.title || body.name,
        slug: body.slug,
        description: body.description || null,
        location: body.location || null,
        startsAt: new Date(body.startsAt),
        endsAt: body.endsAt ? new Date(body.endsAt) : null,
        capacity: body.capacity ?? null,
        coverImageUrl: body.coverImageUrl || null,
        visibility: body.visibility ?? "public",
        recurringType: body.recurringType || null,
        recurringEndsAt: body.recurringEndsAt ? new Date(body.recurringEndsAt) : null,
        updatedAt: new Date(),
      })
      .where(eq(events.id, id))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Update event error:", error);
    return NextResponse.json({ error: "Failed to update event" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: Props) {
  const { id } = await params;

  const [updated] = await db
    .update(events)
    .set({ status: "deleted", updatedAt: new Date() })
    .where(eq(events.id, id))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}

export async function PATCH(req: NextRequest, { params }: Props) {
  const { id } = await params;
  const body = await req.json();

  if (body.action === "toggle_publish") {
    const event = await db.query.events.findFirst({
      where: eq(events.id, id),
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const newStatus = event.status === "published" ? "draft" : "published";

    const updatePayload: Record<string, unknown> = { status: newStatus, updatedAt: new Date() };

    // Sync to Luma when publishing
    if (newStatus === "published" && lumaConfigured()) {
      try {
        if (!event.lumaEventId) {
          // First publish — create on Luma
          const lumaId = await lumaCreateEvent(eventToLumaInput(event));
          updatePayload.lumaEventId = lumaId;
          updatePayload.lumaSyncedAt = new Date();
        } else {
          // Already on Luma — update it
          await lumaUpdateEvent(event.lumaEventId, eventToLumaInput(event));
          updatePayload.lumaSyncedAt = new Date();
        }
      } catch (err) {
        console.error("[luma] sync failed:", err);
        // Don't block publish — just log
      }
    }

    await db
      .update(events)
      .set({
        status: newStatus,
        updatedAt: new Date(),
        ...(updatePayload.lumaEventId ? { lumaEventId: updatePayload.lumaEventId as string } : {}),
        ...(updatePayload.lumaSyncedAt ? { lumaSyncedAt: updatePayload.lumaSyncedAt as Date } : {}),
      })
      .where(eq(events.id, id));

    const updated = await db.query.events.findFirst({ where: eq(events.id, id) });

    return NextResponse.json({
      status: newStatus,
      lumaEventId: updated?.lumaEventId ?? null,
      lumaSyncedAt: updated?.lumaSyncedAt ?? null,
    });
  }

  // Manual Luma sync action
  if (body.action === "sync_luma") {
    const event = await db.query.events.findFirst({ where: eq(events.id, id) });
    if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (!lumaConfigured()) {
      return NextResponse.json({ error: "Luma not configured" }, { status: 503 });
    }

    try {
      if (!event.lumaEventId) {
        const lumaId = await lumaCreateEvent(eventToLumaInput(event));
        await db.update(events)
          .set({ lumaEventId: lumaId, lumaSyncedAt: new Date(), updatedAt: new Date() })
          .where(eq(events.id, id));
        return NextResponse.json({ ok: true, lumaEventId: lumaId, created: true });
      } else {
        await lumaUpdateEvent(event.lumaEventId, eventToLumaInput(event));
        await db.update(events)
          .set({ lumaSyncedAt: new Date(), updatedAt: new Date() })
          .where(eq(events.id, id));
        return NextResponse.json({ ok: true, lumaEventId: event.lumaEventId, created: false });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return NextResponse.json({ error: msg }, { status: 500 });
    }
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
