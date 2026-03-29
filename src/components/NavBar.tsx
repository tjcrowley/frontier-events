import Link from "next/link";
import Image from "next/image";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";

const secret = new TextEncoder().encode(process.env.JWT_SECRET);

async function getUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get("frontier_token")?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, secret);
    const isCitizen =
      payload.authProvider === "frontier" &&
      payload.walletAddress != null &&
      payload.subscriptionStatus === "active";
    return {
      firstName: payload.firstName as string | null,
      role: payload.role as string,
      isCitizen: isCitizen || payload.role === "admin",
    };
  } catch {
    return null;
  }
}

export async function NavBar() {
  const user = await getUser();

  return (
    <header className="border-b border-white/8 bg-[#0A0A0A]/90 backdrop-blur-sm sticky top-0 z-50">
      <div className="mx-auto max-w-5xl px-4 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <Image
            src="/logo-white.svg"
            alt="Frontier Tower"
            width={120}
            height={21}
            priority
          />
          <span className="text-white/30 text-xs font-medium tracking-widest uppercase ml-1 hidden sm:block">
            Events
          </span>
        </Link>

        <nav className="flex items-center gap-1 text-sm">
          <Link
            href="/calendar"
            className="px-3 py-1.5 text-white/50 hover:text-white transition-colors rounded-lg hover:bg-white/5 text-sm"
          >
            Calendar
          </Link>
          {user ? (
            <>
              {user.isCitizen && (
                <Link
                  href="/events/new"
                  className="px-3 py-1.5 text-white/50 hover:text-white transition-colors rounded-lg hover:bg-white/5 text-sm hidden sm:block"
                >
                  + Host Event
                </Link>
              )}
              {user.role === "admin" && (
                <Link
                  href="/admin"
                  className="px-3 py-1.5 text-white/50 hover:text-white transition-colors rounded-lg hover:bg-white/5"
                >
                  Admin
                </Link>
              )}
              <Link
                href="/account"
                className="flex items-center gap-2 px-3 py-1.5 text-white/70 hover:text-white transition-colors rounded-lg hover:bg-white/5"
              >
                <span className="w-6 h-6 rounded-full bg-[#764AE2] flex items-center justify-center text-xs font-bold text-white shrink-0">
                  {(user.firstName?.[0] ?? "?").toUpperCase()}
                </span>
                <span className="hidden sm:block">{user.firstName ?? "Account"}</span>
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="px-3 py-1.5 text-white/60 hover:text-white transition-colors rounded-lg hover:bg-white/5"
              >
                Log In
              </Link>
              <Link
                href="/signup"
                className="px-4 py-1.5 rounded-lg font-medium text-white transition-all"
                style={{ background: "linear-gradient(135deg, #938DEE, #764AE2)" }}
              >
                Sign Up
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
