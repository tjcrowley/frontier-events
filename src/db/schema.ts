import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// ── Organizations ──────────────────────────────────────────────────────────
export const organizations = pgTable("organizations", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  stripeAccount: text("stripe_account"),
  platformFeeBps: integer("platform_fee_bps").notNull().default(1000),
});

// ── Events ─────────────────────────────────────────────────────────────────
export const events = pgTable("events", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => organizations.id),
  title: text("title").notNull(),
  slug: text("slug").notNull(),
  description: text("description"),
  coverImageUrl: text("cover_image_url"),
  location: text("location"),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }),
  status: text("status").notNull().default("draft"),
  visibility: text("visibility").notNull().default("public"),
  capacity: integer("capacity"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ── Ticket Types ───────────────────────────────────────────────────────────
export const ticketTypes = pgTable("ticket_types", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventId: uuid("event_id")
    .notNull()
    .references(() => events.id),
  name: text("name").notNull(),
  description: text("description"),
  priceCents: integer("price_cents").notNull().default(0),
  currency: text("currency").notNull().default("usd"),
  quantity: integer("quantity"),
  maxPerOrder: integer("max_per_order").notNull().default(10),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
});

// ── Contacts ───────────────────────────────────────────────────────────────
export const contacts = pgTable(
  "contacts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id),
    email: text("email").notNull(),
    firstName: text("first_name"),
    lastName: text("last_name"),
    source: text("source"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("contacts_org_email_idx").on(
      table.orgId,
      sql`lower(${table.email})`
    ),
  ]
);

// ── Orders ─────────────────────────────────────────────────────────────────
export const orders = pgTable("orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => organizations.id),
  contactId: uuid("contact_id")
    .notNull()
    .references(() => contacts.id),
  eventId: uuid("event_id")
    .notNull()
    .references(() => events.id),
  status: text("status").notNull().default("pending"),
  totalCents: integer("total_cents").notNull().default(0),
  stripeCheckoutSessionId: text("stripe_checkout_session_id"),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ── Tickets ────────────────────────────────────────────────────────────────
export const tickets = pgTable("tickets", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id),
  ticketTypeId: uuid("ticket_type_id")
    .notNull()
    .references(() => ticketTypes.id),
  contactId: uuid("contact_id")
    .notNull()
    .references(() => contacts.id),
  eventId: uuid("event_id")
    .notNull()
    .references(() => events.id),
  code: text("code").notNull().unique(),
  qrUrl: text("qr_url"),
  status: text("status").notNull().default("valid"),
  checkedInAt: timestamp("checked_in_at", { withTimezone: true }),
  checkedInBy: uuid("checked_in_by"),
  attendeeName: text("attendee_name"),
  attendeeEmail: text("attendee_email"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ── Check-in Log ───────────────────────────────────────────────────────────
export const checkinLog = pgTable("checkin_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  ticketId: uuid("ticket_id")
    .notNull()
    .references(() => tickets.id),
  eventId: uuid("event_id")
    .notNull()
    .references(() => events.id),
  action: text("action").notNull(),
  scannedAt: timestamp("scanned_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  notes: text("notes"),
});
