"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

interface FrontierContextValue {
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

export function AuthGuard({
  requiredRole,
  children,
}: {
  requiredRole?: "admin" | "host";
  children: ReactNode;
}) {
  const { isAdmin, isHost, isLoading, walletAddress } = useFrontier();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-pulse text-slate-400">Loading...</div>
      </div>
    );
  }

  if (!walletAddress) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl font-semibold text-white mb-2">Access Denied</p>
          <p className="text-slate-400">Please open in Frontier Wallet to continue.</p>
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
    notInFrontier: boolean;
  }>({
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
    notInFrontier: false,
  });

  useEffect(() => {
    async function init() {
      try {
        const { isInFrontierApp, FrontierSDK } = await import(
          "@frontiertower/frontier-sdk"
        );

        if (!isInFrontierApp()) {
          setState((s) => ({ ...s, isLoading: false, notInFrontier: true }));
          return;
        }

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
          notInFrontier: false,
        });
      } catch (error) {
        console.error("Frontier SDK init error:", error);
        setState((s) => ({ ...s, isLoading: false }));
      }
    }

    init();
  }, []);

  if (state.notInFrontier) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold text-white mb-4">Frontier Events</h1>
          <p className="text-slate-400 mb-6">
            Open in Frontier Wallet at{" "}
            <a
              href="https://os.frontiertower.io"
              className="text-[#764AE2] hover:underline"
            >
              os.frontiertower.io
            </a>
          </p>
        </div>
      </div>
    );
  }

  const isAdmin = state.role === "admin";
  const isHost = state.role === "host" || isAdmin;

  return (
    <FrontierContext.Provider
      value={{
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
