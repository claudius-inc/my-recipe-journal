"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { cn } from "@/lib/utils";
import {
  INGREDIENT_ROLES,
  type Ingredient,
  type Recipe,
  type RecipeVersion,
} from "@/types/recipes";
import { useRecipeStore } from "@/store/RecipeStore";
import {
  suggestIngredientDefaults,
  COMMON_INGREDIENTS,
  getCategoryIngredients,
  searchIngredients,
} from "@/lib/ingredient-helpers";
import {
  validateIngredients,
  getValidationColor,
  getValidationIconType,
} from "@/lib/ingredient-validation";
import { IterationIntentModal } from "./IterationIntentModal";
import { InteractivePercentageEditor } from "./InteractivePercentageEditor";
import { VersionComparisonModal } from "./VersionComparisonModal";
import { ScalingConfirmationModal } from "./ScalingConfirmationModal";
import { SaveIndicator } from "../ui/SaveIndicator";
import { UploadProgress } from "../ui/UploadProgress";
import { useToast } from "@/context/ToastContext";
import { AIAssistantButton } from "./AIAssistantButton";
import { RecipeAIAssistant } from "./RecipeAIAssistant";
import type { AIAssistantResponse } from "@/lib/gemini-assistant";
import { IngredientList } from "./IngredientList";
import {
  Button,
  Checkbox,
  DropdownMenu,
  IconButton,
  Select,
  TextField,
  TextArea,
  Spinner,
  Tooltip,
} from "@radix-ui/themes";
import {
  PlusCircledIcon,
  PlusIcon,
  ChevronDownIcon,
  ExclamationTriangleIcon,
  InfoCircledIcon,
  StarFilledIcon,
  StarIcon,
  ArchiveIcon,
} from "@radix-ui/react-icons";

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
      <TextArea
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

const formatDate = (date: Date | string) => {
  const d = new Date(date);
  const day = d.getDate();
  const month = d.toLocaleDateString("en-US", { month: "short" });
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
};

const formatDateTime = (date: Date | string) => {
  const d = new Date(date);
  const day = d.getDate();
  const month = d.toLocaleDateString("en-US", { month: "short" });
  const year = d.getFullYear();
  const time = d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  return `${day} ${month} ${year}, ${time}`;
};

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
    getIngredientSuggestions,
  } = useRecipeStore();

  const [recipeName, setRecipeName] = useState("");
  const [recipeDescription, setRecipeDescription] = useState("");
  const [category, setCategory] = useState(selectedRecipe?.category ?? "bread");
  const [notesDraft, setNotesDraft] = useState({
    notes: "",
    nextSteps: "",
    tasteNotes: "",
    visualNotes: "",
    textureNotes: "",
  });
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
  const [isComparisonOpen, setIsComparisonOpen] = useState(false);
  const [comparisonVersion, setComparisonVersion] = useState<RecipeVersion | null>(null);
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
  const [showGenerationTimeout, setShowGenerationTimeout] = useState(false);
  // AI Assistant state
  const [isAIAssistantOpen, setIsAIAssistantOpen] = useState(false);
  // SaveIndicator states for auto-save fields
  const [savingRecipeName, setSavingRecipeName] = useState(false);
  const [savingRecipeDescription, setSavingRecipeDescription] = useState(false);
  const [savingNotes, setSavingNotes] = useState<Record<string, boolean>>({});
  const [savingIngredient, setSavingIngredient] = useState<Record<string, boolean>>({});
  // Photo upload progress
  const [photoUploadProgress, setPhotoUploadProgress] = useState(0);
  const [photoUploadError, setPhotoUploadError] = useState<string | undefined>();
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
    try {
      if (selectedRecipe.archivedAt) {
        await unarchiveRecipe(selectedRecipe.id);
        addToast("Recipe unarchived", "success");
      } else {
        await archiveRecipe(selectedRecipe.id);
        addToast("Recipe archived", "success");
      }
    } catch (error) {
      console.error("Failed to toggle archive:", error);
      addToast("Failed to archive/unarchive recipe", "error");
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

  const handleRatingChange = useCallback(
    async (field: "tasteRating" | "visualRating" | "textureRating", value: number) => {
      if (!selectedRecipe || !selectedVersion) {
        return;
      }
      try {
        await updateVersion(selectedRecipe.id, selectedVersion.id, { [field]: value });
      } catch (error) {
        console.error("Failed to save rating:", error);
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
        // Try R2 presigned URL upload first
        const presignedResponse = await fetch("/api/photos/presigned-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            recipeId: selectedRecipe.id,
            versionId: selectedVersion.id,
            contentType: file.type,
            fileSize: file.size,
          }),
        });

        if (presignedResponse.ok) {
          // R2 is configured - use presigned URL upload
          const { presignedUrl, publicUrl, r2Key } = await presignedResponse.json();

          // Upload directly to R2 with progress tracking
          const xhr = new XMLHttpRequest();

          await new Promise<void>((resolve, reject) => {
            xhr.upload.addEventListener("progress", (event) => {
              if (event.lengthComputable) {
                const progress = Math.round((event.loaded / event.total) * 100);
                setPhotoUploadProgress(progress);
              }
            });

            xhr.addEventListener("load", () => {
              if (xhr.status === 200) {
                resolve();
              } else {
                reject(new Error(`Upload failed with status ${xhr.status}`));
              }
            });

            xhr.addEventListener("error", () =>
              reject(new Error("Network error during upload")),
            );
            xhr.addEventListener("abort", () => reject(new Error("Upload aborted")));

            xhr.open("PUT", presignedUrl);
            xhr.setRequestHeader("Content-Type", file.type);
            xhr.send(file);
          });

          // Update database with R2 URL and key
          await updateVersion(selectedRecipe.id, selectedVersion.id, {
            photoUrl: publicUrl,
            r2Key,
          });

          setPhotoUploadProgress(0);
          addToast("Photo uploaded successfully", "success");
        } else {
          // R2 not configured - fallback to Base64
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

          await updateVersion(selectedRecipe.id, selectedVersion.id, {
            photoUrl: dataUrl,
          });
          setPhotoUploadProgress(0);
          addToast("Photo uploaded (using database storage)", "success");
        }
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
      // Delete from R2 if using R2 storage
      if (selectedVersion.r2Key) {
        try {
          await fetch("/api/photos/delete", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              r2Key: selectedVersion.r2Key,
              photoUrl: selectedVersion.photoUrl,
            }),
          });
        } catch (error) {
          console.error("Failed to delete from R2:", error);
          // Continue anyway to clear database reference
        }
      }

      // Clear database references
      await updateVersion(selectedRecipe.id, selectedVersion.id, {
        photoUrl: null,
        r2Key: null,
      });
      addToast("Photo removed successfully", "success");
    } catch (error) {
      addToast("Failed to remove photo", "error");
    } finally {
      setIsRemovingPhoto(false);
    }
  }, [selectedRecipe, selectedVersion, updateVersion, addToast]);

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
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-5 py-6">
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
                <div className="flex gap-2">
                  <label className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-300">
                    Category
                    <Select.Root
                      value={category}
                      onValueChange={(value) => {
                        setCategory(value as Recipe["category"]);
                        handleRecipeBlur("category");
                      }}
                    >
                      <Select.Trigger />
                      <Select.Content>
                        <Select.Item value="bread">Bread</Select.Item>
                        <Select.Item value="dessert">Dessert</Select.Item>
                        <Select.Item value="drink">Drink</Select.Item>
                        <Select.Item value="main">Main</Select.Item>
                        <Select.Item value="sauce">Sauce</Select.Item>
                        <Select.Item value="other">Other</Select.Item>
                      </Select.Content>
                    </Select.Root>
                  </label>
                </div>
              </div>
              <span className="text-xs text-neutral-400 dark:text-neutral-500">
                Last updated {formatDateTime(selectedRecipe.updatedAt)}
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
          enableBakersPercent={selectedRecipe.category === "bread"}
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
          tasteRating={selectedVersion.tasteRating}
          visualRating={selectedVersion.visualRating}
          textureRating={selectedVersion.textureRating}
          onRatingChange={handleRatingChange}
        />

        <Button
          size="2"
          variant="soft"
          color={selectedRecipe?.archivedAt ? "orange" : "gray"}
          onClick={handleToggleArchive}
        >
          <ArchiveIcon />
          {selectedRecipe?.archivedAt ? "Unarchive recipe" : "Archive recipe"}
        </Button>

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
          selectedRecipe.category === "bread"
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
    <section className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900 relative">
      <div className="flex flex-col gap-3">
        <div className="flex gap-2 overflow-x-auto scrollbar-thin">
          {recipe.versions
            .sort(
              (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
            )
            .map((version, index) => {
              const isActive = version.id === activeVersion.id;
              const isLoading = isSelectingVersion === version.id;
              const versionNumber = index + 1;
              const isDeletingThis = isDeleting === version.id;
              const otherVersions = recipe.versions.filter((v) => v.id !== version.id);

              return (
                <DropdownMenu.Root key={version.id}>
                  <DropdownMenu.Trigger>
                    <Button
                      size="2"
                      loading={isLoading}
                      variant={isActive ? "solid" : "outline"}
                      className="h-12"
                    >
                      <div className="flex items-center gap-2">
                        <div className="flex flex-col text-left">
                          <span className="font-bold">Ver. {versionNumber}</span>
                          <span className="text-xs font-normal">
                            {formatDate(version.createdAt)}
                          </span>
                        </div>
                      </div>
                    </Button>
                  </DropdownMenu.Trigger>
                  <DropdownMenu.Content>
                    <DropdownMenu.Item
                      onClick={async () => {
                        setIsSelectingVersion(version.id);
                        try {
                          await onSelect(recipe.id, version.id);
                        } finally {
                          setIsSelectingVersion(null);
                        }
                      }}
                      disabled={isActive}
                    >
                      {isActive ? "Current" : "Switch to This Version"}
                    </DropdownMenu.Item>
                    {otherVersions.length > 0 && (
                      <DropdownMenu.Sub>
                        <DropdownMenu.SubTrigger>Compare with...</DropdownMenu.SubTrigger>
                        <DropdownMenu.SubContent>
                          {otherVersions.map((otherVersion, idx) => {
                            const otherVersionNumber =
                              recipe.versions
                                .sort(
                                  (a, b) =>
                                    new Date(a.createdAt).getTime() -
                                    new Date(b.createdAt).getTime(),
                                )
                                .findIndex((v) => v.id === otherVersion.id) + 1;
                            return (
                              <DropdownMenu.Item
                                key={otherVersion.id}
                                onClick={() => onCompare(otherVersion.id)}
                              >
                                Ver. {otherVersionNumber} (
                                {formatDate(otherVersion.createdAt)})
                              </DropdownMenu.Item>
                            );
                          })}
                        </DropdownMenu.SubContent>
                      </DropdownMenu.Sub>
                    )}
                    <DropdownMenu.Separator />
                    <DropdownMenu.Item
                      color="red"
                      onClick={async () => {
                        setIsDeleting(version.id);
                        try {
                          await onDelete(version.id);
                        } finally {
                          setIsDeleting(null);
                        }
                      }}
                      disabled={recipe.versions.length === 1 || isDeletingThis}
                    >
                      {isDeletingThis ? "Deleting..." : "Delete Version"}
                    </DropdownMenu.Item>
                  </DropdownMenu.Content>
                </DropdownMenu.Root>
              );
            })}
        </div>
      </div>
      <div className="absolute top-0 right-0 -translate-y-2 translate-x-2">
        <Tooltip content="Create new version">
          <IconButton
            onClick={onDuplicate}
            variant="surface"
            size="2"
            aria-label="Create new version"
          >
            <PlusIcon className="w-4 h-4" />
          </IconButton>
        </Tooltip>
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
  savingIngredient: Record<string, boolean>;
  setSavingIngredient: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
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
  savingIngredient,
  setSavingIngredient,
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
              <span>
                {warning.severity === "info" ? (
                  <InfoCircledIcon className="w-4 h-4" />
                ) : (
                  <ExclamationTriangleIcon className="w-4 h-4" />
                )}
              </span>
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
            onChange={async (payload) => {
              setSavingIngredient((prev) => ({ ...prev, [ingredient.id]: true }));
              try {
                await onUpdate(recipeId, version.id, ingredient.id, payload);
              } finally {
                setSavingIngredient((prev) => ({ ...prev, [ingredient.id]: false }));
              }
            }}
            onRemove={() => onRemove(recipeId, version.id, ingredient.id)}
            isSaving={savingIngredient[ingredient.id] ?? false}
          />
        ))}
        {/* Pending ingredients (optimistic UI) */}
        {pendingIngredients.map((pending) => (
          <PendingIngredientRow key={pending.tempId} ingredient={pending} />
        ))}
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
          <Spinner size="1" />
          <span className="text-base font-medium text-neutral-600 md:text-sm md:font-normal dark:text-neutral-400">
            {ingredient.name}
          </span>
        </div>

        {/* Quantity/Unit/Role row */}
        <div className="flex gap-3 md:contents">
          <div className="flex min-h-9 flex-1 items-center rounded-lg border border-neutral-200 bg-white px-3 py-3 md:col-span-2 md:min-h-0 md:border-transparent md:bg-transparent md:px-0 md:py-0 dark:border-neutral-700 dark:bg-neutral-900 md:dark:border-transparent md:dark:bg-transparent">
            <span className="text-neutral-500 dark:text-neutral-400">
              {ingredient.quantity}
            </span>
          </div>
          <div className="flex min-h-9 flex-1 items-center rounded-lg border border-neutral-200 bg-white px-3 py-3 md:col-span-2 md:min-h-0 md:border-transparent md:bg-transparent md:px-0 md:py-0 dark:border-neutral-700 dark:bg-neutral-900 md:dark:border-transparent md:dark:bg-transparent">
            <span className="text-neutral-500 dark:text-neutral-400">
              {ingredient.unit}
            </span>
          </div>
          <div className="flex min-h-9 flex-1 items-center justify-center rounded-lg border border-neutral-200 bg-white px-3 py-3 text-xs md:col-span-2 md:min-h-0 md:border-transparent md:bg-transparent md:px-0 md:py-0 dark:border-neutral-600 dark:bg-neutral-800 md:dark:border-transparent md:dark:bg-transparent">
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
  isSaving?: boolean;
}

function IngredientRow({
  ingredient,
  suggestions,
  onChange,
  onRemove,
  isSaving = false,
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
          <div className="flex items-center gap-2">
            <input
              list={`ingredient-suggestions-${ingredient.id}`}
              value={state.name}
              onChange={(event) =>
                setState((prev) => ({ ...prev, name: event.target.value }))
              }
              onBlur={commit}
              placeholder="Ingredient name"
              className="flex-1 rounded-lg border border-neutral-200 bg-transparent px-3 py-3 text-base font-medium outline-none focus:border-neutral-400 focus:bg-white focus:ring-2 focus:ring-neutral-200 md:border-transparent md:px-2 md:py-1 md:text-sm md:font-normal dark:border-neutral-700 dark:focus:border-neutral-500 dark:focus:bg-neutral-900 dark:focus:ring-neutral-700 md:dark:border-transparent"
            />
            <SaveIndicator isSaving={isSaving} />
          </div>
          <datalist id={`ingredient-suggestions-${ingredient.id}`}>
            {allSuggestions.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
        </div>

        {/* Quantity/Unit/Role row */}
        <div className="flex gap-3 md:contents">
          <TextField.Root
            type="number"
            value={state.quantity}
            onChange={(event) =>
              setState((prev) => ({ ...prev, quantity: event.target.value }))
            }
            onBlur={commit}
            placeholder="Amount"
            className="w-20 min-h-9 flex-1 rounded-lg border border-neutral-200 bg-transparent px-3 py-3 outline-none focus:border-neutral-400 focus:bg-white focus:ring-2 focus:ring-neutral-200 md:col-span-2 md:w-full md:min-h-0 md:border-transparent md:px-2 md:py-1 dark:border-neutral-700 dark:focus:border-neutral-500 dark:focus:bg-neutral-900 dark:focus:ring-neutral-700 md:dark:border-transparent"
          />
          <TextField.Root
            value={state.unit}
            onChange={(event) =>
              setState((prev) => ({ ...prev, unit: event.target.value }))
            }
            onBlur={commit}
            placeholder="Unit"
            className="w-16 min-h-9 flex-1 rounded-lg border border-neutral-200 bg-transparent px-3 py-3 outline-none focus:border-neutral-400 focus:bg-white focus:ring-2 focus:ring-neutral-200 md:col-span-2 md:w-full md:min-h-0 md:border-transparent md:px-2 md:py-1 dark:border-neutral-700 dark:focus:border-neutral-500 dark:focus:bg-neutral-900 dark:focus:ring-neutral-700 md:dark:border-transparent"
          />

          {/* Role badge selector - consistent with Add form */}
          <div className="relative flex-1 md:col-span-2">
            <Button
              onClick={() => setShowRoleSelector(!showRoleSelector)}
              variant="soft"
              size="1"
              className="flex min-h-9 w-full items-center justify-center gap-1"
            >
              <span className="truncate">{IngredientRoleLabels[state.role]}</span>
              <ChevronDownIcon className="w-3 h-3" />
            </Button>
            {showRoleSelector && (
              <div className="absolute left-0 right-0 top-full z-10 mt-1 flex flex-wrap gap-1 rounded-lg border border-neutral-200 bg-white p-2 shadow-lg dark:border-neutral-700 dark:bg-neutral-800">
                {INGREDIENT_ROLES.filter((r) => r !== state.role).map((role) => (
                  <Button
                    key={role}
                    onClick={() => {
                      setState((prev) => ({ ...prev, role }));
                      setShowRoleSelector(false);
                      commit();
                    }}
                    variant="outline"
                    size="1"
                    className="rounded-full"
                  >
                    {IngredientRoleLabels[role]}
                  </Button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Actions row - visible mobile, integrated desktop */}
        <div className="flex items-center justify-between gap-3 md:col-span-1 md:justify-end">
          <Tooltip content="Delete ingredient">
            <IconButton
              onClick={() => setShowDeleteConfirm(true)}
              disabled={isDeleting}
              variant="soft"
              color="red"
              size="1"
              aria-label="Delete ingredient"
            >
              ✕
            </IconButton>
          </Tooltip>
        </div>
      </div>

      {/* Collapsible notes */}
      {!showNotes ? (
        <Button
          onClick={() => setShowNotes(true)}
          variant="ghost"
          size="2"
          className="w-full md:w-auto text-left"
        >
          + Add notes
        </Button>
      ) : (
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
              Notes
            </label>
            <Button
              onClick={() => {
                setShowNotes(false);
                setState((prev) => ({ ...prev, notes: "" }));
                commit();
              }}
              variant="ghost"
              size="1"
            >
              Remove
            </Button>
          </div>
          <TextArea
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
              <Button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                variant="soft"
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
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
                color="red"
                variant="solid"
                className="flex-1"
              >
                {isDeleting ? "Deleting…" : "Delete"}
              </Button>
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
  checkedIngredients: Set<string>;
  onToggleIngredientCheck: (ingredientId: string) => void;
  onToggleAllIngredients: () => void;
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
  checkedIngredients,
  onToggleIngredientCheck,
  onToggleAllIngredients,
}: BreadToolsProps) {
  const selectedIngredient = version.ingredients.find(
    (ing) => ing.id === selectedScalingIngredient,
  );
  const allChecked = version.ingredients.every((ing) => checkedIngredients.has(ing.id));
  const checkedCount = version.ingredients.filter((ing) =>
    checkedIngredients.has(ing.id),
  ).length;

  return (
    <section className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
              Baker&apos;s percentages
            </h3>
            <div
              onClick={onToggleAllIngredients}
              className="inline-flex items-center gap-2 rounded-lg px-2 py-1 text-xs font-medium text-neutral-600 transition hover:bg-neutral-100 cursor-pointer dark:text-neutral-400 dark:hover:bg-neutral-800"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onToggleAllIngredients();
                }
              }}
              aria-label={
                allChecked ? "Uncheck all ingredients" : "Check all ingredients"
              }
            >
              <Checkbox
                checked={allChecked}
                onCheckedChange={(checked) => {
                  if (checked !== "indeterminate") {
                    onToggleAllIngredients();
                  }
                }}
              />
              <span>
                {allChecked ? "Uncheck all" : "Check all"}{" "}
                {checkedCount > 0 && `(${checkedCount}/${version.ingredients.length})`}
              </span>
            </div>
          </div>
          <ul className="space-y-1 text-sm text-neutral-600 dark:text-neutral-300">
            {version.ingredients.map((ingredient) => {
              const isChecked = checkedIngredients.has(ingredient.id);
              return (
                <li
                  key={ingredient.id}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-2 py-1.5 transition",
                    isChecked
                      ? "bg-green-50 dark:bg-green-900/20"
                      : "hover:bg-neutral-50 dark:hover:bg-neutral-800/50",
                  )}
                >
                  <Checkbox
                    checked={isChecked}
                    onCheckedChange={(checked) => {
                      if (checked !== "indeterminate") {
                        onToggleIngredientCheck(ingredient.id);
                      }
                    }}
                    className="flex-shrink-0"
                    aria-label={`Mark ${ingredient.name} as ${isChecked ? "not added" : "added"}`}
                  />
                  <span
                    className={cn(
                      "flex-1 min-w-0",
                      isChecked && "line-through opacity-60",
                    )}
                  >
                    {ingredient.name}
                  </span>
                  <span
                    className={cn(
                      "text-sm whitespace-nowrap",
                      isChecked
                        ? "text-neutral-400 dark:text-neutral-500"
                        : "text-neutral-500 dark:text-neutral-400",
                    )}
                  >
                    {ingredient.quantity} {ingredient.unit}
                  </span>
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
              );
            })}
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
          <Button
            onClick={() => setIsScalingOpen(!isScalingOpen)}
            variant="soft"
            className="w-full"
          >
            {isScalingOpen ? "Hide scaling tools" : "Scale this formula"}
          </Button>
          {isScalingOpen && (
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-neutral-500 dark:text-neutral-400 mb-1">
                  Scale by ingredient
                </label>
                <Select.Root
                  value={selectedScalingIngredient}
                  onValueChange={(value) => setSelectedScalingIngredient(value)}
                >
                  <Select.Trigger className="w-full" placeholder="Select ingredient..." />
                  <Select.Content>
                    {version.ingredients.map((ing) => (
                      <Select.Item key={ing.id} value={ing.id}>
                        {ing.name}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select.Root>
              </div>
              {selectedIngredient && (
                <div>
                  <label className="block text-neutral-500 dark:text-neutral-400 mb-1">
                    Target amount ({selectedIngredient.unit})
                  </label>
                  <div className="flex gap-2">
                    <TextField.Root
                      type="number"
                      value={targetQuantity}
                      onChange={(event) => setTargetQuantity(event.target.value)}
                      placeholder={`Current: ${selectedIngredient.quantity.toFixed(1)}`}
                      className="flex-1 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-400 focus:ring-2 focus:ring-neutral-200 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-50 dark:focus:border-neutral-500 dark:focus:ring-neutral-700"
                    />
                    <Button
                      onClick={onPreviewScaling}
                      disabled={!targetQuantity || Number(targetQuantity) <= 0}
                      variant="solid"
                    >
                      Preview
                    </Button>
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

interface VersionNotesProps {
  notesDraft: {
    notes: string;
    nextSteps: string;
    tasteNotes: string;
    visualNotes: string;
    textureNotes: string;
  };
  tasteRating?: number;
  visualRating?: number;
  textureRating?: number;
  onRatingChange: (
    field: "tasteRating" | "visualRating" | "textureRating",
    value: number,
  ) => Promise<void>;
  onChange: (value: VersionNotesProps["notesDraft"]) => void;
  onSave: (field: keyof VersionNotesProps["notesDraft"], value: string) => Promise<void>;
  savingNotes?: Record<string, boolean>;
}

function VersionNotes({
  notesDraft,
  onChange,
  onSave,
  savingNotes = {},
  tasteRating,
  visualRating,
  textureRating,
  onRatingChange,
}: VersionNotesProps) {
  const [editingRatingNote, setEditingRatingNote] = useState<
    "taste" | "visual" | "texture" | null
  >(null);
  const [ratingNoteDraft, setRatingNoteDraft] = useState("");

  const ratings: Array<{
    key: "taste" | "visual" | "texture";
    label: string;
    rating?: number;
    note?: string;
    noteField: "tasteNotes" | "visualNotes" | "textureNotes";
    ratingField: "tasteRating" | "visualRating" | "textureRating";
  }> = [
    {
      key: "taste",
      label: "Taste",
      rating: tasteRating,
      note: notesDraft.tasteNotes,
      noteField: "tasteNotes",
      ratingField: "tasteRating",
    },
    {
      key: "visual",
      label: "Visual",
      rating: visualRating,
      note: notesDraft.visualNotes,
      noteField: "visualNotes",
      ratingField: "visualRating",
    },
    {
      key: "texture",
      label: "Texture",
      rating: textureRating,
      note: notesDraft.textureNotes,
      noteField: "textureNotes",
      ratingField: "textureRating",
    },
  ];

  const handleAddNote = (key: "taste" | "visual" | "texture", currentNote?: string) => {
    setEditingRatingNote(key);
    setRatingNoteDraft(currentNote || "");
  };

  const handleSaveRatingNote = async (
    noteField: "tasteNotes" | "visualNotes" | "textureNotes",
  ) => {
    await onSave(noteField, ratingNoteDraft);
    setEditingRatingNote(null);
    setRatingNoteDraft("");
  };

  const handleCancelRatingNote = () => {
    setEditingRatingNote(null);
    setRatingNoteDraft("");
  };

  const handleRemoveRatingNote = async (
    noteField: "tasteNotes" | "visualNotes" | "textureNotes",
  ) => {
    await onSave(noteField, "");
  };

  return (
    <section className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
      <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
        Version journal
      </h3>
      <div className="mt-3 grid gap-6">
        {/* Process Notes */}
        <div className="grid gap-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
              Process notes
            </label>
            <SaveIndicator isSaving={savingNotes["notes"] ?? false} />
          </div>
          <TextArea
            value={notesDraft.notes}
            onChange={(event) => onChange({ ...notesDraft, notes: event.target.value })}
            onBlur={(event) => onSave("notes", event.target.value)}
            rows={4}
            placeholder="Observations during mixing, fermentation, shaping, or baking."
            className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-400 focus:ring-2 focus:ring-neutral-200 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50 dark:focus:border-neutral-500 dark:focus:ring-neutral-700"
          />
          <p className="text-xs text-neutral-400 dark:text-neutral-500">
            Observations during mixing, fermentation, shaping, or baking.
          </p>
        </div>

        {/* Taste Review */}
        <div className="grid gap-3">
          <label className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            Taste Review
          </label>
          {ratings.map(({ key, label, rating, note, noteField, ratingField }) => (
            <div key={key} className="grid gap-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-neutral-700 dark:text-neutral-300">
                  {label}
                </span>
                <div className="flex items-center gap-2">
                  {/* Star Rating */}
                  <div className="flex gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => onRatingChange(ratingField, i + 1)}
                        className="cursor-pointer text-amber-500 hover:scale-110 transition-transform"
                      >
                        {i < (rating || 0) ? (
                          <StarFilledIcon className="w-5 h-5" />
                        ) : (
                          <StarIcon className="w-5 h-5" />
                        )}
                      </button>
                    ))}
                  </div>
                  {/* Note Button */}
                  {!note && editingRatingNote !== key && (
                    <Button
                      variant="ghost"
                      size="1"
                      onClick={() => handleAddNote(key, note)}
                    >
                      + Note
                    </Button>
                  )}
                </div>
              </div>

              {/* Show existing note */}
              {note && editingRatingNote !== key && (
                <div className="ml-0 mt-1">
                  <div className="flex items-start justify-between gap-2 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800">
                    <p className="text-sm text-neutral-700 dark:text-neutral-300 flex-1">
                      {note}
                    </p>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="1"
                        onClick={() => handleAddNote(key, note)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="1"
                        color="red"
                        onClick={() => handleRemoveRatingNote(noteField)}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Editing note */}
              {editingRatingNote === key && (
                <div className="ml-0 mt-1 grid gap-2">
                  <TextArea
                    value={ratingNoteDraft}
                    onChange={(event) => setRatingNoteDraft(event.target.value)}
                    rows={2}
                    placeholder={`Notes on ${label.toLowerCase()}`}
                    className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-400 focus:ring-2 focus:ring-neutral-200 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50 dark:focus:border-neutral-500 dark:focus:ring-neutral-700"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <Button
                      size="1"
                      onClick={() => handleSaveRatingNote(noteField)}
                      disabled={savingNotes[noteField] ?? false}
                    >
                      {savingNotes[noteField] ? "Saving..." : "Save"}
                    </Button>
                    <Button size="1" variant="ghost" onClick={handleCancelRatingNote}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Next Iteration Plan */}
        <div className="grid gap-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
              Next iteration plan
            </label>
            <SaveIndicator isSaving={savingNotes["nextSteps"] ?? false} />
          </div>
          <TextArea
            value={notesDraft.nextSteps}
            onChange={(event) =>
              onChange({ ...notesDraft, nextSteps: event.target.value })
            }
            onBlur={(event) => onSave("nextSteps", event.target.value)}
            rows={4}
            placeholder="Call out the next tweaks to try, schedules to adjust, or ingredients to swap."
            className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-400 focus:ring-2 focus:ring-neutral-200 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50 dark:focus:border-neutral-500 dark:focus:ring-neutral-700"
          />
          <p className="text-xs text-neutral-400 dark:text-neutral-500">
            Call out the next tweaks to try, schedules to adjust, or ingredients to swap.
          </p>
        </div>
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
          <Button
            onClick={onRemove}
            disabled={isRemoving}
            variant="ghost"
            color="red"
            size="1"
          >
            {isRemoving ? "Removing…" : "Remove photo"}
          </Button>
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
