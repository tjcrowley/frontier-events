import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { events, ticketTypes, contacts, orders, tickets } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { stripe } from "@/lib/stripe";
import { createTicketsForOrder } from "@/lib/tickets";
import { sendOrderConfirmation } from "@/lib/email";

interface TicketRequest {
  typeId: string;
  quantity: number;
  attendeeName: string;
  attendeeEmail: string;
}

interface CheckoutBody {
  eventId: string;
  tickets: TicketRequest[];
  contact: { email: string; firstName: string; lastName: string };
}

export async function POST(req: NextRequest) {
  try {
    const body: CheckoutBody = await req.json();
    const { eventId, tickets: ticketRequests, contact } = body;

    // 1. Look up event + ticket types
    const event = await db.query.events.findFirst({
      where: eq(events.id, eventId),
    });
    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const types = await db.query.ticketTypes.findMany({
      where: eq(ticketTypes.eventId, eventId),
    });
    const typeMap = new Map(types.map((t) => [t.id, t]));

    // Validate ticket types and calculate total
    let totalCents = 0;
    const lineItems: { typeId: string; type: (typeof types)[0]; quantity: number; attendeeName: string; attendeeEmail: string }[] = [];

    for (const req of ticketRequests) {
      const type = typeMap.get(req.typeId);
      if (!type) {
        return NextResponse.json(
          { error: `Ticket type ${req.typeId} not found` },
          { status: 400 }
        );
      }
      totalCents += type.priceCents * req.quantity;
      lineItems.push({ typeId: req.typeId, type, quantity: req.quantity, attendeeName: req.attendeeName, attendeeEmail: req.attendeeEmail });
    }

    // 2. Create/upsert contact
    const existingContact = await db.query.contacts.findFirst({
      where: eq(contacts.email, contact.email),
    });

    let contactId: string;
    if (existingContact) {
      await db
        .update(contacts)
        .set({ firstName: contact.firstName, lastName: contact.lastName, updatedAt: new Date() })
        .where(eq(contacts.id, existingContact.id));
      contactId = existingContact.id;
    } else {
      const [newContact] = await db
        .insert(contacts)
        .values({
          email: contact.email,
          firstName: contact.firstName,
          lastName: contact.lastName,
        })
        .returning();
      contactId = newContact.id;
    }

    // Create order
    const [order] = await db
      .insert(orders)
      .values({
        eventId,
        contactId,
        totalCents,
        status: totalCents === 0 ? "completed" : "pending",
      })
      .returning();

    // Create ticket rows (without codes yet)
    for (const item of lineItems) {
      for (let i = 0; i < item.quantity; i++) {
        await db.insert(tickets).values({
          orderId: order.id,
          ticketTypeId: item.typeId,
          attendeeName: item.attendeeName,
          attendeeEmail: item.attendeeEmail,
          status: "pending",
        });
      }
    }

    // 3. Free event — generate tickets immediately
    if (totalCents === 0) {
      await createTicketsForOrder(order.id);

      const orderTickets = await db.query.tickets.findMany({
        where: eq(tickets.orderId, order.id),
        with: { ticketType: true },
      });

      const contactRecord = (await db.query.contacts.findFirst({
        where: eq(contacts.id, contactId),
      }))!;

      await sendOrderConfirmation({
        order,
        tickets: orderTickets.map((t) => ({
          attendeeName: t.attendeeName,
          ticketTypeName: t.ticketType.name,
          code: t.code!,
          qrUrl: t.qrUrl!,
        })),
        contact: contactRecord,
        event,
      });

      return NextResponse.json({
        orderId: order.id,
        redirect: `/orders/${order.id}`,
      });
    }

    // 4. Paid event — create Stripe Checkout Session
    const platformFeeBps = event.platformFeeBps ?? 0;
    const applicationFeeAmount = Math.round((platformFeeBps / 10000) * totalCents);

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: lineItems.map((item) => ({
        price_data: {
          currency: "usd",
          product_data: {
            name: item.type.name,
            description: `${event.name} — ${item.type.name}`,
          },
          unit_amount: item.type.priceCents,
        },
        quantity: item.quantity,
      })),
      ...(applicationFeeAmount > 0 && {
        payment_intent_data: {
          application_fee_amount: applicationFeeAmount,
        },
      }),
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/orders/${order.id}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/e/${event.slug}`,
      customer_email: contact.email,
      metadata: {
        orderId: order.id,
        contactId,
      },
    });

    // Store Stripe session ID on the order
    await db
      .update(orders)
      .set({ stripeSessionId: session.id })
      .where(eq(orders.id, order.id));

    // 5. Return session info
    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
    });
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json(
      { error: "Failed to process checkout" },
      { status: 500 }
    );
  }
}
