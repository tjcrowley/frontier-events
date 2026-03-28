import Link from "next/link";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";

const secret = new TextEncoder().encode(process.env.JWT_SECRET);

async function getUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get("frontier_token")?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, secret);
    return {
      firstName: payload.firstName as string | null,
      role: payload.role as string,
    };
  } catch {
    return null;
  }
}

export async function NavBar() {
  const user = await getUser();

  return (
    <header className="border-b border-slate-800">
      <div className="mx-auto max-w-5xl px-4 py-4 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold text-white">
          Frontier Events
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          {user ? (
            <>
              <span className="text-slate-300">
                {user.firstName || "Account"}
              </span>
              <Link
                href="/account"
                className="text-slate-400 hover:text-white transition-colors"
              >
                Account
              </Link>
              {user.role === "admin" && (
                <Link
                  href="/admin"
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  Admin
                </Link>
              )}
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="text-slate-400 hover:text-white transition-colors"
              >
                Log In
              </Link>
              <Link
                href="/signup"
                className="rounded-lg bg-indigo-600 px-3 py-1.5 font-medium text-white hover:bg-indigo-500 transition-colors"
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
