import { Button } from "@radix-ui/themes";
import { SkeletonRecipeCard } from "@/components/ui/SkeletonRecipeCard";
import { RecipeListItemWithLayout, type SidebarLayout } from "./RecipeListItemLayouts";
import { cn } from "@/lib/utils";
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
  layout?: SidebarLayout;
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
  layout = "default",
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

  // Different spacing based on layout
  const listClassName = cn(
    layout === "cards" ? "grid grid-cols-2 gap-2" : "space-y-3",
    layout === "compact" && "space-y-1",
    layout === "list" && "space-y-1",
    layout === "minimal" && "space-y-0 divide-y divide-neutral-100",
  );

  return (
    <>
      <ul className={listClassName}>
        {recipes.map((recipe) => (
          <RecipeListItemWithLayout
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
            layout={layout}
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
