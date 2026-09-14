"use client";

import React from "react";
import { RemediationData } from "@/types/scanner";

interface RemediationToggleProps {
  remediation?: RemediationData | null;
  isRemediationActive: boolean;
  onToggle: (active: boolean) => void;
  originalViolationsCount: number;
}

export const RemediationToggle: React.FC<RemediationToggleProps> = ({
  remediation,
  isRemediationActive,
  onToggle,
  originalViolationsCount,
}) => {
  if (!remediation) return null;

  const hasViolations = originalViolationsCount > 0;

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-lg">✨</span>
            <h4 className="text-sm font-semibold text-white tracking-wide">
              Guided Remediation Engine
            </h4>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              Differentiator 5
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            {hasViolations
              ? `AI-reconstructed compliant packaging artwork resolving ${originalViolationsCount} statutory violation${originalViolationsCount > 1 ? "s" : ""}.`
              : "Specimen is fully compliant. No statutory artwork corrections required."}
          </p>
        </div>

        {/* Toggle Switch Buttons */}
        {hasViolations && (
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 self-stretch sm:self-auto">
            <button
              onClick={() => onToggle(false)}
              className={`flex-1 sm:flex-initial px-3.5 py-1.5 text-xs font-medium rounded-lg transition-all ${
                !isRemediationActive
                  ? "bg-slate-800 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Original Specimen
            </button>
            <button
              onClick={() => onToggle(true)}
              className={`flex-1 sm:flex-initial px-3.5 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                isRemediationActive
                  ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-950"
                  : "text-emerald-400 hover:text-emerald-300"
              }`}
            >
              <span>✨</span>
              <span>Fix It For Me (100% Pass)</span>
            </button>
          </div>
        )}
      </div>

      {/* When active, show breakdown of applied fixes */}
      {isRemediationActive && hasViolations && remediation.fixes_applied.length > 0 && (
        <div className="mt-3.5 pt-3 border-t border-slate-800/80 space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between text-[11px] font-mono">
            <span className="text-emerald-400 font-semibold flex items-center gap-1">
              <span>✓</span> AI Legal Metrology Fixes Applied ({remediation.fixes_applied.length}):
            </span>
            <span className="text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-bold">
              Post-Fix Score: 100% PASS
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {remediation.fixes_applied.map((fix, idx) => (
              <div
                key={idx}
                className="p-2.5 bg-slate-950/70 border border-emerald-500/20 rounded-xl flex items-start gap-2 text-xs"
              >
                <span className="text-emerald-400 text-sm mt-0.5 font-bold">✓</span>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <strong className="text-slate-200 font-medium">{fix.label}</strong>
                    <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/50 px-1.5 py-0.2 rounded border border-cyan-800/40">
                      {fix.rule_ref}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                    {fix.action}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
