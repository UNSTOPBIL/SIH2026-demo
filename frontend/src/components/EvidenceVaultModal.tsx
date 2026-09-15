"use client";

import React, { useState } from "react";
import { EvidenceVault } from "@/types/scanner";
import { FocusTrap } from "./FocusTrap";

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
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="evidence-vault-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <FocusTrap onEscape={onClose} className="w-full sm:max-w-2xl flex justify-center">
        <div
          className="w-full bg-slate-900 dark:bg-slate-900 light:bg-white border border-emerald-500/40 rounded-t-3xl sm:rounded-2xl shadow-2xl shadow-emerald-950/50 overflow-hidden max-h-[88vh] sm:max-h-[85vh] flex flex-col animate-sheet-up sm:animate-in sm:zoom-in-95"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Mobile Sheet Grab Handle */}
          <div className="w-10 h-1 rounded-full bg-white/20 dark:bg-white/20 light:bg-slate-300 mx-auto mt-2.5 mb-1 sm:hidden shrink-0" />

          {/* Top Official Banner */}
          <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-emerald-950 dark:from-emerald-950 dark:via-slate-900 dark:to-emerald-950 light:from-emerald-50 light:via-white light:to-emerald-50 px-6 py-4 border-b border-emerald-500/30 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/40 flex items-center justify-center text-emerald-400 text-xl font-bold shrink-0">
                🛡️
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3
                    id="evidence-vault-title"
                    className="text-white dark:text-white light:text-slate-900 font-semibold text-base tracking-wide"
                  >
                    Enforcement Evidence Vault
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-mono bg-emerald-500/20 text-emerald-400 dark:text-emerald-400 light:text-emerald-700 border border-emerald-500/30 font-medium">
                    {vault.tamper_proof_status}
                  </span>
                </div>
                <p className="text-xs text-slate-400 dark:text-slate-400 light:text-slate-500 font-mono">
                  Legal Metrology Act, 2009 • Section 15 Sealed Record
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              aria-label="Close Evidence Vault modal"
              className="text-slate-400 hover:text-white dark:hover:text-white light:hover:text-slate-900 p-2 rounded-lg hover:bg-slate-800 dark:hover:bg-slate-800 light:hover:bg-slate-100 transition-colors"
            >
              ✕
            </button>
          </div>

          {/* Content Body */}
          <div className="p-6 space-y-4 overflow-y-auto flex-1">
            {/* Audit ID & Status */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3.5 bg-slate-950/80 dark:bg-slate-950/80 light:bg-slate-50 rounded-xl border border-slate-800 dark:border-slate-800 light:border-slate-200">
                <span className="text-[11px] uppercase tracking-wider text-slate-400 dark:text-slate-400 light:text-slate-500 font-mono block">
                  Certificate / Audit ID
                </span>
                <span className="text-sm font-mono text-emerald-400 dark:text-emerald-400 light:text-emerald-600 font-bold block mt-1">
                  {vault.audit_id}
                </span>
              </div>
              <div className="p-3.5 bg-slate-950/80 dark:bg-slate-950/80 light:bg-slate-50 rounded-xl border border-slate-800 dark:border-slate-800 light:border-slate-200">
                <span className="text-[11px] uppercase tracking-wider text-slate-400 dark:text-slate-400 light:text-slate-500 font-mono block">
                  UTC Timestamp (Instant of Capture)
                </span>
                <span className="text-xs font-mono text-slate-300 dark:text-slate-300 light:text-slate-700 block mt-1">
                  {vault.timestamp_utc}
                </span>
              </div>
            </div>

            {/* Cryptographic SHA-256 Fingerprint */}
            <div className="p-4 bg-slate-950/90 dark:bg-slate-950/90 light:bg-emerald-50/40 rounded-xl border border-emerald-500/30">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-emerald-400 dark:text-emerald-400 light:text-emerald-700 flex items-center gap-1.5 font-mono">
                  <span>🔒</span> Cryptographic Image Digest (SHA-256)
                </span>
                <button
                  onClick={copyHash}
                  className="text-[11px] font-mono px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 dark:text-emerald-400 light:text-emerald-700 rounded-lg border border-emerald-500/30 transition-colors flex items-center gap-1 active:scale-95"
                >
                  {copied ? "✓ Copied!" : "📋 Copy Hash"}
                </button>
              </div>
              <div className="font-mono text-xs text-slate-300 dark:text-slate-300 light:text-slate-800 bg-slate-900/90 dark:bg-slate-900/90 light:bg-white p-2.5 rounded-lg border border-slate-800 dark:border-slate-800 light:border-slate-300 break-all select-all">
                {vault.image_sha256}
              </div>
              <p className="text-[11px] text-slate-400 dark:text-slate-400 light:text-slate-600 mt-2 leading-relaxed">
                Guarantees zero physical or digital image tampering. Any modification of a single pixel alters this hash completely.
              </p>
            </div>

            {/* Inspector & Geotag Credentials */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3.5 bg-slate-950/80 dark:bg-slate-950/80 light:bg-slate-50 rounded-xl border border-slate-800 dark:border-slate-800 light:border-slate-200">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs">👮‍♂️</span>
                  <span className="text-[11px] uppercase tracking-wider text-slate-400 dark:text-slate-400 light:text-slate-500 font-mono">
                    Authorized Inspector
                  </span>
                </div>
                <span className="text-xs font-medium text-slate-200 dark:text-slate-200 light:text-slate-800 block">
                  {vault.inspector_id}
                </span>
                <span className="text-[11px] text-emerald-400/80 dark:text-emerald-400/80 light:text-emerald-600 font-mono mt-0.5 block">
                  Verified Enforcement Officer • Zone 4
                </span>
              </div>

              <div className="p-3.5 bg-slate-950/80 dark:bg-slate-950/80 light:bg-slate-50 rounded-xl border border-slate-800 dark:border-slate-800 light:border-slate-200">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs">📍</span>
                    <span className="text-[11px] uppercase tracking-wider text-slate-400 dark:text-slate-400 light:text-slate-500 font-mono">
                      GPS Geotag Location
                    </span>
                  </div>
                  <a
                    href={`https://maps.google.com/?q=${vault.gps_location.latitude},${vault.gps_location.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-cyan-400 dark:text-cyan-400 light:text-cyan-600 hover:underline font-mono"
                  >
                    Map View ↗
                  </a>
                </div>
                <span className="text-xs font-mono text-slate-200 dark:text-slate-200 light:text-slate-800 block">
                  {vault.gps_location.latitude}° N, {vault.gps_location.longitude}° E
                </span>
                <span className="text-[11px] text-slate-400 dark:text-slate-400 light:text-slate-600 block mt-0.5 truncate">
                  {vault.gps_location.name} (±{vault.gps_location.accuracy_meters}m)
                </span>
              </div>
            </div>

            {/* HMAC Signature & QR Verification */}
            <div className="p-4 bg-slate-950/80 dark:bg-slate-950/80 light:bg-slate-50 rounded-xl border border-slate-800 dark:border-slate-800 light:border-slate-200 flex flex-col sm:flex-row items-center gap-4">
              <div className="w-24 h-24 bg-white p-2 rounded-xl flex-shrink-0 flex flex-col items-center justify-center shadow-md">
                <div className="w-full h-full border-2 border-dashed border-slate-900 flex flex-col items-center justify-center text-center">
                  <span className="text-lg">📱</span>
                  <span className="text-[8px] font-bold text-slate-900 tracking-tighter uppercase mt-0.5">
                    SCAN AUDIT
                  </span>
                </div>
              </div>
              <div className="flex-1 text-left space-y-1">
                <span className="text-xs font-semibold text-slate-200 dark:text-slate-200 light:text-slate-800 font-mono flex items-center gap-1.5">
                  <span>📜</span> Verified Compliance Certificate QR
                </span>
                <p className="text-[11px] text-slate-400 dark:text-slate-400 light:text-slate-600 leading-relaxed">
                  Links directly to the unalterable National Metrology Registry. Implements the 2022 Rule 6 electronic QR standard for digital trust.
                </p>
                <div className="text-[11px] font-mono text-emerald-400 dark:text-emerald-400 light:text-emerald-700 bg-slate-900 dark:bg-slate-900 light:bg-white px-2 py-1 rounded border border-slate-800 dark:border-slate-800 light:border-slate-200 truncate">
                  HMAC: {vault.digital_hmac_signature.slice(0, 32)}...
                </div>
              </div>
            </div>

            {/* Legal Defense Note for Jury */}
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 light:bg-amber-50 light:border-amber-200 rounded-xl text-[11px] text-amber-200/90 dark:text-amber-200/90 light:text-amber-900 leading-relaxed flex items-start gap-2.5">
              <span className="text-base flex-shrink-0">⚖️</span>
              <div>
                <strong className="text-amber-300 dark:text-amber-300 light:text-amber-800 font-medium block">
                  Statutory Defense against Tampering Claims:
                </strong>
                {vault.statutory_defense_statement}
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="bg-slate-950 dark:bg-slate-950 light:bg-slate-50 px-6 py-3.5 border-t border-slate-800 dark:border-slate-800 light:border-slate-200 flex items-center justify-end gap-3 shrink-0">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-300 dark:text-slate-300 light:text-slate-700 hover:text-white dark:hover:text-white light:hover:text-slate-900 bg-slate-800 dark:bg-slate-800 light:bg-white hover:bg-slate-700 light:hover:bg-slate-100 light:border light:border-slate-200/90 light:shadow-xs rounded-xl transition-colors active:scale-95"
            >
              Close Vault
            </button>
          </div>
        </div>
      </FocusTrap>
    </div>
  );
};
