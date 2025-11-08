"use client";

export function SkeletonRecipeCard() {
  return (
    <div className="w-full rounded-xl border border-transparent bg-neutral-50 px-4 py-3 dark:bg-neutral-900/60">
      <div className="flex items-center justify-between gap-2">
        {/* Title skeleton */}
        <div className="flex-1">
          <div className="h-4 w-32 bg-gradient-to-r from-neutral-200 to-neutral-100 animate-shimmer rounded dark:from-neutral-700 dark:to-neutral-800" />
        </div>

        {/* Category skeleton */}
        <div className="h-3 w-16 bg-gradient-to-r from-neutral-200 to-neutral-100 animate-shimmer rounded dark:from-neutral-700 dark:to-neutral-800" />
      </div>

      {/* Description skeleton */}
      <div className="mt-3 space-y-2">
        <div className="h-3 w-full bg-gradient-to-r from-neutral-200 to-neutral-100 animate-shimmer rounded dark:from-neutral-700 dark:to-neutral-800" />
        <div className="h-3 w-4/5 bg-gradient-to-r from-neutral-200 to-neutral-100 animate-shimmer rounded dark:from-neutral-700 dark:to-neutral-800" />
      </div>

      {/* Timestamp skeleton */}
      <div className="mt-2 h-3 w-24 bg-gradient-to-r from-neutral-200 to-neutral-100 animate-shimmer rounded dark:from-neutral-700 dark:to-neutral-800" />
    </div>
  );
}
