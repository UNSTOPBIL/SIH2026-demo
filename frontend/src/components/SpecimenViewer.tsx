"use client";

import React, { useState, useRef, useEffect } from "react";
import { Eye, EyeOff, ZoomIn, ZoomOut, RotateCcw, Scan, Copy, Check, X, Sparkles } from "lucide-react";
import { ScanResponse, OCRDetail } from "../types/scanner";

interface SpecimenViewerProps {
  scan: ScanResponse | null;
  imageUri?: string | null;
  imageTitle?: string | null;
  isLoading: boolean;
  activeRuleQuery?: string | null;
  isRemediationActive?: boolean;
}

export const SpecimenViewer: React.FC<SpecimenViewerProps> = ({
  scan,
  imageUri,
  imageTitle,
  isLoading,
  activeRuleQuery,
  isRemediationActive = false,
}) => {
  const displayImage = imageUri || scan?.image_data_url;
  const displayTitle = imageTitle || scan?.label_name || "Packaging specimen";

  const [showBoxes, setShowBoxes] = useState(true);
  const [hoveredBox, setHoveredBox] = useState<OCRDetail | null>(null);
  const [copiedSnippet, setCopiedSnippet] = useState(false);
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);
  const [imgNaturalSize, setImgNaturalSize] = useState({ width: 1, height: 1 });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scan?.dimensions) {
      setImgNaturalSize({
        width: scan.dimensions.width || 800,
        height: scan.dimensions.height || 600,
      });
    }
  }, [scan]);

  // Dynamically flip tooltip to top if hovered OCR line is in lower half of image
  const isTooltipOnTop = (() => {
    if (!hoveredBox || !hoveredBox.box || hoveredBox.box.length === 0) return false;
    const avgY = hoveredBox.box.reduce((sum, p) => sum + p[1], 0) / hoveredBox.box.length;
    return imgNaturalSize.height > 0 && avgY > imgNaturalSize.height * 0.48;
  })();

  const isBoxMatched = (detail: OCRDetail) => {
    if (!activeRuleQuery) return false;
    return detail.text.toLowerCase().includes(activeRuleQuery.toLowerCase());
  };

  const handleZoomIn = () => {
    setZoomLevel((prev) => Math.min(2.0, +(prev + 0.25).toFixed(2)));
  };

  const handleZoomOut = () => {
    setZoomLevel((prev) => Math.max(0.75, +(prev - 0.25).toFixed(2)));
  };

  const handleResetZoom = () => {
    setZoomLevel(1.0);
  };

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSnippet(true);
    setTimeout(() => setCopiedSnippet(false), 2000);
  };

  return (
    <div className="glass-panel flex flex-col rounded-2xl overflow-hidden h-full">
      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-white/[0.08] px-4 sm:px-5 py-3.5 bg-black/20">
        <div className="flex items-center gap-2">
          <Scan className="h-4 w-4 text-amber-400" />
          <h2 className="text-xs font-mono font-bold tracking-wider uppercase text-gray-200">
            Optical Specimen Canvas
          </h2>
          {isRemediationActive ? (
            <span className="inline-flex items-center gap-1 rounded bg-emerald-500/20 border border-emerald-500/40 px-2 py-0.5 text-[11px] font-mono text-emerald-300 font-bold">
              <Sparkles className="h-3 w-3 text-emerald-400" />
              AI REMEDIATED ARTWORK
            </span>
          ) : displayTitle ? (
            <span className="hidden sm:inline-block max-w-[200px] truncate rounded bg-white/5 px-2 py-0.5 text-[11px] text-gray-400 font-sans">
              {displayTitle}
            </span>
          ) : null}
        </div>

        {/* Action Controls: Zoom & Bounding Box Toggles */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Zoom Controls */}
          <div className="flex items-center rounded-lg border border-white/10 bg-black/40 p-0.5">
            <button
              type="button"
              onClick={handleZoomOut}
              disabled={zoomLevel <= 0.75}
              aria-label="Zoom out specimen"
              className="rounded p-1 text-gray-400 hover:text-white hover:bg-white/10 transition disabled:opacity-30"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={handleResetZoom}
              aria-label="Reset zoom to 100%"
              className="px-1.5 text-[11px] font-mono text-gray-300 hover:text-amber-400 transition"
              title="Click to reset zoom"
            >
              {(zoomLevel * 100).toFixed(0)}%
            </button>
            <button
              type="button"
              onClick={handleZoomIn}
              disabled={zoomLevel >= 2.0}
              aria-label="Zoom in specimen"
              className="rounded p-1 text-gray-400 hover:text-white hover:bg-white/10 transition disabled:opacity-30"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Toggle Bounding Boxes */}
          {!isRemediationActive && (
            <button
              type="button"
              onClick={() => setShowBoxes(!showBoxes)}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-mono transition ${
                showBoxes
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                  : "bg-white/5 text-gray-400 hover:text-white"
              }`}
              title="Toggle OCR Detection Bounding Boxes"
            >
              {showBoxes ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
              <span className="hidden sm:inline">Boxes</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Specimen Display Area */}
      <div
        ref={containerRef}
        className="relative flex-1 flex items-center justify-center p-4 sm:p-6 bg-black/40 min-h-[380px] sm:min-h-[460px] overflow-hidden select-none"
      >
        {displayImage ? (
          <div
            key={displayImage}
            className="relative inline-block max-w-full rounded-xl overflow-hidden border border-white/10 shadow-2xl bg-zinc-950 transition-transform duration-200 leading-none"
            style={{
              transform: `scale(${zoomLevel})`,
              transformOrigin: "center center",
            }}
          >
            {/* Cyberpunk HUD Corner Brackets */}
            <div className="corner-bracket corner-tl" />
            <div className="corner-bracket corner-tr" />
            <div className="corner-bracket corner-bl" />
            <div className="corner-bracket corner-br" />

            {/* The Specimen Image */}
            <img
              src={displayImage}
              alt={displayTitle}
              className="block max-w-full max-h-[520px] w-auto h-auto object-contain select-none"
              loading="eager"
              fetchPriority="high"
              onLoad={(e) => {
                const img = e.currentTarget;
                if (img.naturalWidth && img.naturalHeight) {
                  setImgNaturalSize({
                    width: img.naturalWidth,
                    height: img.naturalHeight,
                  });
                }
              }}
            />

            {/* Optical Laser Scanning Beam Overlay */}
            {isLoading && (
              <div className="absolute inset-0 pointer-events-none overflow-hidden flex flex-col items-center justify-center">
                <div
                  className="absolute inset-0 animate-grid-pulse opacity-30"
                  style={{
                    backgroundImage: "linear-gradient(to right, rgba(245,158,11,0.2) 1px, transparent 1px), linear-gradient(to bottom, rgba(245,158,11,0.2) 1px, transparent 1px)",
                    backgroundSize: "20px 20px",
                  }}
                />
                <div className="absolute left-0 right-0 h-1.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent shadow-[0_0_20px_#f59e0b,0_0_35px_#f97316] animate-laser" />
                <div className="absolute inset-0 bg-amber-500/10 backdrop-brightness-110" />

                <div className="relative z-20 rounded-full border border-amber-500/50 bg-black/85 px-4 py-1.5 shadow-[0_0_25px_rgba(245,158,11,0.5)] backdrop-blur-md flex items-center gap-2.5">
                  <div className="h-2 w-2 rounded-full bg-amber-400 animate-ping" />
                  <span className="font-mono text-xs font-bold uppercase tracking-wider text-amber-300">
                    Scanning Specimen...
                  </span>
                </div>
              </div>
            )}

            {/* SVG Bounding Boxes Overlay — only active when not loading and not in remediation view */}
            {!isLoading && !isRemediationActive && showBoxes && scan?.ocr_details && scan.ocr_details.length > 0 && (
              <svg
                id="specimen-ocr-overlay"
                viewBox={`0 0 ${imgNaturalSize.width} ${imgNaturalSize.height}`}
                className="absolute inset-0 h-full w-full pointer-events-auto specimen-ocr-overlay"
                preserveAspectRatio="none"
              >
                {scan.ocr_details.map((detail, idx) => {
                  if (!detail.box || detail.box.length < 4) return null;
                  const points = detail.box.map((p) => p.join(",")).join(" ");
                  const matched = isBoxMatched(detail);
                  const isHovered = hoveredBox === detail;

                  return (
                    <polygon
                      key={idx}
                      points={points}
                      vectorEffect="non-scaling-stroke"
                      className={`cursor-pointer transition-all duration-150 ${
                        matched
                          ? "fill-amber-400/35 stroke-amber-400 stroke-[3.5px] animate-target-pulse filter drop-shadow-[0_0_12px_rgba(245,158,11,1)]"
                          : isHovered
                          ? "fill-orange-500/30 stroke-orange-400 stroke-[2.5px]"
                          : "fill-blue-500/10 hover:fill-blue-500/25 stroke-blue-400/60 hover:stroke-blue-400 stroke-[1.5px]"
                      }`}
                      onMouseEnter={() => setHoveredBox(detail)}
                      onMouseLeave={() => setHoveredBox(null)}
                    />
                  );
                })}
              </svg>
            )}

          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-center p-8 text-gray-500">
            <Scan className="h-12 w-12 stroke-[1.2] text-gray-600 mb-3 animate-pulse" />
            <p className="text-sm font-medium text-gray-400">No packaging specimen loaded</p>
            <p className="text-xs text-gray-600 mt-1 max-w-xs">
              Select a demonstration preset or upload a commodity packaging label to begin the Rule 6 audit.
            </p>
          </div>
        )}

        {/* Floating Tooltip */}
        {hoveredBox && !isRemediationActive && (
          <div
            className={`absolute ${
              isTooltipOnTop ? "top-4" : "bottom-4"
            } left-4 right-4 sm:left-8 sm:right-8 max-w-xl mx-auto z-40 pointer-events-auto rounded-xl bg-gray-950/95 border border-amber-500/40 p-3.5 backdrop-blur-xl shadow-[0_10px_35px_rgba(0,0,0,0.85)] text-left animate-tooltip`}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono uppercase tracking-wider text-amber-400 font-bold">
                  OCR Text Line
                </span>
                <span
                  className={`rounded px-1.5 py-0.5 text-[11px] font-mono font-semibold ${
                    hoveredBox.confidence >= 0.7
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                      : hoveredBox.confidence >= 0.45
                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                      : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                  }`}
                >
                  {(hoveredBox.confidence * 100).toFixed(0)}% Conf
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleCopyText(hoveredBox.text)}
                  className="flex items-center gap-1 rounded bg-white/10 hover:bg-white/20 px-2 py-0.5 text-[11px] text-gray-200 transition"
                  title="Copy extracted line to clipboard"
                >
                  {copiedSnippet ? (
                    <Check className="h-3 w-3 text-emerald-400" />
                  ) : (
                    <Copy className="h-3 w-3 text-amber-400" />
                  )}
                  <span>{copiedSnippet ? "Copied" : "Copy"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setHoveredBox(null)}
                  aria-label="Dismiss inspection tooltip"
                  className="rounded p-1 text-gray-400 hover:text-white hover:bg-white/10 transition"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <div className="mt-2 h-1 w-full bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, Math.max(10, hoveredBox.confidence * 100))}%` }}
              />
            </div>

            <div className="mt-2 rounded-lg bg-black/60 p-2.5 border border-white/5 max-h-24 overflow-y-auto">
              <p className="font-mono text-xs text-gray-100 leading-relaxed break-words select-text">
                "{hoveredBox.text}"
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Footer Specimen Telemetry Ribbon */}
      <div className="border-t border-white/[0.08] px-5 py-3 bg-black/20 flex flex-wrap items-center justify-between gap-3 text-xs font-mono text-gray-400">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400"></span>
            Resolution:{" "}
            <span className="text-gray-200">
              {scan?.dimensions?.width ? `${scan.dimensions.width}x${scan.dimensions.height} px` : "N/A"}
            </span>
          </span>
          {scan?.font_compliance && (
            <span className="flex items-center gap-1.5 text-cyan-400">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-400"></span>
              Scale:{" "}
              <span className="text-cyan-200">
                {scan.font_compliance.package_width_mm}mm ({scan.font_compliance.scale_px_to_mm} mm/px)
              </span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] text-gray-500">Engine:</span>
          <span className="rounded bg-white/5 px-2 py-0.5 text-[11px] text-emerald-400 font-semibold">
            PP-OCRv4 + Sched. 2 Sizing
          </span>
        </div>
      </div>
    </div>
  );
};
