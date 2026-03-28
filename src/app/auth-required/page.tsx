export default function AuthRequiredPage() {
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <h1 className="text-2xl font-bold text-white mb-4">
          Authentication Required
        </h1>
        <p className="text-slate-400 mb-6">
          Open in Frontier Wallet to continue.
        </p>
        <a
          href="https://os.frontiertower.io"
          className="inline-block rounded-lg px-6 py-3 font-semibold text-white transition-colors"
          style={{ backgroundColor: "#764AE2" }}
        >
          Open Frontier Wallet
        </a>
      </div>
    </div>
  );
}
