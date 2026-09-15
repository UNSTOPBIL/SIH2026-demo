"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { CheckCircle2, Info, AlertTriangle, X } from "lucide-react";

export type ToastType = "success" | "info" | "warning" | "error";

export interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

export interface ToastProps {
  message: string | null;
  type?: ToastType;
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({
  message,
  type = "success",
  onClose,
}) => {
  const [queue, setQueue] = useState<ToastItem[]>([]);
  const [activeToast, setActiveToast] = useState<ToastItem | null>(null);
  const [isExiting, setIsExiting] = useState(false);
  const nextIdRef = useRef(1);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // When a new message prop arrives from parent
  useEffect(() => {
    if (!message) return;

    const newItem: ToastItem = {
      id: nextIdRef.current++,
      message,
      type,
    };

    setQueue((prev) => {
      // Avoid duplicate consecutive messages
      if (prev.length > 0 && prev[prev.length - 1].message === message) {
        return prev;
      }
      return [...prev, newItem];
    });
  }, [message, type]);

  // Advance queue when activeToast is clear and queue has items
  useEffect(() => {
    if (!activeToast && !isExiting && queue.length > 0) {
      const nextItem = queue[0];
      setActiveToast(nextItem);
      setQueue((prev) => prev.slice(1));
    }
  }, [activeToast, isExiting, queue]);

  // Dismiss active toast with exit transition
  const dismissActiveToast = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setIsExiting(true);
    setTimeout(() => {
      setIsExiting(false);
      setActiveToast(null);
    }, 200);
  }, []);

  // When activeToast is active, set display timer
  useEffect(() => {
    if (!activeToast || isExiting) return;

    timerRef.current = setTimeout(() => {
      dismissActiveToast();
    }, 3200);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [activeToast, isExiting, dismissActiveToast]);

  // Notify parent once entire queue is drained
  useEffect(() => {
    if (!activeToast && !isExiting && queue.length === 0 && message) {
      onClose();
    }
  }, [activeToast, isExiting, queue.length, message, onClose]);

  const handleManualDismiss = () => {
    dismissActiveToast();
  };

  if (!activeToast) return null;

  const typeStyles: Record<ToastType, string> = {
    success:
      "border-emerald-500/40 bg-emerald-950/90 text-emerald-200 shadow-[0_0_25px_rgba(16,185,129,0.25)] dark:border-emerald-500/40 dark:bg-emerald-950/90 dark:text-emerald-200 light:border-emerald-300 light:bg-white light:text-emerald-950 light:shadow-emerald-950/10",
    info:
      "border-amber-500/40 bg-amber-950/90 text-amber-200 shadow-[0_0_25px_rgba(245,158,11,0.25)] dark:border-amber-500/40 dark:bg-amber-950/90 dark:text-amber-200 light:border-amber-300 light:bg-white light:text-amber-950 light:shadow-amber-950/10",
    warning:
      "border-orange-500/40 bg-orange-950/90 text-orange-200 shadow-[0_0_25px_rgba(249,115,22,0.25)] dark:border-orange-500/40 dark:bg-orange-950/90 dark:text-orange-200 light:border-orange-300 light:bg-white light:text-orange-950 light:shadow-orange-950/10",
    error:
      "border-rose-500/40 bg-rose-950/90 text-rose-200 shadow-[0_0_25px_rgba(244,63,94,0.25)] dark:border-rose-500/40 dark:bg-rose-950/90 dark:text-rose-200 light:border-rose-300 light:bg-white light:text-rose-950 light:shadow-rose-950/10",
  };

  const IconComponent = {
    success: CheckCircle2,
    info: Info,
    warning: AlertTriangle,
    error: AlertTriangle,
  }[activeToast.type];

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed bottom-6 left-4 right-4 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 z-50 sm:max-w-md sm:w-auto pointer-events-auto transition-all ${
        isExiting ? "animate-toast-exit" : "animate-toast"
      }`}
    >
      <div
        className={`flex flex-col rounded-2xl border backdrop-blur-xl font-medium text-xs sm:text-sm overflow-hidden shadow-2xl transition-colors duration-200 ${
          typeStyles[activeToast.type]
        }`}
      >
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3 overflow-hidden">
            <IconComponent className="h-4 w-4 shrink-0" />
            <span className="leading-snug truncate sm:whitespace-normal">
              {activeToast.message}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0 ml-2">
            {queue.length > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30 light:bg-amber-100 light:text-amber-800 light:border-amber-300">
                +{queue.length} in queue
              </span>
            )}
            <button
              type="button"
              onClick={handleManualDismiss}
              aria-label="Dismiss notification"
              className="rounded-lg p-1 text-gray-400 hover:text-white dark:hover:text-white light:text-slate-500 light:hover:text-slate-900 transition"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Real-time countdown timer indicator */}
        <div className="w-full h-[2px] bg-black/20 dark:bg-white/10 light:bg-slate-200 overflow-hidden">
          <div className="h-full bg-current opacity-70 animate-toast-timer" />
        </div>
      </div>
    </div>
  );
};
