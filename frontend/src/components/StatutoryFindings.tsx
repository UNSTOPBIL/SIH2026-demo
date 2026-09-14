"use client";

import React, { useState } from "react";
import {
  ShieldCheck,
  AlertOctagon,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  Scale,
  Sparkles,
  Info,
  Target,
  AlertTriangle,
  Ruler,
  AlertCircle,
} from "lucide-react";
import { ScanResponse, RuleCard } from "../types/scanner";

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

  if (isLoading) {
    return (
      <div className="glass-panel flex flex-col items-center justify-center rounded-2xl p-12 min-h-[460px] text-center relative overflow-hidden">
        <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-amber-500/10 blur-3xl animate-pulse" />
        <div className="relative mb-6">
          <div className="h-16 w-16 rounded-full border-4 border-amber-500/20 border-t-amber-500 animate-spin" />
          <Scale className="absolute inset-0 m-auto h-7 w-7 text-amber-400 animate-pulse" />
        </div>
        <h3 className="text-base font-semibold text-white">Performing Statutory Audit</h3>
        <p className="text-xs text-gray-400 mt-1.5 max-w-sm leading-relaxed">
          PaddleOCR PP-OCRv4 is extracting packaging text lines while the deterministic rule engine evaluates statutory compliance under Rule 6...
        </p>
      </div>
    );
  }

  if (!scan) {
    return (
      <div className="glass-panel flex flex-col items-center justify-center rounded-2xl p-12 min-h-[460px] text-center text-gray-500">
        <Scale className="h-12 w-12 text-gray-600 mb-3 stroke-[1.2]" />
        <p className="text-sm font-medium text-gray-400">Statutory Engine Standing By</p>
        <p className="text-xs text-gray-600 mt-1 max-w-xs">
          Load a packaging specimen on the left to review mandatory Legal Metrology declarations.
        </p>
      </div>
    );
  }

  const effectiveCards = cardsOverride || scan.cards;
  const effectiveScore = scoreOverride !== undefined && scoreOverride !== null ? scoreOverride : scan.score_percentage;
  const effectiveIsCompliant = isRemediationActive ? true : scan.is_compliant;
  const { summary, repeat_offender, font_compliance } = scan;

  const filteredCards = effectiveCards.filter((card) => {
    const isPassed = card.status === "PASS" || card.passed === true;
    if (filter === "PASS") return isPassed;
    if (filter === "FAIL") return !isPassed;
    return true;
  });

  const passCount = effectiveCards.filter((c) => c.status === "PASS" || c.passed === true).length;
  const failCount = effectiveCards.length - passCount;

  // Circular gauge calculations (radius 28, perimeter ~175.9)
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (effectiveScore / 100) * circumference;

  return (
    <div className="flex flex-col gap-4">
      {/* Repeat-Offender Alert Banner (Differentiator 3) */}
      {repeat_offender && repeat_offender.is_repeat_offender && !isRemediationActive && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-rose-950/80 via-red-950/60 to-slate-900 border border-rose-500/50 shadow-xl shadow-rose-950/40 animate-pulse">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-400 text-lg shrink-0">
              ⚠️
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-rose-500/30 text-rose-300 border border-rose-500/40">
                  REPEAT OFFENDER ALERT • SEC 36(2)
                </span>
                <span className="text-xs font-mono text-rose-400 font-semibold">
                  {repeat_offender.offense_count} Prior Convictions Recorded
                </span>
              </div>
              <h4 className="text-sm font-bold text-white mt-1">
                {repeat_offender.entity_name}
              </h4>
              <p className="text-xs text-rose-200/90 mt-1 leading-relaxed">
                {repeat_offender.statutory_action}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 1. Verdict Hero Banner with Circular Radial Gauge */}
      <div
        className={`glass-panel rounded-2xl p-5 relative overflow-hidden transition-all duration-300 border ${
          effectiveIsCompliant
            ? "border-emerald-500/40 bg-gradient-to-br from-emerald-950/40 via-emerald-900/15 to-transparent shadow-[0_0_35px_rgba(16,185,129,0.18)]"
            : "border-rose-500/40 bg-gradient-to-br from-rose-950/40 via-rose-900/15 to-transparent shadow-[0_0_35px_rgba(244,63,94,0.18)]"
        }`}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border ${
                effectiveIsCompliant
                  ? "border-emerald-500/50 bg-emerald-500/20 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                  : "border-rose-500/50 bg-rose-500/20 text-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.3)]"
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
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                      : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                  }`}
                >
                  {isRemediationActive
                    ? "AI GUIDED REMEDIATION APPLIED"
                    : effectiveIsCompliant
                    ? "LEGAL METROLOGY CERTIFIED"
                    : "STATUTORY NON-COMPLIANCE"}
                </span>
                <span className="font-mono text-xs text-gray-400">
                  Rule 6 Audit
                </span>
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-white mt-1">
                {isRemediationActive
                  ? "Statutory Violations Resolved (100% Pass)"
                  : effectiveIsCompliant
                  ? "Full Statutory Compliance"
                  : "Mandatory Declarations Missing"}
              </h3>
              <p className="text-xs text-gray-300 mt-1 max-w-md leading-relaxed">
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
                  className="stroke-gray-800"
                  strokeWidth="5"
                  fill="transparent"
                />
                <circle
                  cx="35"
                  cy="35"
                  r={radius}
                  className={`transition-all duration-700 ease-out ${
                    effectiveIsCompliant
                      ? "stroke-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.8)]"
                      : "stroke-rose-500 drop-shadow-[0_0_8px_rgba(244,63,94,0.8)]"
                  }`}
                  strokeWidth="5"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  fill="transparent"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="font-mono font-black text-sm text-white leading-none">
                  {effectiveScore.toFixed(0)}%
                </span>
                <span className="text-[11px] font-mono text-gray-400 uppercase leading-tight mt-0.5">
                  Score
                </span>
              </div>
            </div>

            <div className="text-right hidden sm:block">
              <div className="flex items-center justify-end gap-1.5 text-xs font-mono font-semibold">
                <span className="text-emerald-400">{passCount} Passed</span>
                <span className="text-gray-600">/</span>
                <span className={failCount > 0 ? "text-rose-400" : "text-gray-400"}>
                  {failCount} Failed
                </span>
              </div>
              <span className="text-[11px] font-mono text-gray-400 uppercase block mt-1">
                Statutory Benchmark
              </span>
            </div>
          </div>
        </div>

        {/* Linear Progress Underline */}
        <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-black/40">
          <div
            className={`h-full transition-all duration-500 rounded-full ${
              effectiveIsCompliant
                ? "bg-gradient-to-r from-emerald-500 to-teal-400 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                : "bg-gradient-to-r from-rose-500 to-amber-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]"
            }`}
            style={{ width: `${effectiveScore}%` }}
          />
        </div>
      </div>

      {/* 2. Filter Tabs with ARIA accessibility */}
      <div className="flex items-center justify-between px-1">
        <div
          role="tablist"
          aria-label="Filter statutory findings"
          className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-black/40 p-1"
        >
          <button
            type="button"
            role="tab"
            aria-selected={filter === "ALL"}
            onClick={() => setFilter("ALL")}
            className={`rounded-lg px-3 py-1.5 text-xs font-mono font-semibold transition ${
              filter === "ALL"
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-[0_0_12px_rgba(245,158,11,0.2)]"
                : "text-gray-400 hover:text-white"
            }`}
          >
            All Declarations ({effectiveCards.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={filter === "PASS"}
            onClick={() => setFilter("PASS")}
            className={`rounded-lg px-3 py-1.5 text-xs font-mono font-semibold transition ${
              filter === "PASS"
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.2)]"
                : "text-gray-400 hover:text-white"
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
                ? "bg-rose-500/20 text-rose-300 border border-rose-500/30 shadow-[0_0_12px_rgba(244,63,94,0.2)]"
                : "text-gray-400 hover:text-white"
            }`}
          >
            Violations ({failCount})
          </button>
        </div>

        <span className="text-[11px] font-mono text-gray-500 hidden sm:inline">
          Click card to inspect physical font sizing (mm) & penalties
        </span>
      </div>

      {/* 3. Rule Cards List with Font Height & Remediation Tags */}
      <div className="flex flex-col gap-3">
        {filteredCards.map((card, idx) => {
          const cardId = card.id || card.rule_id || `rule-${idx}`;
          const cardTitle = card.label || card.name || card.id || "Statutory Declaration";
          const cardSection = card.rule_ref || card.section || "Rule 6";
          const cardSnippet = card.snippet || card.extracted_value || null;
          const cardDescription = card.description || card.statutory_basis || "";
          const isPassed = card.status === "PASS" || card.passed === true;
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
                  ? "hover:border-emerald-500/40"
                  : "border-rose-500/35 bg-rose-950/15 hover:border-rose-500/60"
              }`}
              onClick={() => setExpandedCardId(isExpanded ? null : cardId)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div
                    className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border transition ${
                      isPassed
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                        : "border-rose-500/40 bg-rose-500/15 text-rose-400 animate-pulse"
                    }`}
                  >
                    {isPassed ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <XCircle className="h-4 w-4" />
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-[11px] font-bold text-amber-400">
                        {cardSection}
                      </span>
                      <span className="text-gray-600">|</span>
                      <h4 className="text-sm font-semibold text-white">
                        {cardTitle}
                      </h4>
                      {card.required && (
                        <span className="rounded bg-white/5 px-1.5 py-0.5 text-[11px] font-mono uppercase text-gray-400">
                          Mandatory
                        </span>
                      )}
                      {card.remediated && (
                        <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-mono text-emerald-300 font-bold border border-emerald-500/30">
                          ✨ AI REMEDIATED
                        </span>
                      )}
                    </div>

                    {/* Extracted Value Snippet */}
                    <div className="mt-2 flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] font-mono text-gray-400">Extracted:</span>
                      {cardSnippet && cardSnippet !== "Not detected on packaging label" ? (
                        <span className="rounded bg-black/60 border border-white/10 px-2 py-0.5 font-mono text-xs text-amber-200 font-medium">
                          "{cardSnippet}"
                        </span>
                      ) : (
                        <span className="font-mono text-xs text-rose-400 italic">
                          Declaration Missing / Not Detected
                        </span>
                      )}
                    </div>

                    {/* Physical Millimeter Font Badge (Differentiator 1) */}
                    {fontInfo && fontInfo.detected_height_mm > 0 && (
                      <div className="mt-2 flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-cyan-950/60 border border-cyan-500/30 text-[11px] font-mono text-cyan-300">
                          <Ruler className="h-3 w-3 text-cyan-400" />
                          Font Height: <strong>{fontInfo.detected_height_mm} mm</strong>
                          <span className="text-slate-400">(Min: {fontInfo.min_required_mm}mm)</span>
                          {fontInfo.is_font_compliant ? (
                            <span className="text-emerald-400 font-bold ml-0.5">✓ Legal</span>
                          ) : (
                            <span className="text-rose-400 font-bold ml-0.5">⚠️ Undersized</span>
                          )}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onHoverRule(cardSnippet);
                    }}
                    title="Highlight on Specimen"
                    aria-label={`Highlight ${cardTitle} on specimen`}
                    className="p-1 rounded text-gray-400 hover:text-amber-400 hover:bg-white/5 transition"
                  >
                    <Target className="h-3.5 w-3.5" />
                  </button>

                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[11px] font-mono font-bold uppercase ${
                      isPassed
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                        : "bg-rose-500/20 text-rose-300 border border-rose-500/30 shadow-[0_0_10px_rgba(244,63,94,0.3)]"
                    }`}
                  >
                    {isPassed ? "PASS" : "FAIL"}
                  </span>

                  <button
                    type="button"
                    className="text-gray-400 hover:text-white p-1"
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

              {/* Expandable Accordion Details */}
              {isExpanded && (
                <div className="mt-3.5 pt-3 border-t border-white/[0.08] flex flex-col gap-2.5 text-xs animate-card-enter">
                  <div>
                    <span className="font-mono text-[11px] text-gray-400 font-semibold">
                      Statutory Basis:
                    </span>
                    <p className="text-gray-300 mt-0.5 leading-relaxed font-sans">
                      {cardDescription}
                    </p>
                  </div>

                  {fontInfo && (
                    <div className="p-2.5 rounded-lg bg-slate-950/80 border border-cyan-500/20">
                      <span className="font-mono text-[11px] text-cyan-400 font-semibold flex items-center gap-1.5">
                        <Ruler className="h-3.5 w-3.5" /> Second Schedule Font Verification:
                      </span>
                      <p className="text-[11px] text-slate-300 mt-1 font-mono">
                        {fontInfo.note}
                      </p>
                    </div>
                  )}

                  {!isPassed && (
                    <div className="rounded-lg bg-rose-500/10 border border-rose-500/25 p-2.5 mt-1 flex items-start gap-2.5">
                      <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-mono text-[11px] text-rose-300 font-bold block">
                          Statutory Penalty Warning:
                        </span>
                        <p className="text-[11px] text-rose-200/90 mt-0.5 leading-relaxed">
                          {card.failure_penalty || "Violation of Rule 6(1) punishable under Section 36 of Legal Metrology Act, 2009 with fine up to ₹25,000 for first offence."}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
