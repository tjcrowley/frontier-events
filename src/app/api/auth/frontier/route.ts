import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { SignJWT } from "jose";

const secret = new TextEncoder().encode(process.env.JWT_SECRET);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { verifiedAccessPayload, walletAddress, profile } = body;

    if (!verifiedAccessPayload || !walletAddress) {
      return NextResponse.json(
        { error: "Missing verifiedAccessPayload or walletAddress" },
        { status: 400 }
      );
    }

    const {
      email,
      subscriptionPlan,
      subscriptionStatus,
      communities,
    } = verifiedAccessPayload;

    if (!email) {
      return NextResponse.json(
        { error: "Missing email in access payload" },
        { status: 400 }
      );
    }

    // Determine role
    let role: "admin" | "member" = subscriptionPlan === "network-society" ? "admin" : "member";

    // Seed admin override
    const seedAdmin = process.env.SEED_ADMIN_WALLET;
    if (seedAdmin && walletAddress.toLowerCase() === seedAdmin.toLowerCase()) {
      role = "admin";
    }

    // Check if user exists
    const existing = await db.query.users.findFirst({
      where: eq(users.walletAddress, walletAddress),
    });

    const isNewUser = !existing;
    const now = new Date();

    if (existing) {
      await db
        .update(users)
        .set({
          email,
          firstName: profile?.firstName ?? existing.firstName,
          lastName: profile?.lastName ?? existing.lastName,
          avatarUrl: profile?.avatarUrl ?? existing.avatarUrl,
          subscriptionPlan: subscriptionPlan ?? null,
          subscriptionStatus: subscriptionStatus ?? null,
          communities: communities ?? [],
          role,
          lastSeenAt: now,
          updatedAt: now,
        })
        .where(eq(users.walletAddress, walletAddress));
    } else {
      await db.insert(users).values({
        walletAddress,
        email,
        firstName: profile?.firstName ?? null,
        lastName: profile?.lastName ?? null,
        avatarUrl: profile?.avatarUrl ?? null,
        subscriptionPlan: subscriptionPlan ?? null,
        subscriptionStatus: subscriptionStatus ?? null,
        communities: communities ?? [],
        role,
        lastSeenAt: now,
      });
    }

    // Fetch the final user state
    const user = await db.query.users.findFirst({
      where: eq(users.walletAddress, walletAddress),
    });

    // Issue JWT (24h)
    const token = await new SignJWT({
      walletAddress,
      email,
      role,
      communities: communities ?? [],
      subscriptionStatus: subscriptionStatus ?? null,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("24h")
      .sign(secret);

    return NextResponse.json({
      token,
      isNewUser,
      user: {
        walletAddress: user!.walletAddress,
        email: user!.email,
        firstName: user!.firstName,
        lastName: user!.lastName,
        role: user!.role,
        newsletterOptIn: user!.newsletterOptIn,
      },
    });
  } catch (error) {
    console.error("Frontier auth error:", error);
    return NextResponse.json(
      { error: "Authentication failed" },
      { status: 500 }
    );
  }
}
