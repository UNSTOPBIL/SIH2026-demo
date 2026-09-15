"use client";

import React, { useState } from "react";
import { X, Layers, Copy, Check } from "lucide-react";
import { ScanResponse } from "../types/scanner";
import { FocusTrap } from "./FocusTrap";

interface RawOcrModalProps {
  isOpen: boolean;
  onClose: () => void;
  scan: ScanResponse | null;
}

export const RawOcrModal: React.FC<RawOcrModalProps> = ({
  isOpen,
  onClose,
  scan,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !scan) return null;

  const handleCopy = () => {
    const text = scan.ocr_lines.join("\n");
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="raw-ocr-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <FocusTrap onEscape={onClose} className="w-full sm:max-w-2xl flex justify-center">
        <div
          className="glass-panel w-full sm:max-w-2xl rounded-t-3xl sm:rounded-2xl border border-white/10 dark:border-white/10 light:border-slate-200 overflow-hidden flex flex-col max-h-[88vh] sm:max-h-[85vh] shadow-2xl animate-sheet-up sm:animate-in sm:zoom-in-95"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Mobile Sheet Grab Handle */}
          <div className="w-10 h-1 rounded-full bg-white/20 dark:bg-white/20 light:bg-slate-300 mx-auto mt-2.5 mb-1 sm:hidden shrink-0" />

          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 dark:border-white/10 light:border-slate-200 px-6 py-4 bg-white/[0.02] dark:bg-white/[0.02] light:bg-slate-50 shrink-0">
            <div className="flex items-center gap-2.5">
              <Layers className="h-5 w-5 text-orange-400" />
              <div>
                <h3 id="raw-ocr-title" className="text-base font-bold text-white dark:text-white light:text-slate-900">
                  Raw PaddleOCR Text Extraction
                </h3>
                <p className="text-xs text-gray-400 dark:text-gray-400 light:text-slate-500">
                  {scan.ocr_line_count} text lines detected at threshold
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close raw OCR modal"
              className="rounded-lg p-1.5 text-gray-400 hover:bg-white/10 dark:hover:bg-white/10 light:hover:bg-slate-200 hover:text-white dark:hover:text-white light:hover:text-slate-900 transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-2">
            {scan.ocr_details && scan.ocr_details.length > 0 ? (
              scan.ocr_details.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between rounded-lg border border-white/5 dark:border-white/5 light:border-slate-200/90 bg-black/40 dark:bg-black/40 light:bg-white light:shadow-xs px-3.5 py-2 font-mono text-xs hover:border-white/10 dark:hover:border-white/10 light:hover:border-slate-300 transition"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-gray-600 dark:text-gray-600 light:text-slate-400 font-bold w-6 text-right">
                      {idx + 1}
                    </span>
                    <span className="text-gray-200 dark:text-gray-200 light:text-slate-900 font-medium">&quot;{item.text}&quot;</span>
                  </div>
                  <span className="rounded bg-white/5 dark:bg-white/5 light:bg-amber-100 px-2 py-0.5 text-[11px] text-amber-400 dark:text-amber-400 light:text-amber-900 shrink-0 font-bold">
                    {(item.confidence * 100).toFixed(0)}%
                  </span>
                </div>
              ))
            ) : (
              scan.ocr_lines.map((line, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-3 rounded-lg border border-white/5 dark:border-white/5 light:border-slate-200/90 bg-black/40 dark:bg-black/40 light:bg-white light:shadow-xs px-3.5 py-2 font-mono text-xs text-gray-200 dark:text-gray-200 light:text-slate-900"
                >
                  <span className="text-gray-600 dark:text-gray-600 light:text-slate-400 font-bold w-6 text-right">{idx + 1}</span>
                  <span>&quot;{line}&quot;</span>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-white/10 dark:border-white/10 light:border-slate-200 px-6 py-3 bg-black/30 dark:bg-black/30 light:bg-slate-50 flex items-center justify-between shrink-0">
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-1.5 rounded-xl border border-white/10 dark:border-white/10 light:border-slate-200 bg-white/5 dark:bg-white/5 light:bg-white light:shadow-xs px-3 py-1.5 text-xs font-semibold text-gray-300 dark:text-gray-300 light:text-slate-700 hover:bg-white/10 dark:hover:bg-white/10 light:hover:bg-slate-50 transition active:scale-95"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-400 light:text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copied ? "Copied" : "Copy All Lines"}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-white/10 dark:bg-white/10 light:bg-slate-900 px-4 py-1.5 text-xs font-semibold text-white hover:bg-white/20 dark:hover:bg-white/20 light:hover:bg-slate-800 transition active:scale-95"
            >
              Close
            </button>
          </div>
        </div>
      </FocusTrap>
    </div>
  );
};
