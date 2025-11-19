"use client";

import { useMemo, useState, useEffect } from "react";
import { Button, DropdownMenu, IconButton, Tooltip } from "@radix-ui/themes";
import {
  ArchiveIcon,
  ArrowLeftIcon,
  CameraIcon,
  LinkBreak2Icon,
  PlusIcon,
} from "@radix-ui/react-icons";

import { cn } from "@/lib/utils";
import {
  type Recipe,
  type RecipeCategory,
  type DuplicateRecipeData,
} from "@/types/recipes";
import { useRecipeStore } from "@/store/RecipeStore";
import { useToast } from "@/context/ToastContext";
import { DuplicateRecipeModal, ImportFromUrlModal } from "@/components/recipes/modals";

import { RecipeSearchHeader } from "./sidebar/RecipeSearchHeader";
import { RecipeList } from "./sidebar/RecipeList";
import { CreateRecipeForm } from "./sidebar/CreateRecipeForm";

interface RecipeSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onOpen: () => void;
}

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
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [draftCategory, setDraftCategory] = useState<RecipeCategory>({
    primary: "baking",
    secondary: "bread",
  });
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
  const [showImportModal, setShowImportModal] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsSearchExpanded(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleToggleArchive = async (recipeId: string, isArchived: boolean) => {
    if (archivingInProgress.has(recipeId)) {
      return;
    }

    setArchivingInProgress((prev) => new Set(prev).add(recipeId));
    setAnimatingOut(recipeId);

    await new Promise((resolve) => setTimeout(resolve, 300));

    try {
      if (isArchived) {
        addToast("Recipe unarchived", "success");
        try {
          await unarchiveRecipe(recipeId);
        } catch (error) {
          console.error("Failed to unarchive:", error);
          addToast("Failed to unarchive recipe", "error");
          throw error;
        }

        setAnimatingOut(null);
        setShowArchived(false);

        await new Promise((resolve) => setTimeout(resolve, 50));
        setJustMoved(recipeId);
        setTimeout(() => setJustMoved(null), 2000);
      } else {
        addToast("Recipe archived", "success");
        try {
          await archiveRecipe(recipeId);
        } catch (error) {
          console.error("Failed to archive:", error);
          addToast("Failed to archive recipe", "error");
          throw error;
        }

        setAnimatingOut(null);
      }
    } catch (error) {
      console.error("Failed to toggle archive:", error);
      setAnimatingOut(null);
    } finally {
      setArchivingInProgress((prev) => {
        const next = new Set(prev);
        next.delete(recipeId);
        return next;
      });
    }
  };

  const handleTogglePin = async (recipeId: string, isPinned: boolean) => {
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

  const handleImportFromUrl = async (data: {
    name: string;
    category: RecipeCategory;
    description?: string;
    ingredients: Array<{
      name: string;
      quantity: number;
      unit: string;
      role: import("@/types/recipes").IngredientRole;
      notes?: string;
    }>;
    steps?: Array<{ order: number; text: string }>;
    instructions?: string;
    sourceUrl: string;
    imageUrl?: string;
  }) => {
    try {
      await createRecipeWithData({
        name: data.name,
        category: data.category,
        description: data.description,
        ingredients: data.ingredients,
        steps: data.steps,
        instructions: data.instructions,
        imageUrl: data.imageUrl,
      });
      addToast("Recipe imported successfully", "success");
      setShowImportModal(false);
      onClose();
    } catch (error) {
      console.error("Failed to import recipe:", error);
      throw error;
    }
  };

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    const byArchiveStatus = recipes.filter((recipe) => {
      const isArchived = !!recipe.archivedAt;
      return showArchived ? isArchived : !isArchived;
    });

    let result = byArchiveStatus;
    if (normalized) {
      result = byArchiveStatus.filter((recipe) => {
        const haystack = [recipe.name, recipe.description ?? "", ...(recipe.tags ?? [])];
        return haystack.some((value) => value.toLowerCase().includes(normalized));
      });
    }

    return result.sort((a, b) => {
      if (a.pinnedAt && !b.pinnedAt) return -1;
      if (!a.pinnedAt && b.pinnedAt) return 1;

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
      const extractedData = (window as any).__extractedRecipeData;

      if (extractedData) {
        await createRecipeWithData({
          name: draftName.trim(),
          category: draftCategory,
          description: extractedData.description,
          ingredients: extractedData.ingredients,
          steps: extractedData.steps,
          instructions: extractedData.instructions,
        });

        delete (window as any).__extractedRecipeData;
      } else {
        await createRecipe({ name: draftName.trim(), category: draftCategory });
      }

      setDraftName("");
      setDraftCategory({ primary: "baking", secondary: "bread" });
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

      setDraftName(extractedData.name || "");
      setDraftCategory(
        extractedData.category || { primary: "baking", secondary: "bread" },
      );
      setIsCreating(true);
      onOpen();

      (window as any).__extractedRecipeData = extractedData;
    } catch (err) {
      setScanError(err instanceof Error ? err.message : "Failed to scan photo");
    } finally {
      setIsScanning(false);
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
          <RecipeSearchHeader
            query={query}
            onQueryChange={setQuery}
            isExpanded={isSearchExpanded}
            onExpandToggle={setIsSearchExpanded}
            onClose={onClose}
          />

          {(loading || error) && (
            <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs text-neutral-600 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300">
              {loading ? "Syncing recipes…" : error}
            </div>
          )}

          <div>
            <div className="flex gap-2">
              <DropdownMenu.Root>
                <DropdownMenu.Trigger>
                  <Button size="2" className="flex-1">
                    <PlusIcon className="w-4 h-4 inline mr-1" />
                    New Recipe
                  </Button>
                </DropdownMenu.Trigger>
                <DropdownMenu.Content>
                  <DropdownMenu.Item
                    onClick={() => {
                      setIsCreating(true);
                      onOpen();
                    }}
                  >
                    <PlusIcon className="w-4 h-4 inline mr-2" />
                    New blank recipe
                  </DropdownMenu.Item>
                  <DropdownMenu.Item asChild>
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/jpg,image/webp"
                        onChange={handlePhotoScan}
                        disabled={isScanning}
                        className="hidden"
                      />
                      <CameraIcon className="w-4 h-4 inline mr-2" />
                      {isScanning ? "Scanning photo..." : "Scan from photo"}
                    </label>
                  </DropdownMenu.Item>
                  <DropdownMenu.Item
                    onClick={() => {
                      setShowImportModal(true);
                      onOpen();
                    }}
                  >
                    <LinkBreak2Icon className="w-4 h-4 inline mr-2" />
                    Import from URL
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Root>
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
              <CreateRecipeForm
                name={draftName}
                onNameChange={setDraftName}
                category={draftCategory}
                onCategoryChange={setDraftCategory}
                error={creationError}
                isSaving={isSaving}
                onSave={persistRecipe}
                onCancel={() => {
                  setIsCreating(false);
                  setDraftName("");
                  setCreationError(null);
                }}
              />
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
          <RecipeList
            recipes={filtered}
            loading={loading}
            query={query}
            showArchived={showArchived}
            hasMore={hasMore}
            loadingMore={loadingMore}
            onLoadMore={loadMore}
            selectedId={selectedRecipeId}
            onSelect={(id) => {
              selectRecipe(id);
              onClose();
            }}
            onTogglePin={handleTogglePin}
            onToggleArchive={handleToggleArchive}
            onDuplicate={(recipe) => setDuplicateModalRecipe(recipe)}
            animatingOut={animatingOut}
            justMoved={justMoved}
            archivingInProgress={archivingInProgress}
            pinningInProgress={pinningInProgress}
          />
        </div>
      </aside>

      {duplicateModalRecipe && (
        <DuplicateRecipeModal
          isOpen={!!duplicateModalRecipe}
          sourceRecipe={duplicateModalRecipe}
          onCancel={() => setDuplicateModalRecipe(null)}
          onConfirm={handleConfirmDuplicate}
          isLoading={isDuplicating}
        />
      )}

      {showImportModal && (
        <ImportFromUrlModal
          isOpen={showImportModal}
          onClose={() => setShowImportModal(false)}
          onImport={handleImportFromUrl}
        />
      )}
    </>
  );
}
