import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { events } from "@/db/schema";
import { eq } from "drizzle-orm";

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

    await db
      .update(events)
      .set({ status: newStatus, updatedAt: new Date() })
      .where(eq(events.id, id));

    return NextResponse.json({ status: newStatus });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
