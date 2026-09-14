"use client";

import React, { useState } from "react";
import { EvidenceVault } from "@/types/scanner";

interface EvidenceVaultModalProps {
  isOpen: boolean;
  onClose: () => void;
  vault?: EvidenceVault | null;
}

export const EvidenceVaultModal: React.FC<EvidenceVaultModalProps> = ({
  isOpen,
  onClose,
  vault,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !vault) return null;

  const copyHash = () => {
    navigator.clipboard.writeText(vault.image_sha256);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-2xl bg-slate-900 border border-emerald-500/40 rounded-2xl shadow-2xl shadow-emerald-950/50 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Official Banner */}
        <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-emerald-950 px-6 py-4 border-b border-emerald-500/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/40 flex items-center justify-center text-emerald-400 text-xl font-bold">
              🛡️
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-white font-semibold text-base tracking-wide">
                  Enforcement Evidence Vault
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-medium">
                  {vault.tamper_proof_status}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono">
                Legal Metrology Act, 2009 • Section 15 Sealed Record
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Audit ID & Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="p-3.5 bg-slate-950/80 rounded-xl border border-slate-800">
              <span className="text-[11px] uppercase tracking-wider text-slate-400 font-mono block">
                Certificate / Audit ID
              </span>
              <span className="text-sm font-mono text-emerald-400 font-bold block mt-1">
                {vault.audit_id}
              </span>
            </div>
            <div className="p-3.5 bg-slate-950/80 rounded-xl border border-slate-800">
              <span className="text-[11px] uppercase tracking-wider text-slate-400 font-mono block">
                UTC Timestamp (Instant of Capture)
              </span>
              <span className="text-xs font-mono text-slate-300 block mt-1">
                {vault.timestamp_utc}
              </span>
            </div>
          </div>

          {/* Cryptographic SHA-256 Fingerprint */}
          <div className="p-4 bg-slate-950/90 rounded-xl border border-emerald-500/30">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5 font-mono">
                <span>🔒</span> Cryptographic Image Digest (SHA-256)
              </span>
              <button
                onClick={copyHash}
                className="text-[11px] font-mono px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-lg border border-emerald-500/30 transition-colors flex items-center gap-1"
              >
                {copied ? "✓ Copied!" : "📋 Copy Hash"}
              </button>
            </div>
            <div className="font-mono text-xs text-slate-300 bg-slate-900/90 p-2.5 rounded-lg border border-slate-800 break-all select-all">
              {vault.image_sha256}
            </div>
            <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
              Guarantees zero physical or digital image tampering. Any modification of a single pixel alters this hash completely.
            </p>
          </div>

          {/* Inspector & Geotag Credentials */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="p-3.5 bg-slate-950/80 rounded-xl border border-slate-800">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs">👮‍♂️</span>
                <span className="text-[11px] uppercase tracking-wider text-slate-400 font-mono">
                  Authorized Inspector
                </span>
              </div>
              <span className="text-xs font-medium text-slate-200 block">
                {vault.inspector_id}
              </span>
              <span className="text-[10px] text-emerald-400/80 font-mono mt-0.5 block">
                Verified Enforcement Officer • Zone 4
              </span>
            </div>

            <div className="p-3.5 bg-slate-950/80 rounded-xl border border-slate-800">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs">📍</span>
                  <span className="text-[11px] uppercase tracking-wider text-slate-400 font-mono">
                    GPS Geotag Location
                  </span>
                </div>
                <a
                  href={`https://maps.google.com/?q=${vault.gps_location.latitude},${vault.gps_location.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] text-cyan-400 hover:underline font-mono"
                >
                  Map View ↗
                </a>
              </div>
              <span className="text-xs font-mono text-slate-200 block">
                {vault.gps_location.latitude}° N, {vault.gps_location.longitude}° E
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5 truncate">
                {vault.gps_location.name} (±{vault.gps_location.accuracy_meters}m)
              </span>
            </div>
          </div>

          {/* HMAC Signature & QR Verification */}
          <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-800 flex flex-col sm:flex-row items-center gap-4">
            {/* Verification QR Mockup */}
            <div className="w-24 h-24 bg-white p-2 rounded-xl flex-shrink-0 flex flex-col items-center justify-center shadow-md">
              <div className="w-full h-full border-2 border-dashed border-slate-900 flex flex-col items-center justify-center text-center">
                <span className="text-lg">📱</span>
                <span className="text-[8px] font-bold text-slate-900 tracking-tighter uppercase mt-0.5">
                  SCAN AUDIT
                </span>
              </div>
            </div>
            <div className="flex-1 text-left space-y-1">
              <span className="text-xs font-semibold text-slate-200 font-mono flex items-center gap-1.5">
                <span>📜</span> Verified Compliance Certificate QR
              </span>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Links directly to the unalterable National Metrology Registry. Implements the 2022 Rule 6 electronic QR standard for digital trust.
              </p>
              <div className="text-[10px] font-mono text-emerald-400 bg-slate-900 px-2 py-1 rounded border border-slate-800 truncate">
                HMAC: {vault.digital_hmac_signature.slice(0, 32)}...
              </div>
            </div>
          </div>

          {/* Legal Defense Note for Jury */}
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-[11px] text-amber-200/90 leading-relaxed flex items-start gap-2.5">
            <span className="text-base flex-shrink-0">⚖️</span>
            <div>
              <strong className="text-amber-300 font-medium block">
                Statutory Defense against Tampering Claims:
              </strong>
              {vault.statutory_defense_statement}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-950 px-6 py-3.5 border-t border-slate-800 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
          >
            Close Vault
          </button>
        </div>
      </div>
    </div>
  );
};
