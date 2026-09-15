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
    <div className="bg-slate-900/90 dark:bg-slate-900/90 light:bg-white border border-slate-800 dark:border-slate-800 light:border-slate-200/90 rounded-2xl p-4 shadow-lg light:shadow-xs transition-colors duration-200">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-lg">✨</span>
            <h4 className="text-sm font-semibold text-white dark:text-white light:text-slate-900 tracking-wide">
              Guided Remediation Engine
            </h4>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-medium bg-emerald-500/20 text-emerald-400 dark:text-emerald-400 light:text-emerald-800 light:bg-emerald-100 border border-emerald-500/30 light:border-emerald-300">
              Differentiator 5
            </span>
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-400 light:text-slate-600 mt-0.5">
            {hasViolations
              ? `AI-reconstructed compliant packaging artwork resolving ${originalViolationsCount} statutory violation${originalViolationsCount > 1 ? "s" : ""}.`
              : "Specimen is fully compliant. No statutory artwork corrections required."}
          </p>
        </div>

        {/* Toggle Switch Buttons */}
        {hasViolations && (
          <div className="flex items-center bg-slate-950 dark:bg-slate-950 light:bg-slate-100 p-1 rounded-xl border border-slate-800 dark:border-slate-800 light:border-slate-200 self-stretch sm:self-auto">
            <button
              onClick={() => onToggle(false)}
              className={`flex-1 sm:flex-initial px-3 sm:px-3.5 py-1.5 text-xs font-medium rounded-lg transition-all active:scale-95 ${
                !isRemediationActive
                  ? "bg-slate-800 dark:bg-slate-800 light:bg-white text-white dark:text-white light:text-slate-800 shadow-sm"
                  : "text-slate-400 dark:text-slate-400 light:text-slate-600 hover:text-slate-200 light:hover:text-slate-900"
              }`}
            >
              <span className="hidden xs:inline">Original Specimen</span>
              <span className="xs:hidden">Original</span>
            </button>
            <button
              onClick={() => onToggle(true)}
              className={`flex-1 sm:flex-initial px-3 sm:px-3.5 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center justify-center gap-1.5 active:scale-95 ${
                isRemediationActive
                  ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-950 light:shadow-emerald-500/20"
                  : "text-emerald-400 dark:text-emerald-400 light:text-emerald-700 hover:text-emerald-300 light:hover:text-emerald-800"
              }`}
            >
              <span>✨</span>
              <span className="hidden xs:inline">Fix It For Me (100% Pass)</span>
              <span className="xs:hidden">Fix (100% Pass)</span>
            </button>
          </div>
        )}
      </div>

      {/* When active, show breakdown of applied fixes */}
      {isRemediationActive && hasViolations && remediation.fixes_applied.length > 0 && (
        <div className="mt-3.5 pt-3 border-t border-slate-800/80 dark:border-slate-800/80 light:border-slate-200/90 space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between text-[11px] font-mono">
            <span className="text-emerald-400 dark:text-emerald-400 light:text-emerald-800 font-semibold flex items-center gap-1">
              <span>✓</span> AI Legal Metrology Fixes Applied ({remediation.fixes_applied.length}):
            </span>
            <span className="text-emerald-400 dark:text-emerald-400 light:text-emerald-800 bg-emerald-500/10 light:bg-emerald-100 px-2 py-0.5 rounded border border-emerald-500/20 light:border-emerald-300 font-bold">
              Post-Fix Score: 100% PASS
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {remediation.fixes_applied.map((fix, idx) => (
              <div
                key={idx}
                className="p-2.5 bg-slate-950/70 dark:bg-slate-950/70 light:bg-slate-50 border border-emerald-500/20 dark:border-emerald-500/20 light:border-emerald-200/80 rounded-xl flex items-start gap-2 text-xs"
              >
                <span className="text-emerald-400 dark:text-emerald-400 light:text-emerald-600 text-sm mt-0.5 font-bold">✓</span>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <strong className="text-slate-200 dark:text-slate-200 light:text-slate-900 font-semibold">{fix.label}</strong>
                    <span className="text-[11px] font-mono text-cyan-400 dark:text-cyan-400 light:text-cyan-800 bg-cyan-950/50 dark:bg-cyan-950/50 light:bg-cyan-100 px-1.5 py-0.2 rounded border border-cyan-800/40 light:border-cyan-300 font-medium">
                      {fix.rule_ref}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 dark:text-slate-400 light:text-slate-600 mt-0.5 leading-snug">
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
