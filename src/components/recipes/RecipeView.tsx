"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { cn } from "@/lib/utils";
import {
  type DuplicateRecipeData,
  type Ingredient,
  type Recipe,
  type RecipeVersion,
  type RecipeCategory,
  type RecipeStep,
} from "@/types/recipes";
import { useRecipeStore } from "@/store/RecipeStore";
import { useToast } from "@/context/ToastContext";
import { usePhotoUpload } from "@/hooks/usePhotoUpload";
import { formatDateTime } from "@/lib/formatting";
import type { AIAssistantResponse } from "@/lib/gemini-assistant";

// Component imports - organized by feature
import { EditableField } from "@/components/ui/EditableField";
import { SaveIndicator } from "@/components/ui/SaveIndicator";
import { AIAssistantButton, RecipeAIAssistant } from "./ai-assistant";
import { CategorySelector } from "./selectors";
import {
  DuplicateRecipeModal,
  IterationIntentModal,
  ScalingConfirmationModal,
  VersionComparisonModal,
} from "./modals";
import { IngredientList } from "./ingredients";
import { RecipeSteps } from "./steps";
import { PhotoUploadSection } from "./shared";
import { RecipeVersionTabs, RecipeVersionNotes } from "./version";

// Radix UI imports
import { Button, TextArea } from "@radix-ui/themes";
import { ArchiveIcon } from "@radix-ui/react-icons";

interface RecipeViewProps {
  onOpenSidebar: () => void;
}

export function RecipeView({ onOpenSidebar }: RecipeViewProps) {
  const { addToast } = useToast();
  const {
    recipes,
    loading,
    selectedRecipe,
    selectedVersion,
    selectVersion,
    createVersion,
    updateVersion,
    deleteVersion,
    addIngredient,
    updateIngredient,
    batchUpdateIngredients,
    deleteIngredient,
    updateRecipe,
    archiveRecipe,
    unarchiveRecipe,
    duplicateRecipe,
    getIngredientSuggestions,
  } = useRecipeStore();

  const [recipeName, setRecipeName] = useState("");
  const [recipeDescription, setRecipeDescription] = useState("");
  const [category, setCategory] = useState<RecipeCategory>(
    selectedRecipe?.category ?? { primary: "baking", secondary: "bread" },
  );
  const [notesDraft, setNotesDraft] = useState({
    notes: "",
    nextSteps: "",
    tasteNotes: "",
    visualNotes: "",
    textureNotes: "",
  });
  const [stepsDraft, setStepsDraft] = useState<RecipeStep[]>([]);
  const [isSavingSteps, setIsSavingSteps] = useState(false);
  const [stepsLastSaved, setStepsLastSaved] = useState<Date | null>(null);
  const [stepsSaveError, setStepsSaveError] = useState<Error | null>(null);
  const [ingredientSuggestions, setIngredientSuggestions] = useState<string[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [isScalingOpen, setIsScalingOpen] = useState(false);
  const [scalingMode, setScalingMode] = useState<"ingredient" | null>(null);
  const [selectedScalingIngredient, setSelectedScalingIngredient] = useState<string>("");
  const [targetQuantity, setTargetQuantity] = useState<string>("");
  const [scaledIngredients, setScaledIngredients] = useState<
    Array<{
      id: string;
      name: string;
      originalQuantity: number;
      newQuantity: number;
      unit: string;
    }>
  >([]);
  const [isScalingModalOpen, setIsScalingModalOpen] = useState(false);
  const [isApplyingScaling, setIsApplyingScaling] = useState(false);
  const [isPreviewingScaling, setIsPreviewingScaling] = useState(false);
  const [savingMetaField, setSavingMetaField] = useState<string | null>(null);
  const [isIntentModalOpen, setIsIntentModalOpen] = useState(false);
  const [isCreatingVersion, setIsCreatingVersion] = useState(false);
  const [isComparisonOpen, setIsComparisonOpen] = useState(false);
  const [comparisonVersion, setComparisonVersion] = useState<RecipeVersion | null>(null);
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
  const [showGenerationTimeout, setShowGenerationTimeout] = useState(false);
  // AI Assistant state
  const [isAIAssistantOpen, setIsAIAssistantOpen] = useState(false);
  // Duplicate modal state
  const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState(false);
  // SaveIndicator states for auto-save fields
  const [savingRecipeName, setSavingRecipeName] = useState(false);
  const [savingRecipeDescription, setSavingRecipeDescription] = useState(false);
  const [savingCategory, setSavingCategory] = useState(false);
  const [savingNotes, setSavingNotes] = useState<Record<string, boolean>>({});
  const [savingIngredient, setSavingIngredient] = useState<Record<string, boolean>>({});
  // Baking checklist (ephemeral, not persisted)
  const [checkedIngredients, setCheckedIngredients] = useState<Set<string>>(new Set());
  // Pending ingredients for optimistic UI
  const [pendingIngredients, setPendingIngredients] = useState<
    Array<{
      tempId: string;
      name: string;
      quantity: number;
      unit: string;
      role: Ingredient["role"];
    }>
  >([]);
  // Star rating states
  const [savingRating, setSavingRating] = useState<string | null>(null);
  const [hoverRating, setHoverRating] = useState<{
    field: string | null;
    value: number | null;
  }>({ field: null, value: null });
  const [pendingRatings, setPendingRatings] = useState<{
    tasteRating?: number;
    visualRating?: number;
    textureRating?: number;
  }>({});

  // Initialize photo upload hook
  const {
    handlePhotoUpload,
    removePhoto,
    isUploading,
    photoUploadProgress,
    photoUploadError,
    isRemovingPhoto,
  } = usePhotoUpload({
    recipeId: selectedRecipe?.id ?? "",
    versionId: selectedVersion?.id ?? "",
  });

  useEffect(() => {
    if (selectedRecipe) {
      setRecipeName(selectedRecipe.name);
      setRecipeDescription(selectedRecipe.description ?? "");
      setCategory(selectedRecipe.category);
    }
  }, [selectedRecipe]);

  useEffect(() => {
    if (selectedVersion) {
      setNotesDraft({
        notes: selectedVersion.notes,
        nextSteps: selectedVersion.nextSteps,
        tasteNotes: selectedVersion.tasteNotes || "",
        visualNotes: selectedVersion.visualNotes || "",
        textureNotes: selectedVersion.textureNotes || "",
      });
      setStepsDraft((selectedVersion.steps as RecipeStep[]) || []);
    }
  }, [selectedVersion]);

  useEffect(() => {
    if (!selectedRecipe) {
      return;
    }
    let active = true;
    setIsLoadingSuggestions(true);
    getIngredientSuggestions(selectedRecipe.id)
      .then((data) => {
        if (active) {
          setIngredientSuggestions(data);
          setIsLoadingSuggestions(false);
        }
      })
      .catch(() => {
        if (active) {
          setIngredientSuggestions([]);
          setIsLoadingSuggestions(false);
        }
      });
    return () => {
      active = false;
    };
  }, [getIngredientSuggestions, selectedRecipe]);

  // Reset baking checklist when version changes
  useEffect(() => {
    setCheckedIngredients(new Set());
  }, [selectedVersion?.id]);

  const flourTotal = useMemo(() => {
    if (!selectedVersion) {
      return 0;
    }
    return selectedVersion.ingredients
      .filter((ingredient) => ingredient.role === "flour")
      .reduce((sum, ingredient) => sum + ingredient.quantity, 0);
  }, [selectedVersion]);

  const totalWeight = useMemo(() => {
    if (!selectedVersion) {
      return 0;
    }
    return selectedVersion.ingredients.reduce(
      (sum, ingredient) => sum + ingredient.quantity,
      0,
    );
  }, [selectedVersion]);

  const hydrationPercent = useMemo(() => {
    if (!selectedVersion || flourTotal === 0) {
      return 0;
    }
    const liquidTotal = selectedVersion.ingredients
      .filter((ingredient) => ingredient.role === "liquid")
      .reduce((sum, ingredient) => sum + ingredient.quantity, 0);
    return (liquidTotal / flourTotal) * 100;
  }, [selectedVersion, flourTotal]);

  const handleRecipeBlur = useCallback(
    async (field: "name" | "description" | "category") => {
      if (!selectedRecipe) {
        return;
      }
      if (field === "name" && recipeName !== selectedRecipe.name) {
        setSavingRecipeName(true);
        try {
          await updateRecipe(selectedRecipe.id, { name: recipeName });
        } finally {
          setSavingRecipeName(false);
        }
      }
      if (
        field === "description" &&
        (recipeDescription ?? "") !== (selectedRecipe.description ?? "")
      ) {
        setSavingRecipeDescription(true);
        try {
          await updateRecipe(selectedRecipe.id, {
            description: recipeDescription || null,
          });
        } finally {
          setSavingRecipeDescription(false);
        }
      }
      if (field === "category" && category !== selectedRecipe.category) {
        await updateRecipe(selectedRecipe.id, { category });
      }
    },
    [category, recipeDescription, recipeName, selectedRecipe, updateRecipe],
  );

  const handleToggleArchive = useCallback(async () => {
    if (!selectedRecipe) {
      return;
    }

    const isArchiving = !selectedRecipe.archivedAt;

    // Show toast immediately for instant feedback
    if (isArchiving) {
      addToast("Recipe archived", "success");
      // Call API in background with optimistic update
      archiveRecipe(selectedRecipe.id).catch((error) => {
        console.error("Failed to archive:", error);
        addToast("Failed to archive recipe", "error");
      });
    } else {
      addToast("Recipe unarchived", "success");
      // Call API in background with optimistic update
      unarchiveRecipe(selectedRecipe.id).catch((error) => {
        console.error("Failed to unarchive:", error);
        addToast("Failed to unarchive recipe", "error");
      });
    }
  }, [selectedRecipe, archiveRecipe, unarchiveRecipe, addToast]);

  const handleNotesSave = useCallback(
    async (field: keyof typeof notesDraft, value: string) => {
      if (!selectedRecipe || !selectedVersion) {
        return;
      }
      setNotesDraft((prev) => ({ ...prev, [field]: value }));
      setSavingNotes((prev) => ({ ...prev, [field]: true }));
      try {
        await updateVersion(selectedRecipe.id, selectedVersion.id, { [field]: value });
      } finally {
        setSavingNotes((prev) => ({ ...prev, [field]: false }));
      }
    },
    [selectedRecipe, selectedVersion, updateVersion],
  );

  const saveStepsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleStepsUpdate = useCallback(
    (steps: RecipeStep[], actionType: "delete" | "add" | "edit" = "edit") => {
      if (!selectedRecipe || !selectedVersion) {
        return;
      }

      // Update local state immediately for responsive UI
      setStepsDraft(steps);
      setStepsSaveError(null); // Clear any previous errors

      // Cancel any pending save
      if (saveStepsTimeoutRef.current) {
        clearTimeout(saveStepsTimeoutRef.current);
      }

      // Different debounce delays based on action type
      const debounceDelays = {
        delete: 0, // Persist deletes immediately
        add: 100, // Quick for adding steps
        edit: 500, // Standard for text editing
      };

      // Debounce the actual save operation
      saveStepsTimeoutRef.current = setTimeout(async () => {
        setIsSavingSteps(true);
        try {
          await updateVersion(selectedRecipe.id, selectedVersion.id, { steps });
          setStepsLastSaved(new Date());
          setStepsSaveError(null);
          // Success - no toast notification (auto-save should be silent)
        } catch (error) {
          const err = error instanceof Error ? error : new Error("Failed to save");
          setStepsSaveError(err);
          addToast("Failed to update steps", "error");
        } finally {
          setIsSavingSteps(false);
        }
      }, debounceDelays[actionType]);
    },
    [selectedRecipe, selectedVersion, updateVersion, addToast],
  );

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveStepsTimeoutRef.current) {
        clearTimeout(saveStepsTimeoutRef.current);
      }
    };
  }, []);

  const handleRatingChange = useCallback(
    async (field: "tasteRating" | "visualRating" | "textureRating", value: number) => {
      if (!selectedRecipe || !selectedVersion) {
        return;
      }
      // Set pending value for optimistic UI update
      setPendingRatings((prev) => ({ ...prev, [field]: value }));
      setSavingRating(field);
      try {
        await updateVersion(selectedRecipe.id, selectedVersion.id, { [field]: value });
      } catch (error) {
        console.error("Failed to save rating:", error);
        addToast("Failed to save rating", "error");
      } finally {
        setSavingRating(null);
        // Clear pending value after save completes
        setPendingRatings((prev) => {
          const updated = { ...prev };
          delete updated[field];
          return updated;
        });
      }
    },
    [selectedRecipe, selectedVersion, updateVersion, addToast],
  );

  const handlePreviewScaling = useCallback(() => {
    if (!selectedVersion || !selectedScalingIngredient || !targetQuantity) {
      return;
    }

    setIsPreviewingScaling(true);

    // Simulate brief calculation time for feedback
    setTimeout(() => {
      const baseIngredient = selectedVersion.ingredients.find(
        (ing) => ing.id === selectedScalingIngredient,
      );

      if (!baseIngredient) {
        setIsPreviewingScaling(false);
        return;
      }

      const parsed = Number(targetQuantity);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        setIsPreviewingScaling(false);
        return;
      }

      const scalingFactor = parsed / baseIngredient.quantity;

      const scaled = selectedVersion.ingredients.map((ing) => ({
        id: ing.id,
        name: ing.name,
        originalQuantity: ing.quantity,
        newQuantity: ing.quantity * scalingFactor,
        unit: ing.unit,
      }));

      setScaledIngredients(scaled);
      setIsScalingModalOpen(true);
      setIsPreviewingScaling(false);
    }, 300);
  }, [selectedVersion, selectedScalingIngredient, targetQuantity]);

  const handleConfirmScaling = useCallback(async () => {
    if (!selectedRecipe || !selectedVersion || scaledIngredients.length === 0) {
      return;
    }

    setIsApplyingScaling(true);
    try {
      // Update all ingredients with new quantities in a single batch request
      await batchUpdateIngredients(
        selectedRecipe.id,
        selectedVersion.id,
        scaledIngredients.map((ingredient) => ({
          id: ingredient.id,
          quantity: ingredient.newQuantity,
        })),
      );

      setIsScalingModalOpen(false);
      setIsScalingOpen(false);
      setSelectedScalingIngredient("");
      setTargetQuantity("");
      setScaledIngredients([]);
    } finally {
      setIsApplyingScaling(false);
    }
  }, [selectedRecipe, selectedVersion, scaledIngredients, batchUpdateIngredients]);

  const handleCancelScaling = useCallback(() => {
    setIsScalingModalOpen(false);
    setScaledIngredients([]);
  }, []);

  const handleUpdateIngredientPercentage = useCallback(
    async (ingredientId: string, newQuantity: number) => {
      if (!selectedRecipe || !selectedVersion) {
        return;
      }
      await updateIngredient(selectedRecipe.id, selectedVersion.id, ingredientId, {
        quantity: newQuantity,
      });
    },
    [selectedRecipe, selectedVersion, updateIngredient],
  );

  const handleCompareVersion = useCallback(
    (versionId: string) => {
      if (!selectedRecipe) {
        return;
      }
      const versionToCompare = selectedRecipe.versions.find((v) => v.id === versionId);
      if (versionToCompare) {
        setComparisonVersion(versionToCompare);
        setIsComparisonOpen(true);
      }
    },
    [selectedRecipe],
  );

  const handleDuplicateVersion = useCallback(async () => {
    if (!selectedRecipe || !selectedVersion) {
      return;
    }
    setIsIntentModalOpen(true);
  }, [selectedRecipe, selectedVersion]);

  const handleCreateVersionWithIntent = useCallback(
    async (data: {
      iterationIntent: string;
      hypothesis?: string;
      baseVersionId: string;
    }) => {
      if (!selectedRecipe) {
        return;
      }
      setIsCreatingVersion(true);
      try {
        await createVersion(selectedRecipe.id, {
          baseVersionId: data.baseVersionId,
          setActive: true,
        });
        // Update the newly created version with iteration intent
        // This will be handled by selecting the new version and updating it
        setIsIntentModalOpen(false);
      } finally {
        setIsCreatingVersion(false);
      }
    },
    [selectedRecipe, createVersion],
  );

  const handleGenerateDescription = useCallback(async () => {
    if (!selectedRecipe || !selectedVersion || selectedVersion.ingredients.length === 0) {
      return;
    }
    setIsGeneratingDescription(true);
    setShowGenerationTimeout(false);

    // Show timeout warning after 10 seconds
    const timeoutHandle = setTimeout(() => {
      setShowGenerationTimeout(true);
    }, 10000);

    try {
      const response = await fetch("/api/recipes/generate-description", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ingredients: selectedVersion.ingredients.map((ing) => ({
            name: ing.name,
            quantity: ing.quantity,
            unit: ing.unit,
            role: ing.role,
          })),
          category: selectedRecipe.category,
          name: selectedRecipe.name,
        }),
      });

      clearTimeout(timeoutHandle);
      setShowGenerationTimeout(false);

      if (!response.ok) {
        throw new Error("Failed to generate description");
      }

      const data = await response.json();
      setRecipeDescription(data.description);
      await updateRecipe(selectedRecipe.id, { description: data.description });
      addToast("Description generated successfully", "success");
    } catch (error) {
      console.error("Failed to generate description:", error);
      addToast("Failed to generate description", "error");
    } finally {
      clearTimeout(timeoutHandle);
      setIsGeneratingDescription(false);
      setShowGenerationTimeout(false);
    }
  }, [selectedRecipe, selectedVersion, updateRecipe, addToast]);

  const handleToggleIngredientCheck = useCallback((ingredientId: string) => {
    setCheckedIngredients((prev) => {
      const next = new Set(prev);
      if (next.has(ingredientId)) {
        next.delete(ingredientId);
      } else {
        next.add(ingredientId);
      }
      return next;
    });
  }, []);

  const handleToggleAllIngredients = useCallback(() => {
    if (!selectedVersion) {
      return;
    }
    setCheckedIngredients((prev) => {
      // If all are checked, uncheck all. Otherwise, check all.
      const allChecked = selectedVersion.ingredients.every((ing) => prev.has(ing.id));
      if (allChecked) {
        return new Set();
      }
      return new Set(selectedVersion.ingredients.map((ing) => ing.id));
    });
  }, [selectedVersion]);

  const handleApplyAIChanges = useCallback(
    async (changes: AIAssistantResponse["changes"]) => {
      if (!selectedRecipe || !selectedVersion || !changes) {
        return;
      }

      // Apply ingredient changes
      if (changes.ingredients) {
        for (const change of changes.ingredients) {
          const ingredientToUpdate = selectedVersion.ingredients.find(
            (ing) => ing.id === change.id,
          );
          if (ingredientToUpdate) {
            const payload: Partial<{
              name: string;
              quantity: number;
              unit: string;
              role: Ingredient["role"];
            }> = {};

            if (change.quantity !== undefined) {
              payload.quantity = change.quantity;
            }
            if (change.name !== undefined) {
              payload.name = change.name;
            }
            if (change.unit !== undefined) {
              payload.unit = change.unit;
            }
            if (change.role !== undefined) {
              payload.role = change.role;
            }

            await updateIngredient(
              selectedRecipe.id,
              selectedVersion.id,
              change.id,
              payload,
            );
          }
        }
      }

      // Apply recipe changes
      if (changes.recipe) {
        await updateRecipe(selectedRecipe.id, changes.recipe);
        if (changes.recipe.name) {
          setRecipeName(changes.recipe.name);
        }
        if (changes.recipe.description) {
          setRecipeDescription(changes.recipe.description);
        }
      }

      // Apply version changes
      if (changes.version) {
        await updateVersion(selectedRecipe.id, selectedVersion.id, changes.version);
      }
    },
    [selectedRecipe, selectedVersion, updateIngredient, updateRecipe, updateVersion],
  );

  const handleConfirmDuplicate = useCallback(
    async (data: DuplicateRecipeData) => {
      if (!selectedRecipe) {
        return;
      }

      setIsDuplicating(true);
      try {
        await duplicateRecipe(selectedRecipe.id, data);
        addToast("Recipe duplicated successfully", "success");
        setIsDuplicateModalOpen(false);
      } catch (error) {
        console.error("Failed to duplicate recipe:", error);
        addToast("Failed to duplicate recipe", "error");
      } finally {
        setIsDuplicating(false);
      }
    },
    [selectedRecipe, duplicateRecipe, addToast],
  );

  if (!selectedRecipe || !selectedVersion) {
    // Show loading state while recipes are being fetched
    const isLoadingRecipes = loading && recipes.length === 0;

    return (
      <div className="flex-1 overflow-y-auto bg-surface px-6 py-8 text-neutral-500 dark:text-neutral-400">
        <div className="mx-auto max-w-2xl text-center">
          <Button
            onClick={onOpenSidebar}
            loading={isLoadingRecipes}
            variant="solid"
            size="3"
            className="mb-6"
          >
            {isLoadingRecipes ? "Loading recipes..." : "Browse recipes"}
          </Button>
          {!isLoadingRecipes && (
            <>
              <h2 className="text-lg font-semibold">Start your first recipe</h2>
              <p className="mt-2 text-sm">
                Use the drawer to create a recipe, then track each experiment with notes,
                ingredient tweaks, and baker&apos;s percentages for breads.
              </p>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-surface">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-5 py-6">
        <section className="grid gap-4 rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex flex-col gap-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <EditableField
                  label="Recipe name"
                  value={recipeName}
                  onChange={setRecipeName}
                  placeholder="e.g. Country loaf"
                  onBlur={() => handleRecipeBlur("name")}
                  isSaving={savingRecipeName}
                />
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                  Description
                </span>
                <SaveIndicator isSaving={savingRecipeDescription} />
              </div>
              <TextArea
                value={recipeDescription}
                onChange={(event) => setRecipeDescription(event.target.value)}
                onBlur={() => handleRecipeBlur("description")}
                placeholder="Describe this recipe iteration."
                rows={3}
                className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-neutral-400 focus:ring-2 focus:ring-neutral-200 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50 dark:focus:border-neutral-500 dark:focus:ring-neutral-700"
              />
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                    Category
                  </label>
                  <div className="flex items-center gap-2">
                    <CategorySelector
                      value={category}
                      onChange={async (newCategory) => {
                        setCategory(newCategory);
                        // Pass the new value directly instead of reading from state
                        if (selectedRecipe && newCategory !== selectedRecipe.category) {
                          setSavingCategory(true);
                          try {
                            await updateRecipe(selectedRecipe.id, {
                              category: newCategory,
                            });
                          } finally {
                            setSavingCategory(false);
                          }
                        }
                      }}
                    />
                    <SaveIndicator isSaving={savingCategory} />
                  </div>
                </div>
              </div>
              <span className="text-xs text-neutral-400 dark:text-neutral-500">
                Last updated {formatDateTime(selectedRecipe.updatedAt)}
              </span>
            </div>
          </div>
        </section>

        <RecipeVersionTabs
          recipe={selectedRecipe}
          activeVersion={selectedVersion}
          onSelect={selectVersion}
          onDuplicate={handleDuplicateVersion}
          onDelete={(versionId) => deleteVersion(selectedRecipe.id, versionId)}
          onCompare={handleCompareVersion}
        />

        <IngredientList
          version={selectedVersion}
          recipeId={selectedRecipe.id}
          recipeCategory={selectedRecipe.category}
          onUpdateIngredient={async (ingredientId, data) => {
            setSavingIngredient((prev) => ({ ...prev, [ingredientId]: true }));
            try {
              await updateIngredient(
                selectedRecipe.id,
                selectedVersion.id,
                ingredientId,
                data,
              );
            } finally {
              setSavingIngredient((prev) => ({ ...prev, [ingredientId]: false }));
            }
          }}
          onDeleteIngredient={(ingredientId) =>
            deleteIngredient(selectedRecipe.id, selectedVersion.id, ingredientId)
          }
          enableBakersPercent={
            selectedRecipe.category.primary === "baking" &&
            ["bread", "sourdough", "cookies", "cakes", "pastries", "pies"].includes(
              selectedRecipe.category.secondary,
            )
          }
          flourTotal={flourTotal}
          savingIngredient={savingIngredient}
          suggestions={ingredientSuggestions}
          isLoadingSuggestions={isLoadingSuggestions}
          checkedIngredients={checkedIngredients}
          onToggleIngredientCheck={handleToggleIngredientCheck}
          onToggleAllIngredients={handleToggleAllIngredients}
          pendingIngredients={pendingIngredients}
          onPendingIngredientsChange={setPendingIngredients}
          onAddIngredient={addIngredient}
          isScalingOpen={isScalingOpen}
          onToggleScaling={() => setIsScalingOpen(!isScalingOpen)}
          selectedScalingIngredient={selectedScalingIngredient}
          onSelectScalingIngredient={setSelectedScalingIngredient}
          targetQuantity={targetQuantity}
          onTargetQuantityChange={setTargetQuantity}
          onPreviewScaling={handlePreviewScaling}
          isPreviewingScaling={isPreviewingScaling}
        />

        <PhotoUploadSection
          version={selectedVersion}
          onUpload={handlePhotoUpload}
          onRemove={() =>
            removePhoto(selectedVersion.photoUrl ?? null, selectedVersion.r2Key ?? null)
          }
          isUploading={isUploading}
          uploadProgress={photoUploadProgress}
          uploadError={photoUploadError}
          isRemoving={isRemovingPhoto}
        />

        <RecipeSteps
          steps={stepsDraft}
          onUpdate={handleStepsUpdate}
          isEditing={false}
          defaultCollapsed={true}
          isSaving={isSavingSteps}
          lastSaved={stepsLastSaved}
          saveError={stepsSaveError}
          onRetry={() => handleStepsUpdate(stepsDraft)}
        />

        <RecipeVersionNotes
          notesDraft={notesDraft}
          onChange={setNotesDraft}
          onSave={handleNotesSave}
          savingNotes={savingNotes}
          tasteRating={selectedVersion.tasteRating}
          visualRating={selectedVersion.visualRating}
          textureRating={selectedVersion.textureRating}
          onRatingChange={handleRatingChange}
          savingRating={savingRating}
          hoverRating={hoverRating}
          setHoverRating={setHoverRating}
          pendingRatings={pendingRatings}
        />

        <div className="flex gap-3">
          <Button
            size="2"
            variant="soft"
            color="gray"
            onClick={() => setIsDuplicateModalOpen(true)}
            className="flex-1"
          >
            Duplicate recipe
          </Button>
          <Button
            size="2"
            variant="soft"
            color={selectedRecipe?.archivedAt ? "orange" : "gray"}
            onClick={handleToggleArchive}
            className="flex-1"
          >
            <ArchiveIcon />
            {selectedRecipe?.archivedAt ? "Unarchive recipe" : "Archive recipe"}
          </Button>
        </div>

        <DuplicateRecipeModal
          isOpen={isDuplicateModalOpen}
          sourceRecipe={selectedRecipe}
          onConfirm={handleConfirmDuplicate}
          onCancel={() => setIsDuplicateModalOpen(false)}
          isLoading={isDuplicating}
        />

        <IterationIntentModal
          isOpen={isIntentModalOpen}
          baseVersion={selectedVersion}
          onConfirm={handleCreateVersionWithIntent}
          onCancel={() => setIsIntentModalOpen(false)}
          isLoading={isCreatingVersion}
        />

        {comparisonVersion && (
          <VersionComparisonModal
            isOpen={isComparisonOpen}
            baseVersion={selectedVersion}
            comparisonVersion={comparisonVersion}
            onClose={() => {
              setIsComparisonOpen(false);
              setComparisonVersion(null);
            }}
            flourTotal={flourTotal}
          />
        )}

        <ScalingConfirmationModal
          isOpen={isScalingModalOpen}
          scaledIngredients={scaledIngredients}
          scalingMethod={
            selectedScalingIngredient && selectedVersion
              ? `Scaling based on ${
                  selectedVersion.ingredients.find(
                    (i) => i.id === selectedScalingIngredient,
                  )?.name
                } to ${targetQuantity} ${
                  selectedVersion.ingredients.find(
                    (i) => i.id === selectedScalingIngredient,
                  )?.unit
                }`
              : ""
          }
          onConfirm={handleConfirmScaling}
          onCancel={handleCancelScaling}
          isApplying={isApplyingScaling}
        />
      </div>

      {/* AI Assistant */}
      <AIAssistantButton onClick={() => setIsAIAssistantOpen(true)} />
      <RecipeAIAssistant
        recipe={selectedRecipe}
        version={selectedVersion}
        bakerPercentages={
          selectedRecipe.category.primary === "baking"
            ? { flourTotal, hydration: hydrationPercent, totalWeight }
            : undefined
        }
        isOpen={isAIAssistantOpen}
        onClose={() => setIsAIAssistantOpen(false)}
        onApplyChanges={handleApplyAIChanges}
      />
    </div>
  );
}
