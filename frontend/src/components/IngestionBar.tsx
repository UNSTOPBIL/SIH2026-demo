"use client";

import React, { useRef } from "react";
import { Upload, Sparkles, AlertTriangle, CheckCircle2, Sliders, RefreshCw, Camera, Zap, Shield, Ruler } from "lucide-react";

interface IngestionBarProps {
  onSelectPreset: (presetId: "compliant" | "violation") => void;
  onFileUpload: (file: File) => void;
  onCameraClick: () => void;
  activePreset: "compliant" | "violation" | "custom" | null;
  confidence: number;
  onConfidenceChange: (val: number) => void;
  packageWidthMm: number;
  onPackageWidthChange: (val: number) => void;
  isLoading: boolean;
  onRescan: () => void;
  onOpenVault: () => void;
  hasVaultData?: boolean;
  isPresetCached?: (presetId: "compliant" | "violation") => boolean;
}

export const IngestionBar: React.FC<IngestionBarProps> = ({
  onSelectPreset,
  onFileUpload,
  onCameraClick,
  activePreset,
  confidence,
  onConfidenceChange,
  packageWidthMm,
  onPackageWidthChange,
  isLoading,
  onRescan,
  onOpenVault,
  hasVaultData,
  isPresetCached,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onFileUpload(e.target.files[0]);
    }
  };

  const getConfidenceTier = (val: number) => {
    if (val >= 0.7) return { label: "Strict", color: "text-emerald-400" };
    if (val >= 0.45) return { label: "Optimal", color: "text-amber-400" };
    return { label: "Permissive", color: "text-orange-400" };
  };

  const tier = getConfidenceTier(confidence);

  return (
    <div className="glass-panel rounded-2xl p-4 sm:p-5 relative overflow-hidden">
      {/* Decorative ambient gradient inside the card */}
      <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-gradient-to-br from-amber-500/10 to-orange-500/5 blur-2xl" />

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        {/* Preset Selector Buttons */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <span className="text-xs font-mono font-medium text-gray-400 uppercase tracking-wider mr-1 flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-amber-400" />
            Demonstration Presets:
          </span>

          {/* Preset A: Compliant */}
          <button
            type="button"
            onClick={() => onSelectPreset("compliant")}
            disabled={isLoading}
            className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all relative ${
              activePreset === "compliant"
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.3)]"
                : "bg-white/[0.04] text-gray-300 border border-white/10 hover:bg-white/[0.08] hover:border-white/20"
            }`}
          >
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
            <span>Herbal Essence Tea</span>
            <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[11px] text-emerald-300 font-mono">
              100% PASS
            </span>
            {isPresetCached && isPresetCached("compliant") && (
              <span className="flex items-center text-[11px] font-mono text-emerald-400/80 gap-0.5 ml-0.5" title="Cached in memory: instantaneous switch">
                <Zap className="h-2.5 w-2.5" />
                <span className="hidden xl:inline">0ms</span>
              </span>
            )}
          </button>

          {/* Preset B: Violation */}
          <button
            type="button"
            onClick={() => onSelectPreset("violation")}
            disabled={isLoading}
            className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all relative ${
              activePreset === "violation"
                ? "bg-rose-500/20 text-rose-300 border border-rose-500/50 shadow-[0_0_20px_rgba(244,63,94,0.3)]"
                : "bg-white/[0.04] text-gray-300 border border-white/10 hover:bg-white/[0.08] hover:border-white/20"
            }`}
          >
            <AlertTriangle className="h-3.5 w-3.5 text-rose-400" />
            <span>Corn Puffs Snack</span>
            <span className="rounded bg-rose-500/20 px-1.5 py-0.5 text-[11px] text-rose-300 font-mono">
              VIOLATIONS
            </span>
            {isPresetCached && isPresetCached("violation") && (
              <span className="flex items-center text-[11px] font-mono text-rose-400/80 gap-0.5 ml-0.5" title="Cached in memory: instantaneous switch">
                <Zap className="h-2.5 w-2.5" />
                <span className="hidden xl:inline">0ms</span>
              </span>
            )}
          </button>
        </div>

        {/* Input Tools, Calibration & Evidence Vault */}
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
          {/* Hidden File Input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/png,image/jpeg,image/webp,image/jpg"
            className="hidden"
          />

          {/* Upload Button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-gray-200 transition hover:bg-white/[0.08] hover:border-white/20 active:scale-95 disabled:opacity-50"
          >
            <Upload className="h-3.5 w-3.5 text-orange-400" />
            <span>Upload</span>
          </button>

          {/* Camera Button */}
          <button
            type="button"
            onClick={onCameraClick}
            disabled={isLoading}
            className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-gray-200 transition hover:bg-white/[0.08] hover:border-white/20 active:scale-95 disabled:opacity-50"
            title="Scan from WebCam"
          >
            <Camera className="h-3.5 w-3.5 text-amber-400" />
            <span className="hidden sm:inline">Camera</span>
          </button>

          {/* Physical Width Calibration Input (Differentiator 1) */}
          <div 
            className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-black/40 px-2.5 py-1.5 text-xs text-gray-300"
            title="Known physical package width for millimeter font calculation (Legal Metrology Second Schedule)"
          >
            <Ruler className="h-3.5 w-3.5 text-cyan-400" />
            <span className="text-[11px] font-mono text-gray-400 hidden xl:inline">Calib:</span>
            <input
              type="number"
              min="20"
              max="500"
              step="5"
              value={packageWidthMm}
              onChange={(e) => onPackageWidthChange(parseFloat(e.target.value) || 100)}
              className="w-12 bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-xs font-mono text-cyan-300 text-center focus:outline-none focus:border-cyan-500"
            />
            <span className="text-[11px] font-mono text-cyan-400 font-bold">mm</span>
          </div>

          {/* Confidence Slider with Tier indicator */}
          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/40 px-2.5 py-1.5 text-xs text-gray-300">
            <Sliders className="h-3.5 w-3.5 text-gray-400" />
            <input
              type="range"
              min="0.10"
              max="0.95"
              step="0.05"
              value={confidence}
              onChange={(e) => onConfidenceChange(parseFloat(e.target.value))}
              aria-label="Minimum OCR confidence threshold"
              className="h-1.5 w-14 sm:w-16 cursor-pointer appearance-none rounded-lg bg-gray-700 accent-amber-500"
            />
            <span className="font-mono text-[11px] text-amber-400 font-bold w-7 text-right">
              {(confidence * 100).toFixed(0)}%
            </span>
          </div>

          {/* Evidence Vault Trigger Button (Anti-Tampering - text.txt) */}
          <button
            type="button"
            onClick={onOpenVault}
            className="flex items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-300 transition hover:bg-emerald-500/20 hover:border-emerald-500/60 active:scale-95 shadow-[0_0_12px_rgba(16,185,129,0.15)]"
            title="Open Inspector Evidence Vault (SHA-256 Cryptographic Hash & GPS Record)"
          >
            <Shield className="h-3.5 w-3.5 text-emerald-400" />
            <span className="hidden md:inline">Evidence Vault</span>
          </button>

          {/* Re-scan / Action Button */}
          <button
            type="button"
            onClick={onRescan}
            disabled={isLoading}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-3.5 py-2 text-xs font-bold text-black shadow-[0_0_20px_rgba(245,158,11,0.35)] transition hover:brightness-110 active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span>{isLoading ? "..." : "Audit"}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
