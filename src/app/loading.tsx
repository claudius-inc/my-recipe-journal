"use client";

import { SkeletonRecipeCard } from "@/components/ui/SkeletonRecipeCard";

export default function RootLoading() {
  return (
    <div className="flex h-screen bg-surface">
      {/* Sidebar skeleton */}
      <aside className="hidden w-80 border-r border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900 md:block">
        <div className="mb-4 space-y-2">
          <div className="h-6 w-32 animate-shimmer rounded-lg bg-gradient-to-r from-neutral-200 via-neutral-100 to-neutral-200 dark:from-neutral-700 dark:via-neutral-600 dark:to-neutral-700" />
          <div className="h-4 w-48 animate-shimmer rounded-lg bg-gradient-to-r from-neutral-200 via-neutral-100 to-neutral-200 dark:from-neutral-700 dark:via-neutral-600 dark:to-neutral-700" />
        </div>

        <div className="mb-4 space-y-2">
          <div className="h-10 animate-shimmer rounded-lg bg-gradient-to-r from-neutral-200 via-neutral-100 to-neutral-200 dark:from-neutral-700 dark:via-neutral-600 dark:to-neutral-700" />
          <div className="h-10 animate-shimmer rounded-lg bg-gradient-to-r from-neutral-200 via-neutral-100 to-neutral-200 dark:from-neutral-700 dark:via-neutral-600 dark:to-neutral-700" />
        </div>

        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <SkeletonRecipeCard key={i} />
          ))}
        </div>
      </aside>

      {/* Main content skeleton */}
      <div className="flex-1 overflow-y-auto px-6 py-8">
        <div className="mx-auto max-w-4xl space-y-6">
          {/* Header skeleton */}
          <div className="flex items-center justify-between">
            <div className="h-8 w-32 animate-shimmer rounded-lg bg-gradient-to-r from-neutral-200 via-neutral-100 to-neutral-200 dark:from-neutral-700 dark:via-neutral-600 dark:to-neutral-700" />
            <div className="h-6 w-48 animate-shimmer rounded-lg bg-gradient-to-r from-neutral-200 via-neutral-100 to-neutral-200 dark:from-neutral-700 dark:via-neutral-600 dark:to-neutral-700" />
          </div>

          {/* Recipe card skeleton */}
          <div className="space-y-3 rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
            <div className="h-10 w-1/3 animate-shimmer rounded-lg bg-gradient-to-r from-neutral-200 via-neutral-100 to-neutral-200 dark:from-neutral-700 dark:via-neutral-600 dark:to-neutral-700" />
            <div className="h-20 animate-shimmer rounded-lg bg-gradient-to-r from-neutral-200 via-neutral-100 to-neutral-200 dark:from-neutral-700 dark:via-neutral-600 dark:to-neutral-700" />
            <div className="flex gap-2">
              <div className="h-8 w-24 animate-shimmer rounded-lg bg-gradient-to-r from-neutral-200 via-neutral-100 to-neutral-200 dark:from-neutral-700 dark:via-neutral-600 dark:to-neutral-700" />
              <div className="h-8 w-32 animate-shimmer rounded-lg bg-gradient-to-r from-neutral-200 via-neutral-100 to-neutral-200 dark:from-neutral-700 dark:via-neutral-600 dark:to-neutral-700" />
            </div>
          </div>

          {/* Tabs skeleton */}
          <div className="flex gap-2 border-b border-neutral-200 dark:border-neutral-800">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="h-10 w-24 animate-shimmer rounded-lg bg-gradient-to-r from-neutral-200 via-neutral-100 to-neutral-200 dark:from-neutral-700 dark:via-neutral-600 dark:to-neutral-700"
              />
            ))}
          </div>

          {/* Content section skeleton */}
          <div className="space-y-3 rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
            <div className="h-6 w-1/4 animate-shimmer rounded-lg bg-gradient-to-r from-neutral-200 via-neutral-100 to-neutral-200 dark:from-neutral-700 dark:via-neutral-600 dark:to-neutral-700" />
            <div className="space-y-2">
              <div className="h-10 animate-shimmer rounded-lg bg-gradient-to-r from-neutral-200 via-neutral-100 to-neutral-200 dark:from-neutral-700 dark:via-neutral-600 dark:to-neutral-700" />
              <div className="h-10 animate-shimmer rounded-lg bg-gradient-to-r from-neutral-200 via-neutral-100 to-neutral-200 dark:from-neutral-700 dark:via-neutral-600 dark:to-neutral-700" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
