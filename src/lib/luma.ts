/**
 * Luma API client
 * Docs: https://docs.luma.com/reference/getting-started-with-your-api
 * Base URL: https://public-api.luma.com
 * Auth: x-luma-api-key header
 *
 * Required env vars:
 *   LUMA_API_KEY        — from Luma dashboard → Settings → API
 *   LUMA_CALENDAR_ID    — your org's Luma calendar ID
 *   LUMA_WEBHOOK_SECRET — from Luma dashboard → Webhooks (for signature verification)
 */

const LUMA_BASE = "https://public-api.luma.com";

function lumaHeaders() {
  return {
    "x-luma-api-key": process.env.LUMA_API_KEY ?? "",
    "Content-Type": "application/json",
  };
}

export function lumaConfigured(): boolean {
  return !!(process.env.LUMA_API_KEY && process.env.LUMA_CALENDAR_ID);
}

// ── Types ──────────────────────────────────────────────────────────────────

export interface LumaEventInput {
  name: string;
  description?: string | null;
  startAt: string;      // ISO 8601
  endAt?: string | null;
  timezone?: string;
  location?: {
    type: "address";
    address: string;
  } | null;
  coverImageUrl?: string | null;
  capacity?: number | null;
  // visibility: luma uses "public" | "private"
  visibility?: "public" | "private";
}

export interface LumaEvent {
  api_id: string;
  name: string;
  url: string;
  start_at: string;
  end_at?: string;
}

export interface LumaGuest {
  api_id: string;
  event_api_id: string;
  name?: string;
  email?: string;
  status: string; // "approved" | "pending_approval" | "declined"
  registered_at: string;
}

// ── Event API ──────────────────────────────────────────────────────────────

/**
 * Create an event on Luma and add it to the calendar.
 * Returns the Luma event api_id.
 */
export async function lumaCreateEvent(input: LumaEventInput): Promise<string> {
  if (!lumaConfigured()) throw new Error("Luma not configured");

  // 1. Create the event
  const res = await fetch(`${LUMA_BASE}/v1/event/create`, {
    method: "POST",
    headers: lumaHeaders(),
    body: JSON.stringify({
      name: input.name,
      description: input.description ?? undefined,
      start_at: input.startAt,
      end_at: input.endAt ?? undefined,
      timezone: input.timezone ?? "America/Los_Angeles",
      geo_address_info: input.location
        ? { full_address: input.location.address }
        : undefined,
      cover_url: input.coverImageUrl ?? undefined,
      capacity: input.capacity ?? undefined,
      visibility: input.visibility ?? "public",
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Luma createEvent failed (${res.status}): ${err}`);
  }

  const data = await res.json() as { event: LumaEvent };
  const lumaId = data.event.api_id;

  // 2. Add to calendar
  await fetch(`${LUMA_BASE}/v1/calendar/add-event`, {
    method: "POST",
    headers: lumaHeaders(),
    body: JSON.stringify({
      calendar_api_id: process.env.LUMA_CALENDAR_ID,
      event_api_id: lumaId,
    }),
  });

  return lumaId;
}

/**
 * Update an existing Luma event.
 */
export async function lumaUpdateEvent(
  lumaEventId: string,
  input: Partial<LumaEventInput>
): Promise<void> {
  if (!lumaConfigured()) throw new Error("Luma not configured");

  const res = await fetch(`${LUMA_BASE}/v1/event/update`, {
    method: "POST",
    headers: lumaHeaders(),
    body: JSON.stringify({
      api_id: lumaEventId,
      ...(input.name && { name: input.name }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.startAt && { start_at: input.startAt }),
      ...(input.endAt !== undefined && { end_at: input.endAt }),
      ...(input.location !== undefined && {
        geo_address_info: input.location
          ? { full_address: input.location.address }
          : null,
      }),
      ...(input.coverImageUrl !== undefined && { cover_url: input.coverImageUrl }),
      ...(input.capacity !== undefined && { capacity: input.capacity }),
      ...(input.visibility && { visibility: input.visibility }),
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Luma updateEvent failed (${res.status}): ${err}`);
  }
}

/**
 * Add a guest to a Luma event (sync our RSVP outward).
 */
export async function lumaAddGuest(
  lumaEventId: string,
  guest: { email: string; name?: string }
): Promise<void> {
  if (!lumaConfigured()) return;

  await fetch(`${LUMA_BASE}/v1/event/add-guests`, {
    method: "POST",
    headers: lumaHeaders(),
    body: JSON.stringify({
      event_api_id: lumaEventId,
      guests: [{ email: guest.email, name: guest.name ?? guest.email }],
    }),
  });
}

// ── Webhook verification ───────────────────────────────────────────────────

/**
 * Verify a Luma webhook request using the signing secret.
 * Luma sends an x-luma-signature header (HMAC-SHA256 of the raw body).
 */
export async function verifyLumaWebhook(
  rawBody: string,
  signature: string
): Promise<boolean> {
  const secret = process.env.LUMA_WEBHOOK_SECRET;
  if (!secret) return true; // allow if not configured (dev)

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sigBytes = await crypto.subtle.sign("HMAC", key, encoder.encode(rawBody));
  const expected = Array.from(new Uint8Array(sigBytes))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return expected === signature;
}

// ── Helpers ────────────────────────────────────────────────────────────────

/** Convert our event to a LumaEventInput */
export function eventToLumaInput(event: {
  title: string;
  description?: string | null;
  startsAt: Date;
  endsAt?: Date | null;
  location?: string | null;
  coverImageUrl?: string | null;
  capacity?: number | null;
  visibility: string;
}): LumaEventInput {
  return {
    name: event.title,
    description: event.description,
    startAt: event.startsAt.toISOString(),
    endAt: event.endsAt?.toISOString() ?? null,
    location: event.location ? { type: "address", address: event.location } : null,
    coverImageUrl: event.coverImageUrl,
    capacity: event.capacity,
    visibility: event.visibility === "citizen" ? "private" : "public",
  };
}
