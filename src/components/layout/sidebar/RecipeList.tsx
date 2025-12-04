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
  onDuplicate: (recipe: Recipe) => void;
  animatingOut: string | null;
  justMoved: string | null;
  archivingInProgress: Set<string>;
  pinningInProgress: Set<string>;
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
  onDuplicate,
  animatingOut,
  justMoved,
  archivingInProgress,
  pinningInProgress,
}: RecipeListProps) {
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
      <ul className="space-y-3">
        {recipes.map((recipe) => (
          <RecipeListItem
            key={recipe.id}
            recipe={recipe}
            isSelected={recipe.id === selectedId}
            onSelect={onSelect}
            onTogglePin={onTogglePin}
            onToggleArchive={onToggleArchive}
            onDuplicate={onDuplicate}
            isAnimatingOut={animatingOut === recipe.id}
            isJustMoved={justMoved === recipe.id}
            isArchiveInProgress={archivingInProgress.has(recipe.id)}
            isPinInProgress={pinningInProgress.has(recipe.id)}
          />
        ))}
      </ul>
      {hasMore && (
        <div className="mt-4 px-3">
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
