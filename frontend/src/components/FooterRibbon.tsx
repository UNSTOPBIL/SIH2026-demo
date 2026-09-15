"use client";

import React from "react";
import { Scale, ShieldCheck, Cpu, Code2 } from "lucide-react";

export const FooterRibbon: React.FC = () => {
  return (
    <footer className="mt-12 border-t border-white/[0.08] dark:border-white/[0.08] light:border-slate-200/90 bg-[#08090d]/60 dark:bg-[#08090d]/60 light:bg-white/80 py-6 text-xs text-gray-400 dark:text-gray-400 light:text-slate-500 transition-colors duration-200">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 light:bg-amber-50 light:border-amber-200 light:text-amber-700 shrink-0">
            <Scale className="h-4 w-4" />
          </div>
          <div>
            <p className="text-gray-300 dark:text-gray-300 light:text-slate-900 font-semibold">
              Legal Metrology (Packaged Commodities) Rules, 2011
            </p>
            <p className="text-[11px] text-gray-500 dark:text-gray-500 light:text-slate-500">
              Statutory verification under Rule 6(1) &amp; penalty provisions under Section 36 of Legal Metrology Act, 2009.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-6 font-mono text-[11px] text-gray-400 dark:text-gray-400 light:text-slate-600">
          <span className="flex items-center gap-1.5">
            <Cpu className="h-3.5 w-3.5 text-emerald-400 light:text-emerald-700" />
            PaddleOCR Edge (No Cloud Lag)
          </span>
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-amber-400 light:text-amber-700" />
            Deterministic Guardrails
          </span>
          <span className="hidden sm:flex items-center gap-1.5 text-gray-500 dark:text-gray-500 light:text-slate-400">
            <Code2 className="h-3.5 w-3.5" />
            SIH 2026 Demo
          </span>
        </div>
      </div>
    </footer>
  );
};
