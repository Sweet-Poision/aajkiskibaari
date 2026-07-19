"use client";

import React, { useEffect, useCallback } from "react";

interface ConfirmModalProps {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning";
  onConfirm: () => void;
  onCancel: () => void;
  isPending?: boolean;
}

export default function ConfirmModal({
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "danger",
  onConfirm,
  onCancel,
  isPending = false,
}: ConfirmModalProps) {
  // Escape to close
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    },
    [onCancel]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // Backdrop click
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onCancel();
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div className="machine-casing w-full max-w-sm p-8 rounded-2xl shadow-2xl">
        {/* Warning indicator strip */}
        <div className="flex items-center gap-3 mb-5">
          <span
            className={`led-indicator ${variant === "danger" ? "led-indicator-red" : "led-indicator-green"}`}
          />
          <h2 className="text-lg font-black text-zinc-800 uppercase tracking-tight drop-shadow-sm">
            {title}
          </h2>
        </div>

        <p className="text-sm text-zinc-600 mb-8 font-bold leading-relaxed">
          {message}
        </p>

        <div className="flex gap-4">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 skeuo-button py-3.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            className={`flex-1 py-3.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all disabled:opacity-50 cursor-pointer ${
              variant === "danger"
                ? "skeuo-button-danger"
                : "skeuo-button-primary"
            }`}
          >
            {isPending ? "Working..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
