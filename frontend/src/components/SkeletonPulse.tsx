"use client";

import React from "react";

export interface SkeletonProps {
  className?: string;
  style?: React.CSSProperties;
}

export const SkeletonBox: React.FC<SkeletonProps> = ({ className = "", style }) => {
  return (
    <div
      style={style}
      className={`skeleton-shimmer rounded-lg ${className}`}
      aria-hidden="true"
    />
  );
};

export const SkeletonLine: React.FC<{
  className?: string;
  width?: string;
  height?: string;
}> = ({ className = "", width = "w-full", height = "h-4" }) => {
  return (
    <div
      className={`skeleton-shimmer rounded ${width} ${height} ${className}`}
      aria-hidden="true"
    />
  );
};

export const SkeletonCircle: React.FC<{
  size?: string;
  className?: string;
}> = ({ size = "w-10 h-10", className = "" }) => {
  return (
    <div
      className={`skeleton-shimmer rounded-full ${size} ${className}`}
      aria-hidden="true"
    />
  );
};

/**
 * Skeleton wireframe replicating the circular radial score gauge hero section
 */
export const SkeletonGauge: React.FC<{ className?: string }> = ({ className = "" }) => {
  return (
    <div className={`flex flex-col sm:flex-row items-center gap-6 p-4 rounded-2xl glass-panel-subtle ${className}`}>
      {/* Circle Gauge Placeholder */}
      <div className="relative w-28 h-28 sm:w-32 sm:h-32 shrink-0 flex items-center justify-center">
        <div className="w-full h-full rounded-full border-4 border-white/5 dark:border-white/5 light:border-slate-200 border-t-amber-500/30 light:border-t-amber-500 animate-spin" />
        <div className="absolute inset-3 rounded-full skeleton-shimmer flex flex-col items-center justify-center gap-1">
          <SkeletonLine width="w-10" height="h-6" />
          <SkeletonLine width="w-8" height="h-2" />
        </div>
      </div>

      {/* Right-hand side stats placeholder */}
      <div className="flex-1 w-full space-y-3 text-center sm:text-left">
        <div className="flex items-center justify-center sm:justify-start gap-2">
          <SkeletonLine width="w-36" height="h-5" />
          <SkeletonLine width="w-16" height="h-5" className="rounded-full" />
        </div>
        <SkeletonLine width="w-48" height="h-3.5" />
        <div className="pt-2 flex items-center justify-center sm:justify-start gap-3">
          <SkeletonLine width="w-24" height="h-7" className="rounded-lg" />
          <SkeletonLine width="w-24" height="h-7" className="rounded-lg" />
        </div>
      </div>
    </div>
  );
};

/**
 * Skeleton wireframe replicating an individual Statutory Finding Card
 */
export const SkeletonCard: React.FC<{ delayMs?: number; className?: string }> = ({
  delayMs = 0,
  className = "",
}) => {
  return (
    <div
      style={{ animationDelay: `${delayMs}ms` }}
      className={`p-4 rounded-xl border border-white/10 dark:border-white/10 light:border-slate-200/90 glass-panel-subtle space-y-3 ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          {/* Status Icon circle */}
          <SkeletonCircle size="w-8 h-8 shrink-0" />
          <div className="space-y-1.5">
            {/* Title & Section Tag */}
            <div className="flex items-center gap-2">
              <SkeletonLine width="w-36 sm:w-48" height="h-4" />
              <SkeletonLine width="w-16" height="h-3.5" className="rounded" />
            </div>
            {/* Snippet / Subtitle */}
            <SkeletonLine width="w-52 sm:w-64" height="h-3" />
          </div>
        </div>
        {/* Pass / Fail Badge */}
        <SkeletonLine width="w-16" height="h-6" className="rounded-full shrink-0" />
      </div>

      {/* Detail row */}
      <div className="pt-2 border-t border-white/5 dark:border-white/5 light:border-slate-200/80 flex items-center justify-between">
        <SkeletonLine width="w-28" height="h-3" />
        <SkeletonLine width="w-20" height="h-3" />
      </div>
    </div>
  );
};

/**
 * Complete Skeleton container for StatutoryFindings component
 */
export const SkeletonFindingsList: React.FC = () => {
  return (
    <div className="space-y-4 animate-in fade-in duration-300" aria-label="Loading statutory audit results">
      {/* Hero Score Gauge */}
      <SkeletonGauge />

      {/* Declarations Filter Tabs row placeholder */}
      <div className="flex items-center justify-between gap-2 p-1.5 rounded-xl glass-panel-subtle">
        <div className="flex items-center gap-2">
          <SkeletonLine width="w-16 sm:w-20" height="h-7" className="rounded-lg" />
          <SkeletonLine width="w-20 sm:w-24" height="h-7" className="rounded-lg" />
          <SkeletonLine width="w-20 sm:w-24" height="h-7" className="rounded-lg" />
        </div>
        <SkeletonLine width="w-28" height="h-4" className="hidden sm:block" />
      </div>

      {/* Staggered Rule Cards */}
      <div className="space-y-3">
        <SkeletonCard delayMs={0} />
        <SkeletonCard delayMs={75} />
        <SkeletonCard delayMs={150} />
        <SkeletonCard delayMs={225} />
      </div>
    </div>
  );
};
