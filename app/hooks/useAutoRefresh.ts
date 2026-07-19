"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function useAutoRefresh(intervalMs: number = 30000) {
  const router = useRouter();

  useEffect(() => {
    // Only refresh when the window is focused
    let interval: NodeJS.Timeout;

    const startInterval = () => {
      interval = setInterval(() => {
        if (document.visibilityState === "visible") {
          router.refresh();
        }
      }, intervalMs);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        router.refresh(); // Refresh immediately when returning to tab
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    startInterval();

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [router, intervalMs]);
}
