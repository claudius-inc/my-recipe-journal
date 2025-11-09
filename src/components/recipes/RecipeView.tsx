"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { cn } from "@/lib/utils";
import {
  CATEGORY_CONFIGS,
  INGREDIENT_ROLES,
  type CategoryField,
  type Ingredient,
  type Recipe,
  type RecipeVersion,
} from "@/types/recipes";
import { getCategoryConfig, useRecipeStore } from "@/store/RecipeStore";
import {
  suggestIngredientDefaults,
  COMMON_INGREDIENTS,
  getCategoryIngredients,
  searchIngredients,
} from "@/lib/ingredient-helpers";
import {
  validateIngredients,
  getValidationColor,
  getValidationIcon,
} from "@/lib/ingredient-validation";
import { IterationIntentModal } from "./IterationIntentModal";
import { IterationTracking } from "./IterationTracking";
import { InteractivePercentageEditor } from "./InteractivePercentageEditor";
import { VersionComparisonModal } from "./VersionComparisonModal";
import { TastingReview } from "./TastingReview";
import { CollapsibleSection } from "../ui/CollapsibleSection";
import { ScalingConfirmationModal } from "./ScalingConfirmationModal";
import { SaveIndicator } from "../ui/SaveIndicator";
import { UploadProgress } from "../ui/UploadProgress";
import { useToast } from "@/context/ToastContext";

interface RecipeViewProps {
  onOpenSidebar: () => void;
}

interface EditableFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  rows?: number;
  onBlur?: () => void;
  isSaving?: boolean;
}

const EditableField = ({
  label,
  value,
  onChange,
  placeholder,
  multiline,
  rows = 3,
  onBlur,
  isSaving = false,
}: EditableFieldProps) => (
  <label className="flex flex-col gap-1">
    <div className="flex items-center justify-between">
      <span className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
        {label}
      </span>
      <SaveIndicator isSaving={isSaving} />
    </div>
    {multiline ? (
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        rows={rows}
        className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-neutral-400 focus:ring-2 focus:ring-neutral-200 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50 dark:focus:border-neutral-500 dark:focus:ring-neutral-700"
      />
    ) : (
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-neutral-400 focus:ring-2 focus:ring-neutral-200 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50 dark:focus:border-neutral-500 dark:focus:ring-neutral-700"
      />
    )}
  </label>
);

const IngredientRoleLabels: Record<string, string> = {
  flour: "Flour",
  liquid: "Liquid",
  preferment: "Preferment",
  salt: "Salt",
  sweetener: "Sweetener",
  fat: "Fat",
  add_in: "Add-in",
  spice: "Spice",
  other: "Other",
};

const formatPercent = (value: number) => `${(Math.round(value * 10) / 10).toFixed(1)}%`;

export function RecipeView({ onOpenSidebar }: RecipeViewProps) {
  const { addToast } = useToast();
  const {
    selectedRecipe,
    selectedVersion,
    selectVersion,
    createVersion,
    updateVersion,
    deleteVersion,
    addIngredient,
    updateIngredient,
    deleteIngredient,
    updateRecipe,
    getIngredientSuggestions,
  } = useRecipeStore();

  const [recipeName, setRecipeName] = useState("");
  const [recipeDescription, setRecipeDescription] = useState("");
  const [category, setCategory] = useState(selectedRecipe?.category ?? "bread");
  const [metadataDraft, setMetadataDraft] = useState<Record<string, string>>({});
  const [notesDraft, setNotesDraft] = useState({
    notes: "",
    tastingNotes: "",
    nextSteps: "",
  });
  const [isSavingTastingReview, setIsSavingTastingReview] = useState(false);
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
  const [isUploading, setIsUploading] = useState(false);
  const [isIntentModalOpen, setIsIntentModalOpen] = useState(false);
  const [isCreatingVersion, setIsCreatingVersion] = useState(false);
  const [isSavingIteration, setIsSavingIteration] = useState(false);
  const [isComparisonOpen, setIsComparisonOpen] = useState(false);
  const [comparisonVersion, setComparisonVersion] = useState<RecipeVersion | null>(null);
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
  const [showGenerationTimeout, setShowGenerationTimeout] = useState(false);
  // SaveIndicator states for auto-save fields
  const [savingRecipeName, setSavingRecipeName] = useState(false);
  const [savingRecipeDescription, setSavingRecipeDescription] = useState(false);
  const [savingNotes, setSavingNotes] = useState<Record<string, boolean>>({});
  const [savingIngredient, setSavingIngredient] = useState<Record<string, boolean>>({});
  // Photo upload progress
  const [photoUploadProgress, setPhotoUploadProgress] = useState(0);
  const [photoUploadError, setPhotoUploadError] = useState<string | undefined>();

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
        tastingNotes: selectedVersion.tastingNotes,
        nextSteps: selectedVersion.nextSteps,
      });

      const metadataEntries = Object.entries(selectedVersion.metadata ?? {}).reduce(
        (acc, [key, value]) => {
          acc[key] = String(value ?? "");
          return acc;
        },
        {} as Record<string, string>,
      );
      setMetadataDraft(metadataEntries);
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

  const categoryConfig = useMemo(
    () => (selectedRecipe ? getCategoryConfig(selectedRecipe.category) : null),
    [selectedRecipe],
  );

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

  const handleMetadataSave = useCallback(
    async (field: CategoryField, value: string) => {
      if (!selectedRecipe || !selectedVersion) {
        return;
      }
      setSavingMetaField(field.id);
      try {
        let normalized: string | number | undefined = value;
        if (field.type === "number") {
          const numericValue = Number(value);
          normalized = Number.isFinite(numericValue) ? numericValue : undefined;
        } else {
          normalized = value.trim();
        }
        const nextMetadata = { ...(selectedVersion.metadata ?? {}) } as Record<
          string,
          string | number
        >;
        if (normalized === undefined || normalized === "") {
          delete nextMetadata[field.id];
        } else {
          nextMetadata[field.id] = normalized;
        }
        await updateVersion(selectedRecipe.id, selectedVersion.id, {
          metadata: nextMetadata,
        });
        setMetadataDraft((prev) => {
          const next = { ...prev };
          if (normalized === undefined || normalized === "") {
            delete next[field.id];
          } else {
            next[field.id] = String(normalized);
          }
          return next;
        });
      } finally {
        setSavingMetaField(null);
      }
    },
    [selectedRecipe, selectedVersion, updateVersion],
  );

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
      // Update each ingredient with new quantity
      for (const ingredient of scaledIngredients) {
        await updateIngredient(selectedRecipe.id, selectedVersion.id, ingredient.id, {
          quantity: ingredient.newQuantity,
        });
      }

      setIsScalingModalOpen(false);
      setIsScalingOpen(false);
      setSelectedScalingIngredient("");
      setTargetQuantity("");
      setScaledIngredients([]);
    } finally {
      setIsApplyingScaling(false);
    }
  }, [selectedRecipe, selectedVersion, scaledIngredients, updateIngredient]);

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

  const handlePhotoUpload = useCallback(
    async (file: File) => {
      if (!selectedRecipe || !selectedVersion) {
        return;
      }

      // Validate file type
      if (!file.type.startsWith("image/")) {
        setPhotoUploadError("Please select a valid image file");
        return;
      }

      // Validate file size (5MB max)
      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
        setPhotoUploadError("Image must be smaller than 5MB");
        return;
      }

      setIsUploading(true);
      setPhotoUploadError(undefined);
      setPhotoUploadProgress(0);

      try {
        const reader = new FileReader();
        const dataUrl = await new Promise<string>((resolve, reject) => {
          reader.onprogress = (event) => {
            if (event.lengthComputable) {
              const progress = Math.round((event.loaded / event.total) * 100);
              setPhotoUploadProgress(progress);
            }
          };
          reader.onload = () => {
            setPhotoUploadProgress(100);
            resolve(typeof reader.result === "string" ? reader.result : "");
          };
          reader.onerror = () =>
            reject(reader.error ?? new Error("Failed to read image"));
          reader.readAsDataURL(file);
        });

        // Simulate upload delay to show progress
        await new Promise((resolve) => setTimeout(resolve, 500));

        await updateVersion(selectedRecipe.id, selectedVersion.id, { photoUrl: dataUrl });
        setPhotoUploadProgress(0);
      } catch (error) {
        setPhotoUploadError(
          error instanceof Error ? error.message : "Failed to upload photo",
        );
        addToast("Failed to upload photo", "error");
      } finally {
        setIsUploading(false);
      }
    },
    [selectedRecipe, selectedVersion, updateVersion, addToast],
  );

  const [isRemovingPhoto, setIsRemovingPhoto] = useState(false);

  const removePhoto = useCallback(async () => {
    if (!selectedRecipe || !selectedVersion) {
      return;
    }
    setIsRemovingPhoto(true);
    try {
      await updateVersion(selectedRecipe.id, selectedVersion.id, { photoUrl: null });
    } finally {
      setIsRemovingPhoto(false);
    }
  }, [selectedRecipe, selectedVersion, updateVersion]);

  const handleSaveTastingReview = useCallback(
    async (data: {
      tastingNotes: string;
      tasteRating?: number;
      visualRating?: number;
      textureRating?: number;
      tasteTags: string[];
      textureTags: string[];
    }) => {
      if (!selectedRecipe || !selectedVersion) {
        return;
      }
      setIsSavingTastingReview(true);
      try {
        await updateVersion(selectedRecipe.id, selectedVersion.id, {
          tastingNotes: data.tastingNotes,
          tasteRating: data.tasteRating,
          visualRating: data.visualRating,
          textureRating: data.textureRating,
          tasteTags: data.tasteTags,
          textureTags: data.textureTags,
        });
        // Update local state
        setNotesDraft((prev) => ({ ...prev, tastingNotes: data.tastingNotes }));
      } finally {
        setIsSavingTastingReview(false);
      }
    },
    [selectedRecipe, selectedVersion, updateVersion],
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

  const handleSaveIteration = useCallback(
    async (data: { iterationIntent?: string; hypothesis?: string; outcome?: string }) => {
      if (!selectedRecipe || !selectedVersion) {
        return;
      }
      setIsSavingIteration(true);
      try {
        await updateVersion(selectedRecipe.id, selectedVersion.id, {
          iterationIntent: data.iterationIntent,
          hypothesis: data.hypothesis,
          outcome: data.outcome,
        });
      } finally {
        setIsSavingIteration(false);
      }
    },
    [selectedRecipe, selectedVersion, updateVersion],
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

  if (!selectedRecipe || !selectedVersion) {
    return (
      <div className="flex-1 overflow-y-auto bg-surface px-6 py-8 text-neutral-500 dark:text-neutral-400">
        <div className="mx-auto max-w-2xl text-center">
          <button
            type="button"
            onClick={onOpenSidebar}
            className="mb-6 inline-flex items-center gap-2 rounded-full bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200"
          >
            Browse recipes
          </button>
          <h2 className="text-lg font-semibold">Start your first recipe</h2>
          <p className="mt-2 text-sm">
            Use the drawer to create a recipe, then track each experiment with notes,
            ingredient tweaks, and baker’s percentages for breads.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-surface">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-5 py-6">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onOpenSidebar}
            className="inline-flex items-center gap-2 rounded-full border border-neutral-200 px-3 py-1 text-xs font-medium text-neutral-700 shadow-sm transition hover:bg-neutral-100 md:hidden dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
          >
            ☰ Recipes
          </button>
          <span className="text-xs uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
            Last updated {new Date(selectedRecipe.updatedAt).toLocaleString()}
          </span>
        </div>

        <section className="grid gap-4 rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex flex-col gap-2">
            <EditableField
              label="Recipe name"
              value={recipeName}
              onChange={setRecipeName}
              placeholder="e.g. Country loaf"
              onBlur={() => handleRecipeBlur("name")}
              isSaving={savingRecipeName}
            />
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                  Goal
                </span>
                <div className="flex items-center gap-2">
                  <SaveIndicator isSaving={savingRecipeDescription} />
                  {selectedVersion.ingredients.length > 0 && (
                    <button
                      type="button"
                      onClick={handleGenerateDescription}
                      disabled={isGeneratingDescription}
                      className="text-xs font-medium text-blue-600 transition hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-60 dark:text-blue-400 dark:hover:text-blue-300"
                    >
                      {isGeneratingDescription ? "Generating..." : "✨ Generate with AI"}
                    </button>
                  )}
                </div>
              </div>
              <textarea
                value={recipeDescription}
                onChange={(event) => setRecipeDescription(event.target.value)}
                onBlur={() => handleRecipeBlur("description")}
                placeholder="Describe the goal for this recipe iteration."
                rows={3}
                className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-neutral-400 focus:ring-2 focus:ring-neutral-200 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50 dark:focus:border-neutral-500 dark:focus:ring-neutral-700"
              />
              {showGenerationTimeout && isGeneratingDescription && (
                <div className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
                  ⏱ Generation is taking longer than expected. Please wait...
                </div>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-300">
                Category
                <select
                  value={category}
                  onChange={(event) =>
                    setCategory(event.target.value as Recipe["category"])
                  }
                  onBlur={() => handleRecipeBlur("category")}
                  className="rounded-lg border border-neutral-200 bg-white px-3 py-1 text-sm outline-none focus:border-neutral-400 focus:ring-2 focus:ring-neutral-200 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50 dark:focus:border-neutral-500 dark:focus:ring-neutral-700"
                >
                  {Object.values(CATEGORY_CONFIGS).map((config) => (
                    <option key={config.id} value={config.id}>
                      {config.name}
                    </option>
                  ))}
                </select>
              </label>
              <span className="text-xs text-neutral-400 dark:text-neutral-500">
                {CATEGORY_CONFIGS[selectedRecipe.category]?.description}
              </span>
            </div>
          </div>
        </section>

        <VersionTabs
          recipe={selectedRecipe}
          activeVersion={selectedVersion}
          onSelect={selectVersion}
          onDuplicate={handleDuplicateVersion}
          onDelete={(versionId) => deleteVersion(selectedRecipe.id, versionId)}
          onCompare={handleCompareVersion}
        />

        <IngredientEditor
          version={selectedVersion}
          recipeId={selectedRecipe.id}
          recipeCategory={selectedRecipe.category}
          suggestions={ingredientSuggestions}
          isLoadingSuggestions={isLoadingSuggestions}
          onAdd={addIngredient}
          onUpdate={updateIngredient}
          onRemove={deleteIngredient}
          enableBakersPercent={categoryConfig?.enableBakersPercent}
        />

        {categoryConfig?.enableBakersPercent && (
          <BreadTools
            version={selectedVersion}
            flourTotal={flourTotal}
            totalWeight={totalWeight}
            hydration={hydrationPercent}
            isScalingOpen={isScalingOpen}
            setIsScalingOpen={setIsScalingOpen}
            selectedScalingIngredient={selectedScalingIngredient}
            setSelectedScalingIngredient={setSelectedScalingIngredient}
            targetQuantity={targetQuantity}
            setTargetQuantity={setTargetQuantity}
            onPreviewScaling={handlePreviewScaling}
            onUpdateIngredientQuantity={handleUpdateIngredientPercentage}
          />
        )}

        {categoryConfig?.fields?.length ? (
          <CollapsibleSection
            title="Category notes"
            subtitle="Optional recipe-specific details"
            badge={
              Object.keys(metadataDraft).length === 0
                ? "empty"
                : Object.keys(metadataDraft).length === categoryConfig.fields.length
                  ? "complete"
                  : "partial"
            }
          >
            <MetadataFields
              fields={categoryConfig.fields}
              metadata={metadataDraft}
              onChange={(fieldId, value) =>
                setMetadataDraft((prev) => ({ ...prev, [fieldId]: value }))
              }
              onSave={handleMetadataSave}
              savingField={savingMetaField}
            />
          </CollapsibleSection>
        ) : null}

        <PhotoSection
          version={selectedVersion}
          onUpload={handlePhotoUpload}
          onRemove={removePhoto}
          isUploading={isUploading}
          uploadProgress={photoUploadProgress}
          uploadError={photoUploadError}
          isRemoving={isRemovingPhoto}
        />

        <VersionNotes
          notesDraft={notesDraft}
          onChange={setNotesDraft}
          onSave={handleNotesSave}
          savingNotes={savingNotes}
        />

        <section className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
          <TastingReview
            version={selectedVersion}
            onSave={handleSaveTastingReview}
            isSaving={isSavingTastingReview}
          />
        </section>

        <section className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
          <IterationTracking
            version={selectedVersion}
            onSave={handleSaveIteration}
            isSaving={isSavingIteration}
          />
        </section>

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
                } to ${targetQuantity}`
              : ""
          }
          onConfirm={handleConfirmScaling}
          onCancel={handleCancelScaling}
          isApplying={isApplyingScaling}
        />
      </div>
    </div>
  );
}

interface VersionTabsProps {
  recipe: Recipe;
  activeVersion: RecipeVersion;
  onSelect: (recipeId: string, versionId: string) => Promise<void>;
  onDuplicate: () => Promise<void>;
  onDelete: (versionId: string) => Promise<void>;
  onCompare: (versionId: string) => void;
}

function VersionTabs({
  recipe,
  activeVersion,
  onSelect,
  onDuplicate,
  onDelete,
  onCompare,
}: VersionTabsProps) {
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isSelectingVersion, setIsSelectingVersion] = useState<string | null>(null);

  return (
    <section className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex flex-col gap-3">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
          {recipe.versions.map((version) => {
            const isActive = version.id === activeVersion.id;
            const isLoading = isSelectingVersion === version.id;
            return (
              <button
                key={version.id}
                type="button"
                onClick={async () => {
                  setIsSelectingVersion(version.id);
                  try {
                    await onSelect(recipe.id, version.id);
                  } finally {
                    setIsSelectingVersion(null);
                  }
                }}
                disabled={isLoading || isActive}
                className={cn(
                  "flex-shrink-0 rounded-xl border px-3 py-2 text-sm font-medium transition min-w-[140px] disabled:cursor-not-allowed",
                  isActive
                    ? "border-neutral-900 bg-neutral-900 text-white dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-900"
                    : isLoading
                      ? "border-neutral-400 bg-neutral-100 dark:border-neutral-600 dark:bg-neutral-800 opacity-60"
                      : "border-neutral-200 bg-white hover:border-neutral-400 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:border-neutral-500",
                )}
              >
                <div className="flex items-center gap-2">
                  <div className="flex flex-col text-left">
                    <span>{version.title || "Untitled"}</span>
                    <span className="text-xs font-normal text-neutral-400 dark:text-neutral-500">
                      {new Date(version.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  {isLoading && (
                    <div className="animate-spin">
                      <svg
                        className="w-3 h-3 text-neutral-600 dark:text-neutral-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onDuplicate}
            className="flex-1 rounded-lg border border-neutral-200 px-3 py-2 text-xs font-medium text-neutral-700 transition hover:bg-neutral-100 sm:flex-initial dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
          >
            + New version
          </button>
          {recipe.versions.length > 1 && (
            <>
              <button
                type="button"
                onClick={() => {
                  if (recipe.versions.length > 1) {
                    const otherVersion = recipe.versions.find(
                      (v) => v.id !== activeVersion.id,
                    );
                    if (otherVersion) {
                      onCompare(otherVersion.id);
                    }
                  }
                }}
                className="flex-1 rounded-lg border border-blue-200 px-3 py-2 text-xs font-medium text-blue-600 transition hover:bg-blue-50 sm:flex-initial dark:border-blue-800/60 dark:text-blue-300 dark:hover:bg-blue-900/30"
              >
                Compare
              </button>
              <button
                type="button"
                onClick={async () => {
                  setIsDeleting(activeVersion.id);
                  await onDelete(activeVersion.id);
                  setIsDeleting(null);
                }}
                disabled={isDeleting === activeVersion.id}
                className="flex-1 rounded-lg border border-red-200 px-3 py-2 text-xs font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-70 sm:flex-initial dark:border-red-800/60 dark:text-red-300 dark:hover:bg-red-900/30"
              >
                {isDeleting === activeVersion.id ? "Removing…" : "Delete"}
              </button>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

type IngredientsOperations = {
  add: (
    recipeId: string,
    versionId: string,
    payload: {
      name: string;
      quantity: number;
      unit: string;
      role: Ingredient["role"];
      notes?: string;
      sortOrder?: number;
    },
  ) => Promise<void>;
  update: (
    recipeId: string,
    versionId: string,
    ingredientId: string,
    payload: Partial<{
      name: string;
      quantity: number;
      unit: string;
      role: Ingredient["role"];
      notes: string | null;
      sortOrder: number;
    }>,
  ) => Promise<void>;
  remove: (recipeId: string, versionId: string, ingredientId: string) => Promise<void>;
};

interface IngredientEditorProps {
  version: RecipeVersion;
  recipeId: string;
  recipeCategory: Recipe["category"];
  suggestions: string[];
  isLoadingSuggestions?: boolean;
  onAdd: IngredientsOperations["add"];
  onUpdate: IngredientsOperations["update"];
  onRemove: IngredientsOperations["remove"];
  enableBakersPercent?: boolean;
}

function IngredientEditor({
  version,
  recipeId,
  recipeCategory,
  suggestions,
  isLoadingSuggestions = false,
  onAdd,
  onUpdate,
  onRemove,
  enableBakersPercent,
}: IngredientEditorProps) {
  const { addToast } = useToast();
  const [draft, setDraft] = useState({
    name: "",
    quantity: "",
    unit: "",
    role: "other" as Ingredient["role"],
    notes: "",
  });
  const [showRoleSelector, setShowRoleSelector] = useState(false);
  const [pendingIngredients, setPendingIngredients] = useState<
    Array<{
      tempId: string;
      name: string;
      quantity: number;
      unit: string;
      role: Ingredient["role"];
    }>
  >([]);

  useEffect(() => {
    setDraft({ name: "", quantity: "", unit: "", role: "other", notes: "" });
  }, [version.id]);

  // Auto-suggest role and unit when ingredient name changes
  const handleNameChange = (name: string) => {
    const defaults = suggestIngredientDefaults(name);
    if (defaults) {
      setDraft((prev) => ({
        ...prev,
        name,
        role: defaults.role || prev.role,
        unit: defaults.unit || prev.unit,
      }));
    } else {
      setDraft((prev) => ({ ...prev, name }));
    }
  };

  // Combine user's suggestions with category-aware ingredients
  const categoryIngredients = getCategoryIngredients(recipeCategory, undefined);
  const allSuggestions = Array.from(
    new Set([...categoryIngredients, ...suggestions]),
  ).sort();

  // Validate ingredients
  const validationWarnings = validateIngredients(
    version.ingredients,
    enableBakersPercent,
  );

  // Check if form is complete
  const isFormValid =
    draft.name.trim() && draft.unit.trim() && Number(draft.quantity) > 0;

  // Quick unit setter
  const setQuickUnit = (unit: string) => {
    setDraft((prev) => ({ ...prev, unit }));
  };

  const submitDraft = async () => {
    if (!draft.name.trim() || !draft.unit.trim()) {
      return;
    }
    const parsed = Number(draft.quantity);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return;
    }

    const payload = {
      name: draft.name.trim(),
      quantity: parsed,
      unit: draft.unit.trim(),
      role: draft.role,
      notes: draft.notes?.trim() || undefined,
    };

    // Generate temporary ID for optimistic UI
    const tempId = `temp-${Date.now()}-${Math.random()}`;

    // Add to pending ingredients immediately
    setPendingIngredients((prev) => [
      ...prev,
      {
        tempId,
        name: payload.name,
        quantity: payload.quantity,
        unit: payload.unit,
        role: payload.role,
      },
    ]);

    // Clear form immediately for next entry
    setDraft({ name: "", quantity: "", unit: "", role: "other", notes: "" });
    setShowRoleSelector(false);

    try {
      // Fire the API call asynchronously
      await onAdd(recipeId, version.id, payload);
      // Remove from pending once confirmed
      setPendingIngredients((prev) => prev.filter((ing) => ing.tempId !== tempId));
    } catch (error) {
      console.error("Failed to add ingredient:", error);
      // Remove from pending on error
      setPendingIngredients((prev) => prev.filter((ing) => ing.tempId !== tempId));
      // Show error toast
      addToast(
        error instanceof Error ? error.message : "Failed to add ingredient",
        "error",
      );
    }
  };

  // Handle Enter key submit
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && isFormValid) {
      e.preventDefault();
      submitDraft();
    }
  };

  return (
    <section className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
      <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
        Ingredients
      </h3>

      {/* Validation warnings */}
      {validationWarnings.length > 0 && (
        <div className="mt-3 space-y-2">
          {validationWarnings.map((warning, index) => (
            <div
              key={index}
              className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-xs ${
                warning.severity === "error"
                  ? "border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-900/20"
                  : warning.severity === "warning"
                    ? "border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-900/20"
                    : "border-blue-200 bg-blue-50 dark:border-blue-900/50 dark:bg-blue-900/20"
              }`}
            >
              <span>{getValidationIcon(warning.severity)}</span>
              <p className={getValidationColor(warning.severity)}>{warning.message}</p>
            </div>
          ))}
        </div>
      )}

      <div className="mt-3 space-y-2">
        {version.ingredients.map((ingredient) => (
          <IngredientRow
            key={ingredient.id}
            ingredient={ingredient}
            suggestions={suggestions}
            onChange={(payload) => onUpdate(recipeId, version.id, ingredient.id, payload)}
            onRemove={() => onRemove(recipeId, version.id, ingredient.id)}
          />
        ))}
        {/* Pending ingredients (optimistic UI) */}
        {pendingIngredients.map((pending) => (
          <PendingIngredientRow key={pending.tempId} ingredient={pending} />
        ))}
      </div>
      <div className="mt-4 grid gap-3 rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-3 dark:border-neutral-700 dark:bg-neutral-900/60">
        <h4 className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          Add ingredient
        </h4>
        <div className="grid gap-2 text-sm" onKeyDown={handleKeyDown}>
          <div className="flex flex-col gap-2">
            <div className="relative">
              <input
                list="ingredient-suggestions"
                value={draft.name}
                onChange={(event) => handleNameChange(event.target.value)}
                placeholder="Ingredient name"
                disabled={isLoadingSuggestions}
                className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-400 focus:ring-2 focus:ring-neutral-200 disabled:opacity-60 disabled:cursor-not-allowed dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50 dark:focus:border-neutral-500 dark:focus:ring-neutral-700"
              />
              {isLoadingSuggestions && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-600 dark:border-neutral-600 dark:border-t-neutral-300" />
                </div>
              )}
            </div>

            {/* Role badge/chip */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowRoleSelector(!showRoleSelector)}
                className="inline-flex items-center gap-1 rounded-full border border-neutral-300 bg-white px-2.5 py-1 text-xs font-medium text-neutral-600 transition hover:bg-neutral-50 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
              >
                {IngredientRoleLabels[draft.role]}
                <span className="text-[10px]">▾</span>
              </button>
              {showRoleSelector && (
                <div className="flex flex-wrap gap-1">
                  {INGREDIENT_ROLES.filter((r) => r !== draft.role).map((role) => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => {
                        setDraft((prev) => ({ ...prev, role }));
                        setShowRoleSelector(false);
                      }}
                      className="rounded-full border border-neutral-200 bg-white px-2 py-0.5 text-xs text-neutral-600 transition hover:border-neutral-400 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:border-neutral-500 dark:hover:bg-neutral-800"
                    >
                      {IngredientRoleLabels[role]}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <input
              type="number"
              value={draft.quantity}
              onChange={(event) =>
                setDraft((prev) => ({ ...prev, quantity: event.target.value }))
              }
              placeholder="Quantity"
              className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-400 focus:ring-2 focus:ring-neutral-200 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50 dark:focus:border-neutral-500 dark:focus:ring-neutral-700"
            />
            <input
              value={draft.unit}
              onChange={(event) =>
                setDraft((prev) => ({ ...prev, unit: event.target.value }))
              }
              placeholder="Unit"
              className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-400 focus:ring-2 focus:ring-neutral-200 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50 dark:focus:border-neutral-500 dark:focus:ring-neutral-700"
            />
            <button
              type="button"
              onClick={submitDraft}
              disabled={!isFormValid}
              className="w-full rounded-lg bg-neutral-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-neutral-900 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200 dark:disabled:hover:bg-neutral-100"
            >
              <span className="hidden sm:inline">Add</span>
              <span className="sm:hidden">+</span>
            </button>
          </div>

          {/* Quick unit shortcuts */}
          {!draft.unit && draft.name && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-neutral-500 dark:text-neutral-400">
                Quick:
              </span>
              {["g", "ml", "pc"].map((unit) => (
                <button
                  key={unit}
                  type="button"
                  onClick={() => setQuickUnit(unit)}
                  className="rounded-md border border-neutral-300 bg-white px-2 py-1 text-xs text-neutral-600 transition hover:bg-neutral-100 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
                >
                  {unit}
                </button>
              ))}
            </div>
          )}
        </div>
        {isLoadingSuggestions && (
          <div className="rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-700 dark:bg-blue-900/20 dark:text-blue-300">
            ⏳ Loading ingredient suggestions…
          </div>
        )}
        <datalist id="ingredient-suggestions">
          {allSuggestions.map((name) => (
            <option key={name} value={name} />
          ))}
        </datalist>
      </div>
    </section>
  );
}

interface PendingIngredientRowProps {
  ingredient: {
    tempId: string;
    name: string;
    quantity: number;
    unit: string;
    role: Ingredient["role"];
  };
}

function PendingIngredientRow({ ingredient }: PendingIngredientRowProps) {
  return (
    <div className="space-y-3 rounded-xl border border-neutral-200 bg-neutral-50 p-3 text-sm shadow-sm opacity-60 md:space-y-2 dark:border-neutral-700 dark:bg-neutral-900/50">
      {/* Mobile: vertical stack, Desktop: horizontal grid */}
      <div className="flex flex-col gap-3 md:grid md:grid-cols-12 md:items-center md:gap-2">
        {/* Ingredient name - full width mobile, prominent */}
        <div className="flex items-center gap-2 md:col-span-4">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-600 dark:border-neutral-600 dark:border-t-neutral-300" />
          <span className="text-base font-medium text-neutral-600 md:text-sm md:font-normal dark:text-neutral-400">
            {ingredient.name}
          </span>
        </div>

        {/* Quantity/Unit/Role row */}
        <div className="flex gap-3 md:contents">
          <div className="flex min-h-[44px] flex-1 items-center rounded-lg border border-neutral-200 bg-white px-3 py-3 md:col-span-2 md:min-h-0 md:border-transparent md:bg-transparent md:px-0 md:py-0 dark:border-neutral-700 dark:bg-neutral-900 md:dark:border-transparent md:dark:bg-transparent">
            <span className="text-neutral-500 dark:text-neutral-400">
              {ingredient.quantity}
            </span>
          </div>
          <div className="flex min-h-[44px] flex-1 items-center rounded-lg border border-neutral-200 bg-white px-3 py-3 md:col-span-2 md:min-h-0 md:border-transparent md:bg-transparent md:px-0 md:py-0 dark:border-neutral-700 dark:bg-neutral-900 md:dark:border-transparent md:dark:bg-transparent">
            <span className="text-neutral-500 dark:text-neutral-400">
              {ingredient.unit}
            </span>
          </div>
          <div className="flex min-h-[44px] flex-1 items-center justify-center rounded-lg border border-neutral-200 bg-white px-3 py-3 text-xs md:col-span-2 md:min-h-0 md:border-transparent md:bg-transparent md:px-0 md:py-0 dark:border-neutral-600 dark:bg-neutral-800 md:dark:border-transparent md:dark:bg-transparent">
            <span className="text-neutral-500 dark:text-neutral-400">
              {IngredientRoleLabels[ingredient.role]}
            </span>
          </div>
        </div>

        {/* Empty space for delete button alignment */}
        <div className="md:col-span-1"></div>
      </div>
    </div>
  );
}

interface IngredientRowProps {
  ingredient: Ingredient;
  suggestions: string[];
  onChange: (
    payload: Partial<{
      name: string;
      quantity: number;
      unit: string;
      role: Ingredient["role"];
      notes: string | null;
    }>,
  ) => Promise<void>;
  onRemove: () => Promise<void>;
}

function IngredientRow({
  ingredient,
  suggestions,
  onChange,
  onRemove,
}: IngredientRowProps) {
  const [state, setState] = useState({
    name: ingredient.name,
    quantity: ingredient.quantity.toString(),
    unit: ingredient.unit,
    role: ingredient.role,
    notes: ingredient.notes ?? "",
  });
  const [showNotes, setShowNotes] = useState(
    !!(ingredient.notes && ingredient.notes.trim()),
  );
  const [showRoleSelector, setShowRoleSelector] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Combine user's suggestions with common ingredients
  const allSuggestions = Array.from(
    new Set([...COMMON_INGREDIENTS, ...suggestions]),
  ).sort();

  useEffect(() => {
    setState({
      name: ingredient.name,
      quantity: ingredient.quantity.toString(),
      unit: ingredient.unit,
      role: ingredient.role,
      notes: ingredient.notes ?? "",
    });
  }, [ingredient]);

  const commit = async () => {
    const parsed = Number(state.quantity);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return;
    }
    if (!state.name.trim() || !state.unit.trim()) {
      return;
    }
    const payload = {
      name: state.name.trim(),
      quantity: parsed,
      unit: state.unit.trim(),
      role: state.role,
      notes: state.notes.trim() ? state.notes.trim() : null,
    };
    await onChange(payload);
  };

  return (
    <div className="space-y-3 rounded-xl border border-neutral-200 bg-white p-3 text-sm shadow-sm md:space-y-2 dark:border-neutral-700 dark:bg-neutral-950">
      {/* Mobile: vertical stack, Desktop: horizontal grid */}
      <div className="flex flex-col gap-3 md:grid md:grid-cols-12 md:items-center md:gap-2">
        {/* Ingredient name - full width mobile, prominent */}
        <div className="md:col-span-4">
          <input
            list={`ingredient-suggestions-${ingredient.id}`}
            value={state.name}
            onChange={(event) =>
              setState((prev) => ({ ...prev, name: event.target.value }))
            }
            onBlur={commit}
            placeholder="Ingredient name"
            className="w-full rounded-lg border border-neutral-200 bg-transparent px-3 py-3 text-base font-medium outline-none focus:border-neutral-400 focus:bg-white focus:ring-2 focus:ring-neutral-200 md:border-transparent md:px-2 md:py-1 md:text-sm md:font-normal dark:border-neutral-700 dark:focus:border-neutral-500 dark:focus:bg-neutral-900 dark:focus:ring-neutral-700 md:dark:border-transparent"
          />
          <datalist id={`ingredient-suggestions-${ingredient.id}`}>
            {allSuggestions.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
        </div>

        {/* Quantity/Unit/Role row */}
        <div className="flex gap-3 md:contents">
          <input
            type="number"
            value={state.quantity}
            onChange={(event) =>
              setState((prev) => ({ ...prev, quantity: event.target.value }))
            }
            onBlur={commit}
            placeholder="Amount"
            className="w-20 min-h-[44px] flex-1 rounded-lg border border-neutral-200 bg-transparent px-3 py-3 outline-none focus:border-neutral-400 focus:bg-white focus:ring-2 focus:ring-neutral-200 md:col-span-2 md:w-full md:min-h-0 md:border-transparent md:px-2 md:py-1 dark:border-neutral-700 dark:focus:border-neutral-500 dark:focus:bg-neutral-900 dark:focus:ring-neutral-700 md:dark:border-transparent"
          />
          <input
            value={state.unit}
            onChange={(event) =>
              setState((prev) => ({ ...prev, unit: event.target.value }))
            }
            onBlur={commit}
            placeholder="Unit"
            className="w-16 min-h-[44px] flex-1 rounded-lg border border-neutral-200 bg-transparent px-3 py-3 outline-none focus:border-neutral-400 focus:bg-white focus:ring-2 focus:ring-neutral-200 md:col-span-2 md:w-full md:min-h-0 md:border-transparent md:px-2 md:py-1 dark:border-neutral-700 dark:focus:border-neutral-500 dark:focus:bg-neutral-900 dark:focus:ring-neutral-700 md:dark:border-transparent"
          />

          {/* Role badge selector - consistent with Add form */}
          <div className="relative flex-1 md:col-span-2">
            <button
              type="button"
              onClick={() => setShowRoleSelector(!showRoleSelector)}
              className="flex min-h-[44px] w-full items-center justify-center gap-1 rounded-lg border border-neutral-200 bg-white px-3 py-3 text-xs font-medium text-neutral-600 transition hover:bg-neutral-50 md:min-h-0 md:rounded-lg md:border-transparent md:bg-transparent md:px-2 md:py-1 md:hover:border-neutral-300 md:hover:bg-white dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700 md:dark:border-transparent md:dark:bg-transparent md:dark:hover:border-neutral-600 md:dark:hover:bg-neutral-900"
            >
              <span className="truncate">{IngredientRoleLabels[state.role]}</span>
              <span className="text-[10px]">▾</span>
            </button>
            {showRoleSelector && (
              <div className="absolute left-0 right-0 top-full z-10 mt-1 flex flex-wrap gap-1 rounded-lg border border-neutral-200 bg-white p-2 shadow-lg dark:border-neutral-700 dark:bg-neutral-800">
                {INGREDIENT_ROLES.filter((r) => r !== state.role).map((role) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => {
                      setState((prev) => ({ ...prev, role }));
                      setShowRoleSelector(false);
                      commit();
                    }}
                    className="rounded-full border border-neutral-200 bg-white px-2.5 py-1 text-xs text-neutral-600 transition hover:border-neutral-400 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:border-neutral-500 dark:hover:bg-neutral-800"
                  >
                    {IngredientRoleLabels[role]}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Actions row - visible mobile, integrated desktop */}
        <div className="flex items-center justify-between gap-3 md:col-span-1 md:justify-end">
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            disabled={isDeleting}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-red-200 bg-white text-sm text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 md:min-h-0 md:min-w-0 md:border-neutral-200 md:px-2 md:py-1 md:text-xs md:text-neutral-500 md:hover:bg-neutral-100 dark:border-red-800/60 dark:bg-neutral-900 dark:text-red-400 dark:hover:bg-red-900/30 md:dark:border-neutral-700 md:dark:text-neutral-400 md:dark:hover:bg-neutral-800"
            aria-label="Delete ingredient"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Collapsible notes */}
      {!showNotes ? (
        <button
          type="button"
          onClick={() => setShowNotes(true)}
          className="w-full rounded-lg border border-dashed border-neutral-300 bg-neutral-50 px-3 py-3 text-left text-sm text-blue-600 transition hover:border-blue-300 hover:bg-blue-50 md:w-auto md:border-none md:bg-transparent md:px-0 md:py-0 md:text-xs md:hover:border-none md:hover:bg-transparent md:hover:underline dark:border-neutral-700 dark:bg-neutral-900/50 dark:text-blue-400 dark:hover:border-blue-700 dark:hover:bg-blue-900/20 md:dark:border-none md:dark:bg-transparent md:dark:hover:border-none md:dark:hover:bg-transparent"
        >
          + Add notes
        </button>
      ) : (
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
              Notes
            </label>
            <button
              type="button"
              onClick={() => {
                setShowNotes(false);
                setState((prev) => ({ ...prev, notes: "" }));
                commit();
              }}
              className="text-xs text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
            >
              Remove
            </button>
          </div>
          <textarea
            value={state.notes}
            onChange={(event) =>
              setState((prev) => ({ ...prev, notes: event.target.value }))
            }
            onBlur={commit}
            rows={2}
            placeholder="Notes on ingredient tweaks"
            className="w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs outline-none focus:border-neutral-400 focus:bg-white focus:ring-2 focus:ring-neutral-200 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:focus:border-neutral-500 dark:focus:ring-neutral-700"
          />
        </div>
      )}

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-lg dark:bg-neutral-900">
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
              Delete ingredient?
            </h3>
            <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
              Are you sure you want to delete <strong>{ingredient.name}</strong>? This
              action cannot be undone.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="flex-1 rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-600 dark:text-neutral-200 dark:hover:bg-neutral-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  setIsDeleting(true);
                  try {
                    await onRemove();
                    setShowDeleteConfirm(false);
                  } finally {
                    setIsDeleting(false);
                  }
                }}
                disabled={isDeleting}
                className="flex-1 rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-red-600 dark:hover:bg-red-700"
              >
                {isDeleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface BreadToolsProps {
  version: RecipeVersion;
  flourTotal: number;
  totalWeight: number;
  hydration: number;
  isScalingOpen: boolean;
  setIsScalingOpen: (open: boolean) => void;
  selectedScalingIngredient: string;
  setSelectedScalingIngredient: (value: string) => void;
  targetQuantity: string;
  setTargetQuantity: (value: string) => void;
  onPreviewScaling: () => void;
  onUpdateIngredientQuantity: (
    ingredientId: string,
    newQuantity: number,
  ) => Promise<void>;
}

function BreadTools({
  version,
  flourTotal,
  totalWeight,
  hydration,
  isScalingOpen,
  setIsScalingOpen,
  selectedScalingIngredient,
  setSelectedScalingIngredient,
  targetQuantity,
  setTargetQuantity,
  onPreviewScaling,
  onUpdateIngredientQuantity,
}: BreadToolsProps) {
  const selectedIngredient = version.ingredients.find(
    (ing) => ing.id === selectedScalingIngredient,
  );
  return (
    <section className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
            Baker’s percentages
          </h3>
          <ul className="space-y-1 text-sm text-neutral-600 dark:text-neutral-300">
            {version.ingredients.map((ingredient) => (
              <li key={ingredient.id} className="flex items-center justify-between gap-4">
                <span>{ingredient.name}</span>
                {flourTotal > 0 ? (
                  <InteractivePercentageEditor
                    ingredient={ingredient}
                    flourTotal={flourTotal}
                    onSave={(newQuantity) =>
                      onUpdateIngredientQuantity(ingredient.id, newQuantity)
                    }
                  />
                ) : (
                  <span className="font-mono">–</span>
                )}
              </li>
            ))}
          </ul>
        </div>
        <div className="space-y-3 rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-sm dark:border-neutral-700 dark:bg-neutral-900/60">
          <p className="flex items-center justify-between">
            <span className="text-neutral-500 dark:text-neutral-400">Total flour</span>
            <span className="font-semibold text-neutral-800 dark:text-neutral-100">
              {flourTotal.toFixed(1)} g
            </span>
          </p>
          <p className="flex items-center justify-between">
            <span className="text-neutral-500 dark:text-neutral-400">
              Total dough weight
            </span>
            <span className="font-semibold text-neutral-800 dark:text-neutral-100">
              {totalWeight.toFixed(1)} g
            </span>
          </p>
          <p className="flex items-center justify-between">
            <span className="text-neutral-500 dark:text-neutral-400">Hydration</span>
            <span className="font-semibold text-neutral-800 dark:text-neutral-100">
              {formatPercent(hydration)}
            </span>
          </p>
          <button
            type="button"
            onClick={() => setIsScalingOpen(!isScalingOpen)}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-xs font-medium text-neutral-700 transition hover:bg-neutral-100 dark:border-neutral-600 dark:text-neutral-200 dark:hover:bg-neutral-800"
          >
            {isScalingOpen ? "Hide scaling tools" : "Scale this formula"}
          </button>
          {isScalingOpen && (
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-neutral-500 dark:text-neutral-400 mb-1">
                  Scale by ingredient
                </label>
                <select
                  value={selectedScalingIngredient}
                  onChange={(event) => setSelectedScalingIngredient(event.target.value)}
                  className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-400 focus:ring-2 focus:ring-neutral-200 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-50 dark:focus:border-neutral-500 dark:focus:ring-neutral-700"
                >
                  <option value="">Select ingredient...</option>
                  {version.ingredients.map((ing) => (
                    <option key={ing.id} value={ing.id}>
                      {ing.name}
                    </option>
                  ))}
                </select>
              </div>
              {selectedIngredient && (
                <div>
                  <label className="block text-neutral-500 dark:text-neutral-400 mb-1">
                    Target amount ({selectedIngredient.unit})
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={targetQuantity}
                      onChange={(event) => setTargetQuantity(event.target.value)}
                      placeholder={`Current: ${selectedIngredient.quantity.toFixed(1)}`}
                      className="flex-1 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-400 focus:ring-2 focus:ring-neutral-200 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-50 dark:focus:border-neutral-500 dark:focus:ring-neutral-700"
                    />
                    <button
                      type="button"
                      onClick={onPreviewScaling}
                      disabled={!targetQuantity || Number(targetQuantity) <= 0}
                      className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-blue-700 dark:hover:bg-blue-600"
                    >
                      Preview
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                    All other ingredients will be scaled proportionally
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

interface MetadataFieldsProps {
  fields: CategoryField[];
  metadata: Record<string, string>;
  onChange: (fieldId: string, value: string) => void;
  onSave: (field: CategoryField, value: string) => Promise<void>;
  savingField: string | null;
}

function MetadataFields({
  fields,
  metadata,
  onChange,
  onSave,
  savingField,
}: MetadataFieldsProps) {
  return (
    <div className="grid gap-3">
      {fields.map((field) => (
        <div key={field.id} className="grid gap-1">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
              {field.label}
            </label>
            <SaveIndicator isSaving={savingField === field.id} />
          </div>
          {field.type === "textarea" ? (
            <textarea
              value={metadata[field.id] ?? ""}
              onChange={(event) => onChange(field.id, event.target.value)}
              onBlur={(event) => onSave(field, event.target.value)}
              placeholder={field.placeholder}
              rows={4}
              className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-400 focus:ring-2 focus:ring-neutral-200 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50 dark:focus:border-neutral-500 dark:focus:ring-neutral-700"
            />
          ) : field.type === "select" ? (
            <select
              value={metadata[field.id] ?? ""}
              onChange={(event) => {
                onChange(field.id, event.target.value);
                void onSave(field, event.target.value);
              }}
              className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-400 focus:ring-2 focus:ring-neutral-200 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50 dark:focus:border-neutral-500 dark:focus:ring-neutral-700"
            >
              <option value="">Select...</option>
              {(field.options ?? []).map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          ) : (
            <input
              type={field.type === "number" ? "number" : "text"}
              value={metadata[field.id] ?? ""}
              onChange={(event) => onChange(field.id, event.target.value)}
              onBlur={(event) => onSave(field, event.target.value)}
              placeholder={field.placeholder}
              className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-400 focus:ring-2 focus:ring-neutral-200 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50 dark:focus:border-neutral-500 dark:focus:ring-neutral-700"
            />
          )}
          {field.helpText ? (
            <p className="text-xs text-neutral-400 dark:text-neutral-500">
              {field.helpText}
            </p>
          ) : null}
        </div>
      ))}
    </div>
  );
}

interface VersionNotesProps {
  notesDraft: {
    notes: string;
    tastingNotes: string;
    nextSteps: string;
  };
  onChange: (value: VersionNotesProps["notesDraft"]) => void;
  onSave: (field: keyof VersionNotesProps["notesDraft"], value: string) => Promise<void>;
  savingNotes?: Record<string, boolean>;
}

function VersionNotes({
  notesDraft,
  onChange,
  onSave,
  savingNotes = {},
}: VersionNotesProps) {
  const entries: Array<{
    key: keyof VersionNotesProps["notesDraft"];
    label: string;
    help: string;
  }> = [
    {
      key: "notes",
      label: "Process notes",
      help: "Observations during mixing, fermentation, shaping, or baking.",
    },
    {
      key: "nextSteps",
      label: "Next iteration plan",
      help: "Call out the next tweaks to try, schedules to adjust, or ingredients to swap.",
    },
  ];

  return (
    <section className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
      <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
        Version journal
      </h3>
      <div className="mt-3 grid gap-4">
        {entries.map(({ key, label, help }) => (
          <div key={key} className="grid gap-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                {label}
              </label>
              <SaveIndicator isSaving={savingNotes[key] ?? false} />
            </div>
            <textarea
              value={notesDraft[key]}
              onChange={(event) => onChange({ ...notesDraft, [key]: event.target.value })}
              onBlur={(event) => onSave(key, event.target.value)}
              rows={4}
              placeholder={help}
              className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-400 focus:ring-2 focus:ring-neutral-200 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50 dark:focus:border-neutral-500 dark:focus:ring-neutral-700"
            />
            <p className="text-xs text-neutral-400 dark:text-neutral-500">{help}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

interface PhotoSectionProps {
  version: RecipeVersion;
  onUpload: (file: File) => Promise<void>;
  onRemove: () => Promise<void>;
  isUploading: boolean;
  uploadProgress?: number;
  uploadError?: string;
  isRemoving?: boolean;
}

function PhotoSection({
  version,
  onUpload,
  onRemove,
  isUploading,
  uploadProgress = 0,
  uploadError,
  isRemoving = false,
}: PhotoSectionProps) {
  return (
    <section className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
            Snapshot
          </h3>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Capture the final result of this iteration to compare progress over time.
          </p>
        </div>
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-neutral-300 px-3 py-2 text-xs font-medium text-neutral-700 transition hover:bg-neutral-100 dark:border-neutral-600 dark:text-neutral-200 dark:hover:bg-neutral-800">
          {isUploading ? "Uploading…" : "Upload photo"}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                void onUpload(file);
              }
            }}
            disabled={isUploading}
          />
        </label>
      </div>

      {/* Upload progress/error */}
      {(isUploading || uploadError) && (
        <div className="mt-4">
          <UploadProgress
            isUploading={isUploading}
            progress={uploadProgress}
            fileName="Photo"
            error={uploadError}
          />
        </div>
      )}

      {version.photoUrl ? (
        <div className="mt-4 space-y-2">
          <div className="overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-700">
            <img
              src={version.photoUrl}
              alt="Recipe result"
              className="h-auto w-full object-cover"
            />
          </div>
          <button
            type="button"
            onClick={onRemove}
            disabled={isRemoving}
            className="text-xs text-red-500 hover:underline disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {isRemoving ? "Removing…" : "Remove photo"}
          </button>
        </div>
      ) : (
        <p className="mt-4 text-sm text-neutral-500 dark:text-neutral-400">
          No photo attached yet. Tap upload after each bake or mix to build your visual
          log.
        </p>
      )}
    </section>
  );
}
