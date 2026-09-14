"use client";

import React from "react";
import { X, Layers, Copy, Check } from "lucide-react";
import { ScanResponse } from "../types/scanner";

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
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="glass-panel w-full max-w-2xl rounded-2xl border border-white/10 overflow-hidden flex flex-col max-h-[85vh] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4 bg-white/[0.02]">
          <div className="flex items-center gap-2.5">
            <Layers className="h-5 w-5 text-orange-400" />
            <div>
              <h3 id="raw-ocr-title" className="text-base font-bold text-white">
                Raw PaddleOCR Text Extraction
              </h3>
              <p className="text-xs text-gray-400">
                {scan.ocr_line_count} text lines detected at threshold
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close raw OCR modal"
            className="rounded-lg p-1.5 text-gray-400 hover:bg-white/10 hover:text-white transition"
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
                className="flex items-center justify-between rounded-lg border border-white/5 bg-black/40 px-3.5 py-2 font-mono text-xs hover:border-white/10 transition"
              >
                <div className="flex items-center gap-3">
                  <span className="text-gray-600 font-bold w-6 text-right">
                    {idx + 1}
                  </span>
                  <span className="text-gray-200">"{item.text}"</span>
                </div>
                <span className="rounded bg-white/5 px-2 py-0.5 text-[11px] text-amber-400 shrink-0 font-bold">
                  {(item.confidence * 100).toFixed(0)}%
                </span>
              </div>
            ))
          ) : (
            scan.ocr_lines.map((line, idx) => (
              <div
                key={idx}
                className="flex items-center gap-3 rounded-lg border border-white/5 bg-black/40 px-3.5 py-2 font-mono text-xs text-gray-200"
              >
                <span className="text-gray-600 font-bold w-6 text-right">{idx + 1}</span>
                <span>"{line}"</span>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-white/10 px-6 py-3 bg-black/30 flex items-center justify-between">
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-gray-300 hover:bg-white/10 transition"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            <span>{copied ? "Copied" : "Copy All Lines"}</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-white/10 px-4 py-1.5 text-xs font-semibold text-white hover:bg-white/20 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
