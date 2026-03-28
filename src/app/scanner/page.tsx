"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import Link from "next/link";

interface ScanResult {
  valid: boolean;
  status: "valid" | "checked_in" | "invalid";
  attendeeName?: string;
  ticketType?: string;
  checkedInAt?: string;
  code?: string;
}

interface HeadCount {
  checkedIn: number;
  total: number;
}

export default function ScannerPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [headcount, setHeadcount] = useState<HeadCount>({ checkedIn: 0, total: 0 });
  const [error, setError] = useState("");
  const [lastScanned, setLastScanned] = useState("");
  const [checking, setChecking] = useState(false);
  const animFrameRef = useRef<number>(0);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: 640, height: 480 },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setScanning(true);
        setError("");
      }
    } catch {
      setError("Camera access denied. Please allow camera permissions.");
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach((t) => t.stop());
      videoRef.current.srcObject = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
    }
    setScanning(false);
  }, []);

  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  // QR scanning loop using jsQR
  useEffect(() => {
    if (!scanning) return;

    let jsQR: typeof import("jsqr").default | null = null;

    // Dynamically import jsQR
    import("jsqr").then((mod) => {
      jsQR = mod.default;
    });

    function scan() {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || !jsQR || video.readyState !== video.HAVE_ENOUGH_DATA) {
        animFrameRef.current = requestAnimationFrame(scan);
        return;
      }

      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, canvas.width, canvas.height);

      if (code?.data) {
        // Extract ticket code from URL or use raw value
        const match = code.data.match(/FT-[A-Z0-9]{6}/) || code.data.match(/\/tickets\/(FT-[A-Z0-9]{6})/);
        const ticketCode = match ? match[0].replace("/tickets/", "") : null;

        if (ticketCode && ticketCode !== lastScanned) {
          setLastScanned(ticketCode);
          validateTicket(ticketCode);
        }
      }

      animFrameRef.current = requestAnimationFrame(scan);
    }

    animFrameRef.current = requestAnimationFrame(scan);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [scanning, lastScanned]);

  async function validateTicket(code: string) {
    try {
      const res = await fetch(`/api/check-in/${code}`);
      const data = await res.json();
      setResult({ ...data, code });
      if (data.headcount) {
        setHeadcount(data.headcount);
      }
    } catch {
      setResult({ valid: false, status: "invalid", code });
    }
  }

  async function confirmCheckIn(code: string) {
    setChecking(true);
    try {
      const res = await fetch(`/api/check-in/${code}`, { method: "POST" });
      const data = await res.json();
      setResult({ ...data, code });
      if (data.headcount) {
        setHeadcount(data.headcount);
      }
    } catch {
      setError("Check-in failed");
    }
    setChecking(false);
  }

  function clearAndRescan() {
    setResult(null);
    setLastScanned("");
  }

  const resultBg =
    result?.status === "valid"
      ? "border-green-500 bg-green-900/30"
      : result?.status === "checked_in"
      ? "border-yellow-500 bg-yellow-900/30"
      : "border-red-500 bg-red-900/30";

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      <header className="border-b border-slate-800 px-4 py-3 flex items-center justify-between">
        <Link href="/" className="text-sm text-slate-400 hover:text-white transition-colors">
          &larr; Home
        </Link>
        <h1 className="font-semibold text-white">Check-In Scanner</h1>
        <div className="text-sm text-slate-400">
          <span className="font-mono font-bold text-white">{headcount.checkedIn}</span>
          {" / "}
          <span className="font-mono">{headcount.total}</span>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center p-4 gap-4">
        {error && (
          <div className="w-full max-w-sm rounded-lg bg-red-900/30 border border-red-500 p-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {/* Camera View */}
        <div className="relative w-full max-w-sm aspect-square bg-black rounded-lg overflow-hidden">
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            playsInline
            muted
          />
          <canvas ref={canvasRef} className="hidden" />
          {!scanning && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-800">
              <button
                onClick={startCamera}
                className="rounded-lg bg-indigo-600 px-6 py-3 font-semibold text-white hover:bg-indigo-500 transition-colors"
              >
                Start Scanner
              </button>
            </div>
          )}
          {scanning && !result && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="w-48 h-48 border-2 border-indigo-400 rounded-lg opacity-50" />
            </div>
          )}
        </div>

        {/* Scan Result */}
        {result && (
          <div className={`w-full max-w-sm rounded-lg border-2 p-4 ${resultBg}`}>
            {result.status === "valid" && (
              <>
                <p className="text-green-400 font-semibold text-lg mb-1">Valid Ticket</p>
                <p className="text-white font-medium">{result.attendeeName}</p>
                <p className="text-sm text-slate-300">{result.ticketType}</p>
                <p className="text-xs text-slate-400 font-mono mt-1">{result.code}</p>
                <button
                  onClick={() => confirmCheckIn(result.code!)}
                  disabled={checking}
                  className="mt-4 w-full rounded-lg bg-green-600 px-4 py-3 text-lg font-bold text-white hover:bg-green-500 disabled:opacity-50 transition-colors"
                >
                  {checking ? "Checking in..." : "Check In"}
                </button>
              </>
            )}

            {result.status === "checked_in" && (
              <>
                <p className="text-yellow-400 font-semibold text-lg mb-1">Already Checked In</p>
                <p className="text-white font-medium">{result.attendeeName}</p>
                <p className="text-sm text-slate-300">{result.ticketType}</p>
                {result.checkedInAt && (
                  <p className="text-xs text-slate-400 mt-1">
                    at {new Date(result.checkedInAt).toLocaleTimeString()}
                  </p>
                )}
              </>
            )}

            {result.status === "invalid" && (
              <p className="text-red-400 font-semibold text-lg">Invalid Ticket</p>
            )}

            <button
              onClick={clearAndRescan}
              className="mt-3 w-full rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 transition-colors"
            >
              Scan Next
            </button>
          </div>
        )}

        {scanning && (
          <button
            onClick={stopCamera}
            className="text-sm text-slate-500 hover:text-slate-300 transition-colors"
          >
            Stop Scanner
          </button>
        )}
      </main>
    </div>
  );
}
