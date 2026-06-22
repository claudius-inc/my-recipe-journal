"use client";

import { Skeleton } from "@radix-ui/themes";

export function SkeletonRecipeCard() {
  // Mirror the RecipeListItem layout (thumbnail + name + meta line) to avoid
  // layout shift when real data replaces the skeleton.
  return (
    <div className="flex items-center gap-2 px-2 py-2">
      <Skeleton width="40px" height="40px" style={{ borderRadius: "0.5rem" }} />
      <div className="flex-1 space-y-1.5">
        <Skeleton width="60%" height="14px" />
        <Skeleton width="40%" height="10px" />
      </div>
    </div>
  );
}
