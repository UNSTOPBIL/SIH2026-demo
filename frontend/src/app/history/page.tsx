"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Layers,
  Search,
  Filter,
  Download,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Scale,
  Sun,
  Moon,
  Home,
  BarChart3,
  Calendar,
  Building,
  CheckCircle2,
  FileText,
  RefreshCw
} from "lucide-react";

interface ScanRecord {
  id: string;
  timestamp: string;
  inspector_id: string;
  brand: string;
  product_name: string;
  category: string;
  verdict: string;
  score: number;
  is_compliant: boolean;
  cards_count: number;
  district: string;
  state: string;
}

interface ProductRecord {
  id: string;
  brand: string;
  product_name: string;
  category: string;
  total_scans: number;
  pass_count: number;
  review_count: number;
  violation_count: number;
  last_scanned: string;
  last_verdict: string;
  last_score: number;
}

export default function HistoryPage() {
  const [activeTab, setActiveTab] = useState<"scans" | "products">("scans");
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  // Scans State
  const [scans, setScans] = useState<ScanRecord[]>([]);
  const [totalScans, setTotalScans] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [verdictFilter, setVerdictFilter] = useState<string>("ALL");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [expandedScanId, setExpandedScanId] = useState<string | null>(null);
  const [expandedDetail, setExpandedDetail] = useState<any>(null);
  const [loadingDetail, setLoadingDetail] = useState<boolean>(false);

  // Products State
  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [totalProducts, setTotalProducts] = useState<number>(0);
  const [productPage, setProductPage] = useState<number>(1);
  const [productTotalPages, setProductTotalPages] = useState<number>(1);
  const [productSearch, setProductSearch] = useState<string>("");

  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem("sih_theme") as "dark" | "light" | null;
      if (savedTheme) {
        setTheme(savedTheme);
        applyTheme(savedTheme);
      }
    } catch {}
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

  // Initial load to populate both tab counts
  useEffect(() => {
    fetchScans();
    fetchProducts();
  }, []);

  // Fetch scans on filter/page change
  useEffect(() => {
    if (activeTab === "scans") {
      fetchScans();
    }
  }, [activeTab, page, verdictFilter, categoryFilter]);

  // Fetch products on page change
  useEffect(() => {
    if (activeTab === "products") {
      fetchProducts();
    }
  }, [activeTab, productPage]);

  const fetchScans = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "15",
      });
      if (verdictFilter !== "ALL") params.append("verdict", verdictFilter);
      if (categoryFilter !== "ALL") params.append("category", categoryFilter);
      if (searchQuery.trim()) params.append("search", searchQuery.trim());

      const res = await fetch(`/api/scans?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setScans(data.scans || []);
        setTotalScans(data.total_records || 0);
        setTotalPages(data.total_pages || 1);
      }
    } catch (e) {
      console.error("Error loading scans:", e);
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(productPage),
        limit: "15",
      });
      if (productSearch.trim()) params.append("search", productSearch.trim());

      const res = await fetch(`/api/products?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products || []);
        setTotalProducts(data.total_products || 0);
        setProductTotalPages(data.total_pages || 1);
      }
    } catch (e) {
      console.error("Error loading products:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleExpand = async (scanId: string) => {
    if (expandedScanId === scanId) {
      setExpandedScanId(null);
      setExpandedDetail(null);
      return;
    }

    setExpandedScanId(scanId);
    setLoadingDetail(true);
    try {
      const res = await fetch(`/api/scans/${scanId}`);
      if (res.ok) {
        const data = await res.json();
        setExpandedDetail(data);
      }
    } catch (e) {
      console.error("Error loading scan details:", e);
    } finally {
      setLoadingDetail(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#08090d] light:bg-[#f8fafc] text-gray-100 light:text-slate-800 transition-colors duration-200">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-white/10 light:border-slate-200/90 bg-[#08090d]/80 light:bg-white/85 backdrop-blur-md px-4 sm:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 light:bg-amber-500/15 border border-amber-500/30 text-amber-400 light:text-amber-700 shadow-sm">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold tracking-widest text-amber-500 light:text-amber-600 uppercase">
                  FORENSIC RECORD VAULT
                </span>
                <span className="rounded bg-blue-500/15 border border-blue-500/30 px-1.5 py-0.5 text-[10px] font-mono text-blue-400 light:text-blue-700">
                  SQLITE PERSISTENCE
                </span>
              </div>
              <h1 className="text-base sm:text-lg font-bold tracking-tight text-white light:text-slate-900">
                Inspection History & Product Compliance Repository
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            <Link
              href="/"
              className="flex items-center gap-1.5 rounded-lg border border-white/10 light:border-slate-200 bg-white/[0.04] light:bg-white px-3 py-1.5 text-xs font-medium text-gray-300 light:text-slate-700 transition hover:bg-white/[0.08]"
            >
              <Home className="h-3.5 w-3.5" />
              <span>Scanner</span>
            </Link>

            <Link
              href="/dashboard"
              className="flex items-center gap-1.5 rounded-lg border border-white/10 light:border-slate-200 bg-white/[0.04] light:bg-white px-3 py-1.5 text-xs font-medium text-gray-300 light:text-slate-700 transition hover:bg-white/[0.08]"
            >
              <BarChart3 className="h-3.5 w-3.5" />
              <span>Dashboard</span>
            </Link>

            <button
              onClick={toggleTheme}
              type="button"
              aria-label="Toggle theme"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 light:border-slate-200 bg-white/[0.04] light:bg-white text-gray-300 light:text-slate-700 transition hover:bg-white/[0.08]"
            >
              {theme === "dark" ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-slate-700" />}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-8 py-6 space-y-6">
        {/* Navigation Tabs */}
        <div className="flex border-b border-white/10 light:border-slate-200">
          <button
            onClick={() => setActiveTab("scans")}
            className={`pb-3 px-4 text-xs sm:text-sm font-semibold border-b-2 transition ${
              activeTab === "scans"
                ? "border-amber-400 text-amber-400 light:text-amber-600 light:border-amber-600"
                : "border-transparent text-gray-400 light:text-slate-500 hover:text-gray-200 light:hover:text-slate-800"
            }`}
          >
            📋 Inspection Audit Log ({totalScans})
          </button>
          <button
            onClick={() => setActiveTab("products")}
            className={`pb-3 px-4 text-xs sm:text-sm font-semibold border-b-2 transition ${
              activeTab === "products"
                ? "border-amber-400 text-amber-400 light:text-amber-600 light:border-amber-600"
                : "border-transparent text-gray-400 light:text-slate-500 hover:text-gray-200 light:hover:text-slate-800"
            }`}
          >
            🏢 Product Compliance Catalog ({totalProducts})
          </button>
        </div>

        {/* TAB 1: SCANS HISTORY */}
        {activeTab === "scans" && (
          <div className="space-y-4">
            {/* Filter Bar */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white/[0.02] light:bg-white p-3.5 rounded-xl border border-white/10 light:border-slate-200 shadow-sm">
              {/* Verdict Filter Pills */}
              <div className="flex flex-wrap items-center gap-1.5">
                {["ALL", "COMPLIANT", "REVIEW_REQUIRED", "POTENTIAL_VIOLATION"].map((v) => (
                  <button
                    key={v}
                    onClick={() => {
                      setVerdictFilter(v);
                      setPage(1);
                    }}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold transition ${
                      verdictFilter === v
                        ? "bg-amber-500 text-black shadow-xs font-bold"
                        : "bg-white/[0.04] light:bg-slate-100 text-gray-300 light:text-slate-600 hover:bg-white/[0.08]"
                    }`}
                  >
                    {v === "ALL" ? "All Statuses" : v.replace("_", " ")}
                  </button>
                ))}
              </div>

              {/* Search & Category */}
              <div className="flex items-center gap-2">
                <select
                  value={categoryFilter}
                  onChange={(e) => {
                    setCategoryFilter(e.target.value);
                    setPage(1);
                  }}
                  className="rounded-lg border border-white/10 light:border-slate-200 bg-black/40 light:bg-slate-50 px-2.5 py-1.5 text-xs text-gray-200 light:text-slate-800 focus:outline-hidden"
                >
                  <option value="ALL">All Categories</option>
                  <option value="Food">Food / Beverage</option>
                  <option value="Personal Care">Personal Care</option>
                  <option value="Household">Household</option>
                  <option value="Electronics">Electronics</option>
                </select>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    setPage(1);
                    fetchScans();
                  }}
                  className="relative flex-1 md:w-56"
                >
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search brand, id..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-lg border border-white/10 light:border-slate-200 bg-black/40 light:bg-slate-50 pl-8 pr-3 py-1.5 text-xs text-gray-200 light:text-slate-800 placeholder-gray-500 focus:outline-hidden"
                  />
                </form>
              </div>
            </div>

            {/* Inspections Table */}
            <div className="rounded-2xl border border-white/10 light:border-slate-200/90 bg-white/[0.03] light:bg-white overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-white/10 light:border-slate-200 bg-white/[0.02] light:bg-slate-50 text-gray-400 light:text-slate-500">
                    <tr>
                      <th className="py-3 px-4 font-medium whitespace-nowrap">Record ID</th>
                      <th className="py-3 px-4 font-medium min-w-[220px]">Commodity Details</th>
                      <th className="py-3 px-4 font-medium whitespace-nowrap">Category</th>
                      <th className="py-3 px-4 font-medium whitespace-nowrap">Verdict</th>
                      <th className="py-3 px-4 font-medium whitespace-nowrap">Compliance</th>
                      <th className="py-3 px-4 font-medium whitespace-nowrap">Jurisdiction</th>
                      <th className="py-3 px-4 font-medium text-right whitespace-nowrap">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 light:divide-slate-100">
                    {loading ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-gray-500">
                          <RefreshCw className="h-5 w-5 animate-spin mx-auto text-amber-400 mb-2" />
                          Loading forensic records...
                        </td>
                      </tr>
                    ) : scans.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-gray-500">
                          No packaging inspections found matching your filters.
                        </td>
                      </tr>
                    ) : (
                      scans.map((scan) => {
                        const isExpanded = expandedScanId === scan.id;
                        return (
                          <React.Fragment key={scan.id}>
                            <tr className="hover:bg-white/[0.02] light:hover:bg-slate-50 transition">
                              <td className="py-3 px-4 font-mono font-semibold text-amber-400 light:text-amber-700 whitespace-nowrap">
                                {scan.id}
                              </td>
                              <td className="py-3 px-4 font-medium text-gray-200 light:text-slate-800">
                                {scan.brand} <span className="text-gray-400 light:text-slate-500 font-normal">— {scan.product_name}</span>
                              </td>
                              <td className="py-3 px-4 text-gray-400 light:text-slate-500 whitespace-nowrap">
                                {scan.category}
                              </td>
                              <td className="py-3 px-4 whitespace-nowrap">
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
                              <td className="py-3 px-4 font-mono font-bold text-gray-300 light:text-slate-700 whitespace-nowrap">
                                {scan.score}%
                              </td>
                              <td className="py-3 px-4 text-gray-400 light:text-slate-500 whitespace-nowrap">
                                {scan.district}, {scan.state}
                              </td>
                              <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                                <button
                                  onClick={() => handleToggleExpand(scan.id)}
                                  className="inline-flex items-center gap-1 rounded border border-white/10 light:border-slate-200 bg-white/[0.04] light:bg-white px-2 py-1 text-[11px] font-medium text-gray-300 light:text-slate-700 hover:bg-white/[0.08]"
                                >
                                  {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                                  <span>{isExpanded ? "Close" : "Audit"}</span>
                                </button>

                                <a
                                  href={`/api/reports/inspection/${scan.id}`}
                                  download
                                  title="Download Court-Admissible Form I Memo"
                                  className="inline-flex items-center gap-1 rounded bg-amber-500/10 light:bg-amber-500 light:text-white text-amber-300 border border-amber-500/30 light:border-amber-600 px-2 py-1 text-[11px] font-semibold hover:bg-amber-500/20"
                                >
                                  <Download className="h-3 w-3" />
                                  <span>PDF</span>
                                </a>
                              </td>
                            </tr>

                            {/* Expanded Audit Card View */}
                            {isExpanded && (
                              <tr className="bg-black/30 light:bg-slate-50/70 border-b border-amber-500/20">
                                <td colSpan={7} className="p-4 space-y-3">
                                  {loadingDetail ? (
                                    <div className="py-6 text-center text-gray-400">Loading statutory evidence...</div>
                                  ) : expandedDetail ? (
                                    <div className="space-y-4">
                                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 light:border-slate-200 pb-2">
                                        <div className="flex items-center gap-3">
                                          <span className="font-mono text-xs text-amber-400 light:text-amber-700">
                                            Evidence SHA-256: {expandedDetail.evidence_vault?.image_sha256 || expandedDetail.image_hash || "LOCKED"}
                                          </span>
                                          <span className="text-xs text-gray-400 light:text-slate-500">
                                            Inspector: {expandedDetail.inspector_id}
                                          </span>
                                        </div>
                                        <div className="font-mono text-xs text-gray-400 light:text-slate-500">
                                          Recorded: {expandedDetail.timestamp?.replace("T", " ").slice(0, 19)} UTC
                                        </div>
                                      </div>

                                      {/* Grid of 11 Statutory Cards */}
                                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {(expandedDetail.cards || []).map((card: any) => (
                                          <div
                                            key={card.id}
                                            className={`rounded-xl border p-3 text-xs space-y-1.5 ${
                                              card.status === "PASS"
                                                ? "border-emerald-500/30 bg-emerald-950/10 light:bg-white"
                                                : card.status === "FAIL"
                                                ? "border-red-500/30 bg-red-950/10 light:bg-white"
                                                : card.status === "NOT_APPLICABLE"
                                                ? "border-gray-500/20 bg-gray-900/10 light:bg-slate-100"
                                                : "border-amber-500/30 bg-amber-950/10 light:bg-white"
                                            }`}
                                          >
                                            <div className="flex items-center justify-between">
                                              <span className="font-mono font-bold text-gray-400 light:text-slate-500 text-[10px]">
                                                {card.rule_ref}
                                              </span>
                                              <span
                                                className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                                  card.status === "PASS"
                                                    ? "bg-emerald-500/20 text-emerald-400 light:text-emerald-700"
                                                    : card.status === "FAIL"
                                                    ? "bg-red-500/20 text-red-400 light:text-red-700"
                                                    : card.status === "NOT_APPLICABLE"
                                                    ? "bg-gray-500/20 text-gray-400 light:text-slate-600"
                                                    : "bg-amber-500/20 text-amber-400 light:text-amber-700"
                                                }`}
                                              >
                                                {card.actual_status || card.status}
                                              </span>
                                            </div>

                                            <div className="font-semibold text-gray-200 light:text-slate-800">{card.label}</div>
                                            <p className="font-mono text-[11px] text-amber-300 light:text-amber-800 bg-black/30 light:bg-slate-50 p-1.5 rounded border border-white/5 light:border-slate-200 line-clamp-2">
                                              {card.snippet || "Not detected on packaging"}
                                            </p>

                                            {/* Font Measurement Badge */}
                                            {card.font_compliance && card.font_compliance.detected_height_mm > 0 && (
                                              <div className="text-[10px] text-gray-400 light:text-slate-500 font-mono">
                                                Font Height: <b className="text-gray-200 light:text-slate-800">{card.font_compliance.detected_height_mm} mm</b> (Min {card.font_compliance.min_required_mm} mm)
                                              </div>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="text-red-400">Error loading inspection details.</div>
                                  )}
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between p-3.5 border-t border-white/10 light:border-slate-200 text-xs text-gray-400 light:text-slate-500">
                <span>
                  Showing page {page} of {totalPages} ({totalScans} total inspections)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="px-2.5 py-1 rounded border border-white/10 light:border-slate-200 disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <button
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    className="px-2.5 py-1 rounded border border-white/10 light:border-slate-200 disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: PRODUCT COMPLIANCE CATALOG */}
        {activeTab === "products" && (
          <div className="space-y-4">
            {/* Search */}
            <div className="bg-white/[0.02] light:bg-white p-3.5 rounded-xl border border-white/10 light:border-slate-200 shadow-sm flex items-center justify-between gap-3">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setProductPage(1);
                  fetchProducts();
                }}
                className="relative flex-1 max-w-md"
              >
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search product name or brand..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="w-full rounded-lg border border-white/10 light:border-slate-200 bg-black/40 light:bg-slate-50 pl-8 pr-3 py-1.5 text-xs text-gray-200 light:text-slate-800 placeholder-gray-500 focus:outline-hidden"
                />
              </form>
              <span className="text-xs text-gray-400 light:text-slate-500">
                Tracking historical compliance across market brands
              </span>
            </div>

            {/* Product Catalog Table */}
            <div className="rounded-2xl border border-white/10 light:border-slate-200/90 bg-white/[0.03] light:bg-white overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-white/10 light:border-slate-200 bg-white/[0.02] light:bg-slate-50 text-gray-400 light:text-slate-500">
                    <tr>
                      <th className="py-3 px-4 font-medium min-w-[220px]">Brand & Product Name</th>
                      <th className="py-3 px-4 font-medium whitespace-nowrap">Category</th>
                      <th className="py-3 px-4 font-medium whitespace-nowrap">Total Audits</th>
                      <th className="py-3 px-4 font-medium whitespace-nowrap">Compliance Rate</th>
                      <th className="py-3 px-4 font-medium whitespace-nowrap">Last Audit Verdict</th>
                      <th className="py-3 px-4 font-medium whitespace-nowrap">Last Inspected</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 light:divide-slate-100">
                    {loading ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-gray-500">
                          Loading product catalog...
                        </td>
                      </tr>
                    ) : products.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-gray-500">
                          No product entries in the repository catalog yet.
                        </td>
                      </tr>
                    ) : (
                      products.map((p) => {
                        const passRate = p.total_scans > 0 ? Math.round((p.pass_count / p.total_scans) * 100) : 0;
                        return (
                          <tr key={p.id} className="hover:bg-white/[0.02] light:hover:bg-slate-50 transition">
                            <td className="py-3 px-4 font-medium text-gray-200 light:text-slate-800">
                              <b>{p.brand}</b> — {p.product_name}
                            </td>
                            <td className="py-3 px-4 text-gray-400 light:text-slate-500 whitespace-nowrap">{p.category}</td>
                            <td className="py-3 px-4 font-mono whitespace-nowrap">{p.total_scans} scan(s)</td>
                            <td className="py-3 px-4 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-gray-300 light:text-slate-700">{passRate}%</span>
                                <div className="h-1.5 w-16 rounded-full bg-white/10 light:bg-slate-200 overflow-hidden">
                                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${passRate}%` }} />
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold ${
                                  p.last_verdict === "COMPLIANT"
                                    ? "bg-emerald-500/15 text-emerald-400 light:text-emerald-700 border border-emerald-500/30"
                                    : p.last_verdict === "POTENTIAL_VIOLATION"
                                    ? "bg-red-500/15 text-red-400 light:text-red-700 border border-red-500/30"
                                    : "bg-amber-500/15 text-amber-400 light:text-amber-700 border border-amber-500/30"
                                }`}
                              >
                                {p.last_verdict}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-gray-400 light:text-slate-500 font-mono text-[11px] whitespace-nowrap">
                              {p.last_scanned ? p.last_scanned.slice(0, 10) : "—"}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Product Pagination */}
              <div className="flex items-center justify-between p-3.5 border-t border-white/10 light:border-slate-200 text-xs text-gray-400 light:text-slate-500">
                <span>
                  Page {productPage} of {productTotalPages} ({totalProducts} tracked products)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    disabled={productPage <= 1}
                    onClick={() => setProductPage((p) => Math.max(1, p - 1))}
                    className="px-2.5 py-1 rounded border border-white/10 light:border-slate-200 disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <button
                    disabled={productPage >= productTotalPages}
                    onClick={() => setProductPage((p) => p + 1)}
                    className="px-2.5 py-1 rounded border border-white/10 light:border-slate-200 disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
