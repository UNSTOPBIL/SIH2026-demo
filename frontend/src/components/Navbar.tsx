"use client";

import React from "react";
import { ShieldCheck, Activity, FileJson, Scale, Layers } from "lucide-react";
import { ScanResponse } from "../types/scanner";

interface NavbarProps {
  currentScan: ScanResponse | null;
  onOpenRules: () => void;
  onOpenRawOcr: () => void;
  onExportSuccess?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentScan,
  onOpenRules,
  onOpenRawOcr,
  onExportSuccess,
}) => {
  const handleExportJson = () => {
    if (!currentScan) return;
    const blob = new Blob([JSON.stringify(currentScan, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `legal_metrology_audit_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    onExportSuccess?.();
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/[0.08] bg-[#08090d]/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        {/* Brand Identity */}
        <div className="flex items-center gap-3">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/20 via-orange-500/10 to-transparent border border-amber-500/30 shadow-[0_0_20px_rgba(245,158,11,0.2)]">
            <Scale className="h-5 w-5 text-amber-400" />
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold tracking-widest text-amber-500 uppercase">
                SIH 2026 // AGENTIC AUDIT
              </span>
              <span className="rounded bg-white/10 px-1.5 py-0.5 text-[11px] font-medium text-gray-300">
                v1.0.0
              </span>
            </div>
            <h1 className="text-base font-semibold tracking-tight text-white sm:text-lg">
              Legal Metrology Rule 6 Compliance Engine
            </h1>
          </div>
        </div>

        {/* Telemetry & Global Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Telemetry pill */}
          <div className="hidden lg:flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-1.5 text-xs text-gray-300">
            <span className="flex items-center gap-1.5 font-mono text-[11px] text-emerald-400">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
              PP-OCRv4 CPU
            </span>
            <span className="text-gray-600">|</span>
            <span className="font-mono text-[11px] text-gray-400">
              7 Guardrails
            </span>
            <span className="text-gray-600">|</span>
            <span className="font-mono text-[11px] text-amber-400">
              {currentScan ? `${(currentScan.latency_seconds * 1000).toFixed(0)}ms latency` : "Ready"}
            </span>
          </div>

          {/* Rule Inspector Button */}
          <button
            onClick={onOpenRules}
            type="button"
            className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-gray-300 transition hover:bg-white/[0.08] hover:text-white hover:border-white/20"
          >
            <ShieldCheck className="h-3.5 w-3.5 text-amber-400" />
            <span className="hidden sm:inline">Statutory Rules</span>
          </button>

          {/* Raw OCR Button */}
          <button
            onClick={onOpenRawOcr}
            disabled={!currentScan}
            type="button"
            className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-gray-300 transition hover:bg-white/[0.08] hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Layers className="h-3.5 w-3.5 text-orange-400" />
            <span className="hidden sm:inline">Raw OCR</span>
          </button>

          {/* JSON Export */}
          <button
            onClick={handleExportJson}
            disabled={!currentScan}
            type="button"
            className="flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-300 transition hover:bg-amber-500/20 hover:border-amber-500/50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <FileJson className="h-3.5 w-3.5" />
            <span>Export JSON</span>
          </button>
        </div>
      </div>
    </header>
  );
};
