import { useState, useEffect, useMemo } from "react";
import { useRecipeStore } from "@/store/RecipeStore";
import { useToast } from "@/context/ToastContext";
import {
  type Recipe,
  type RecipeCategory,
  type DuplicateRecipeData,
} from "@/types/recipes";

export function useSidebarLogic(onClose: () => void, onOpen: () => void) {
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

  return {
    state: {
      query,
      isSearchExpanded,
      isCreating,
      draftName,
      draftCategory,
      creationError,
      isSaving,
      isScanning,
      scanError,
      showArchived,
      animatingOut,
      justMoved,
      archivingInProgress,
      pinningInProgress,
      duplicateModalRecipe,
      isDuplicating,
      showImportModal,
      loading,
      error,
      hasMore,
      loadingMore,
      selectedRecipeId,
      filteredRecipes: filtered,
    },
    actions: {
      setQuery,
      setIsSearchExpanded,
      setIsCreating,
      setDraftName,
      setDraftCategory,
      setCreationError,
      setShowArchived,
      setDuplicateModalRecipe,
      setShowImportModal,
      handleToggleArchive,
      handleTogglePin,
      handleConfirmDuplicate,
      handleImportFromUrl,
      persistRecipe,
      handlePhotoScan,
      loadMore,
      selectRecipe,
    },
  };
}
