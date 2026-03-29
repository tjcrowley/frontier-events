import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { events, rsvps } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { jwtVerify } from "jose";

const secret = new TextEncoder().encode(process.env.JWT_SECRET);

interface Props {
  params: Promise<{ slug: string }>;
}

export async function GET(req: NextRequest, { params }: Props) {
  const token = req.cookies.get("frontier_token")?.value;
  if (!token) {
    return NextResponse.json({ status: null });
  }

  let email: string;
  try {
    const { payload } = await jwtVerify(token, secret);
    email = payload.email as string;
  } catch {
    return NextResponse.json({ status: null });
  }

  const { slug } = await params;
  const event = await db.query.events.findFirst({
    where: eq(events.slug, slug),
  });

  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  const rsvp = await db.query.rsvps.findFirst({
    where: and(eq(rsvps.eventId, event.id), eq(rsvps.email, email)),
  });

  return NextResponse.json({ status: rsvp?.status ?? null });
}
