import Image from "next/image";
import Link from "next/link";

export default function CitizensOnlyPage() {
  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center px-4">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute -top-48 left-1/2 -translate-x-1/2 w-[500px] h-[400px] rounded-full opacity-15 blur-3xl"
          style={{ background: "radial-gradient(ellipse, #764AE2, transparent 70%)" }}
        />
      </div>

      <div className="relative text-center max-w-md">
        <Link href="/">
          <Image
            src="/logo-white.svg"
            alt="Frontier Tower"
            width={140}
            height={25}
            className="mx-auto mb-10 opacity-70"
          />
        </Link>

        <div className="rounded-2xl border border-[#764AE2]/25 bg-[#764AE2]/8 p-8 mb-6">
          <div
            className="w-14 h-14 rounded-2xl mx-auto mb-5 flex items-center justify-center text-2xl"
            style={{ background: "linear-gradient(135deg, #938DEE22, #764AE244)" }}
          >
            🏛️
          </div>
          <h1 className="text-xl font-bold text-white mb-2">Citizens Only</h1>
          <p className="text-white/50 text-sm leading-relaxed">
            Creating events on Frontier requires an active Frontier Tower membership and wallet authentication via Frontier OS.
          </p>
        </div>

        <div className="space-y-3">
          <a
            href="https://os.frontiertower.io"
            className="block w-full rounded-xl px-4 py-3 font-semibold text-white text-sm transition-all"
            style={{ background: "linear-gradient(135deg, #938DEE, #764AE2)" }}
          >
            Open Frontier OS →
          </a>
          <Link
            href="/"
            className="block w-full rounded-xl border border-white/10 px-4 py-3 text-sm text-white/50 hover:text-white hover:border-white/20 transition-colors"
          >
            Back to Events
          </Link>
        </div>

        <p className="mt-6 text-xs text-white/25">
          Not a member yet?{" "}
          <a href="https://frontiertower.io" className="text-[#764AE2] hover:text-[#938DEE] transition-colors">
            Learn about Frontier Tower
          </a>
        </p>
      </div>
    </div>
  );
}
