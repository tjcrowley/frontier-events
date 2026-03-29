import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { eventMessages } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
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

  const { id } = await params;
  const messages = await db
    .select()
    .from(eventMessages)
    .where(eq(eventMessages.eventId, id))
    .orderBy(desc(eventMessages.createdAt));

  return NextResponse.json(messages);
}

export async function POST(req: NextRequest, { params }: Props) {
  const admin = await checkAdmin(req);
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const { subject, body: msgBody, recipientFilter } = body;

  if (!subject || !msgBody) {
    return NextResponse.json({ error: "Missing subject or body" }, { status: 400 });
  }

  const [message] = await db
    .insert(eventMessages)
    .values({
      eventId: id,
      senderUserId: admin.sub as string,
      subject,
      body: msgBody,
      recipientFilter: recipientFilter || "all",
      status: "draft",
    })
    .returning();

  return NextResponse.json(message);
}
