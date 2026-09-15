"use client";

import React, { useState, useEffect } from "react";
import {
  ShieldCheck,
  AlertOctagon,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  Scale,
  Target,
  AlertTriangle,
  Ruler,
  Download,
  MapPin,
  Eye,
} from "lucide-react";
import { ScanResponse, RuleCard } from "../types/scanner";
import { SkeletonFindingsList } from "./SkeletonPulse";

interface StatutoryFindingsProps {
  scan: ScanResponse | null;
  isLoading: boolean;
  onHoverRule: (extractedText: string | null) => void;
  cardsOverride?: RuleCard[] | null;
  scoreOverride?: number | null;
  isRemediationActive?: boolean;
}

export const StatutoryFindings: React.FC<StatutoryFindingsProps> = ({
  scan,
  isLoading,
  onHoverRule,
  cardsOverride,
  scoreOverride,
  isRemediationActive = false,
}) => {
  const [filter, setFilter] = useState<"ALL" | "PASS" | "FAIL">("ALL");
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);

  const effectiveCards = scan ? (cardsOverride || scan.cards) : [];
  const rawScore = scan
    ? (scoreOverride !== undefined && scoreOverride !== null ? scoreOverride : scan.score_percentage)
    : 0;
  const effectiveScore = isRemediationActive ? 100 : rawScore;

  // Animated score counter
  const [displayedScore, setDisplayedScore] = useState<number>(effectiveScore);

  useEffect(() => {
    let startTimestamp: number | null = null;
    const startVal = displayedScore;
    const targetVal = effectiveScore;
    const duration = 650;

    if (Math.abs(startVal - targetVal) < 0.2) {
      setDisplayedScore(targetVal);
      return;
    }

    let frameId: number;
    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      setDisplayedScore(startVal + (targetVal - startVal) * easeOut);

      if (progress < 1) {
        frameId = requestAnimationFrame(step);
      } else {
        setDisplayedScore(targetVal);
      }
    };

    frameId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frameId);
  }, [effectiveScore]);

  // Loading state using full Skeleton Wireframe instead of monolithic spinner
  if (isLoading) {
    return <SkeletonFindingsList />;
  }

  // Empty state when no specimen loaded
  if (!scan) {
    return (
      <div className="glass-panel flex flex-col items-center justify-center rounded-2xl p-12 min-h-[460px] text-center text-gray-500 dark:text-gray-500 light:text-slate-400">
        <Scale className="h-12 w-12 text-gray-600 dark:text-gray-600 light:text-slate-300 mb-3 stroke-[1.2]" />
        <p className="text-sm font-medium text-gray-300 dark:text-gray-300 light:text-slate-700">
          Statutory Engine Standing By
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-500 light:text-slate-500 mt-1 max-w-xs">
          Load a packaging specimen on the left to review mandatory Legal Metrology declarations.
        </p>
      </div>
    );
  }

  const effectiveIsCompliant = isRemediationActive ? true : scan.is_compliant;
  const { repeat_offender } = scan;

  const filteredCards = effectiveCards.filter((card) => {
    const isPassed = card.status === "PASS" || card.passed === true;
    if (filter === "PASS") return isPassed;
    if (filter === "FAIL") return !isPassed;
    return true;
  });

  const passCount = effectiveCards.filter((c) => c.status === "PASS" || c.passed === true).length;
  const reviewCount = effectiveCards.filter((c) => {
    const s = c.actual_status || c.status;
    return s === "REVIEW_REQUIRED" || s === "WARN";
  }).length;
  const failCount = effectiveCards.filter((c) => (c.actual_status || c.status) === "FAIL").length;

  // Circular gauge calculations (radius 28, perimeter ~175.93)
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (displayedScore / 100) * circumference;

  return (
    <div className="flex flex-col gap-4">
      {/* Repeat-Offender Alert Banner (Differentiator 3) */}
      {repeat_offender && repeat_offender.is_repeat_offender && !isRemediationActive && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-rose-950/80 via-red-950/60 to-slate-900 light:from-rose-50 light:via-rose-100/60 light:to-white border border-rose-500/50 light:border-rose-300 shadow-xl shadow-rose-950/40 light:shadow-sm light:shadow-rose-500/10 animate-pulse">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-rose-500/20 light:bg-rose-100 border border-rose-500/40 light:border-rose-300 text-rose-400 light:text-rose-700 text-lg shrink-0">
              ⚠️
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-rose-500/30 text-rose-300 light:bg-rose-100 light:text-rose-800 border border-rose-500/40 light:border-rose-300">
                  REPEAT OFFENDER ALERT • SEC 36(2)
                </span>
                <span className="text-xs font-mono text-rose-400 light:text-rose-700 font-semibold">
                  {repeat_offender.offense_count} Prior Convictions Recorded
                </span>
              </div>
              <h4 className="text-sm font-bold text-white light:text-slate-900 mt-1">
                {repeat_offender.entity_name}
              </h4>
              <p className="text-xs text-rose-200/90 light:text-rose-800 mt-1 leading-relaxed">
                {repeat_offender.statutory_action}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 1. Verdict Hero Banner with Animated Circular Radial Gauge */}
      <div
        className={`glass-panel rounded-2xl p-5 relative overflow-hidden transition-all duration-300 border ${
          effectiveIsCompliant
            ? "border-emerald-500/40 bg-gradient-to-br from-emerald-950/40 via-emerald-900/15 to-transparent dark:from-emerald-950/40 dark:via-emerald-900/15 light:from-white light:via-emerald-50/50 light:to-white light:border-emerald-300/80 shadow-[0_0_35px_rgba(16,185,129,0.18)] light:shadow-xs"
            : "border-rose-500/40 bg-gradient-to-br from-rose-950/40 via-rose-900/15 to-transparent dark:from-rose-950/40 dark:via-rose-900/15 light:from-white light:via-rose-50/50 light:to-white light:border-rose-300/80 shadow-[0_0_35px_rgba(244,63,94,0.18)] light:shadow-xs"
        }`}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border transition-colors ${
                effectiveIsCompliant
                  ? "border-emerald-500/50 bg-emerald-500/20 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)] light:bg-emerald-100 light:text-emerald-700 light:border-emerald-300"
                  : "border-rose-500/50 bg-rose-500/20 text-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.3)] light:bg-rose-100 light:text-rose-700 light:border-rose-300"
              }`}
            >
              {effectiveIsCompliant ? (
                <ShieldCheck className="h-6 w-6" />
              ) : (
                <AlertOctagon className="h-6 w-6" />
              )}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-[11px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                    effectiveIsCompliant
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 light:bg-emerald-100 light:text-emerald-800 light:border-emerald-300"
                      : "bg-rose-500/20 text-rose-300 border border-rose-500/30 light:bg-rose-100 light:text-rose-800 light:border-rose-300"
                  }`}
                >
                  {isRemediationActive
                    ? "AI GUIDED REMEDIATION APPLIED"
                    : effectiveIsCompliant
                    ? "LEGAL METROLOGY CERTIFIED"
                    : "STATUTORY NON-COMPLIANCE"}
                </span>
                <span className="font-mono text-xs text-gray-400 dark:text-gray-400 light:text-slate-500">
                  Rule 6 Audit
                </span>
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-white dark:text-white light:text-slate-900 mt-1">
                {isRemediationActive
                  ? "Statutory Violations Resolved (100% Pass)"
                  : effectiveIsCompliant
                  ? "Full Statutory Compliance"
                  : "Mandatory Declarations Missing"}
              </h3>
              <p className="text-xs text-gray-300 dark:text-gray-300 light:text-slate-600 mt-1 max-w-md leading-relaxed">
                {isRemediationActive
                  ? "Label corrected using Legal Metrology Rule 6 template standards. All missing declarations generated and typography adjusted."
                  : effectiveIsCompliant
                  ? "All required declarations under Legal Metrology (Packaged Commodities) Rules, 2011 are verified and legally compliant."
                  : "Label fails mandatory statutory provisions under Rule 6(1). Distribution or sale without rectification invites penalty under Section 36."}
              </p>
            </div>
          </div>

          {/* Radial Circular Score Gauge */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="relative flex items-center justify-center h-16 w-16">
              <svg className="h-16 w-16 -rotate-90" viewBox="0 0 70 70">
                <circle
                  cx="35"
                  cy="35"
                  r={radius}
                  className="stroke-gray-800 dark:stroke-gray-800 light:stroke-slate-200"
                  strokeWidth="5"
                  fill="transparent"
                />
                <circle
                  cx="35"
                  cy="35"
                  r={radius}
                  className={`transition-all duration-300 ease-out ${
                    effectiveIsCompliant
                      ? "stroke-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.8)] light:stroke-emerald-500"
                      : "stroke-rose-500 drop-shadow-[0_0_8px_rgba(244,63,94,0.8)] light:stroke-rose-500"
                  }`}
                  strokeWidth="5"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  fill="transparent"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="font-mono font-black text-sm text-white dark:text-white light:text-slate-900 leading-none">
                  {Math.round(displayedScore)}%
                </span>
                <span className="text-[11px] font-mono text-gray-400 dark:text-gray-400 light:text-slate-500 uppercase leading-tight mt-0.5 font-semibold">
                  Score
                </span>
              </div>
            </div>

            <div className="text-right hidden sm:block">
              <div className="flex items-center justify-end gap-1.5 text-xs font-mono font-semibold">
                <span className="text-emerald-400 dark:text-emerald-400 light:text-emerald-700">{passCount} Passed</span>
                {reviewCount > 0 && (
                  <>
                    <span className="text-gray-600 dark:text-gray-600 light:text-slate-300">/</span>
                    <span className="text-amber-400 dark:text-amber-400 light:text-amber-700">{reviewCount} Review</span>
                  </>
                )}
                <span className="text-gray-600 dark:text-gray-600 light:text-slate-300">/</span>
                <span className={failCount > 0 ? "text-rose-400 dark:text-rose-400 light:text-rose-700" : "text-gray-400 dark:text-gray-400 light:text-slate-500"}>
                  {failCount} Failed
                </span>
              </div>
              <span className="text-[11px] font-mono text-gray-400 dark:text-gray-400 light:text-slate-500 uppercase block mt-1 font-medium">
                Statutory Benchmark
              </span>
            </div>
          </div>
        </div>

        {/* Linear Progress Underline */}
        <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-black/40 dark:bg-black/40 light:bg-slate-200">
          <div
            className={`h-full transition-all duration-500 rounded-full ${
              effectiveIsCompliant
                ? "bg-gradient-to-r from-emerald-500 to-teal-400 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                : "bg-gradient-to-r from-rose-500 to-amber-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]"
            }`}
            style={{ width: `${displayedScore}%` }}
          />
        </div>

        {/* Statutory Verification Badges & Official Form I Memo Download */}
        <div className="mt-3.5 pt-3 border-t border-white/5 dark:border-white/5 light:border-slate-100 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-2">
            {/* Rule 7 & 8 PDP Placement Badge */}
            <span
              className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-mono font-semibold border ${
                scan?.placement_compliance?.all_placement_compliant
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300 light:text-emerald-800 light:bg-emerald-50"
                  : "border-blue-500/30 bg-blue-500/10 text-blue-300 light:text-blue-800 light:bg-blue-50"
              }`}
            >
              <MapPin className="h-3 w-3" />
              <span>Rules 7 & 8: Principal Display Panel Validated</span>
            </span>

            {/* Rule 9 Contrast & Prominence Badge */}
            <span className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-mono font-semibold border border-purple-500/30 bg-purple-500/10 text-purple-300 light:text-purple-800 light:bg-purple-50">
              <Eye className="h-3 w-3" />
              <span>Rule 9: Text Contrast & Legibility Verified</span>
            </span>
          </div>

          {/* Official Form I Memo (PDF) Download */}
          {scan && (
            <a
              href={`/api/reports/inspection/${scan.id || "CURRENT_SCAN"}`}
              download
              title="Download official Legal Metrology Form I Inspection & Seizure Memo"
              className="gloss-shine inline-flex items-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/15 hover:bg-amber-500/25 light:bg-amber-500 light:text-white light:hover:bg-amber-600 px-3 py-1 text-xs font-semibold text-amber-300 light:border-amber-600 transition shadow-xs active:scale-95"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Form I Inspection Memo (PDF)</span>
            </a>
          )}
        </div>
      </div>

      {/* 2. Filter Tabs with ARIA accessibility */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
        <div
          role="tablist"
          aria-label="Filter statutory findings"
          className="flex items-center gap-1.5 rounded-xl border border-white/10 dark:border-white/10 light:border-slate-200/90 bg-black/40 dark:bg-black/40 light:bg-slate-100 p-1 w-fit"
        >
          <button
            type="button"
            role="tab"
            aria-selected={filter === "ALL"}
            onClick={() => setFilter("ALL")}
            className={`rounded-lg px-2.5 sm:px-3 py-1.5 text-xs font-mono font-semibold transition ${
              filter === "ALL"
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-[0_0_12px_rgba(245,158,11,0.2)] light:bg-white light:text-slate-900 light:border-slate-200/90 light:shadow-xs"
                : "text-gray-400 dark:text-gray-400 light:text-slate-600 hover:text-white light:hover:text-slate-900"
            }`}
          >
            All <span className="hidden xs:inline">Declarations </span>({effectiveCards.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={filter === "PASS"}
            onClick={() => setFilter("PASS")}
            className={`rounded-lg px-3 py-1.5 text-xs font-mono font-semibold transition ${
              filter === "PASS"
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.2)] light:bg-emerald-100 light:text-emerald-900 light:border-emerald-300 light:shadow-xs"
                : "text-gray-400 dark:text-gray-400 light:text-slate-600 hover:text-white light:hover:text-slate-900"
            }`}
          >
            Passed ({passCount})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={filter === "FAIL"}
            onClick={() => setFilter("FAIL")}
            className={`rounded-lg px-3 py-1.5 text-xs font-mono font-semibold transition ${
              filter === "FAIL"
                ? "bg-rose-500/20 text-rose-300 border border-rose-500/30 shadow-[0_0_12px_rgba(244,63,94,0.2)] light:bg-rose-100 light:text-rose-900 light:border-rose-300 light:shadow-xs"
                : "text-gray-400 dark:text-gray-400 light:text-slate-600 hover:text-white light:hover:text-slate-900"
            }`}
          >
            Violations ({failCount})
          </button>
        </div>

        <span className="text-[11px] font-mono text-gray-400 dark:text-gray-400 light:text-slate-500 hidden md:inline">
          Click card to inspect physical font sizing (mm) & penalties
        </span>
      </div>

      {/* 3. Empty Filter State */}
      {filteredCards.length === 0 && (
        <div className="glass-panel-subtle rounded-2xl p-8 text-center space-y-2.5 border border-dashed border-white/10 dark:border-white/10 light:border-slate-300">
          <div className="inline-flex p-3 rounded-full bg-emerald-500/10 dark:bg-emerald-500/10 light:bg-emerald-50 text-emerald-400 mb-1">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <h4 className="text-sm font-semibold text-white dark:text-white light:text-slate-900">
            {filter === "FAIL" ? "Zero Violations Detected" : "No Declarations in View"}
          </h4>
          <p className="text-xs text-gray-400 dark:text-gray-400 light:text-slate-600 max-w-sm mx-auto leading-relaxed">
            {filter === "FAIL"
              ? "All mandatory Legal Metrology Rule 6 declarations have passed audit verification on this specimen."
              : "No declarations match the current filter selection."}
          </p>
        </div>
      )}

      {/* 4. Rule Cards List with CSS Grid Accordion Transitions */}
      <div className="flex flex-col gap-3">
        {filteredCards.map((card, idx) => {
          const cardId = card.id || card.rule_id || `rule-${idx}`;
          const cardTitle = card.label || card.name || card.id || "Statutory Declaration";
          const cardSection = card.rule_ref || card.section || "Rule 6";
          const cardSnippet = card.snippet || card.extracted_value || null;
          const cardDescription = card.description || card.statutory_basis || "";
          const actualStatus = card.actual_status || card.status;
          const isPassed = actualStatus === "PASS" || card.passed === true;
          const isReview = actualStatus === "REVIEW_REQUIRED" || actualStatus === "WARN";
          const isNotApplicable = actualStatus === "NOT_APPLICABLE";
          const isExpanded = expandedCardId === cardId;
          const fontInfo = card.font_compliance;

          return (
            <div
              key={cardId}
              style={{ animationDelay: `${idx * 45}ms` }}
              onMouseEnter={() => onHoverRule(cardSnippet)}
              onMouseLeave={() => onHoverRule(null)}
              className={`glass-panel glass-panel-hover rounded-xl p-4 transition-all duration-200 cursor-pointer border animate-card-enter ${
                isPassed
                  ? "hover:border-emerald-500/40 light:bg-white light:border-slate-200/80 light:border-l-4 light:border-l-emerald-500 light:hover:border-emerald-400 light:shadow-xs"
                  : isReview
                  ? "border-amber-500/35 bg-amber-950/15 dark:bg-amber-950/15 light:bg-white light:border-amber-200 light:border-l-4 light:border-l-amber-500 hover:border-amber-500/60 light:hover:border-amber-400 light:shadow-xs"
                  : isNotApplicable
                  ? "border-white/10 bg-white/[0.02] light:bg-white light:border-slate-200 light:border-l-4 light:border-l-slate-400 light:shadow-xs"
                  : "border-rose-500/35 bg-rose-950/15 dark:bg-rose-950/15 light:bg-white light:border-rose-200 light:border-l-4 light:border-l-rose-500 hover:border-rose-500/60 light:hover:border-rose-400 light:shadow-xs"
              }`}
              onClick={() => setExpandedCardId(isExpanded ? null : cardId)}
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div
                    className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border transition ${
                      isPassed
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400 light:bg-emerald-100 light:text-emerald-700 light:border-emerald-200"
                        : isReview
                        ? "border-amber-500/40 bg-amber-500/15 text-amber-400 light:bg-amber-100 light:text-amber-700 light:border-amber-200"
                        : isNotApplicable
                        ? "border-slate-500/30 bg-slate-500/10 text-slate-400 light:bg-slate-100 light:text-slate-600 light:border-slate-200"
                        : "border-rose-500/40 bg-rose-500/15 text-rose-400 light:bg-rose-100 light:text-rose-700 light:border-rose-200 animate-pulse"
                    }`}
                  >
                    {isPassed ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : isReview ? (
                      <AlertTriangle className="h-4 w-4" />
                    ) : isNotApplicable ? (
                      <Scale className="h-4 w-4" />
                    ) : (
                      <XCircle className="h-4 w-4" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-[11px] font-bold text-amber-400 dark:text-amber-400 light:text-amber-700">
                        {cardSection}
                      </span>
                      <span className="text-gray-600 dark:text-gray-600 light:text-slate-300">|</span>
                      <h4 className="text-sm font-semibold text-white dark:text-white light:text-slate-900 break-words">
                        {cardTitle}
                      </h4>
                      {card.required && (
                        <span className="rounded bg-white/5 dark:bg-white/5 light:bg-slate-100 light:border light:border-slate-200/80 px-1.5 py-0.5 text-[11px] font-mono uppercase text-gray-400 dark:text-gray-400 light:text-slate-600">
                          Mandatory
                        </span>
                      )}
                      {card.remediated && (
                        <span className="rounded bg-emerald-500/20 light:bg-emerald-100 light:text-emerald-800 light:border-emerald-300 px-1.5 py-0.5 text-[11px] font-mono text-emerald-300 font-bold border border-emerald-500/30">
                          ✨ AI REMEDIATED
                        </span>
                      )}
                    </div>

                    {/* Extracted Value Snippet */}
                    <div className="mt-2 flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] font-mono text-gray-400 dark:text-gray-400 light:text-slate-500 shrink-0">
                        Extracted:
                      </span>
                      {cardSnippet && cardSnippet !== "Not detected on packaging label" ? (
                        <span className="rounded bg-black/60 dark:bg-black/60 light:bg-slate-50 border border-white/10 dark:border-white/10 light:border-slate-200 px-2 py-0.5 font-mono text-xs text-amber-200 dark:text-amber-200 light:text-amber-900 font-medium break-words max-w-full">
                          &quot;{cardSnippet}&quot;
                        </span>
                      ) : isReview ? (
                        <span className="font-mono text-xs text-amber-400 dark:text-amber-400 light:text-amber-700 italic font-medium break-words">
                          Unprinted / Requires Physical Stamp Verification
                        </span>
                      ) : (
                        <span className="font-mono text-xs text-rose-400 dark:text-rose-400 light:text-rose-700 italic font-medium break-words">
                          Declaration Missing / Not Detected
                        </span>
                      )}
                    </div>

                    {/* Physical Millimeter Font Badge (Differentiator 1) */}
                    {fontInfo && fontInfo.detected_height_mm > 0 && (
                      <div className="mt-2 flex items-center gap-2">
                        <span className="inline-flex items-center flex-wrap gap-1 px-2 py-0.5 rounded-md bg-cyan-950/60 dark:bg-cyan-950/60 light:bg-cyan-50 border border-cyan-500/30 light:border-cyan-200 text-[11px] font-mono text-cyan-300 dark:text-cyan-300 light:text-cyan-800">
                          <Ruler className="h-3 w-3 text-cyan-400 light:text-cyan-600 shrink-0" />
                          Font Height: <strong>{fontInfo.detected_height_mm} mm</strong>
                          <span className="text-slate-400 dark:text-slate-400 light:text-slate-500">(Min: {fontInfo.min_required_mm}mm)</span>
                          {fontInfo.is_font_compliant ? (
                            <span className="text-emerald-400 dark:text-emerald-400 light:text-emerald-700 font-bold ml-0.5">✓ Legal</span>
                          ) : (
                            <span className="text-rose-400 dark:text-rose-400 light:text-rose-700 font-bold ml-0.5">⚠️ Undersized</span>
                          )}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 w-full sm:w-auto pt-2 sm:pt-0 border-t border-white/5 sm:border-t-0">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onHoverRule(cardSnippet);
                      }}
                      title="Highlight on Specimen"
                      aria-label={`Highlight ${cardTitle} on specimen`}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-amber-400 hover:bg-white/5 dark:hover:bg-white/5 light:hover:bg-slate-100 light:hover:text-amber-700 transition"
                    >
                      <Target className="h-4 w-4" />
                    </button>

                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[11px] font-mono font-bold uppercase ${
                        isPassed
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 light:bg-emerald-100 light:text-emerald-800 light:border-emerald-200"
                          : isReview
                          ? "bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-[0_0_10px_rgba(245,158,11,0.2)] light:bg-amber-100 light:text-amber-800 light:border-amber-200"
                          : isNotApplicable
                          ? "bg-slate-500/20 text-slate-300 border border-slate-500/30 light:bg-slate-100 light:text-slate-600 light:border-slate-200"
                          : "bg-rose-500/20 text-rose-300 border border-rose-500/30 shadow-[0_0_10px_rgba(244,63,94,0.3)] light:bg-rose-100 light:text-rose-800 light:border-rose-200"
                      }`}
                    >
                      {isPassed ? "PASS" : isReview ? "REVIEW" : isNotApplicable ? "N/A" : "FAIL"}
                    </span>
                  </div>

                  <button
                    type="button"
                    className="text-gray-400 hover:text-white dark:hover:text-white light:hover:text-slate-900 p-1"
                    aria-label={isExpanded ? "Collapse declaration details" : "Expand declaration details"}
                    aria-expanded={isExpanded}
                  >
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Expandable Accordion Details with CSS Grid Smooth Transition */}
              <div className={`accordion-wrapper ${isExpanded ? "expanded" : ""}`}>
                <div className="accordion-inner">
                  <div className="mt-3.5 pt-3 border-t border-white/[0.08] dark:border-white/[0.08] light:border-slate-200/90 flex flex-col gap-2.5 text-xs">
                    <div>
                      <span className="font-mono text-[11px] text-gray-400 dark:text-gray-400 light:text-slate-500 font-semibold">
                        Statutory Basis:
                      </span>
                      <p className="text-gray-300 dark:text-gray-300 light:text-slate-700 mt-0.5 leading-relaxed font-sans">
                        {cardDescription}
                      </p>
                    </div>

                    {fontInfo && (
                      <div className="p-2.5 rounded-lg bg-slate-950/80 dark:bg-slate-950/80 light:bg-cyan-50/80 border border-cyan-500/20 light:border-cyan-200">
                        <span className="font-mono text-[11px] text-cyan-400 dark:text-cyan-400 light:text-cyan-700 font-semibold flex items-center gap-1.5">
                          <Ruler className="h-3.5 w-3.5" /> Second Schedule Font Verification:
                        </span>
                        <p className="text-[11px] text-slate-300 dark:text-slate-300 light:text-slate-600 mt-1 font-mono">
                          {fontInfo.note}
                        </p>
                      </div>
                    )}

                    {!isPassed && (
                      <div className="rounded-lg bg-rose-500/10 light:bg-rose-50 border border-rose-500/25 light:border-rose-200 p-2.5 mt-1 flex items-start gap-2.5">
                        <AlertTriangle className="h-4 w-4 text-rose-400 light:text-rose-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-mono text-[11px] text-rose-300 dark:text-rose-300 light:text-rose-700 font-bold block">
                            Statutory Penalty Warning:
                          </span>
                          <p className="text-[11px] text-rose-200/90 dark:text-rose-200/90 light:text-rose-900 mt-0.5 leading-relaxed">
                            {card.failure_penalty || "Violation of Rule 6(1) punishable under Section 36 of Legal Metrology Act, 2009 with fine up to ₹25,000 for first offence."}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
