import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { ticketTypes } from "@/db/schema";
import { eq } from "drizzle-orm";

interface Props {
  params: Promise<{ id: string }>;
}

export async function PUT(req: NextRequest, { params }: Props) {
  const { id } = await params;
  const body = await req.json();

  try {
    const [updated] = await db
      .update(ticketTypes)
      .set({
        name: body.name,
        description: body.description ?? null,
        priceCents: body.priceCents ?? 0,
        quantity: body.quantity ?? null,
      })
      .where(eq(ticketTypes.id, id))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Ticket type not found" }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Update ticket type error:", error);
    return NextResponse.json({ error: "Failed to update ticket type" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: Props) {
  const { id } = await params;

  const [deleted] = await db
    .delete(ticketTypes)
    .where(eq(ticketTypes.id, id))
    .returning();

  if (!deleted) {
    return NextResponse.json({ error: "Ticket type not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
