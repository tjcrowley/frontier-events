import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

async function seed() {
  const pool = new Pool({
    connectionString:
      process.env.DATABASE_URL ??
      "postgresql://postgres:postgres@localhost:5432/frontier_events",
  });

  const db = drizzle(pool, { schema });

  // ── Organization ───────────────────────────────────────────────────────
  const [org] = await db
    .insert(schema.organizations)
    .values({
      name: "Frontier Tower",
      slug: "frontier-tower",
      platformFeeBps: 1000,
    })
    .returning();

  console.log("Created org:", org.name);

  // ── Event (starts tomorrow at 7 PM PT) ────────────────────────────────
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(19, 0, 0, 0); // 7 PM local

  const eventEnd = new Date(tomorrow);
  eventEnd.setHours(22, 0, 0, 0); // 10 PM local

  const [event] = await db
    .insert(schema.events)
    .values({
      orgId: org.id,
      title: "Vibe Coding Night",
      slug: "vibe-coding-night",
      description:
        "Join us for an evening of collaborative coding, music, and good vibes at Frontier Tower.",
      location: "Frontier Tower — 3rd Floor Makerspace",
      startsAt: tomorrow,
      endsAt: eventEnd,
      status: "published",
      visibility: "public",
      capacity: 50,
    })
    .returning();

  console.log("Created event:", event.title);

  // ── Ticket Types ───────────────────────────────────────────────────────
  const [freeTicket] = await db
    .insert(schema.ticketTypes)
    .values({
      eventId: event.id,
      name: "General Admission",
      description: "Free entry to Vibe Coding Night",
      priceCents: 0,
      currency: "usd",
      quantity: 40,
      maxPerOrder: 4,
      sortOrder: 0,
      isActive: true,
    })
    .returning();

  const [vipTicket] = await db
    .insert(schema.ticketTypes)
    .values({
      eventId: event.id,
      name: "VIP",
      description: "VIP access with reserved seating and refreshments",
      priceCents: 2000,
      currency: "usd",
      quantity: 10,
      maxPerOrder: 2,
      sortOrder: 1,
      isActive: true,
    })
    .returning();

  console.log("Created ticket types:", freeTicket.name, "&", vipTicket.name);

  await pool.end();
  console.log("Seed complete!");
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
