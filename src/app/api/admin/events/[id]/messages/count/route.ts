import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { rsvps, orders, contacts } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { jwtVerify } from "jose";

const secret = new TextEncoder().encode(process.env.JWT_SECRET);

interface Props {
  params: Promise<{ id: string }>;
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

export async function GET(req: NextRequest, { params }: Props) {
  const admin = await checkAdmin(req);
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: eventId } = await params;
  const filter = req.nextUrl.searchParams.get("filter") || "all";

  const recipientMap = new Set<string>();

  if (filter === "all" || filter === "going") {
    const rsvpFilter = filter === "going"
      ? and(eq(rsvps.eventId, eventId), eq(rsvps.status, "going"))
      : eq(rsvps.eventId, eventId);

    const rsvpRows = await db
      .select({ email: rsvps.email })
      .from(rsvps)
      .where(rsvpFilter);

    for (const r of rsvpRows) {
      recipientMap.add(r.email.toLowerCase());
    }
  }

  if (filter === "all" || filter === "going" || filter === "tickets_only") {
    const orderContacts = await db
      .select({ email: contacts.email })
      .from(orders)
      .innerJoin(contacts, eq(orders.contactId, contacts.id))
      .where(and(eq(orders.eventId, eventId), eq(orders.status, "completed")));

    for (const c of orderContacts) {
      recipientMap.add(c.email.toLowerCase());
    }
  }

  return NextResponse.json({ count: recipientMap.size });
}
