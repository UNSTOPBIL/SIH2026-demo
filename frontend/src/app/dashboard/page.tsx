"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  FileSpreadsheet,
  Download,
  Building2,
  Calendar,
  Layers,
  ArrowUpRight,
  TrendingUp,
  RefreshCw,
  Search,
  Scale,
  Sun,
  Moon,
  Home,
  CheckCircle2,
  FileText
} from "lucide-react";

interface AnalyticsData {
  kpis: {
    total_inspections: number;
    today_inspections: number;
    month_inspections: number;
    compliance_rate: number;
    violation_rate: number;
    compliant_count: number;
    review_count: number;
    violation_count: number;
    estimated_compounding_fines_inr: number;
  };
  verdict_distribution: {
    COMPLIANT: number;
    REVIEW_REQUIRED: number;
    POTENTIAL_VIOLATION: number;
  };
  rule_breakdown: Array<{
    rule_id: string;
    label: string;
    total: number;
    pass: number;
    review: number;
    fail: number;
    failure_rate: number;
  }>;
  category_breakdown: Array<{
    category: string;
    total: number;
    passed: number;
    failed: number;
    compliance_rate: number;
  }>;
  top_violators: Array<{
    entity_name: string;
    offense_count: number;
    risk_tier: string;
    statutory_action: string;
  }>;
  recent_inspections: Array<{
    id: string;
    timestamp: string;
    inspector_id: string;
    brand: string;
    product_name: string;
    category: string;
    verdict: string;
    score: number;
  }>;
}

export default function DashboardPage() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [searchQuery, setSearchQuery] = useState<string>("");

  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem("sih_theme") as "dark" | "light" | null;
      if (savedTheme) {
        setTheme(savedTheme);
        applyTheme(savedTheme);
      }
    } catch {
      // ignore
    }
    fetchAnalytics();
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
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    try {
      localStorage.setItem("sih_theme", next);
    } catch {}
    applyTheme(next);
  };

  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/enforcement/analytics");
      if (!res.ok) {
        throw new Error(`Failed to load analytics: ${res.statusText}`);
      }
      const data = await res.json();
      setAnalytics(data);
    } catch (e: any) {
      setError(e.message || "Failed to communicate with enforcement API");
    } finally {
      setLoading(false);
    }
  };

  const filteredRecent = (analytics?.recent_inspections || []).filter((item) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.brand?.toLowerCase().includes(q) ||
      item.product_name?.toLowerCase().includes(q) ||
      item.id?.toLowerCase().includes(q) ||
      item.category?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-[#08090d] light:bg-[#f8fafc] text-gray-100 light:text-slate-800 transition-colors duration-200">
      {/* Top Operations Header */}
      <header className="sticky top-0 z-30 border-b border-white/10 light:border-slate-200/90 bg-[#08090d]/80 light:bg-white/85 backdrop-blur-md px-4 sm:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 light:bg-amber-500/15 border border-amber-500/30 text-amber-400 light:text-amber-700 shadow-sm">
              <Scale className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold tracking-widest text-amber-500 light:text-amber-600 uppercase">
                  GOVERNMENT OF INDIA • LEGAL METROLOGY DIVISION
                </span>
                <span className="rounded bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.5 text-[10px] font-mono text-emerald-400 light:text-emerald-700">
                  LIVE OPERATIONS
                </span>
              </div>
              <h1 className="text-base sm:text-lg font-bold tracking-tight text-white light:text-slate-900">
                Enforcement Official Operations & Analytics Dashboard
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            {/* Quick Navigation Links */}
            <Link
              href="/"
              className="flex items-center gap-1.5 rounded-lg border border-white/10 light:border-slate-200 bg-white/[0.04] light:bg-white px-3 py-1.5 text-xs font-medium text-gray-300 light:text-slate-700 transition hover:bg-white/[0.08] light:hover:bg-slate-50"
            >
              <Home className="h-3.5 w-3.5" />
              <span>Scanner</span>
            </Link>

            <Link
              href="/history"
              className="flex items-center gap-1.5 rounded-lg border border-white/10 light:border-slate-200 bg-white/[0.04] light:bg-white px-3 py-1.5 text-xs font-medium text-gray-300 light:text-slate-700 transition hover:bg-white/[0.08] light:hover:bg-slate-50"
            >
              <Layers className="h-3.5 w-3.5" />
              <span>Repository</span>
            </Link>

            {/* CSV Export Button */}
            <a
              href="/api/exports/scans.csv"
              download
              className="flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 light:bg-emerald-600 light:text-white px-3 py-1.5 text-xs font-semibold text-emerald-400 light:border-emerald-600 transition hover:bg-emerald-500/20 active:scale-95"
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              <span>Export CSV</span>
            </a>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              type="button"
              aria-label="Toggle Theme"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 light:border-slate-200 bg-white/[0.04] light:bg-white text-gray-300 light:text-slate-700 transition hover:bg-white/[0.08]"
            >
              {theme === "dark" ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-slate-700" />}
            </button>

            {/* Refresh */}
            <button
              onClick={fetchAnalytics}
              disabled={loading}
              type="button"
              aria-label="Refresh Dashboard"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 light:border-slate-200 bg-white/[0.04] light:bg-white text-gray-300 light:text-slate-700 transition hover:bg-white/[0.08] disabled:opacity-40"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin text-amber-400" : ""}`} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-8 py-6 space-y-6">
        {/* Error Notification */}
        {error && (
          <div className="p-4 rounded-xl border border-red-500/30 bg-red-500/10 text-red-300 light:text-red-700 text-sm flex items-center justify-between">
            <span>{error}</span>
            <button onClick={fetchAnalytics} className="underline text-xs">Retry</button>
          </div>
        )}

        {/* 4 Hero KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* KPI 1: Total Inspections */}
          <div className="rounded-2xl border border-white/10 light:border-slate-200/90 bg-white/[0.03] light:bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-400 light:text-slate-500">Total Inspections</span>
              <span className="rounded-full bg-blue-500/10 light:bg-blue-50 text-blue-400 light:text-blue-700 px-2 py-0.5 text-[11px] font-semibold">
                All Jurisdictions
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-bold font-mono tracking-tight text-white light:text-slate-900">
                {analytics?.kpis.total_inspections ?? "—"}
              </span>
              <span className="text-xs font-mono text-emerald-400 light:text-emerald-700">
                +{analytics?.kpis.today_inspections ?? 0} today
              </span>
            </div>
            <p className="mt-1 text-[11px] text-gray-400 light:text-slate-500">
              Verified under Legal Metrology Act, 2009
            </p>
          </div>

          {/* KPI 2: Statutory Compliance Rate */}
          <div className="rounded-2xl border border-white/10 light:border-slate-200/90 bg-white/[0.03] light:bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-400 light:text-slate-500">Statutory Compliance</span>
              <span className="rounded-full bg-emerald-500/10 light:bg-emerald-50 text-emerald-400 light:text-emerald-700 px-2 py-0.5 text-[11px] font-semibold">
                {analytics?.kpis.compliant_count ?? 0} Certified
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-bold font-mono tracking-tight text-emerald-400 light:text-emerald-700">
                {analytics?.kpis.compliance_rate ? `${analytics.kpis.compliance_rate}%` : "—"}
              </span>
              <span className="text-xs text-gray-400 light:text-slate-500">pass benchmark</span>
            </div>
            <p className="mt-1 text-[11px] text-gray-400 light:text-slate-500">
              Rule 6 full 11-declaration conformity
            </p>
          </div>

          {/* KPI 3: Non-Compliance & Seizure Rate */}
          <div className="rounded-2xl border border-white/10 light:border-slate-200/90 bg-white/[0.03] light:bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-400 light:text-slate-500">Violations & Seizures</span>
              <span className="rounded-full bg-red-500/10 light:bg-red-50 text-red-400 light:text-red-700 px-2 py-0.5 text-[11px] font-semibold">
                Section 15 Actions
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-bold font-mono tracking-tight text-red-400 light:text-red-700">
                {analytics?.kpis.violation_count ?? "—"}
              </span>
              <span className="text-xs text-amber-400 light:text-amber-700 font-mono">
                +{analytics?.kpis.review_count ?? 0} on hold
              </span>
            </div>
            <p className="mt-1 text-[11px] text-gray-400 light:text-slate-500">
              Contravening mandatory packaging rules
            </p>
          </div>

          {/* KPI 4: Compounding Fines Assessed */}
          <div className="rounded-2xl border border-white/10 light:border-slate-200/90 bg-white/[0.03] light:bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-400 light:text-slate-500">Compounding Fines</span>
              <span className="rounded-full bg-amber-500/10 light:bg-amber-50 text-amber-400 light:text-amber-700 px-2 py-0.5 text-[11px] font-semibold">
                Section 36(1)
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-bold font-mono tracking-tight text-amber-400 light:text-amber-700">
                ₹{(analytics?.kpis.estimated_compounding_fines_inr ?? 0).toLocaleString("en-IN")}
              </span>
            </div>
            <p className="mt-1 text-[11px] text-gray-400 light:text-slate-500">
              Statutory penalty liability assessed
            </p>
          </div>
        </div>

        {/* Middle Section: Verdict Distribution & Top Rule Infractions */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Verdict Breakdown */}
          <div className="lg:col-span-4 rounded-2xl border border-white/10 light:border-slate-200/90 bg-white/[0.03] light:bg-white p-6 shadow-sm flex flex-col justify-between">
            <div>
              <h2 className="text-sm font-semibold text-white light:text-slate-900 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-amber-400 light:text-amber-600" />
                Statutory Verdict Distribution
              </h2>
              <p className="text-xs text-gray-400 light:text-slate-500 mt-1">
                Field inspection results across all monitored packaged goods.
              </p>

              <div className="mt-6 space-y-4">
                {/* Compliant Bar */}
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-emerald-400 light:text-emerald-700 font-medium flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-emerald-400"></span> Fully Compliant
                    </span>
                    <span className="font-mono text-gray-300 light:text-slate-700">
                      {analytics?.verdict_distribution.COMPLIANT ?? 0} (
                      {analytics?.kpis.total_inspections
                        ? Math.round(((analytics.verdict_distribution.COMPLIANT || 0) / analytics.kpis.total_inspections) * 100)
                        : 0}%)
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-white/10 light:bg-slate-100 overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                      style={{
                        width: `${
                          analytics?.kpis.total_inspections
                            ? ((analytics.verdict_distribution.COMPLIANT || 0) / analytics.kpis.total_inspections) * 100
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>

                {/* Review Required Bar */}
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-amber-400 light:text-amber-700 font-medium flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-amber-400"></span> Review Required / Unstamped
                    </span>
                    <span className="font-mono text-gray-300 light:text-slate-700">
                      {analytics?.verdict_distribution.REVIEW_REQUIRED ?? 0} (
                      {analytics?.kpis.total_inspections
                        ? Math.round(((analytics.verdict_distribution.REVIEW_REQUIRED || 0) / analytics.kpis.total_inspections) * 100)
                        : 0}%)
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-white/10 light:bg-slate-100 overflow-hidden">
                    <div
                      className="h-full bg-amber-500 rounded-full transition-all duration-500"
                      style={{
                        width: `${
                          analytics?.kpis.total_inspections
                            ? ((analytics.verdict_distribution.REVIEW_REQUIRED || 0) / analytics.kpis.total_inspections) * 100
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>

                {/* Violation Bar */}
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-red-400 light:text-red-700 font-medium flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-red-400"></span> Statutory Violation (Section 15)
                    </span>
                    <span className="font-mono text-gray-300 light:text-slate-700">
                      {analytics?.verdict_distribution.POTENTIAL_VIOLATION ?? 0} (
                      {analytics?.kpis.total_inspections
                        ? Math.round(((analytics.verdict_distribution.POTENTIAL_VIOLATION || 0) / analytics.kpis.total_inspections) * 100)
                        : 0}%)
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-white/10 light:bg-slate-100 overflow-hidden">
                    <div
                      className="h-full bg-red-500 rounded-full transition-all duration-500"
                      style={{
                        width: `${
                          analytics?.kpis.total_inspections
                            ? ((analytics.verdict_distribution.POTENTIAL_VIOLATION || 0) / analytics.kpis.total_inspections) * 100
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-white/10 light:border-slate-100 flex items-center justify-between text-xs text-gray-400 light:text-slate-500">
              <span>Jurisdiction: Maharashtra Central</span>
              <span className="font-mono text-[11px] text-amber-400 light:text-amber-700">DLMO Division 4</span>
            </div>
          </div>

          {/* Right: Rule 6 Sub-Rule Infraction Breakdown */}
          <div className="lg:col-span-8 rounded-2xl border border-white/10 light:border-slate-200/90 bg-white/[0.03] light:bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold text-white light:text-slate-900 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-red-400 light:text-red-600" />
                  Top Contravened Statutory Declarations (Rule 6 Ranking)
                </h2>
                <p className="text-xs text-gray-400 light:text-slate-500 mt-0.5">
                  Proportion of packaging defects detected across all evaluated statutory cards.
                </p>
              </div>
              <span className="text-[11px] font-mono text-gray-400 light:text-slate-500">
                11 Rules Monitored
              </span>
            </div>

            <div className="space-y-3">
              {(analytics?.rule_breakdown || []).slice(0, 6).map((rule, idx) => {
                const failCount = rule.fail;
                const reviewCount = rule.review;
                const total = rule.total || 1;
                const failPct = Math.round((failCount / total) * 100);
                const reviewPct = Math.round((reviewCount / total) * 100);

                return (
                  <div key={rule.rule_id} className="text-xs">
                    <div className="flex justify-between items-center mb-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-gray-500 text-[11px]">#{idx + 1}</span>
                        <span className="font-medium text-gray-200 light:text-slate-800">{rule.label}</span>
                      </div>
                      <div className="flex items-center gap-3 font-mono text-[11px]">
                        {failCount > 0 && (
                          <span className="text-red-400 light:text-red-700 font-semibold">
                            {failCount} Fail ({failPct}%)
                          </span>
                        )}
                        {reviewCount > 0 && (
                          <span className="text-amber-400 light:text-amber-700">
                            {reviewCount} Review ({reviewPct}%)
                          </span>
                        )}
                        <span className="text-emerald-400 light:text-emerald-700">{rule.pass} Pass</span>
                      </div>
                    </div>
                    {/* Multi-segment progress bar */}
                    <div className="h-1.5 w-full rounded-full bg-white/10 light:bg-slate-100 overflow-hidden flex">
                      <div className="bg-emerald-500 h-full" style={{ width: `${(rule.pass / total) * 100}%` }} />
                      <div className="bg-amber-400 h-full" style={{ width: `${(reviewCount / total) * 100}%` }} />
                      <div className="bg-red-500 h-full" style={{ width: `${(failCount / total) * 100}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* High-Risk Repeat-Offender Entity Escalation Registry */}
        <div className="rounded-2xl border border-red-500/20 bg-red-950/10 light:bg-red-50/50 p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-4">
            <div>
              <h2 className="text-sm font-semibold text-red-300 light:text-red-900 flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-red-400 light:text-red-600" />
                Section 36(2) Repeat-Offender Escalation Registry
              </h2>
              <p className="text-xs text-red-200/70 light:text-red-800/80 mt-0.5">
                Entities with repeated packaging infractions subject to enhanced compounding fines or magistrate prosecution.
              </p>
            </div>
            <span className="rounded-lg bg-red-500/15 border border-red-500/30 px-2.5 py-1 text-xs font-mono font-bold text-red-400 light:text-red-700">
              HIGH SURVEILLANCE
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(analytics?.top_violators || []).map((v) => (
              <div
                key={v.entity_name}
                className="rounded-xl border border-red-500/20 bg-black/40 light:bg-white p-4 space-y-2 shadow-xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-xs font-bold text-white light:text-slate-900 line-clamp-1">{v.entity_name}</h3>
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] font-mono font-bold ${
                      v.risk_tier === "CRITICAL"
                        ? "bg-red-500 text-white"
                        : v.risk_tier === "HIGH"
                        ? "bg-amber-500 text-black"
                        : "bg-blue-500/20 text-blue-300 light:text-blue-800"
                    }`}
                  >
                    {v.risk_tier}
                  </span>
                </div>
                <div className="text-[11px] font-mono text-gray-400 light:text-slate-500">
                  Total Prior Offenses: <b className="text-red-400 light:text-red-700">{v.offense_count}</b>
                </div>
                <p className="text-[11px] text-gray-300 light:text-slate-600 line-clamp-2 leading-relaxed">
                  {v.statutory_action}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Live Field Inspections Feed & Form I Memos */}
        <div className="rounded-2xl border border-white/10 light:border-slate-200/90 bg-white/[0.03] light:bg-white p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-sm font-semibold text-white light:text-slate-900 flex items-center gap-2">
                <FileText className="h-4 w-4 text-amber-400 light:text-amber-600" />
                Live Field Inspection Log & Statutory Seizure Memos
              </h2>
              <p className="text-xs text-gray-400 light:text-slate-500 mt-0.5">
                Download court-admissible Form I Inspection Memos (PDF) with SHA-256 tamper seals for active cases.
              </p>
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-gray-400" />
              <input
                type="text"
                placeholder="Search brand, ID, or product..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-white/10 light:border-slate-200 bg-black/20 light:bg-slate-50 pl-8 pr-3 py-1.5 text-xs text-gray-200 light:text-slate-800 placeholder-gray-500 focus:outline-hidden focus:border-amber-500"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-white/10 light:border-slate-200 text-gray-400 light:text-slate-500 font-medium">
                <tr>
                  <th className="pb-2.5 px-3 font-medium whitespace-nowrap">Inspection ID</th>
                  <th className="pb-2.5 px-3 font-medium min-w-[200px]">Commodity Brand & Name</th>
                  <th className="pb-2.5 px-3 font-medium whitespace-nowrap">Category</th>
                  <th className="pb-2.5 px-3 font-medium whitespace-nowrap">Verdict</th>
                  <th className="pb-2.5 px-3 font-medium whitespace-nowrap">Score</th>
                  <th className="pb-2.5 px-3 font-medium whitespace-nowrap">Timestamp</th>
                  <th className="pb-2.5 px-3 font-medium text-right whitespace-nowrap">Statutory Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 light:divide-slate-100">
                {filteredRecent.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 px-3 text-center text-gray-500">
                      No inspections match the search query.
                    </td>
                  </tr>
                ) : (
                  filteredRecent.map((scan) => (
                    <tr key={scan.id} className="hover:bg-white/[0.02] light:hover:bg-slate-50 transition">
                      <td className="py-3 px-3 font-mono text-[11px] text-amber-400 light:text-amber-700 whitespace-nowrap">
                        {scan.id}
                      </td>
                      <td className="py-3 px-3 font-medium text-gray-200 light:text-slate-800">
                        {scan.brand} <span className="text-gray-400 light:text-slate-500 font-normal">— {scan.product_name}</span>
                      </td>
                      <td className="py-3 px-3 text-gray-400 light:text-slate-500 whitespace-nowrap">
                        {scan.category}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold ${
                            scan.verdict === "COMPLIANT"
                              ? "bg-emerald-500/15 text-emerald-400 light:text-emerald-700 border border-emerald-500/30"
                              : scan.verdict === "POTENTIAL_VIOLATION"
                              ? "bg-red-500/15 text-red-400 light:text-red-700 border border-red-500/30"
                              : "bg-amber-500/15 text-amber-400 light:text-amber-700 border border-amber-500/30"
                          }`}
                        >
                          {scan.verdict}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono font-semibold text-gray-300 light:text-slate-700 whitespace-nowrap">
                        {scan.score}%
                      </td>
                      <td className="py-3 px-3 text-gray-400 light:text-slate-500 font-mono text-[11px] whitespace-nowrap">
                        {scan.timestamp ? scan.timestamp.slice(0, 16).replace("T", " ") : "—"}
                      </td>
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <a
                          href={`/api/reports/inspection/${scan.id}`}
                          download
                          title="Download Form I Statutory Inspection Memo"
                          className="inline-flex items-center gap-1 rounded bg-amber-500/10 light:bg-amber-500 light:text-white hover:bg-amber-500/20 text-amber-300 light:hover:bg-amber-600 border border-amber-500/30 light:border-amber-600 px-2.5 py-1 text-[11px] font-semibold transition active:scale-95"
                        >
                          <Download className="h-3 w-3" />
                          <span>Form I PDF</span>
                        </a>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
