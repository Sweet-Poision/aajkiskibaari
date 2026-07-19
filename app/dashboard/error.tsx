"use client";

import { useEffect } from "react";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard Error:", error);
  }, [error]);

  return (
    <div className="flex h-[80vh] items-center justify-center p-4">
      <div className="machine-casing max-w-md w-full p-8 text-center border-t-4 border-t-red-600">
        <div className="flex justify-center mb-4">
          <span className="led-indicator led-indicator-red scale-150 animate-pulse" />
        </div>
        <h2 className="text-2xl font-black text-zinc-800 uppercase tracking-tight mb-2">
          System Malfunction
        </h2>
        <p className="text-sm text-zinc-600 font-bold mb-8">
          The dashboard encountered a mechanical error. Please try rebooting the module.
        </p>
        <button
          onClick={() => reset()}
          className="skeuo-button-primary w-full py-4 text-xs tracking-widest rounded-xl"
        >
          Reboot Dashboard
        </button>
      </div>
    </div>
  );
}
