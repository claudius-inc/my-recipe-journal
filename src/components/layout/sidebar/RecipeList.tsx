"use client";

import { useEffect, useRef } from "react";
import { Button } from "@radix-ui/themes";
import { SkeletonRecipeCard } from "@/components/ui/SkeletonRecipeCard";
import { RecipeListItem } from "./RecipeListItem";
import type { Recipe } from "@/types/recipes";

interface RecipeListProps {
  recipes: Recipe[];
  loading: boolean;
  query: string;
  showArchived: boolean;
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onTogglePin: (id: string, isPinned: boolean) => void;
  onToggleArchive: (id: string, isArchived: boolean) => void;
  onDelete: (id: string) => void;
  onDuplicate: (recipe: Recipe) => void;
  animatingOut: string | null;
  justMoved: string | null;
  archivingInProgress: Set<string>;
  pinningInProgress: Set<string>;
  deletingInProgress: Set<string>;
}

export function RecipeList({
  recipes,
  loading,
  query,
  showArchived,
  hasMore,
  loadingMore,
  onLoadMore,
  selectedId,
  onSelect,
  onTogglePin,
  onToggleArchive,
  onDelete,
  onDuplicate,
  animatingOut,
  justMoved,
  archivingInProgress,
  pinningInProgress,
  deletingInProgress,
}: RecipeListProps) {
  // Auto-load the next page when a sentinel near the end scrolls into view.
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!hasMore || loadingMore) return;
    const node = sentinelRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) onLoadMore();
      },
      { rootMargin: "200px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, onLoadMore]);

  if (loading && recipes.length === 0) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <SkeletonRecipeCard key={i} />
        ))}
      </div>
    );
  }

  if (recipes.length === 0) {
    return (
      <p className="px-3 text-sm text-neutral-500">
        {query
          ? `No recipes found for "${query}"`
          : showArchived
            ? "No archived recipes."
            : "No recipes yet. Create one to get started."}
      </p>
    );
  }

  return (
    <>
      <ul className="space-y-1">
        {recipes.map((recipe) => (
          <RecipeListItem
            key={recipe.id}
            recipe={recipe}
            isSelected={recipe.id === selectedId}
            onSelect={onSelect}
            onTogglePin={onTogglePin}
            onToggleArchive={onToggleArchive}
            onDelete={onDelete}
            onDuplicate={onDuplicate}
            isAnimatingOut={animatingOut === recipe.id}
            isJustMoved={justMoved === recipe.id}
            isArchiveInProgress={archivingInProgress.has(recipe.id)}
            isPinInProgress={pinningInProgress.has(recipe.id)}
            isDeleteInProgress={deletingInProgress.has(recipe.id)}
          />
        ))}
      </ul>
      {hasMore && (
        <div ref={sentinelRef} className="mt-4 px-3">
          <Button
            variant="outline"
            size="2"
            className="w-full"
            onClick={onLoadMore}
            disabled={loadingMore}
          >
            {loadingMore ? "Loading…" : "Load more"}
          </Button>
        </div>
      )}
    </>
  );
}
