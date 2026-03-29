import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { events } from "@/db/schema";
import { eq } from "drizzle-orm";

interface Props {
  params: Promise<{ id: string }>;
}

function addInterval(date: Date, type: string, multiplier: number): Date {
  const result = new Date(date);
  if (type === "monthly") {
    result.setMonth(result.getMonth() + multiplier);
  } else {
    const days = type === "biweekly" ? 14 : 7;
    result.setDate(result.getDate() + days * multiplier);
  }
  return result;
}

export async function POST(req: NextRequest, { params }: Props) {
  const { id } = await params;

  const parent = await db.query.events.findFirst({
    where: eq(events.id, id),
  });

  if (!parent) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  if (!parent.recurringType) {
    return NextResponse.json({ error: "Event has no recurrence type set" }, { status: 400 });
  }

  if (!parent.recurringEndsAt) {
    return NextResponse.json({ error: "Event has no recurring end date set" }, { status: 400 });
  }

  const startsAt = new Date(parent.startsAt);
  const endsAt = parent.endsAt ? new Date(parent.endsAt) : null;
  const duration = endsAt ? endsAt.getTime() - startsAt.getTime() : null;
  const recurringEndsAt = new Date(parent.recurringEndsAt);

  const instances: { id: string; slug: string; startsAt: Date }[] = [];
  let i = 1;

  while (true) {
    const instanceStart = addInterval(startsAt, parent.recurringType, i);
    if (instanceStart > recurringEndsAt) break;

    const instanceEnd = duration ? new Date(instanceStart.getTime() + duration) : null;
    const dateStr = instanceStart.toISOString().slice(0, 10);
    const instanceSlug = `${parent.slug}-${dateStr}`;

    const [created] = await db
      .insert(events)
      .values({
        orgId: parent.orgId,
        title: parent.title,
        slug: instanceSlug,
        description: parent.description,
        location: parent.location,
        coverImageUrl: parent.coverImageUrl,
        visibility: parent.visibility,
        capacity: parent.capacity,
        status: parent.status,
        hostUserId: parent.hostUserId,
        startsAt: instanceStart,
        endsAt: instanceEnd,
        recurringParentId: parent.id,
      })
      .returning();

    instances.push({ id: created.id, slug: created.slug, startsAt: created.startsAt });
    i++;
  }

  return NextResponse.json({ created: instances.length, instances });
}
