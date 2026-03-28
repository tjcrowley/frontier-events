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
    const { email, password, firstName, lastName, newsletterOptIn } = body;

    // Validate email
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: "Invalid email address" },
        { status: 400 }
      );
    }

    // Validate password
    if (!password || password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    // Check if email already taken
    const existing = await db.query.users.findFirst({
      where: eq(users.email, email.toLowerCase()),
    });

    if (existing) {
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 409 }
      );
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    const now = new Date();

    // Insert user
    const [user] = await db
      .insert(users)
      .values({
        email: email.toLowerCase(),
        firstName: firstName || null,
        lastName: lastName || null,
        passwordHash,
        authProvider: "email",
        role: "member",
        newsletterOptIn: !!newsletterOptIn,
        newsletterOptInAt: newsletterOptIn ? now : null,
        lastSeenAt: now,
      })
      .returning();

    // Issue JWT (24h)
    const token = await new SignJWT({
      walletAddress: null,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      communities: [],
      subscriptionStatus: null,
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
    console.error("Email signup error:", error);
    return NextResponse.json(
      { error: "Signup failed" },
      { status: 500 }
    );
  }
}
