"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Navbar } from "../components/Navbar";
import { IngestionBar } from "../components/IngestionBar";
import { SpecimenViewer } from "../components/SpecimenViewer";
import { StatutoryFindings } from "../components/StatutoryFindings";
import { RuleInspectorModal } from "../components/RuleInspectorModal";
import { RawOcrModal } from "../components/RawOcrModal";
import { CameraModal } from "../components/CameraModal";
import { EvidenceVaultModal } from "../components/EvidenceVaultModal";
import { RemediationToggle } from "../components/RemediationToggle";
import { FooterRibbon } from "../components/FooterRibbon";
import { Toast } from "../components/Toast";
import { ScanResponse } from "../types/scanner";
import { AlertCircle, RefreshCw } from "lucide-react";
import { optimizeImage } from "../utils/imageOptimizer";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "";

const PRESET_METADATA = {
  compliant: {
    label_name: "Herbal Essence Organic Tea (250 g)",
    image_url: "/samples/compliant_sample.png",
  },
  violation: {
    label_name: "Crunchy Corn Puffs (100 g)",
    image_url: "/samples/non_compliant_sample.png",
  },
};

export default function Home() {
  const [currentScan, setCurrentScan] = useState<ScanResponse | null>(null);
  const [activePreset, setActivePreset] = useState<"compliant" | "violation" | "custom" | null>("compliant");
  const [activeImageUri, setActiveImageUri] = useState<string>(PRESET_METADATA.compliant.image_url);
  const [activeImageTitle, setActiveImageTitle] = useState<string>(PRESET_METADATA.compliant.label_name);
  const [confidence, setConfidence] = useState<number>(0.55);
  const [packageWidthMm, setPackageWidthMm] = useState<number>(100);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Guided Remediation State ("Fix It For Me" - Differentiator 5)
  const [isRemediationActive, setIsRemediationActive] = useState<boolean>(false);

  // Cross-component hover highlight: highlights matching bounding boxes
  const [activeRuleQuery, setActiveRuleQuery] = useState<string | null>(null);

  // Modals state
  const [isRulesModalOpen, setIsRulesModalOpen] = useState(false);
  const [isRawOcrModalOpen, setIsRawOcrModalOpen] = useState(false);
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
  const [isEvidenceVaultOpen, setIsEvidenceVaultOpen] = useState(false);

  // Toast notification state
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "info" | "warning" | "error";
  } | null>(null);

  const presetCacheRef = useRef<Record<string, ScanResponse>>({});

  const showToast = (message: string, type: "success" | "info" | "warning" | "error" = "success") => {
    setToast({ message, type });
  };

  // Load preset scan
  const loadPreset = useCallback(async (presetId: "compliant" | "violation", forceRefresh = false) => {
    setActivePreset(presetId);
    setErrorMessage(null);
    setIsRemediationActive(false); // Reset remediation view when switching specimens

    const presetMeta = PRESET_METADATA[presetId];
    if (presetMeta) {
      setActiveImageUri(presetMeta.image_url);
      setActiveImageTitle(presetMeta.label_name);
    }

    if (!forceRefresh && presetCacheRef.current[presetId]) {
      const cached = presetCacheRef.current[presetId];
      setCurrentScan(cached);
      if (cached.image_data_url) {
        setActiveImageUri(cached.image_data_url);
      }
      showToast(`Instant Switch: Loaded ${cached.label_name || presetId} (0ms cache)`, "info");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/presets/${presetId}`);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || `Server returned ${res.status}`);
      }
      const data: ScanResponse = await res.json();
      presetCacheRef.current[presetId] = data;
      setCurrentScan(data);
      if (data.image_data_url) {
        setActiveImageUri(data.image_data_url);
      }
      showToast(`Audit Complete: ${data.label_name || presetId} analyzed`, "success");
    } catch (err: any) {
      console.error("Failed to load preset:", err);
      setErrorMessage(
        `Failed to communicate with the Metrology Compliance Engine (${err.message}). Ensure the backend server is running at ${API_BASE_URL}.`
      );
      showToast("Backend connection failed", "error");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPreset("compliant");
  }, [loadPreset]);

  // Handle custom file upload (memory-safe progressive downscaling)
  const handleFileUpload = async (file: File) => {
    setIsLoading(true);
    setErrorMessage(null);
    setIsRemediationActive(false);
    setActivePreset("custom");
    setActiveImageTitle(file.name);

    let uploadPayload: File | Blob = file;
    try {
      showToast("Optimizing specimen image...", "info");
      const optimized = await optimizeImage(file, { maxDimension: 1920, quality: 0.92 });
      uploadPayload = new File([optimized.blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", {
        type: "image/jpeg",
      });
      setActiveImageUri(optimized.dataUrl);
    } catch (optErr) {
      console.warn("Client optimization fallback to raw file:", optErr);
      const previewUrl = URL.createObjectURL(file);
      setActiveImageUri(previewUrl);
    }

    const formData = new FormData();
    formData.append("file", uploadPayload);
    formData.append("confidence_threshold", confidence.toString());
    formData.append("package_width_mm", packageWidthMm.toString());

    try {
      const res = await fetch(`${API_BASE_URL}/api/scan`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || `Server returned ${res.status}`);
      }

      const data: ScanResponse = await res.json();
      setCurrentScan(data);
      if (data.image_data_url) {
        setActiveImageUri(data.image_data_url);
      }
      showToast(`Specimen audited: ${file.name} (${data.ocr_line_count} text lines)`, "success");
    } catch (err: any) {
      console.error("Error uploading file:", err);
      setErrorMessage(`Inference failed on uploaded specimen: ${err.message}`);
      showToast("Label audit failed", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle webcam capture
  const handleCameraCapture = async (base64Image: string, enhanceQuality: boolean = true) => {
    setActiveImageUri(base64Image);
    setActiveImageTitle("Live Camera Specimen");
    setIsLoading(true);
    setErrorMessage(null);
    setIsRemediationActive(false);
    setActivePreset("custom");

    try {
      const res = await fetch(`${API_BASE_URL}/api/scan-base64`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image_base64: base64Image,
          confidence_threshold: confidence,
          enhance_quality: enhanceQuality,
          package_width_mm: packageWidthMm,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || `Server returned ${res.status}`);
      }

      const data: ScanResponse = await res.json();
      setCurrentScan(data);
      if (data.image_data_url) {
        setActiveImageUri(data.image_data_url);
      }
      showToast(`Live capture audited: ${data.ocr_line_count} text lines extracted`, "success");
    } catch (err: any) {
      console.error("Error processing webcam frame:", err);
      setErrorMessage(`Webcam audit failed: ${err.message}`);
      showToast("Webcam audit failed", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle direct hardware camera capture
  const handleHardwareCameraCapture = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    setIsRemediationActive(false);
    setActivePreset("custom");
    showToast("Connecting to Hardware WebCam & Auditing...", "info");

    try {
      const res = await fetch(`${API_BASE_URL}/api/camera/capture`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          device_index: 0,
          confidence_threshold: confidence,
          enhance_quality: true,
          package_width_mm: packageWidthMm,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || `Server returned ${res.status}`);
      }

      const data: ScanResponse = await res.json();
      setCurrentScan(data);
      if (data.image_data_url) {
        setActiveImageUri(data.image_data_url);
        setActiveImageTitle(data.label_name || "Live WebCam Specimen");
      }
      showToast(`Hardware capture audited: ${data.ocr_line_count} text lines extracted`, "success");
    } catch (err: any) {
      console.error("Hardware webcam capture error:", err);
      setErrorMessage(`Hardware webcam audit failed: ${err.message}`);
      showToast("Hardware camera scan failed", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRescan = () => {
    if (activePreset === "compliant" || activePreset === "violation") {
      loadPreset(activePreset, true);
    } else if (currentScan?.image_data_url) {
      handleCameraCapture(currentScan.image_data_url);
    }
  };

  // Determine effective display image and title when remediation is active
  const effectiveDisplayImage = isRemediationActive && currentScan?.remediation?.remediated_image_base64
    ? currentScan.remediation.remediated_image_base64
    : activeImageUri;

  const originalViolationsCount = currentScan?.remediation?.original_violations_count ?? (
    currentScan ? currentScan.cards.filter(c => !c.passed).length : 0
  );

  return (
    <div className="bg-agent-mesh min-h-screen flex flex-col selection:bg-amber-500/30 selection:text-amber-200">
      {/* Top Navbar */}
      <Navbar
        currentScan={currentScan}
        onOpenRules={() => setIsRulesModalOpen(true)}
        onOpenRawOcr={() => setIsRawOcrModalOpen(true)}
        onExportSuccess={() => showToast("Regulatory audit JSON downloaded successfully", "success")}
      />

      {/* Main Container */}
      <main className="mx-auto flex-1 w-full max-w-7xl px-4 sm:px-6 py-6 flex flex-col gap-5">
        {/* Ingestion & Control Bar */}
        <IngestionBar
          onSelectPreset={loadPreset}
          onFileUpload={handleFileUpload}
          onCameraClick={() => setIsCameraModalOpen(true)}
          activePreset={activePreset}
          confidence={confidence}
          onConfidenceChange={setConfidence}
          packageWidthMm={packageWidthMm}
          onPackageWidthChange={setPackageWidthMm}
          isLoading={isLoading}
          onRescan={handleRescan}
          onOpenVault={() => setIsEvidenceVaultOpen(true)}
          hasVaultData={!!currentScan?.evidence_vault}
          isPresetCached={(id) => !!presetCacheRef.current[id]}
        />

        {/* Guided Remediation Banner ("Fix It For Me" - Differentiator 5) */}
        {currentScan && (
          <RemediationToggle
            remediation={currentScan.remediation}
            isRemediationActive={isRemediationActive}
            onToggle={setIsRemediationActive}
            originalViolationsCount={originalViolationsCount}
          />
        )}

        {/* Error Notification Banner */}
        {errorMessage && (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-rose-500/30 bg-rose-950/40 p-4 text-xs text-rose-200 shadow-lg animate-toast">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => loadPreset("compliant")}
              className="flex items-center gap-1.5 rounded-lg bg-rose-500/20 px-3 py-1 text-xs font-semibold text-rose-300 hover:bg-rose-500/30 transition shrink-0"
            >
              <RefreshCw className="h-3 w-3" />
              <span>Retry</span>
            </button>
          </div>
        )}

        {/* Split Screen Layout: Left Specimen Canvas, Right Statutory Findings */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Specimen Viewer (5 cols on lg) */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            <SpecimenViewer
              scan={currentScan}
              imageUri={effectiveDisplayImage}
              imageTitle={activeImageTitle}
              isLoading={isLoading}
              activeRuleQuery={activeRuleQuery}
              isRemediationActive={isRemediationActive}
            />
          </div>

          {/* Right Column: Statutory Declarations Audit (7 cols on lg) */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            <StatutoryFindings
              scan={currentScan}
              isLoading={isLoading}
              onHoverRule={(extractedText) => setActiveRuleQuery(extractedText)}
              cardsOverride={isRemediationActive ? currentScan?.remediation?.remediated_cards : null}
              scoreOverride={isRemediationActive ? 100.0 : null}
              isRemediationActive={isRemediationActive}
            />
          </div>
        </div>
      </main>

      {/* Footer Citation Ribbon */}
      <FooterRibbon />

      {/* Modals */}
      <RuleInspectorModal
        isOpen={isRulesModalOpen}
        onClose={() => setIsRulesModalOpen(false)}
      />

      <RawOcrModal
        isOpen={isRawOcrModalOpen}
        onClose={() => setIsRawOcrModalOpen(false)}
        scan={currentScan}
      />

      <CameraModal
        isOpen={isCameraModalOpen}
        onClose={() => setIsCameraModalOpen(false)}
        onCapture={handleCameraCapture}
        onDirectHardwareCapture={handleHardwareCameraCapture}
      />

      <EvidenceVaultModal
        isOpen={isEvidenceVaultOpen}
        onClose={() => setIsEvidenceVaultOpen(false)}
        vault={currentScan?.evidence_vault}
      />

      {/* Floating Toast System */}
      <Toast
        message={toast?.message || null}
        type={toast?.type || "success"}
        onClose={() => setToast(null)}
      />
    </div>
  );
}
