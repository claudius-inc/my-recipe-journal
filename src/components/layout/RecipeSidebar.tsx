"use client";

import { useMemo, useState } from "react";
import { Button, IconButton, Select, TextField, Tooltip } from "@radix-ui/themes";

import { cn } from "@/lib/utils";
import { CATEGORY_CONFIGS, type RecipeCategory } from "@/types/recipes";
import { useRecipeStore } from "@/store/RecipeStore";
import { SkeletonRecipeCard } from "@/components/ui/SkeletonRecipeCard";

interface RecipeSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onOpen: () => void;
}

const categories = Object.values(CATEGORY_CONFIGS);

const formatRelativeTime = (iso: string) => {
  const formatter = new Intl.RelativeTimeFormat(undefined, {
    numeric: "auto",
  });
  const now = Date.now();
  const diffMs = new Date(iso).getTime() - now;
  const diffMinutes = Math.round(diffMs / (1000 * 60));
  if (Math.abs(diffMinutes) < 60) {
    return formatter.format(diffMinutes, "minute");
  }
  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) {
    return formatter.format(diffHours, "hour");
  }
  const diffDays = Math.round(diffHours / 24);
  if (Math.abs(diffDays) < 14) {
    return formatter.format(diffDays, "day");
  }
  const diffWeeks = Math.round(diffDays / 7);
  if (Math.abs(diffWeeks) < 8) {
    return formatter.format(diffWeeks, "week");
  }
  const diffMonths = Math.round(diffDays / 30);
  return formatter.format(diffMonths, "month");
};

export function RecipeSidebar({ isOpen, onClose, onOpen }: RecipeSidebarProps) {
  const {
    recipes,
    selectedRecipeId,
    selectRecipe,
    createRecipe,
    createRecipeWithData,
    loading,
    error,
    hasMore,
    loadMore,
    loadingMore,
  } = useRecipeStore();
  const [query, setQuery] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [draftCategory, setDraftCategory] = useState<RecipeCategory>("bread");
  const [creationError, setCreationError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return recipes;
    }
    return recipes.filter((recipe) => {
      const haystack = [recipe.name, recipe.description ?? "", ...(recipe.tags ?? [])];
      return haystack.some((value) => value.toLowerCase().includes(normalized));
    });
  }, [recipes, query]);

  const persistRecipe = async () => {
    if (!draftName.trim() || isSaving) {
      return;
    }
    setCreationError(null);
    setIsSaving(true);
    try {
      // Check if we have extracted recipe data from photo scan
      const extractedData = (window as any).__extractedRecipeData;

      if (extractedData) {
        // Use the rich data from photo extraction
        await createRecipeWithData({
          name: draftName.trim(),
          category: draftCategory,
          description: extractedData.description,
          ingredients: extractedData.ingredients,
          instructions: extractedData.instructions,
          metadata: extractedData.metadata,
        });

        // Clean up stored data
        delete (window as any).__extractedRecipeData;
      } else {
        // Regular recipe creation
        await createRecipe({ name: draftName.trim(), category: draftCategory });
      }

      setDraftName("");
      setDraftCategory("bread");
      setIsCreating(false);
      onClose();
    } catch (err) {
      setCreationError(err instanceof Error ? err.message : "Failed to create recipe");
    } finally {
      setIsSaving(false);
    }
  };

  const handlePhotoScan = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setIsScanning(true);
    setScanError(null);
    setCreationError(null);

    try {
      const formData = new FormData();
      formData.append("photo", file);

      const response = await fetch("/api/recipes/from-photo", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to scan recipe");
      }

      const extractedData = await response.json();

      // Populate form with extracted data
      setDraftName(extractedData.name || "");
      setDraftCategory(extractedData.category || "bread");
      setIsCreating(true);
      onOpen();

      // Store extracted data for later use when creating
      (window as any).__extractedRecipeData = extractedData;
    } catch (err) {
      setScanError(err instanceof Error ? err.message : "Failed to scan photo");
    } finally {
      setIsScanning(false);
      // Reset the file input
      event.target.value = "";
    }
  };

  return (
    <>
      {isOpen && (
        <div
          role="presentation"
          className="fixed inset-0 z-30 bg-neutral-950/40 backdrop-blur-sm md:hidden"
          onClick={onClose}
        />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-[85vw] max-w-sm flex-col border-r border-neutral-200 bg-white shadow-xl transition-transform md:static md:z-auto md:h-full md:w-80 md:translate-x-0 md:shadow-none dark:border-neutral-800 dark:bg-neutral-900",
          isOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center justify-between gap-2 border-b border-neutral-200 px-5 py-4 dark:border-neutral-800">
          <div>
            <h1 className="text-lg font-semibold tracking-tight">Recipe Log</h1>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Capture iterations and improve every batch.
            </p>
          </div>
          <Tooltip content="Close">
            <IconButton
              variant="ghost"
              size="2"
              className="rounded-full md:hidden"
              onClick={onClose}
              aria-label="Close recipes panel"
            >
              ×
            </IconButton>
          </Tooltip>
        </div>

        <div className="space-y-4 border-b border-neutral-200 px-5 py-4 dark:border-neutral-800">
          {(loading || error) && (
            <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs text-neutral-600 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300">
              {loading ? "Syncing recipes…" : error}
            </div>
          )}
          <div className="relative">
            <TextField.Root
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search recipes"
              className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-2 text-sm outline-none transition focus:border-neutral-400 focus:bg-white focus:ring-2 focus:ring-neutral-200 dark:border-neutral-700 dark:bg-neutral-800 dark:focus:border-neutral-500 dark:focus:ring-neutral-700"
            />
          </div>
          <div>
            <div className="flex gap-2">
              <Button
                size="2"
                className="flex-1"
                onClick={() => {
                  setIsCreating(true);
                  onOpen();
                }}
              >
                + New recipe
              </Button>
              <Button variant="outline" size="2" asChild disabled={isScanning}>
                <label
                  className={cn("cursor-pointer", isScanning && "cursor-not-allowed")}
                >
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/jpg,image/webp"
                    onChange={handlePhotoScan}
                    disabled={isScanning}
                    className="hidden"
                  />
                  {isScanning ? "📸 Scanning…" : "📸 Scan"}
                </label>
              </Button>
            </div>
            {scanError && (
              <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600 dark:border-red-900 dark:bg-red-950 dark:text-red-400">
                {scanError}
              </div>
            )}
            {isCreating && (
              <div className="mt-4 space-y-3 rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
                    Recipe name
                  </label>
                  <TextField.Root
                    autoFocus
                    value={draftName}
                    onChange={(event) => setDraftName(event.target.value)}
                    className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-400 focus:ring-2 focus:ring-neutral-200 dark:border-neutral-700 dark:bg-neutral-800 dark:focus:border-neutral-500 dark:focus:ring-neutral-700"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
                    Category
                  </label>
                  <Select.Root
                    value={draftCategory}
                    onValueChange={(value) => setDraftCategory(value as RecipeCategory)}
                  >
                    <Select.Trigger className="w-full" />
                    <Select.Content>
                      {categories.map((category) => (
                        <Select.Item key={category.id} value={category.id}>
                          {category.name}
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select.Root>
                </div>
                {creationError && <p className="text-xs text-red-500">{creationError}</p>}
                <div className="flex gap-2">
                  <Button
                    size="2"
                    className="flex-1"
                    onClick={persistRecipe}
                    disabled={isSaving}
                  >
                    {isSaving ? "Creating…" : "Create"}
                  </Button>
                  <Button
                    variant="outline"
                    size="2"
                    className="flex-1"
                    onClick={() => {
                      setIsCreating(false);
                      setDraftName("");
                      setCreationError(null);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-4">
          {loading && filtered.length === 0 ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <SkeletonRecipeCard key={i} />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <p className="px-3 text-sm text-neutral-500 dark:text-neutral-400">
              No recipes yet. Create one to get started.
            </p>
          ) : (
            <>
              <ul className="space-y-2">
                {filtered.map((recipe) => (
                  <li key={recipe.id}>
                    <Button
                      variant={recipe.id === selectedRecipeId ? "solid" : "soft"}
                      size="3"
                      className={cn(
                        "w-full rounded-xl px-4 py-3 text-left",
                        recipe.id === selectedRecipeId
                          ? ""
                          : "bg-neutral-50 dark:bg-neutral-900/60",
                      )}
                      onClick={() => {
                        selectRecipe(recipe.id);
                        onClose();
                      }}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold">{recipe.name}</span>
                        <span className="text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                          {CATEGORY_CONFIGS[recipe.category]?.name ?? recipe.category}
                        </span>
                      </div>
                      {recipe.description ? (
                        <p className="mt-1 line-clamp-2 text-xs text-neutral-500 dark:text-neutral-400">
                          {recipe.description}
                        </p>
                      ) : null}
                      <p className="mt-2 text-xs text-neutral-400 dark:text-neutral-500">
                        Updated {formatRelativeTime(recipe.updatedAt)}
                      </p>
                    </Button>
                  </li>
                ))}
              </ul>
              {hasMore && (
                <div className="mt-4 px-3">
                  <Button
                    variant="outline"
                    size="2"
                    className="w-full"
                    onClick={loadMore}
                    disabled={loadingMore}
                  >
                    {loadingMore ? "Loading…" : "Load more"}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </aside>
    </>
  );
}
