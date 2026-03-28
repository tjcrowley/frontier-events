import { relations } from "drizzle-orm";
import {
  organizations,
  events,
  ticketTypes,
  contacts,
  orders,
  tickets,
  checkinLog,
} from "./schema";

export const organizationsRelations = relations(organizations, ({ many }) => ({
  events: many(events),
  contacts: many(contacts),
  orders: many(orders),
}));

export const eventsRelations = relations(events, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [events.orgId],
    references: [organizations.id],
  }),
  ticketTypes: many(ticketTypes),
  tickets: many(tickets),
  orders: many(orders),
  checkinLogs: many(checkinLog),
}));

export const ticketTypesRelations = relations(ticketTypes, ({ one, many }) => ({
  event: one(events, {
    fields: [ticketTypes.eventId],
    references: [events.id],
  }),
  tickets: many(tickets),
}));

export const contactsRelations = relations(contacts, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [contacts.orgId],
    references: [organizations.id],
  }),
  orders: many(orders),
  tickets: many(tickets),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [orders.orgId],
    references: [organizations.id],
  }),
  contact: one(contacts, {
    fields: [orders.contactId],
    references: [contacts.id],
  }),
  event: one(events, {
    fields: [orders.eventId],
    references: [events.id],
  }),
  tickets: many(tickets),
}));

export const ticketsRelations = relations(tickets, ({ one }) => ({
  order: one(orders, {
    fields: [tickets.orderId],
    references: [orders.id],
  }),
  ticketType: one(ticketTypes, {
    fields: [tickets.ticketTypeId],
    references: [ticketTypes.id],
  }),
  contact: one(contacts, {
    fields: [tickets.contactId],
    references: [contacts.id],
  }),
  event: one(events, {
    fields: [tickets.eventId],
    references: [events.id],
  }),
}));

export const checkinLogRelations = relations(checkinLog, ({ one }) => ({
  ticket: one(tickets, {
    fields: [checkinLog.ticketId],
    references: [tickets.id],
  }),
  event: one(events, {
    fields: [checkinLog.eventId],
    references: [events.id],
  }),
}));
