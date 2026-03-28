import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { ticketTypes } from "@/db/schema";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const [ticketType] = await db
      .insert(ticketTypes)
      .values({
        eventId: body.eventId,
        name: body.name,
        description: body.description ?? null,
        priceCents: body.priceCents ?? 0,
        quantity: body.quantity ?? null,
      })
      .returning();

    return NextResponse.json(ticketType, { status: 201 });
  } catch (error) {
    console.error("Create ticket type error:", error);
    return NextResponse.json({ error: "Failed to create ticket type" }, { status: 500 });
  }
}
