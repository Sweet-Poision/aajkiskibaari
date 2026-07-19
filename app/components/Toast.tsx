"use client";

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from "react";

// ─── Types ────────────────────────────────────────
type ToastType = "success" | "error" | "info";

interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
  exiting?: boolean;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void;
}

// ─── Context ──────────────────────────────────────
const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider>");
  return ctx;
}

// ─── Provider ─────────────────────────────────────
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const counterRef = useRef(0);

  const toast = useCallback((message: string, type: ToastType = "info") => {
    const id = `toast-${++counterRef.current}`;
    setToasts((prev) => [...prev, { id, message, type }]);

    // Begin exit animation after 3.5s
    setTimeout(() => {
      setToasts((prev) =>
        prev.map((t) => (t.id === id ? { ...t, exiting: true } : t))
      );
    }, 3500);

    // Remove from DOM after exit animation completes
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <ToastContainer toasts={toasts} />
    </ToastContext.Provider>
  );
}

// ─── Toast Container (pinned bottom-right) ────────
function ToastContainer({ toasts }: { toasts: ToastItem[] }) {
  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-6 right-6 z-[100] flex flex-col-reverse gap-3 pointer-events-none"
      style={{ maxWidth: "380px" }}
    >
      {toasts.map((t) => (
        <ToastNote key={t.id} item={t} />
      ))}
    </div>
  );
}

// ─── Individual Toast — styled as a sticky note ───
function ToastNote({ item }: { item: ToastItem }) {
  const ledClass =
    item.type === "success"
      ? "led-indicator-green"
      : item.type === "error"
        ? "led-indicator-red"
        : "";

  return (
    <div
      className={`toast-note pointer-events-auto ${item.exiting ? "toast-exit" : "toast-enter"}`}
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <span className={`led-indicator ${ledClass} flex-shrink-0 mt-0.5`} />
        <p className="text-[11px] font-bold text-zinc-700 leading-relaxed">
          {item.message}
        </p>
      </div>
    </div>
  );
}
