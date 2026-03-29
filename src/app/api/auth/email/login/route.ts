import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { SignJWT } from "jose";
import bcrypt from "bcryptjs";

const secret = new TextEncoder().encode(process.env.JWT_SECRET);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    // Look up user by email
    const user = await db.query.users.findFirst({
      where: eq(users.email, email.toLowerCase()),
    });

    if (!user || user.authProvider !== "email" || !user.passwordHash) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Verify password
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Update lastSeenAt
    const now = new Date();
    await db
      .update(users)
      .set({ lastSeenAt: now, updatedAt: now })
      .where(eq(users.id, user.id));

    // Issue JWT (24h)
    const token = await new SignJWT({
      walletAddress: null,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      communities: user.communities ?? [],
      subscriptionStatus: user.subscriptionStatus ?? null,
      authProvider: "email",
    })
      .setSubject(user.id)
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("24h")
      .sign(secret);

    return NextResponse.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        newsletterOptIn: user.newsletterOptIn,
      },
    });
  } catch (error) {
    console.error("Email login error:", error);
    return NextResponse.json(
      { error: "Login failed" },
      { status: 500 }
    );
  }
}
