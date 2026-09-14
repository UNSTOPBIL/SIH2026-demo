"use client";

import React, { useEffect } from "react";
import { CheckCircle2, Info, AlertTriangle, X } from "lucide-react";

export interface ToastProps {
  message: string | null;
  type?: "success" | "info" | "warning" | "error";
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({
  message,
  type = "success",
  onClose,
}) => {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => {
      onClose();
    }, 3200);
    return () => clearTimeout(timer);
  }, [message, onClose]);

  if (!message) return null;

  const typeStyles = {
    success: "border-emerald-500/40 bg-emerald-950/80 text-emerald-200 shadow-[0_0_25px_rgba(16,185,129,0.25)]",
    info: "border-amber-500/40 bg-amber-950/80 text-amber-200 shadow-[0_0_25px_rgba(245,158,11,0.25)]",
    warning: "border-orange-500/40 bg-orange-950/80 text-orange-200 shadow-[0_0_25px_rgba(249,115,22,0.25)]",
    error: "border-rose-500/40 bg-rose-950/80 text-rose-200 shadow-[0_0_25px_rgba(244,63,94,0.25)]",
  };

  const IconComponent = {
    success: CheckCircle2,
    info: Info,
    warning: AlertTriangle,
    error: AlertTriangle,
  }[type];

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-toast max-w-md w-auto pointer-events-auto"
    >
      <div
        className={`flex items-center gap-3 rounded-2xl border px-4 py-3 backdrop-blur-xl font-medium text-xs sm:text-sm ${typeStyles[type]}`}
      >
        <IconComponent className="h-4 w-4 shrink-0" />
        <span className="leading-snug">{message}</span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Dismiss notification"
          className="ml-2 rounded-lg p-1 text-gray-400 hover:text-white transition"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};
