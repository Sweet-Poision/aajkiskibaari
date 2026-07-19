import React from "react";

export default function Loading() {
  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 animate-pulse">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="h-8 w-48 bg-zinc-300 rounded-md mb-2"></div>
          <div className="h-4 w-64 bg-zinc-200 rounded-md"></div>
        </div>
        <div className="h-10 w-24 bg-zinc-300 rounded-lg"></div>
      </div>

      {/* StatsBar Skeleton */}
      <div className="machine-casing w-full p-4 mb-8 grid grid-cols-1 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="skeuo-inset p-3 h-20 bg-zinc-200/50 rounded-md" />
        ))}
      </div>

      {/* Tabs Skeleton */}
      <div className="flex gap-2 mb-6 border-b-2 border-zinc-400">
        <div className="h-10 w-32 bg-zinc-300 rounded-t-lg"></div>
        <div className="h-10 w-32 bg-zinc-200 rounded-t-lg"></div>
        <div className="h-10 w-32 bg-zinc-200 rounded-t-lg"></div>
      </div>

      {/* Content Skeleton (Paper Sheets) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="skeleton-paper p-6 h-48" />
        ))}
      </div>
    </div>
  );
}
