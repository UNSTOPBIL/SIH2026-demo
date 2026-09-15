"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ShieldCheck, FileJson, Scale, Layers, Sun, Moon, BarChart3, History } from "lucide-react";
import { ScanResponse } from "../types/scanner";

interface NavbarProps {
  currentScan: ScanResponse | null;
  onOpenRules: () => void;
  onOpenRawOcr: () => void;
  onExportSuccess?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentScan,
  onOpenRules,
  onOpenRawOcr,
  onExportSuccess,
}) => {
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("sih_theme") as "dark" | "light" | null;
      if (saved) {
        setTheme(saved);
        applyTheme(saved);
      } else {
        // Default to dark
        applyTheme("dark");
      }
    } catch {
      applyTheme("dark");
    }
  }, []);

  const applyTheme = (t: "dark" | "light") => {
    if (t === "light") {
      document.documentElement.classList.add("light");
      document.documentElement.classList.remove("dark");
    } else {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
    }
  };

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    try {
      localStorage.setItem("sih_theme", nextTheme);
    } catch {
      // ignore
    }
    applyTheme(nextTheme);
  };

  const handleExportJson = () => {
    if (!currentScan) return;

    // Structure clean, human-readable statutory audit report without massive base64 strings
    const exportData = {
      audit_report: {
        title: "Legal Metrology Packaged Commodities (LMPC) Statutory Audit Report",
        generated_at: new Date().toISOString(),
        specimen_file: currentScan.filename || "specimen_image.jpg",
        overall_verdict: currentScan.is_compliant ? "COMPLIANT" : (currentScan.verdict_state || "NON_COMPLIANT"),
        statutory_score_percentage: `${currentScan.score_percentage ?? currentScan.summary?.score_percentage ?? 0}%`,
        processing_latency_seconds: Number(currentScan.latency_seconds?.toFixed(2) ?? 0),
      },
      statutory_summary: {
        total_declarations_evaluated: currentScan.summary?.total_rules ?? currentScan.findings?.length ?? 0,
        declarations_passed: currentScan.summary?.passed_count ?? 0,
        declarations_failed: currentScan.summary?.violation_count ?? 0,
        declarations_requiring_review: currentScan.summary?.review_count ?? 0,
        declarations_not_applicable: currentScan.summary?.not_applicable_count ?? 0,
      },
      repeat_offender_analysis: currentScan.repeat_offender ? {
        company_name: currentScan.repeat_offender.company_name,
        prior_offenses_recorded: currentScan.repeat_offender.offense_count,
        is_repeat_offender: currentScan.repeat_offender.is_repeat_offender,
        legal_statute_provision: currentScan.repeat_offender.legal_provision,
      } : null,
      mandatory_declaration_findings: (currentScan.cards || []).map((card) => ({
        declaration: card.label || card.id,
        rule_reference: card.rule_ref || "Rule 6",
        status: card.actual_status || card.status,
        extracted_text: card.snippet || "Not detected on packaging label",
        statutory_description: card.description,
        font_compliance: card.font_compliance ? {
          detected_height_mm: card.font_compliance.detected_height_mm,
          statutory_min_mm: card.font_compliance.min_required_mm,
          is_compliant: card.font_compliance.is_font_compliant,
          schedule_reference: card.font_compliance.note,
        } : null,
      })),
      ocr_extracted_text_lines: currentScan.ocr_lines && currentScan.ocr_lines.length > 0 ? currentScan.ocr_lines : (currentScan.ocr_details || []).map((d) => d.text).filter(Boolean),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `legal_metrology_audit_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    onExportSuccess?.();
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/[0.08] dark:border-white/[0.08] bg-[#08090d]/80 dark:bg-[#08090d]/80 light:bg-white/85 light:border-slate-200/90 light:shadow-xs backdrop-blur-xl transition-colors duration-200">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        {/* Brand Identity */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="relative flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/20 via-orange-500/10 to-transparent light:from-amber-400/25 light:via-orange-400/15 light:to-amber-500/10 border border-amber-500/30 light:border-amber-400/40 shadow-[0_0_20px_rgba(245,158,11,0.2)] light:shadow-amber-500/15 shrink-0">
            <Scale className="h-4.5 w-4.5 sm:h-5 sm:w-5 text-amber-400 light:text-amber-600" />
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="hidden xs:inline text-xs font-mono font-bold tracking-widest text-amber-500 light:text-amber-600 uppercase">
                SIH 2026 // AGENTIC AUDIT
              </span>
              <span className="xs:hidden text-[10px] font-mono font-bold text-amber-500 light:text-amber-600 uppercase">
                SIH 2026
              </span>
              <span className="rounded bg-white/10 dark:bg-white/10 light:bg-slate-100 light:border light:border-slate-200/80 px-1.5 py-0.5 text-[10px] sm:text-[11px] font-medium text-gray-300 dark:text-gray-300 light:text-slate-600">
                v1.0.0
              </span>
            </div>
            <h1 className="text-xs sm:text-base font-semibold tracking-tight text-white dark:text-white light:text-slate-900 truncate max-w-[125px] xs:max-w-[200px] sm:max-w-none">
              <span className="xs:hidden">LM Rule 6 Scanner</span>
              <span className="hidden xs:inline">Legal Metrology Rule 6 Compliance Engine</span>
            </h1>
          </div>
        </div>

        {/* Telemetry & Global Actions */}
        <div className="flex items-center gap-1 sm:gap-2.5 shrink-0">
          {/* Navigation Links */}
          <Link
            href="/dashboard"
            className="flex items-center gap-1 rounded-lg border border-white/10 dark:border-white/10 light:border-slate-200/90 bg-white/[0.04] dark:bg-white/[0.04] light:bg-white light:shadow-xs px-2 sm:px-3 py-1.5 text-xs font-semibold text-gray-300 dark:text-gray-300 light:text-slate-700 transition hover:bg-white/[0.08] light:hover:bg-slate-50 hover:text-white dark:hover:text-white light:hover:text-slate-900 active:scale-95"
            title="Open Enforcement Official Operations & Analytics Dashboard"
          >
            <BarChart3 className="h-3.5 w-3.5 text-amber-400 light:text-amber-600" />
            <span className="hidden sm:inline">Dashboard</span>
          </Link>

          <Link
            href="/history"
            className="flex items-center gap-1 rounded-lg border border-white/10 dark:border-white/10 light:border-slate-200/90 bg-white/[0.04] dark:bg-white/[0.04] light:bg-white light:shadow-xs px-2 sm:px-3 py-1.5 text-xs font-semibold text-gray-300 dark:text-gray-300 light:text-slate-700 transition hover:bg-white/[0.08] light:hover:bg-slate-50 hover:text-white dark:hover:text-white light:hover:text-slate-900 active:scale-95"
            title="Open Historical Inspections and Product Compliance Repository"
          >
            <History className="h-3.5 w-3.5 text-blue-400 light:text-blue-600" />
            <span className="hidden sm:inline">Repository</span>
          </Link>

          {/* Telemetry pill */}
          <div className="hidden xl:flex items-center gap-2.5 rounded-full border border-white/10 dark:border-white/10 light:border-slate-200/90 bg-white/[0.03] dark:bg-white/[0.03] light:bg-white/80 light:shadow-xs px-3 py-1.5 text-xs text-gray-300 dark:text-gray-300 light:text-slate-700">
            <span className="flex items-center gap-1.5 font-mono text-[11px] text-emerald-400 light:text-emerald-700 font-semibold">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
              PP-OCRv4
            </span>
            <span className="text-gray-600 dark:text-gray-600 light:text-slate-300">|</span>
            <span className="font-mono text-[11px] text-gray-400 dark:text-gray-400 light:text-slate-500">
              11 Guardrails
            </span>
            <span className="text-gray-600 dark:text-gray-600 light:text-slate-300">|</span>
            <span className="font-mono text-[11px] text-amber-400 light:text-amber-700 font-semibold">
              {currentScan ? `${(currentScan.latency_seconds * 1000).toFixed(0)}ms` : "Ready"}
            </span>
          </div>

          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            type="button"
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            className="flex items-center justify-center h-8 w-8 rounded-lg border border-white/10 dark:border-white/10 light:border-slate-200/90 bg-white/[0.04] dark:bg-white/[0.04] light:bg-white light:shadow-xs text-gray-300 dark:text-gray-300 light:text-slate-700 transition hover:bg-white/[0.08] light:hover:bg-slate-50 active:scale-95"
          >
            {theme === "dark" ? (
              <Sun className="h-4 w-4 text-amber-400 transition-transform duration-200" />
            ) : (
              <Moon className="h-4 w-4 text-slate-700 transition-transform duration-200" />
            )}
          </button>

          {/* Rule Inspector Button */}
          <button
            onClick={onOpenRules}
            type="button"
            aria-label="Statutory Rules"
            title="Inspect Legal Metrology Rule 6 statutory rules"
            className="hidden md:flex items-center gap-1.5 rounded-lg border border-white/10 dark:border-white/10 light:border-slate-200/90 bg-white/[0.04] dark:bg-white/[0.04] light:bg-white light:shadow-xs px-2.5 sm:px-3 py-1.5 text-xs font-medium text-gray-300 dark:text-gray-300 light:text-slate-700 transition hover:bg-white/[0.08] light:hover:bg-slate-50 hover:text-white dark:hover:text-white light:hover:text-slate-900 active:scale-95"
          >
            <ShieldCheck className="h-3.5 w-3.5 text-amber-400 light:text-amber-600" />
            <span className="hidden sm:inline">Rules</span>
          </button>

          {/* Raw OCR Button */}
          <button
            onClick={onOpenRawOcr}
            disabled={!currentScan}
            type="button"
            aria-label="Raw OCR Data"
            title="View extracted raw OCR token coordinates and confidence scores"
            className="hidden md:flex items-center gap-1.5 rounded-lg border border-white/10 dark:border-white/10 light:border-slate-200/90 bg-white/[0.04] dark:bg-white/[0.04] light:bg-white light:shadow-xs px-2.5 sm:px-3 py-1.5 text-xs font-medium text-gray-300 dark:text-gray-300 light:text-slate-700 transition hover:bg-white/[0.08] light:hover:bg-slate-50 hover:text-white dark:hover:text-white light:hover:text-slate-900 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
          >
            <Layers className="h-3.5 w-3.5 text-orange-400 light:text-orange-600" />
            <span className="hidden sm:inline">OCR</span>
          </button>

          {/* JSON Export */}
          <button
            onClick={handleExportJson}
            disabled={!currentScan}
            type="button"
            aria-label="Export JSON audit report"
            title="Export full statutory audit report as JSON"
            className="gloss-shine flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2 sm:px-3 py-1.5 text-xs font-medium text-amber-300 dark:text-amber-300 light:text-white light:bg-gradient-to-r light:from-amber-500 light:to-orange-500 light:border-amber-400/40 light:shadow-xs light:shadow-amber-500/20 light:hover:from-amber-600 light:hover:to-orange-600 transition hover:bg-amber-500/20 hover:border-amber-500/50 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
          >
            <FileJson className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">JSON</span>
          </button>
        </div>
      </div>
    </header>
  );
};
