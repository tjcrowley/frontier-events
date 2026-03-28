"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

interface FrontierContextValue {
  userId: string | null;
  walletAddress: string | null;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  role: string | null;
  communities: string[];
  subscriptionStatus: string | null;
  newsletterOptIn: boolean;
  isAdmin: boolean;
  isHost: boolean;
  isLoading: boolean;
  sdk: unknown | null;
  showNewsletterModal: boolean;
  setShowNewsletterModal: (v: boolean) => void;
  setNewsletterOptIn: (v: boolean) => void;
}

const FrontierContext = createContext<FrontierContextValue>({
  userId: null,
  walletAddress: null,
  email: null,
  firstName: null,
  lastName: null,
  role: null,
  communities: [],
  subscriptionStatus: null,
  newsletterOptIn: false,
  isAdmin: false,
  isHost: false,
  isLoading: true,
  sdk: null,
  showNewsletterModal: false,
  setShowNewsletterModal: () => {},
  setNewsletterOptIn: () => {},
});

export function useFrontier() {
  return useContext(FrontierContext);
}

/** Decode a JWT payload without verification (client-side display only). */
function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
    // Check expiration
    if (payload.exp && payload.exp * 1000 < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export function AuthGuard({
  requiredRole,
  children,
}: {
  requiredRole?: "admin" | "host";
  children: ReactNode;
}) {
  const { isAdmin, isHost, isLoading, userId } = useFrontier();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-pulse text-slate-400">Loading...</div>
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl font-semibold text-white mb-2">Sign In Required</p>
          <p className="text-slate-400 mb-4">Please sign in to access this page.</p>
          <a
            href="/login"
            className="inline-block rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors"
          >
            Sign In
          </a>
        </div>
      </div>
    );
  }

  if (requiredRole === "admin" && !isAdmin) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl font-semibold text-white mb-2">Access Denied</p>
          <p className="text-slate-400">Admin access required.</p>
        </div>
      </div>
    );
  }

  if (requiredRole === "host" && !isHost && !isAdmin) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl font-semibold text-white mb-2">Access Denied</p>
          <p className="text-slate-400">Host access required.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export function FrontierProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{
    userId: string | null;
    walletAddress: string | null;
    email: string | null;
    firstName: string | null;
    lastName: string | null;
    role: string | null;
    communities: string[];
    subscriptionStatus: string | null;
    newsletterOptIn: boolean;
    isLoading: boolean;
    sdk: unknown | null;
    showNewsletterModal: boolean;
  }>({
    userId: null,
    walletAddress: null,
    email: null,
    firstName: null,
    lastName: null,
    role: null,
    communities: [],
    subscriptionStatus: null,
    newsletterOptIn: false,
    isLoading: true,
    sdk: null,
    showNewsletterModal: false,
  });

  useEffect(() => {
    async function init() {
      try {
        const { isInFrontierApp, FrontierSDK } = await import(
          "@frontiertower/frontier-sdk"
        );

        if (isInFrontierApp()) {
          // ── Frontier wallet flow ──
          const sdk = new FrontierSDK();

          const [accessControls, profile, address] = await Promise.all([
            sdk.getUser().getVerifiedAccessControls(),
            sdk.getUser().getProfile(),
            sdk.getWallet().getAddress(),
          ]);

          const res = await fetch("/api/auth/frontier", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              verifiedAccessPayload: accessControls,
              walletAddress: address,
              profile: {
                firstName: profile.firstName,
                lastName: profile.lastName,
                avatarUrl: profile.profilePicture,
              },
            }),
          });

          if (!res.ok) {
            console.error("Auth failed:", await res.text());
            setState((s) => ({ ...s, isLoading: false }));
            return;
          }

          const data = await res.json();

          // Store JWT
          sessionStorage.setItem("frontier_token", data.token);
          document.cookie = `frontier_token=${data.token}; path=/; max-age=86400; SameSite=Lax`;

          setState({
            userId: data.user.id,
            walletAddress: data.user.walletAddress,
            email: data.user.email,
            firstName: data.user.firstName,
            lastName: data.user.lastName,
            role: data.user.role,
            communities: accessControls.communities ?? [],
            subscriptionStatus: accessControls.subscriptionStatus ?? null,
            newsletterOptIn: data.user.newsletterOptIn,
            isLoading: false,
            sdk,
            showNewsletterModal: data.isNewUser,
          });
          return;
        }
      } catch (error) {
        // Frontier SDK not available — continue to JWT check
        console.debug("Frontier SDK not available:", error);
      }

      // ── Non-Frontier flow: try existing JWT ──
      const token = sessionStorage.getItem("frontier_token");
      if (token) {
        const payload = decodeJwtPayload(token);
        if (payload) {
          setState({
            userId: (payload.sub as string) ?? null,
            walletAddress: (payload.walletAddress as string) ?? null,
            email: (payload.email as string) ?? null,
            firstName: (payload.firstName as string) ?? null,
            lastName: (payload.lastName as string) ?? null,
            role: (payload.role as string) ?? null,
            communities: (payload.communities as string[]) ?? [],
            subscriptionStatus: (payload.subscriptionStatus as string) ?? null,
            newsletterOptIn: false,
            isLoading: false,
            sdk: null,
            showNewsletterModal: false,
          });
          return;
        }
        // Token expired or invalid — clear it
        sessionStorage.removeItem("frontier_token");
        document.cookie = "frontier_token=; path=/; max-age=0";
      }

      // ── Anonymous visitor ──
      setState((s) => ({ ...s, isLoading: false }));
    }

    init();
  }, []);

  const isAdmin = state.role === "admin";
  const isHost = state.role === "host" || isAdmin;

  return (
    <FrontierContext.Provider
      value={{
        userId: state.userId,
        walletAddress: state.walletAddress,
        email: state.email,
        firstName: state.firstName,
        lastName: state.lastName,
        role: state.role,
        communities: state.communities,
        subscriptionStatus: state.subscriptionStatus,
        newsletterOptIn: state.newsletterOptIn,
        isAdmin,
        isHost,
        isLoading: state.isLoading,
        sdk: state.sdk,
        showNewsletterModal: state.showNewsletterModal,
        setShowNewsletterModal: (v) =>
          setState((s) => ({ ...s, showNewsletterModal: v })),
        setNewsletterOptIn: (v) =>
          setState((s) => ({ ...s, newsletterOptIn: v })),
      }}
    >
      {children}
    </FrontierContext.Provider>
  );
}
