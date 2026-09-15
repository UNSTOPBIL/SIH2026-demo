"use client";

import React, { useRef, useState, useEffect } from "react";
import {
  X,
  Camera,
  RefreshCw,
  AlertCircle,
  Zap,
  Video,
  Check,
  RotateCcw,
  Sparkles,
  Cpu,
  Smartphone,
  Image as ImageIcon,
  Loader2,
  Crosshair,
} from "lucide-react";
import { optimizeImage } from "../utils/imageOptimizer";
import { FocusTrap } from "./FocusTrap";

interface CameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (base64Image: string, enhanceQuality?: boolean) => void;
  onDirectHardwareCapture?: () => Promise<void>;
  isHardwareCapturing?: boolean;
}

export const CameraModal: React.FC<CameraModalProps> = ({
  isOpen,
  onClose,
  onCapture,
  onDirectHardwareCapture,
  isHardwareCapturing = false,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const mobileFileInputRef = useRef<HTMLInputElement>(null);
  const galleryFileInputRef = useRef<HTMLInputElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const [cameraError, setCameraError] = useState<string | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const [enhanceQuality, setEnhanceQuality] = useState<boolean>(true);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState<boolean>(false);
  const [isOptimizing, setIsOptimizing] = useState<boolean>(false);
  const [optimizingMessage, setOptimizingMessage] = useState<string>("Processing image...");
  const [focusPoint, setFocusPoint] = useState<{ x: number; y: number } | null>(null);

  const activeStreamRef = useRef<MediaStream | null>(null);

  const refreshDevices = async () => {
    try {
      if (!navigator.mediaDevices?.enumerateDevices) return;
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = allDevices.filter((d) => d.kind === "videoinput");
      setDevices(videoDevices);
    } catch (e) {
      console.warn("Error enumerating video devices:", e);
    }
  };

  // Listen for device changes (e.g. plugging/unplugging webcam)
  useEffect(() => {
    if (!navigator.mediaDevices?.addEventListener) return;
    const handleDeviceChange = () => {
      console.log("Device change detected, refreshing camera list...");
      refreshDevices();
    };
    navigator.mediaDevices.addEventListener("devicechange", handleDeviceChange);
    return () => {
      navigator.mediaDevices.removeEventListener("devicechange", handleDeviceChange);
    };
  }, []);

  // Start video stream whenever modal opens or deviceId changes
  useEffect(() => {
    if (!isOpen || capturedImage) return;

    let isCancelled = false;
    setIsInitializing(true);
    setCameraError(null);

    const startCamera = async () => {
      // Step 1: Release any previously held tracks & wait for camera HAL to release
      if (activeStreamRef.current) {
        activeStreamRef.current.getTracks().forEach((t) => t.stop());
        activeStreamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      // Give the hardware HAL 200ms to free the sensor
      await new Promise((r) => setTimeout(r, 200));
      if (isCancelled) return;

      // Step 2: Build high-resolution constraints with continuous autofocus
      const primaryConstraints: MediaStreamConstraints = {
        video: selectedDeviceId
          ? {
              deviceId: { exact: selectedDeviceId },
              width: { ideal: 3840, min: 1920 },
              height: { ideal: 2160, min: 1080 },
            }
          : {
              facingMode: { ideal: "environment" },
              width: { ideal: 3840, min: 1920 },
              height: { ideal: 2160, min: 1080 },
            },
      };

      if (!navigator.mediaDevices?.getUserMedia) {
        if (!isCancelled) {
          setCameraError(
            typeof window !== "undefined" && window.isSecureContext === false
              ? "Live browser video streaming requires HTTPS on mobile networks. Tap below to capture with phone camera or select from gallery!"
              : "Camera device not accessible. Use 'Choose from Gallery' or 'Open Phone Camera' below."
          );
          setIsInitializing(false);
        }
        return;
      }

      let activeStream: MediaStream | null = null;
      try {
        activeStream = await navigator.mediaDevices.getUserMedia(primaryConstraints);
      } catch (err: any) {
        console.warn("Primary high-res camera constraints failed, attempting fallback:", err);
        await new Promise((r) => setTimeout(r, 300));
        if (isCancelled) return;
        try {
          // Fallback: standard environment facingMode
          activeStream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: { ideal: "environment" },
              width: { ideal: 1920 },
              height: { ideal: 1080 },
            },
          });
        } catch (fallbackErr: any) {
          console.warn("Environment fallback failed, trying basic video:", fallbackErr);
          try {
            activeStream = await navigator.mediaDevices.getUserMedia({ video: true });
          } catch (finalErr: any) {
            console.error("Camera access failed completely:", finalErr);
            if (!isCancelled) {
              setCameraError(
                window.isSecureContext === false
                  ? "Mobile browsers require HTTPS for live video streaming. Use 'Phone Camera' below for instant native photo capture!"
                  : "Could not access camera. Please verify permissions or select a photo from gallery below."
              );
              setIsInitializing(false);
            }
            return;
          }
        }
      }

      if (isCancelled) {
        activeStream?.getTracks().forEach((t) => t.stop());
        return;
      }

      // Step 3: Hardware auto-focus & exposure lock configuration
      const videoTrack = activeStream.getVideoTracks()[0];
      if (videoTrack) {
        try {
          const capabilities = (videoTrack.getCapabilities?.() || {}) as any;
          const advanced: any[] = [];
          if (capabilities.focusMode && Array.isArray(capabilities.focusMode) && capabilities.focusMode.includes("continuous")) {
            advanced.push({ focusMode: "continuous" });
          }
          if (capabilities.exposureMode && Array.isArray(capabilities.exposureMode) && capabilities.exposureMode.includes("continuous")) {
            advanced.push({ exposureMode: "continuous" });
          }
          if (advanced.length > 0 && videoTrack.applyConstraints) {
            videoTrack.applyConstraints({ advanced }).catch(() => {});
          }
        } catch (capErr) {
          console.log("Hardware focus configuration note:", capErr);
        }
      }

      activeStreamRef.current = activeStream;
      setStream(activeStream);
      setIsInitializing(false);

      if (videoRef.current) {
        videoRef.current.srcObject = activeStream;
        videoRef.current.play().catch(() => {});
      }

      // Populate devices list and sync selectedDeviceId to current track without triggering loop
      try {
        const allDevices = await navigator.mediaDevices.enumerateDevices();
        const vDevs = allDevices.filter((d) => d.kind === "videoinput");
        setDevices(vDevs);
        const currentTrack = activeStream.getVideoTracks()[0];
        const currentDevId = currentTrack?.getSettings?.()?.deviceId;
        if (currentDevId && !selectedDeviceId) {
          setSelectedDeviceId(currentDevId);
        }
      } catch (e) {
        console.warn("Error enumerating devices after stream open:", e);
      }
    };

    startCamera();

    return () => {
      isCancelled = true;
      if (activeStreamRef.current) {
        activeStreamRef.current.getTracks().forEach((t) => t.stop());
        activeStreamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, [isOpen, selectedDeviceId, capturedImage]);

  // Keyboard accessibility
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        handleClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const handleClose = () => {
    if (activeStreamRef.current) {
      activeStreamRef.current.getTracks().forEach((track) => track.stop());
      activeStreamRef.current = null;
    }
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCapturedImage(null);
    setIsOptimizing(false);
    onClose();
  };

  // Tap-to-Focus trigger on live video viewfinder
  const handleTapToFocus = async (e: React.MouseEvent<HTMLDivElement>) => {
    if (!videoRef.current || !activeStreamRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setFocusPoint({ x, y });
    setTimeout(() => setFocusPoint(null), 1200);

    const track = activeStreamRef.current.getVideoTracks()[0];
    if (track && track.applyConstraints) {
      try {
        const caps = (track.getCapabilities?.() || {}) as any;
        const relX = Math.max(0, Math.min(1, x / rect.width));
        const relY = Math.max(0, Math.min(1, y / rect.height));
        if (caps.pointsOfInterest) {
          await track.applyConstraints({
            advanced: [{ pointsOfInterest: [{ x: relX, y: relY }] } as any],
          });
        }
      } catch (focusErr) {
        // Tap visual indicator still shows
      }
    }
  };

  // High-Resolution Snapshot with W3C ImageCapture ISP Hardware Trigger
  const handleSnap = async () => {
    if (!videoRef.current || !activeStreamRef.current) return;
    setIsOptimizing(true);
    setOptimizingMessage("Triggering high-resolution sensor capture...");

    try {
      const track = activeStreamRef.current.getVideoTracks()[0];
      let photoBlob: Blob | null = null;

      // Strategy 1: W3C ImageCapture API (hardware still camera trigger with ISP autofocus & native sensor resolution)
      if (typeof window !== "undefined" && "ImageCapture" in window && track) {
        try {
          const imageCapture = new (window as any).ImageCapture(track);
          photoBlob = await imageCapture.takePhoto({
            imageWidth: 3840,
            imageHeight: 2160,
          });
          if (photoBlob) {
            console.log("Hardware ImageCapture.takePhoto succeeded! Blob size:", photoBlob.size);
          }
        } catch (icErr) {
          console.warn("ImageCapture.takePhoto failed, falling back to canvas grab:", icErr);
        }
      }

      // Strategy 2: High-resolution frame grab from video stream
      if (!photoBlob) {
        const video = videoRef.current;
        const canvas = document.createElement("canvas");
        const width = video.videoWidth || 1920;
        const height = video.videoHeight || 1080;
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Could not create canvas 2D context");

        ctx.drawImage(video, 0, 0, width, height);

        photoBlob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob(
            (b) => (b ? resolve(b) : reject(new Error("Canvas blob generation failed"))),
            "image/jpeg",
            0.95
          );
        });
        canvas.width = 0;
        canvas.height = 0;
      }

      if (!photoBlob) {
        throw new Error("Could not acquire valid photo frame");
      }

      setOptimizingMessage("Optimizing specimen clarity & preserving memory...");
      // Client-side progressive downscaling (guarantees < 500KB JPEG, max 1920px, crisp micro-text)
      const optimized = await optimizeImage(photoBlob, { maxDimension: 1920, quality: 0.92 });
      setCapturedImage(optimized.dataUrl);
    } catch (err: any) {
      console.error("Error capturing photo:", err);
      setCameraError(`Could not capture photo: ${err.message}`);
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
  };

  // Safe High-Res Mobile Camera / Gallery Upload (Immune to Low Memory Killer)
  const handleMobileCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setIsOptimizing(true);
      setOptimizingMessage("Optimizing high-res photo (preventing memory crash)...");
      setCameraError(null);

      try {
        // Immediate client-side downscale and compression before it enters DOM/State!
        // Downsamples 50MP/20MB file to optimal 1920px (<500KB) in seconds.
        const optimized = await optimizeImage(file, { maxDimension: 1920, quality: 0.92 });
        setCapturedImage(optimized.dataUrl);
      } catch (err: any) {
        console.error("Failed to process mobile capture:", err);
        setCameraError(`Failed to process photo: ${err.message}`);
      } finally {
        setIsOptimizing(false);
        e.target.value = "";
      }
    }
  };

  const handleConfirmAudit = () => {
    if (!capturedImage) return;
    onCapture(capturedImage, enhanceQuality);
    handleClose();
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="camera-modal-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <FocusTrap onEscape={handleClose} className="w-full sm:max-w-xl flex justify-center">
        <div className="glass-panel w-full sm:max-w-xl rounded-t-3xl sm:rounded-2xl border border-white/10 overflow-hidden flex flex-col shadow-2xl bg-zinc-950/95 max-h-[88vh] sm:max-h-[85vh] animate-sheet-up sm:animate-in sm:zoom-in-95">
          {/* Mobile Sheet Grab Handle */}
          <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mt-2.5 mb-1 sm:hidden shrink-0" />

          {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-3.5 bg-black/30">
          <div className="flex items-center gap-2">
            <Camera className="h-4 w-4 text-amber-400" />
            <h3 id="camera-modal-title" className="text-xs font-bold text-white uppercase tracking-wider font-mono">
              Live Packaging Camera Scanner
            </h3>
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close camera scanner"
            className="rounded-lg p-1 text-gray-400 hover:bg-white/10 hover:text-white transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Viewfinder Controls & Device Selection */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-2.5 border-b border-white/[0.06] bg-black/40 text-[11px] font-mono">
          {/* Camera Device Switcher */}
          <div className="flex items-center gap-2 min-w-[180px]">
            <Video className="h-3.5 w-3.5 text-gray-400" />
            {devices.length > 1 ? (
              <select
                value={selectedDeviceId}
                onChange={(e) => {
                  setSelectedDeviceId(e.target.value);
                  setCapturedImage(null);
                }}
                className="bg-black/60 border border-white/15 text-gray-200 rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:border-amber-400/50"
              >
                {devices.map((d, i) => (
                  <option key={d.deviceId || i} value={d.deviceId}>
                    {d.label || `Camera Device ${i + 1}`}
                  </option>
                ))}
              </select>
            ) : (
              <span className="text-gray-300">
                {devices[0]?.label || "WebCam Active"}
              </span>
            )}
          </div>

          {/* Text Clarifier / Low-Quality Booster Toggle */}
          <button
            type="button"
            onClick={() => setEnhanceQuality(!enhanceQuality)}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 transition ${
              enhanceQuality
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                : "bg-white/5 text-gray-400 hover:text-white border border-white/10"
            }`}
            title="Enhance low-contrast and soft webcam captures using CLAHE & unsharp text masking"
          >
            <Sparkles className="h-3 w-3" />
            <span>Text Clarifier {enhanceQuality ? "ON" : "OFF"}</span>
          </button>
        </div>

        {/* Video / Snapshot Viewport */}
        <div
          className="relative bg-black min-h-[320px] sm:min-h-[380px] flex items-center justify-center p-3 overflow-hidden select-none cursor-crosshair"
          onClick={!capturedImage ? handleTapToFocus : undefined}
        >
          {/* Tap-to-Focus Reticle Visualizer */}
          {focusPoint && (
            <div
              style={{ left: focusPoint.x - 20, top: focusPoint.y - 20 }}
              className="absolute w-10 h-10 border-2 border-amber-400 rounded-full animate-ping pointer-events-none z-30"
            />
          )}

          {/* Optimizing / Downscaling Processing Overlay */}
          {isOptimizing && (
            <div className="absolute inset-0 z-40 bg-black/85 backdrop-blur-sm flex flex-col items-center justify-center gap-3 p-4 text-center">
              <Loader2 className="h-8 w-8 text-amber-400 animate-spin" />
              <p className="text-xs font-mono text-amber-300 font-semibold">{optimizingMessage}</p>
              <span className="text-[11px] font-mono text-gray-400">Protecting phone memory from crash...</span>
            </div>
          )}

          {cameraError && !capturedImage ? (
            <div className="flex flex-col items-center text-center p-6 text-rose-400 max-w-sm">
              <div className="p-3 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 mb-3">
                <Camera className="h-7 w-7" />
              </div>
              <h4 className="text-sm font-semibold text-white mb-1">
                Select or Capture Specimen Photo
              </h4>
              <p className="text-xs mb-4 text-gray-300 leading-relaxed">{cameraError}</p>

              <div className="flex flex-col w-full gap-2.5">
                <button
                  type="button"
                  onClick={() => mobileFileInputRef.current?.click()}
                  className="w-full flex items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-2.5 text-xs font-bold text-black hover:brightness-110 transition shadow-[0_0_15px_rgba(16,185,129,0.3)] active:scale-95"
                >
                  <Smartphone className="h-4 w-4" />
                  <span>Take Photo with Phone Camera</span>
                </button>

                <button
                  type="button"
                  onClick={() => galleryFileInputRef.current?.click()}
                  className="w-full flex items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 px-4 py-2.5 text-xs font-bold text-white hover:brightness-110 transition shadow-[0_0_15px_rgba(59,130,246,0.3)] active:scale-95"
                >
                  <ImageIcon className="h-4 w-4" />
                  <span>Choose Photo from Gallery</span>
                </button>

                {onDirectHardwareCapture && (
                  <button
                    type="button"
                    onClick={async () => {
                      handleClose();
                      await onDirectHardwareCapture();
                    }}
                    className="w-full flex items-center justify-center gap-2.5 rounded-xl bg-white/10 border border-white/20 px-4 py-2 text-xs font-bold text-gray-200 hover:bg-white/20 transition active:scale-95"
                  >
                    <Cpu className="h-4 w-4 text-blue-400" />
                    <span>Direct Hardware WebCam</span>
                  </button>
                )}
              </div>

              <p className="text-[11px] text-gray-400 mt-4 max-w-xs leading-relaxed">
                💡 <span className="text-amber-300 font-semibold">Memory-Safe Mode:</span> High-resolution mobile photos are client-downscaled to avoid memory crashes.
              </p>
            </div>
          ) : capturedImage ? (
            /* Frozen Frame Preview */
            <div className="relative overflow-hidden rounded-xl border border-amber-500/40 w-full aspect-video bg-zinc-950 flex items-center justify-center">
              <img
                src={capturedImage}
                alt="Captured packaging frame"
                className="w-full h-full object-contain"
              />
              <div className="absolute top-3 left-3 rounded-full bg-black/80 px-2.5 py-1 text-[11px] font-mono text-amber-300 border border-amber-500/30">
                Snapshot Frozen (High-Res Ready)
              </div>
            </div>
          ) : (
            /* Live Video Stream Viewport */
            <div className="relative overflow-hidden rounded-xl border border-white/10 w-full aspect-video bg-zinc-950 flex items-center justify-center">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-contain transition-all duration-200 ${
                  enhanceQuality ? "contrast-[1.1] brightness-[1.02]" : ""
                }`}
              />

              {/* Cyberpunk HUD Reticle & Corner Brackets */}
              <div className="pointer-events-none absolute inset-6 border border-amber-400/30 rounded-lg flex flex-col items-center justify-between p-3">
                <div className="h-4 w-4 border-t-2 border-l-2 border-amber-400 absolute top-0 left-0" />
                <div className="h-4 w-4 border-t-2 border-r-2 border-amber-400 absolute top-0 right-0" />
                <div className="h-4 w-4 border-b-2 border-l-2 border-amber-400 absolute bottom-0 left-0" />
                <div className="h-4 w-4 border-b-2 border-r-2 border-amber-400 absolute bottom-0 right-0" />

                <div className="rounded bg-black/70 px-2 py-0.5 text-[11px] font-mono text-amber-400 tracking-wider uppercase border border-amber-400/20">
                  Target: Commodity Declaration Panel
                </div>

                <div className="flex items-center gap-2 text-[11px] font-mono text-gray-300 bg-black/70 px-2 py-0.5 rounded border border-white/10">
                  <Crosshair className="h-3 w-3 text-amber-400" />
                  <span>Tap screen to lock focus</span>
                </div>
              </div>

              {/* Laser Scanning Line */}
              <div className="pointer-events-none absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent shadow-[0_0_12px_#f59e0b] animate-laser" />
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="border-t border-white/10 px-5 py-3.5 pb-6 sm:pb-3.5 bg-black/50 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleClose}
              className="rounded-xl px-3.5 py-2 text-xs font-semibold text-gray-400 hover:text-white transition active:scale-95"
            >
              Cancel
            </button>

            {/* When stream is active (no error), show quick alternative sources */}
            {!cameraError && !capturedImage && (
              <>
                {onDirectHardwareCapture && (
                  <button
                    type="button"
                    onClick={async () => {
                      handleClose();
                      await onDirectHardwareCapture();
                    }}
                    disabled={isHardwareCapturing}
                    className="hidden sm:flex items-center gap-1.5 rounded-xl border border-blue-500/40 bg-blue-500/15 px-3 py-1.5 text-xs font-mono text-blue-300 hover:bg-blue-500/25 transition"
                    title="Capture uncompressed frame directly from USB webcam hardware"
                  >
                    <Cpu className="h-3.5 w-3.5" />
                    <span>Direct WebCam</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => mobileFileInputRef.current?.click()}
                  disabled={isOptimizing}
                  className="flex items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/15 px-3 py-1.5 text-xs font-mono text-emerald-300 hover:bg-emerald-500/25 transition"
                  title="Open native mobile camera"
                >
                  <Smartphone className="h-3.5 w-3.5" />
                  <span>Phone Camera</span>
                </button>

                <button
                  type="button"
                  onClick={() => galleryFileInputRef.current?.click()}
                  disabled={isOptimizing}
                  className="flex items-center gap-1.5 rounded-xl border border-blue-500/40 bg-blue-500/15 px-3 py-1.5 text-xs font-mono text-blue-300 hover:bg-blue-500/25 transition"
                  title="Choose from photo gallery"
                >
                  <ImageIcon className="h-3.5 w-3.5" />
                  <span>Gallery</span>
                </button>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            {capturedImage ? (
              <>
                <button
                  type="button"
                  onClick={handleRetake}
                  className="flex items-center gap-1.5 rounded-xl border border-white/15 px-3.5 py-2 text-xs font-semibold text-gray-300 hover:text-white hover:bg-white/10 transition active:scale-95"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Retake</span>
                </button>
                <button
                  type="button"
                  onClick={handleConfirmAudit}
                  className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-5 py-2 text-xs font-bold text-black shadow-[0_0_20px_rgba(245,158,11,0.3)] transition hover:brightness-110 active:scale-95"
                >
                  <Check className="h-4 w-4" />
                  <span>Audit Specimen</span>
                </button>
              </>
            ) : !cameraError ? (
              <button
                type="button"
                onClick={handleSnap}
                disabled={isInitializing || isOptimizing}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-5 py-2 text-xs font-bold text-black shadow-[0_0_20px_rgba(245,158,11,0.3)] transition hover:brightness-110 active:scale-95 disabled:opacity-40"
              >
                <Camera className="h-4 w-4" />
                <span>Snap Photo</span>
              </button>
            ) : null}
          </div>
        </div>

        {/* Hidden Mobile Camera Input with Environment Facing Camera Trigger */}
        <input
          type="file"
          ref={mobileFileInputRef}
          accept="image/*"
          capture="environment"
          onChange={handleMobileCapture}
          className="hidden"
        />

        {/* Hidden Gallery Input */}
        <input
          type="file"
          ref={galleryFileInputRef}
          accept="image/*"
          onChange={handleMobileCapture}
          className="hidden"
        />
      </div>
      </FocusTrap>
    </div>
  );
};
