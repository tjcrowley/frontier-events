import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const secret = new TextEncoder().encode(process.env.JWT_SECRET);

interface JWTPayload {
  sub: string; // userId
  walletAddress: string | null;
  email: string;
  role: string;
  communities: string[];
  subscriptionStatus: string | null;
}

async function getPayload(req: NextRequest): Promise<JWTPayload | null> {
  const authHeader = req.headers.get("authorization");
  let token: string | undefined;

  if (authHeader?.startsWith("Bearer ")) {
    token = authHeader.slice(7);
  } else {
    token = req.cookies.get("frontier_token")?.value;
  }

  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as unknown as JWTPayload;
  } catch {
    return null;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isApiRoute = pathname.startsWith("/api/");
  const payload = await getPayload(req);

  // Admin routes
  if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
    if (!payload) {
      if (isApiRoute) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      return NextResponse.redirect(new URL("/login", req.url));
    }
    if (payload.role !== "admin") {
      if (isApiRoute) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      return NextResponse.redirect(new URL("/login", req.url));
    }
  }

  // Scanner and check-in routes: host or admin
  if (pathname === "/scanner" || pathname.startsWith("/api/check-in")) {
    if (!payload) {
      if (isApiRoute) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      return NextResponse.redirect(new URL("/login", req.url));
    }
    if (payload.role !== "admin" && payload.role !== "host") {
      if (isApiRoute) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      return NextResponse.redirect(new URL("/login", req.url));
    }
  }

  // Account route: any auth
  if (pathname === "/account") {
    if (!payload) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
  }

  // Pass user info via headers for downstream use
  if (payload) {
    const response = NextResponse.next();
    response.headers.set("x-user-id", payload.sub);
    response.headers.set("x-wallet-address", payload.walletAddress ?? "");
    response.headers.set("x-user-role", payload.role);
    response.headers.set("x-user-email", payload.email);
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/scanner", "/account", "/api/admin/:path*", "/api/check-in/:path*"],
};
