"use client";

import { useMemo, useState } from "react";
import {
  Badge,
  Button,
  DropdownMenu,
  IconButton,
  Select,
  TextField,
  Tooltip,
} from "@radix-ui/themes";
import {
  Cross2Icon,
  CameraIcon,
  ArchiveIcon,
  DotsVerticalIcon,
  ArrowLeftIcon,
  DrawingPinIcon,
  DrawingPinFilledIcon,
} from "@radix-ui/react-icons";

import { cn } from "@/lib/utils";
import {
  RECIPE_CATEGORIES,
  type Recipe,
  type RecipeCategory,
  type DuplicateRecipeData,
} from "@/types/recipes";
import { useRecipeStore } from "@/store/RecipeStore";
import { SkeletonRecipeCard } from "@/components/ui/SkeletonRecipeCard";
import { useToast } from "@/context/ToastContext";
import { DuplicateRecipeModal } from "@/components/recipes/DuplicateRecipeModal";

interface RecipeSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onOpen: () => void;
}

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
  const { addToast } = useToast();
  const {
    recipes,
    selectedRecipeId,
    selectRecipe,
    createRecipe,
    createRecipeWithData,
    archiveRecipe,
    unarchiveRecipe,
    pinRecipe,
    unpinRecipe,
    duplicateRecipe,
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
  const [showArchived, setShowArchived] = useState(false);
  const [animatingOut, setAnimatingOut] = useState<string | null>(null);
  const [justMoved, setJustMoved] = useState<string | null>(null);
  const [archivingInProgress, setArchivingInProgress] = useState<Set<string>>(new Set());
  const [pinningInProgress, setPinningInProgress] = useState<Set<string>>(new Set());
  const [duplicateModalRecipe, setDuplicateModalRecipe] = useState<Recipe | null>(null);
  const [isDuplicating, setIsDuplicating] = useState(false);

  const handleToggleArchive = async (recipeId: string, isArchived: boolean) => {
    // Prevent overlapping archive/unarchive actions on the same recipe
    if (archivingInProgress.has(recipeId)) {
      return;
    }

    // Mark this recipe as having an in-progress archive action
    setArchivingInProgress((prev) => new Set(prev).add(recipeId));

    // Start exit animation
    setAnimatingOut(recipeId);

    // Wait for animation to complete
    await new Promise((resolve) => setTimeout(resolve, 300));

    try {
      if (isArchived) {
        // Unarchiving flow
        // 1. Show toast immediately
        addToast("Recipe unarchived", "success");

        // 2. Call API with optimistic update and wait for completion
        try {
          await unarchiveRecipe(recipeId);
        } catch (error) {
          console.error("Failed to unarchive:", error);
          addToast("Failed to unarchive recipe", "error");
          throw error; // Re-throw to hit outer catch
        }

        // 3. Immediately switch view and highlight (optimistic update makes recipe available)
        setAnimatingOut(null);
        setShowArchived(false);

        // 4. Small delay to let React render, then highlight
        await new Promise((resolve) => setTimeout(resolve, 50));
        setJustMoved(recipeId);
        setTimeout(() => setJustMoved(null), 2000);
      } else {
        // Archiving flow
        // 1. Show toast immediately
        addToast("Recipe archived", "success");

        // 2. Call API with optimistic update and wait for completion
        try {
          await archiveRecipe(recipeId);
        } catch (error) {
          console.error("Failed to archive:", error);
          addToast("Failed to archive recipe", "error");
          throw error; // Re-throw to hit outer catch
        }

        // 3. Clear animation immediately (optimistic update makes recipe available in archive list)
        setAnimatingOut(null);

        // Optional: Uncomment to automatically show archived list
        // setShowArchived(true);
        // await new Promise((resolve) => setTimeout(resolve, 50));
        // setJustMoved(recipeId);
        // setTimeout(() => setJustMoved(null), 2000);
      }
    } catch (error) {
      console.error("Failed to toggle archive:", error);
      setAnimatingOut(null);
    } finally {
      // Always clear the in-progress flag when done
      setArchivingInProgress((prev) => {
        const next = new Set(prev);
        next.delete(recipeId);
        return next;
      });
    }
  };

  const handleTogglePin = async (recipeId: string, isPinned: boolean) => {
    // Prevent overlapping pin/unpin actions
    if (pinningInProgress.has(recipeId)) {
      return;
    }

    setPinningInProgress((prev) => new Set(prev).add(recipeId));

    try {
      if (isPinned) {
        await unpinRecipe(recipeId);
        addToast("Recipe unpinned", "success");
      } else {
        await pinRecipe(recipeId);
        addToast("Recipe pinned", "success");
      }
    } catch (error) {
      console.error("Failed to toggle pin:", error);
      addToast("Failed to pin/unpin recipe", "error");
    } finally {
      setPinningInProgress((prev) => {
        const next = new Set(prev);
        next.delete(recipeId);
        return next;
      });
    }
  };

  const handleConfirmDuplicate = async (data: DuplicateRecipeData) => {
    if (!duplicateModalRecipe) {
      return;
    }

    setIsDuplicating(true);
    try {
      await duplicateRecipe(duplicateModalRecipe.id, data);
      addToast("Recipe duplicated successfully", "success");
      setDuplicateModalRecipe(null);
      onClose();
    } catch (error) {
      console.error("Failed to duplicate recipe:", error);
      addToast("Failed to duplicate recipe", "error");
    } finally {
      setIsDuplicating(false);
    }
  };

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    // First filter by archived status
    const byArchiveStatus = recipes.filter((recipe) => {
      const isArchived = !!recipe.archivedAt;
      return showArchived ? isArchived : !isArchived;
    });

    // Then filter by search query
    let result = byArchiveStatus;
    if (normalized) {
      result = byArchiveStatus.filter((recipe) => {
        const haystack = [recipe.name, recipe.description ?? "", ...(recipe.tags ?? [])];
        return haystack.some((value) => value.toLowerCase().includes(normalized));
      });
    }

    // Sort: pinned recipes first, then by updated date
    return result.sort((a, b) => {
      // Pinned recipes always come first
      if (a.pinnedAt && !b.pinnedAt) return -1;
      if (!a.pinnedAt && b.pinnedAt) return 1;

      // Both pinned or both not pinned: sort by pinnedAt or updatedAt
      if (a.pinnedAt && b.pinnedAt) {
        return new Date(b.pinnedAt).getTime() - new Date(a.pinnedAt).getTime();
      }

      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }, [recipes, query, showArchived]);

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
        <div className="space-y-3 border-b border-neutral-200 px-5 py-3 dark:border-neutral-800">
          {/* Row 1: Title, Search, Close */}
          <div className="flex items-center gap-3">
            <h1 className="text-base font-semibold tracking-tight shrink-0">Recipes</h1>
            <TextField.Root
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search recipes"
              className="flex-1"
            />
            <Tooltip content="Close">
              <IconButton
                variant="ghost"
                size="2"
                className="rounded-full md:hidden"
                onClick={onClose}
                aria-label="Close recipes panel"
              >
                <Cross2Icon className="w-4 h-4" />
              </IconButton>
            </Tooltip>
          </div>

          {/* Loading/Error message */}
          {(loading || error) && (
            <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs text-neutral-600 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300">
              {loading ? "Syncing recipes…" : error}
            </div>
          )}

          {/* Row 2: Action buttons */}
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
                  <CameraIcon className="w-4 h-4 inline mr-1" />
                  {isScanning ? "Scanning…" : "Scan"}
                </label>
              </Button>
              <Tooltip
                content={showArchived ? "Show active recipes" : "Show archived recipes"}
              >
                <IconButton
                  variant={showArchived ? "solid" : "outline"}
                  size="2"
                  onClick={() => setShowArchived(!showArchived)}
                  aria-label="Toggle archived recipes view"
                >
                  <ArchiveIcon className="w-4 h-4" />
                </IconButton>
              </Tooltip>
            </div>
            {scanError && (
              <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600 dark:border-red-900 dark:bg-red-950 dark:text-red-400">
                {scanError}
              </div>
            )}
            {isCreating && (
              <div className="mt-4 space-y-3 rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900">
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
                      {RECIPE_CATEGORIES.map((category) => (
                        <Select.Item key={category} value={category}>
                          {category}
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

        {showArchived && (
          <Button
            variant="soft"
            size="2"
            className="w-full rounded-none py-5"
            onClick={() => setShowArchived(false)}
          >
            <ArrowLeftIcon className="w-4 h-4 inline mr-2" />
            Back to active recipes
          </Button>
        )}

        <div className="flex-1 overflow-y-auto px-2 py-4">
          {loading && filtered.length === 0 ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <SkeletonRecipeCard key={i} />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <p className="px-3 text-sm text-neutral-500 dark:text-neutral-400">
              {showArchived
                ? "No archived recipes."
                : "No recipes yet. Create one to get started."}
            </p>
          ) : (
            <>
              <ul className="space-y-3">
                {filtered.map((recipe) => {
                  const isAnimatingOut = animatingOut === recipe.id;
                  const isJustMoved = justMoved === recipe.id;
                  const isArchiveInProgress = archivingInProgress.has(recipe.id);
                  const isPinInProgress = pinningInProgress.has(recipe.id);

                  return (
                    <li
                      key={recipe.id}
                      className={cn(
                        "flex items-stretch gap-2 transition-all",
                        isAnimatingOut && "animate-slideUp",
                        isJustMoved &&
                          "animate-fadeIn ring-2 ring-blue-400 dark:ring-blue-600 rounded-lg",
                      )}
                    >
                      <Button
                        variant={recipe.id === selectedRecipeId ? "solid" : "soft"}
                        size="3"
                        className={cn(
                          "flex-1 h-auto rounded-lg px-4 py-4 text-left transition-shadow justify-start",
                          recipe.id === selectedRecipeId
                            ? "shadow-sm"
                            : "bg-neutral-50 hover:shadow-md dark:bg-neutral-900/60",
                          isAnimatingOut && "pointer-events-none opacity-50",
                        )}
                        onClick={() => {
                          selectRecipe(recipe.id);
                          onClose();
                        }}
                        disabled={isAnimatingOut}
                      >
                        <div className="space-y-2">
                          <div className="flex flex-col gap-2 items-start">
                            <div className="flex items-center gap-2">
                              {recipe.pinnedAt && (
                                <Tooltip content="Pinned">
                                  <DrawingPinFilledIcon className="h-4 w-4 text-white" />
                                </Tooltip>
                              )}
                              <span className="text-base font-semibold leading-tight md:text-sm">
                                {recipe.name}
                              </span>
                              {recipe.archivedAt && (
                                <Tooltip content="Archived">
                                  <ArchiveIcon className="h-4 w-4 text-orange-500" />
                                </Tooltip>
                              )}
                            </div>
                            <Badge
                              color={recipe.id === selectedRecipeId ? "gray" : "gold"}
                              variant="soft"
                              className={recipe.id === selectedRecipeId ? "bg-white" : ""}
                            >
                              {RECIPE_CATEGORIES.find(
                                (c) => c === recipe.category,
                              )?.toLocaleUpperCase() ??
                                recipe.category.toLocaleUpperCase()}
                            </Badge>
                          </div>
                          <p
                            className={cn(
                              "text-xs text-neutral-400 dark:text-neutral-500",
                              recipe.id === selectedRecipeId &&
                                "text-white dark:text-neutral-100 font-medium",
                            )}
                          >
                            Last updated {formatRelativeTime(recipe.updatedAt)}
                          </p>
                        </div>
                      </Button>
                      <div className="flex flex-col items-center gap-2">
                        <DropdownMenu.Root>
                          <DropdownMenu.Trigger>
                            <IconButton
                              variant="soft"
                              size="3"
                              className={cn(
                                "rounded-lg",
                                recipe.id === selectedRecipeId
                                  ? ""
                                  : "bg-neutral-50 hover:shadow-md dark:bg-neutral-900/60",
                              )}
                              aria-label="Recipe options"
                              disabled={isAnimatingOut || isArchiveInProgress}
                            >
                              <DotsVerticalIcon />
                            </IconButton>
                          </DropdownMenu.Trigger>
                          <DropdownMenu.Content>
                            <DropdownMenu.Item
                              onClick={(e) => {
                                e.stopPropagation();
                                setDuplicateModalRecipe(recipe);
                              }}
                              disabled={isAnimatingOut}
                            >
                              Duplicate
                            </DropdownMenu.Item>
                            <DropdownMenu.Separator />
                            <DropdownMenu.Item
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleArchive(recipe.id, !!recipe.archivedAt);
                              }}
                              disabled={isAnimatingOut || isArchiveInProgress}
                            >
                              <ArchiveIcon />
                              {recipe.archivedAt ? "Unarchive" : "Archive"}
                            </DropdownMenu.Item>
                          </DropdownMenu.Content>
                        </DropdownMenu.Root>
                        <Tooltip
                          content={recipe.pinnedAt ? "Unpin recipe" : "Pin recipe"}
                        >
                          <IconButton
                            variant="soft"
                            size="3"
                            color={recipe.pinnedAt ? "blue" : undefined}
                            className={cn(
                              "rounded-lg",
                              recipe.id === selectedRecipeId
                                ? ""
                                : "bg-neutral-50 hover:shadow-md dark:bg-neutral-900/60",
                            )}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleTogglePin(recipe.id, !!recipe.pinnedAt);
                            }}
                            disabled={
                              isAnimatingOut || isArchiveInProgress || isPinInProgress
                            }
                            aria-label={recipe.pinnedAt ? "Unpin recipe" : "Pin recipe"}
                          >
                            {recipe.pinnedAt ? (
                              <DrawingPinFilledIcon />
                            ) : (
                              <DrawingPinIcon />
                            )}
                          </IconButton>
                        </Tooltip>
                      </div>
                    </li>
                  );
                })}
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

      {duplicateModalRecipe && (
        <DuplicateRecipeModal
          isOpen={!!duplicateModalRecipe}
          sourceRecipe={duplicateModalRecipe}
          onConfirm={handleConfirmDuplicate}
          onCancel={() => setDuplicateModalRecipe(null)}
          isLoading={isDuplicating}
        />
      )}
    </>
  );
}
