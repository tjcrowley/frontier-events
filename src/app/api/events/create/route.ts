import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { events, organizations, eventHosts } from "@/db/schema";
import { eq } from "drizzle-orm";
import { jwtVerify } from "jose";

const secret = new TextEncoder().encode(process.env.JWT_SECRET);

async function getPayload(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : req.cookies.get("frontier_token")?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as {
      sub: string;
      walletAddress?: string | null;
      email: string;
      firstName?: string | null;
      role: string;
      subscriptionStatus?: string | null;
      authProvider?: string;
    };
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const payload = await getPayload(req);

  if (!payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Must be a Frontier citizen (wallet auth + active subscription) OR admin
  const isFrontierCitizen =
    payload.authProvider === "frontier" &&
    payload.walletAddress &&
    payload.subscriptionStatus === "active";

  if (!isFrontierCitizen && payload.role !== "admin") {
    return NextResponse.json(
      { error: "Event creation requires an active Frontier Tower membership authenticated via Frontier OS." },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const {
      title,
      slug,
      description,
      location,
      startsAt,
      endsAt,
      capacity,
      coverImageUrl,
      visibility,
      floorCommunitySlug,
    } = body;

    if (!title || !slug || !startsAt) {
      return NextResponse.json({ error: "title, slug, and startsAt are required" }, { status: 400 });
    }

    // Get default org
    const org = await db.query.organizations.findFirst();
    if (!org) {
      return NextResponse.json({ error: "No organization configured" }, { status: 500 });
    }

    const [event] = await db
      .insert(events)
      .values({
        orgId: org.id,
        title,
        slug,
        description: description || null,
        location: location || null,
        startsAt: new Date(startsAt),
        endsAt: endsAt ? new Date(endsAt) : null,
        capacity: capacity ?? null,
        coverImageUrl: coverImageUrl || null,
        visibility: visibility === "citizen" ? "citizen" : "public",
        floorCommunitySlug: floorCommunitySlug || null,
        hostUserId: payload.sub,
        // Start as draft — admin reviews before publishing
        status: payload.role === "admin" ? "published" : "draft",
      })
      .returning();

    // Add creator as event host
    await db.insert(eventHosts).values({
      eventId: event.id,
      userId: payload.sub,
    }).onConflictDoNothing();

    return NextResponse.json({ id: event.id, slug: event.slug, status: event.status });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    // Duplicate slug
    if (msg.includes("unique") || msg.includes("duplicate")) {
      return NextResponse.json({ error: "That slug is already taken. Try a different title." }, { status: 409 });
    }
    console.error("Event create error:", err);
    return NextResponse.json({ error: "Failed to create event" }, { status: 500 });
  }
}
