"use client";

import React, { useState, useEffect } from "react";
import { X, Search, Package, CheckCircle2, AlertTriangle, ExternalLink, Sparkles, Layers, ShieldCheck, Tag } from "lucide-react";
import { GalleryPackage } from "../types/scanner";

interface TestGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPackage: (pkg: GalleryPackage) => void;
  apiBaseUrl: string;
}

export const TestGalleryModal: React.FC<TestGalleryModalProps> = ({
  isOpen,
  onClose,
  onSelectPackage,
  apiBaseUrl,
}) => {
  const [packages, setPackages] = useState<GalleryPackage[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");

  useEffect(() => {
    if (!isOpen) return;

    const fetchGallery = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${apiBaseUrl}/api/test-gallery`);
        if (res.ok) {
          const data = await res.json();
          setPackages(data.packages || []);
        }
      } catch (err) {
        console.error("Failed to load test gallery packages:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchGallery();
  }, [isOpen, apiBaseUrl]);

  if (!isOpen) return null;

  const categories = ["ALL", ...Array.from(new Set(packages.map((p) => p.category)))];

  const filtered = packages.filter((pkg) => {
    const matchesCategory = selectedCategory === "ALL" || pkg.category === selectedCategory;
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      pkg.brand.toLowerCase().includes(q) ||
      pkg.product_name.toLowerCase().includes(q) ||
      pkg.category.toLowerCase().includes(q) ||
      pkg.expected_verdict.toLowerCase().includes(q);
    return matchesCategory && matchesSearch;
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/70 dark:bg-black/80 light:bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="glass-panel w-full max-w-5xl max-h-[92vh] rounded-2xl flex flex-col overflow-hidden border border-white/10 dark:border-white/10 light:border-slate-200 bg-slate-950/95 dark:bg-slate-950/95 light:bg-white shadow-2xl animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 dark:border-white/10 light:border-slate-200 bg-white/[0.02] dark:bg-white/[0.02] light:bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 light:text-amber-600">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white dark:text-white light:text-slate-900 tracking-tight">
                  Mass Test Suite Gallery
                </h2>
                <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/20 light:bg-amber-100 text-amber-300 light:text-amber-800 border border-amber-500/30">
                  {packages.length} Specimens
                </span>
              </div>
              <p className="text-xs text-gray-400 dark:text-gray-400 light:text-slate-500 mt-0.5">
                Unseen packaging labels across 10 FMCG and consumer hardware categories
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="/api/batch-audit/results"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 light:text-emerald-700 light:bg-emerald-50 transition"
              title="View full JSON benchmark telemetry"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span>Benchmark JSON</span>
            </a>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-gray-400 hover:text-white dark:hover:text-white light:hover:text-slate-900 hover:bg-white/10 dark:hover:bg-white/10 light:hover:bg-slate-100 transition"
              aria-label="Close modal"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="px-5 py-3 border-b border-white/10 dark:border-white/10 light:border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white/[0.01] dark:bg-white/[0.01] light:bg-white">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 dark:text-gray-400 light:text-slate-400" />
            <input
              type="text"
              placeholder="Search by brand, commodity name, category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 text-xs bg-black/40 dark:bg-black/40 light:bg-slate-50 border border-white/10 dark:border-white/10 light:border-slate-200 rounded-lg text-gray-200 dark:text-gray-200 light:text-slate-800 placeholder-gray-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`text-[11px] font-semibold px-2.5 py-1 rounded-md transition shrink-0 ${
                  selectedCategory === cat
                    ? "bg-amber-500 text-black dark:text-black light:text-slate-950 font-bold shadow-xs"
                    : "bg-white/[0.04] dark:bg-white/[0.04] light:bg-slate-100 text-gray-400 dark:text-gray-400 light:text-slate-600 hover:text-white light:hover:text-slate-900"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Grid of Specimen Cards */}
        <div className="flex-1 overflow-y-auto p-5 scrollbar-thin">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mb-3" />
              <p className="text-xs font-mono">Loading mass test catalog...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400 light:text-slate-500">
              <Package className="h-10 w-10 text-gray-600 light:text-slate-300 mb-2" />
              <p className="text-sm font-semibold text-gray-300 light:text-slate-700">No test specimens match your filter</p>
              <p className="text-xs mt-1">Try clearing the search query or selecting &apos;ALL&apos;.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((pkg) => {
                const isCompliant = pkg.expected_verdict === "COMPLIANT";
                const isReview = pkg.expected_verdict === "REVIEW_REQUIRED";
                const isViolation = pkg.expected_verdict === "POTENTIAL_VIOLATION";

                return (
                  <div
                    key={pkg.id}
                    onClick={() => {
                      onSelectPackage(pkg);
                      onClose();
                    }}
                    className="group flex flex-col rounded-xl border border-white/10 dark:border-white/10 light:border-slate-200/90 bg-white/[0.03] dark:bg-white/[0.03] light:bg-white hover:bg-white/[0.07] light:hover:bg-slate-50 hover:border-amber-500/40 light:hover:border-amber-400/60 transition cursor-pointer overflow-hidden shadow-sm hover:shadow-md"
                  >
                    {/* Image Preview */}
                    <div className="h-36 bg-slate-900/60 dark:bg-slate-900/60 light:bg-slate-100 relative overflow-hidden flex items-center justify-center p-2 border-b border-white/5 dark:border-white/5 light:border-slate-100">
                      <img
                        src={`${apiBaseUrl}${pkg.image_url}`}
                        alt={pkg.product_name}
                        className="max-h-full max-w-full object-contain group-hover:scale-105 transition duration-200"
                        loading="lazy"
                      />
                      {/* Expected Verdict Badge */}
                      <div className="absolute top-2 right-2">
                        {isCompliant && (
                          <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 light:bg-emerald-100 light:text-emerald-800 border border-emerald-500/30">
                            <CheckCircle2 className="h-2.5 w-2.5" />
                            COMPLIANT
                          </span>
                        )}
                        {isReview && (
                          <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 light:bg-amber-100 light:text-amber-800 border border-amber-500/30">
                            <AlertTriangle className="h-2.5 w-2.5" />
                            REVIEW / UNSTAMPED
                          </span>
                        )}
                        {isViolation && (
                          <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 light:bg-rose-100 light:text-rose-800 border border-rose-500/30">
                            <AlertTriangle className="h-2.5 w-2.5" />
                            VIOLATION
                          </span>
                        )}
                      </div>

                      {/* Category Tag */}
                      <div className="absolute bottom-2 left-2">
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-black/70 text-gray-300 dark:text-gray-300 light:bg-white/90 light:text-slate-800 backdrop-blur-xs">
                          {pkg.category}
                        </span>
                      </div>
                    </div>

                    {/* Metadata & Actions */}
                    <div className="p-3.5 flex-1 flex flex-col justify-between space-y-3">
                      <div>
                        <span className="text-[11px] font-bold text-amber-400 dark:text-amber-400 light:text-amber-700 tracking-wider uppercase">
                          {pkg.brand}
                        </span>
                        <h4 className="text-xs font-semibold text-gray-200 dark:text-gray-200 light:text-slate-800 line-clamp-1 mt-0.5">
                          {pkg.product_name}
                        </h4>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-white/5 dark:border-white/5 light:border-slate-100">
                        <span className="text-[10px] font-mono text-gray-400 dark:text-gray-400 light:text-slate-500 truncate max-w-[150px]">
                          {pkg.filename}
                        </span>
                        <span className="text-[11px] font-bold text-amber-400 light:text-amber-600 group-hover:translate-x-0.5 transition flex items-center gap-1">
                          Audit Specimen &rarr;
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-white/10 dark:border-white/10 light:border-slate-200 bg-white/[0.02] dark:bg-white/[0.02] light:bg-slate-50 flex items-center justify-between text-xs text-gray-400 dark:text-gray-400 light:text-slate-500">
          <span>Click any specimen to run full OCR & Rule 6 statutory audit.</span>
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg bg-white/10 dark:bg-white/10 light:bg-slate-200 text-gray-200 dark:text-gray-200 light:text-slate-700 font-semibold hover:bg-white/20 transition text-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
