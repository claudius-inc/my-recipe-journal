"use client";

import { Skeleton } from "@radix-ui/themes";

export function SkeletonRecipeCard() {
  return (
    <div className="w-full rounded-xl border border-transparent bg-neutral-50 px-4 py-3 dark:bg-neutral-900/60">
      <div className="flex items-center justify-between gap-2">
        {/* Title skeleton */}
        <div className="flex-1">
          <Skeleton width="160px" height="20px" />
        </div>

        {/* Category badge skeleton */}
        <Skeleton width="80px" height="24px" style={{ borderRadius: "9999px" }} />
      </div>

      {/* Timestamp skeleton */}
      <div className="mt-2">
        <Skeleton width="112px" height="12px" />
      </div>
    </div>
  );
}
