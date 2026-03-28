import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, contacts, organizations } from "@/db/schema";
import { eq } from "drizzle-orm";
import { jwtVerify } from "jose";

const secret = new TextEncoder().encode(process.env.JWT_SECRET);

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const { payload } = await jwtVerify(token, secret);
    const walletAddress = payload.walletAddress as string;

    const body = await req.json();
    const { optIn } = body;

    const now = new Date();

    await db
      .update(users)
      .set({
        newsletterOptIn: !!optIn,
        newsletterOptInAt: optIn ? now : null,
        updatedAt: now,
      })
      .where(eq(users.walletAddress, walletAddress));

    if (optIn) {
      const user = await db.query.users.findFirst({
        where: eq(users.walletAddress, walletAddress),
      });

      if (user) {
        // Get an org to associate the contact with
        const org = await db.query.organizations.findFirst();
        const orgId = org?.id ?? process.env.DEFAULT_ORG_ID ?? "00000000-0000-0000-0000-000000000000";

        const existingContact = await db.query.contacts.findFirst({
          where: eq(contacts.email, user.email),
        });

        if (existingContact) {
          await db
            .update(contacts)
            .set({
              firstName: user.firstName,
              lastName: user.lastName,
              walletAddress,
              source: "frontier-wallet",
              updatedAt: now,
            })
            .where(eq(contacts.id, existingContact.id));
        } else {
          await db.insert(contacts).values({
            orgId,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            walletAddress,
            source: "frontier-wallet",
          });
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Newsletter opt-in error:", error);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
