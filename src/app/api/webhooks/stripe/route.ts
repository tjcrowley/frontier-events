import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db";
import { orders, tickets, contacts, events } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { createTicketsForOrder } from "@/lib/tickets";
import { sendOrderConfirmation } from "@/lib/email";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const headersList = await headers();
  const signature = headersList.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const orderId = session.metadata?.orderId;
    const contactId = session.metadata?.contactId;

    if (!orderId || !contactId) {
      console.error("Missing metadata on checkout session:", session.id);
      return NextResponse.json({ error: "Missing metadata" }, { status: 400 });
    }

    // Update order with payment info
    await db
      .update(orders)
      .set({
        status: "completed",
        stripePaymentIntentId: session.payment_intent as string,
        paidAt: new Date(),
      })
      .where(eq(orders.id, orderId));

    // Generate ticket codes + QR codes
    await createTicketsForOrder(orderId);

    // Load full data for confirmation email
    const order = await db.query.orders.findFirst({
      where: eq(orders.id, orderId),
    });

    const orderTickets = await db.query.tickets.findMany({
      where: eq(tickets.orderId, orderId),
      with: { ticketType: true },
    });

    const contact = await db.query.contacts.findFirst({
      where: eq(contacts.id, contactId),
    });

    const eventRecord = await db.query.events.findFirst({
      where: eq(events.id, order!.eventId),
    });

    if (order && contact && eventRecord) {
      await sendOrderConfirmation({
        order,
        tickets: orderTickets.map((t) => ({
          attendeeName: t.attendeeName,
          ticketTypeName: t.ticketType.name,
          code: t.code!,
          qrUrl: t.qrUrl!,
        })),
        contact,
        event: eventRecord,
      });
    }
  }

  return NextResponse.json({ received: true });
}
