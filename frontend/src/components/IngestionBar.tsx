"use client";

import React, { useRef, useState } from "react";
import { Upload, Sparkles, AlertTriangle, CheckCircle2, Sliders, RefreshCw, Camera, Zap, Shield, Ruler, ArrowDownToLine, Layers } from "lucide-react";

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
  onOpenGallery?: () => void;
  galleryCount?: number;
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
  isPresetCached,
  onOpenGallery,
  galleryCount = 26,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onFileUpload(e.target.files[0]);
    }
  };

  // Drag and drop handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragOver) setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only reset if leaving the outer container
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith("image/")) {
        onFileUpload(file);
      }
    }
  };

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`glass-panel rounded-2xl p-4 sm:p-5 relative overflow-hidden transition-all duration-200 ${
        isDragOver
          ? "border-amber-500 ring-2 ring-amber-500/40 bg-amber-500/[0.08]"
          : ""
      }`}
    >
      {/* Drag & Drop Visual Overlay */}
      {isDragOver && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/80 dark:bg-black/80 light:bg-white/90 backdrop-blur-md rounded-2xl border-2 border-dashed border-amber-400 animate-in fade-in duration-150">
          <div className="flex flex-col items-center gap-2 text-amber-400">
            <ArrowDownToLine className="h-8 w-8 animate-bounce" />
            <span className="font-mono text-sm font-bold tracking-wider uppercase">
              Drop packaging specimen to audit
            </span>
            <span className="text-xs text-gray-400 dark:text-gray-400 light:text-slate-600">
              Supports PNG, JPG, JPEG, WEBP
            </span>
          </div>
        </div>
      )}

      {/* Decorative ambient gradient inside the card */}
      <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-gradient-to-br from-amber-500/10 to-orange-500/5 blur-2xl" />

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        {/* Preset Selector Buttons */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 w-full lg:w-auto">
          <span className="text-xs font-mono font-medium text-gray-400 dark:text-gray-400 light:text-slate-500 uppercase tracking-wider flex items-center gap-1.5 shrink-0">
            <Sparkles className="h-3.5 w-3.5 text-amber-400" />
            Demonstration Presets:
          </span>

          <div className="grid grid-cols-1 xs:grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
            {/* Preset A: Compliant */}
            <button
              type="button"
              onClick={() => onSelectPreset("compliant")}
              disabled={isLoading}
              className={`flex items-center justify-between sm:justify-start gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all relative active:scale-95 ${
                activePreset === "compliant"
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.3)] light:bg-emerald-50 light:text-emerald-900 light:border-emerald-300 light:shadow-sm light:shadow-emerald-500/10"
                  : "bg-white/[0.04] dark:bg-white/[0.04] light:bg-white text-gray-300 dark:text-gray-300 light:text-slate-700 border border-white/10 dark:border-white/10 light:border-slate-200/90 hover:bg-white/[0.08] light:hover:bg-slate-50 light:shadow-xs"
              }`}
            >
              <div className="flex items-center gap-1.5 truncate">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 light:text-emerald-600 shrink-0" />
                <span className="truncate">Herbal Essence Tea</span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <span className="rounded bg-emerald-500/20 light:bg-emerald-100 px-1.5 py-0.5 text-[11px] text-emerald-300 dark:text-emerald-300 light:text-emerald-800 font-mono font-semibold">
                  100% PASS
                </span>
                {isPresetCached && isPresetCached("compliant") && (
                  <span className="flex items-center text-[11px] font-mono text-emerald-400/80 light:text-emerald-700 font-semibold gap-0.5" title="Cached in memory: instantaneous switch">
                    <Zap className="h-2.5 w-2.5" />
                    <span className="hidden xl:inline">0ms</span>
                  </span>
                )}
              </div>
            </button>

            {/* Preset B: Violation */}
            <button
              type="button"
              onClick={() => onSelectPreset("violation")}
              disabled={isLoading}
              className={`flex items-center justify-between sm:justify-start gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all relative active:scale-95 ${
                activePreset === "violation"
                  ? "bg-rose-500/20 text-rose-300 border border-rose-500/50 shadow-[0_0_20px_rgba(244,63,94,0.3)] light:bg-rose-50 light:text-rose-900 light:border-rose-300 light:shadow-sm light:shadow-rose-500/10"
                  : "bg-white/[0.04] dark:bg-white/[0.04] light:bg-white text-gray-300 dark:text-gray-300 light:text-slate-700 border border-white/10 dark:border-white/10 light:border-slate-200/90 hover:bg-white/[0.08] light:hover:bg-slate-50 light:shadow-xs"
              }`}
            >
              <div className="flex items-center gap-1.5 truncate">
                <AlertTriangle className="h-3.5 w-3.5 text-rose-400 light:text-rose-600 shrink-0" />
                <span className="truncate">Corn Puffs Snack</span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <span className="rounded bg-rose-500/20 light:bg-rose-100 px-1.5 py-0.5 text-[11px] text-rose-300 dark:text-rose-300 light:text-rose-800 font-mono font-semibold">
                  VIOLATIONS
                </span>
                {isPresetCached && isPresetCached("violation") && (
                  <span className="flex items-center text-[11px] font-mono text-rose-400/80 light:text-rose-700 font-semibold gap-0.5" title="Cached in memory: instantaneous switch">
                    <Zap className="h-2.5 w-2.5" />
                    <span className="hidden xl:inline">0ms</span>
                  </span>
                )}
              </div>
            </button>

            {/* Test Suite / Mass Unseen Catalog Button */}
            {onOpenGallery && (
              <button
                type="button"
                onClick={onOpenGallery}
                disabled={isLoading}
                className="flex items-center justify-between sm:justify-start gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition-all relative active:scale-95 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 dark:text-amber-300 light:text-amber-900 light:bg-amber-50 light:border-amber-200 border border-amber-500/30 light:shadow-xs"
                title="Explore and test 26 unseen packaging labels across FMCG categories"
              >
                <div className="flex items-center gap-1.5 truncate">
                  <Layers className="h-3.5 w-3.5 text-amber-400 light:text-amber-600 shrink-0" />
                  <span className="truncate">Test Suite</span>
                </div>
                <span className="rounded bg-amber-500/20 light:bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-300 dark:text-amber-300 light:text-amber-800 font-mono font-bold">
                  {galleryCount} PKGS
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Input Tools, Calibration & Evidence Vault */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 w-full lg:w-auto">
          {/* Hidden File Input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/png,image/jpeg,image/webp,image/jpg"
            className="hidden"
          />

          {/* Upload / Gallery Button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            className="flex items-center gap-1.5 rounded-xl border border-white/10 dark:border-white/10 light:border-slate-200/90 bg-white/[0.04] dark:bg-white/[0.04] light:bg-white light:shadow-xs px-3 py-2 text-xs font-semibold text-gray-200 dark:text-gray-200 light:text-slate-700 transition hover:bg-white/[0.08] light:hover:bg-slate-50 active:scale-95 disabled:opacity-50"
            title="Upload packaging specimen from device gallery or files"
          >
            <Upload className="h-3.5 w-3.5 text-orange-400 light:text-orange-600" />
            <span>Upload</span>
          </button>

          {/* Camera Button */}
          <button
            type="button"
            onClick={onCameraClick}
            disabled={isLoading}
            className="flex items-center gap-1.5 rounded-xl border border-white/10 dark:border-white/10 light:border-slate-200/90 bg-white/[0.04] dark:bg-white/[0.04] light:bg-white light:shadow-xs px-3 py-2 text-xs font-semibold text-gray-200 dark:text-gray-200 light:text-slate-700 transition hover:bg-white/[0.08] light:hover:bg-slate-50 active:scale-95 disabled:opacity-50"
            title="Scan from WebCam or Phone Camera"
          >
            <Camera className="h-3.5 w-3.5 text-amber-400 light:text-amber-600" />
            <span>Camera</span>
          </button>

          {/* Physical Width Calibration Input (Differentiator 1) */}
          <div 
            className="flex items-center gap-1.5 rounded-xl border border-white/10 dark:border-white/10 light:border-slate-200/80 bg-black/40 dark:bg-black/40 light:bg-slate-50 px-2.5 py-1.5 text-xs text-gray-300 dark:text-gray-300 light:text-slate-700"
            title="Known physical package width for millimeter font calculation (Legal Metrology Second Schedule)"
          >
            <Ruler className="h-3.5 w-3.5 text-cyan-400 light:text-cyan-600" />
            <span className="text-[11px] font-mono text-gray-400 dark:text-gray-400 light:text-slate-500 hidden xl:inline">Calib:</span>
            <input
              type="number"
              min="20"
              max="500"
              step="5"
              value={packageWidthMm}
              onChange={(e) => onPackageWidthChange(parseFloat(e.target.value) || 100)}
              className="w-12 bg-slate-900 dark:bg-slate-900 light:bg-white border border-slate-700 dark:border-slate-700 light:border-slate-200 rounded px-1.5 py-0.5 text-xs font-mono text-cyan-300 dark:text-cyan-300 light:text-cyan-800 text-center focus:outline-none focus:border-cyan-500"
            />
            <span className="text-[11px] font-mono text-cyan-400 dark:text-cyan-400 light:text-cyan-700 font-bold">mm</span>
          </div>

          {/* Confidence Slider with Tier indicator */}
          <div className="flex items-center gap-2 rounded-xl border border-white/10 dark:border-white/10 light:border-slate-200/80 bg-black/40 dark:bg-black/40 light:bg-slate-50 px-2.5 py-1.5 text-xs text-gray-300 dark:text-gray-300 light:text-slate-700">
            <Sliders className="h-3.5 w-3.5 text-gray-400 dark:text-gray-400 light:text-slate-500" />
            <input
              type="range"
              min="0.10"
              max="0.95"
              step="0.05"
              value={confidence}
              onChange={(e) => onConfidenceChange(parseFloat(e.target.value))}
              aria-label="Minimum OCR confidence threshold"
              className="h-1.5 w-14 sm:w-16 cursor-pointer appearance-none rounded-lg bg-gray-700 dark:bg-gray-700 light:bg-slate-200 accent-amber-500"
            />
            <span className="font-mono text-[11px] text-amber-400 dark:text-amber-400 light:text-amber-700 font-bold w-7 text-right">
              {(confidence * 100).toFixed(0)}%
            </span>
          </div>

          {/* Evidence Vault Trigger Button (Anti-Tampering - text.txt) */}
          <button
            type="button"
            onClick={onOpenVault}
            className="flex items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-300 dark:text-emerald-300 light:text-emerald-800 light:bg-emerald-50 light:border-emerald-200 light:shadow-xs transition hover:bg-emerald-500/20 hover:border-emerald-500/60 light:hover:bg-emerald-100/70 active:scale-95 shadow-[0_0_12px_rgba(16,185,129,0.15)]"
            title="Open Inspector Evidence Vault (SHA-256 Cryptographic Hash & GPS Record)"
          >
            <Shield className="h-3.5 w-3.5 text-emerald-400 light:text-emerald-600" />
            <span className="hidden md:inline">Evidence Vault</span>
          </button>

          {/* Re-scan / Action Button */}
          <button
            type="button"
            onClick={onRescan}
            disabled={isLoading}
            className="gloss-shine flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-3.5 py-2 text-xs font-bold text-black dark:text-black light:text-slate-900 shadow-[0_0_20px_rgba(245,158,11,0.35)] light:shadow-amber-500/20 transition hover:brightness-110 active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span>{isLoading ? "..." : "Audit"}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
