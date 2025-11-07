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
import { SuccessMetrics } from "./SuccessMetrics";
import { IterationIntentModal } from "./IterationIntentModal";
import { IterationTracking } from "./IterationTracking";

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
}

const EditableField = ({
  label,
  value,
  onChange,
  placeholder,
  multiline,
  rows = 3,
  onBlur,
}: EditableFieldProps) => (
  <label className="flex flex-col gap-1">
    <span className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
      {label}
    </span>
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
  const [isSavingMetrics, setIsSavingMetrics] = useState(false);
  const [notesDraft, setNotesDraft] = useState({
    notes: "",
    tastingNotes: "",
    nextSteps: "",
  });
  const [ingredientSuggestions, setIngredientSuggestions] = useState<string[]>([]);
  const [isScalingOpen, setIsScalingOpen] = useState(false);
  const [scalingFactor, setScalingFactor] = useState(1);
  const [targetWeight, setTargetWeight] = useState<string>("");
  const [savingMetaField, setSavingMetaField] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isIntentModalOpen, setIsIntentModalOpen] = useState(false);
  const [isCreatingVersion, setIsCreatingVersion] = useState(false);
  const [isSavingIteration, setIsSavingIteration] = useState(false);

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
    getIngredientSuggestions(selectedRecipe.id)
      .then((data) => {
        if (active) {
          setIngredientSuggestions(data);
        }
      })
      .catch(() => {
        if (active) {
          setIngredientSuggestions([]);
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
        await updateRecipe(selectedRecipe.id, { name: recipeName });
      }
      if (
        field === "description" &&
        (recipeDescription ?? "") !== (selectedRecipe.description ?? "")
      ) {
        await updateRecipe(selectedRecipe.id, { description: recipeDescription || null });
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
      await updateVersion(selectedRecipe.id, selectedVersion.id, { [field]: value });
    },
    [selectedRecipe, selectedVersion, updateVersion],
  );

  const handleVersionScaling = useCallback(
    async (factor: number) => {
      if (!selectedRecipe || !selectedVersion) {
        return;
      }
      await createVersion(selectedRecipe.id, {
        baseVersionId: selectedVersion.id,
        scalingFactor: factor,
        setActive: true,
      });
      setIsScalingOpen(false);
      setScalingFactor(1);
      setTargetWeight("");
    },
    [createVersion, selectedRecipe, selectedVersion],
  );

  const handleTargetWeight = useCallback(() => {
    if (!totalWeight || !targetWeight) {
      return;
    }
    const parsed = Number(targetWeight);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return;
    }
    handleVersionScaling(parsed / totalWeight);
  }, [handleVersionScaling, targetWeight, totalWeight]);

  const handlePhotoUpload = useCallback(
    async (file: File) => {
      if (!selectedRecipe || !selectedVersion) {
        return;
      }
      setIsUploading(true);
      const reader = new FileReader();
      const dataUrl = await new Promise<string>((resolve, reject) => {
        reader.onload = () =>
          resolve(typeof reader.result === "string" ? reader.result : "");
        reader.onerror = () => reject(reader.error ?? new Error("Failed to read image"));
        reader.readAsDataURL(file);
      });
      await updateVersion(selectedRecipe.id, selectedVersion.id, { photoUrl: dataUrl });
      setIsUploading(false);
    },
    [selectedRecipe, selectedVersion, updateVersion],
  );

  const removePhoto = useCallback(async () => {
    if (!selectedRecipe || !selectedVersion) {
      return;
    }
    await updateVersion(selectedRecipe.id, selectedVersion.id, { photoUrl: null });
  }, [selectedRecipe, selectedVersion, updateVersion]);

  const handleSaveMetrics = useCallback(
    async (data: {
      tasteRating?: number;
      visualRating?: number;
      textureRating?: number;
      tasteTags: string[];
      textureTags: string[];
    }) => {
      if (!selectedRecipe || !selectedVersion) {
        return;
      }
      setIsSavingMetrics(true);
      try {
        await updateVersion(selectedRecipe.id, selectedVersion.id, {
          tasteRating: data.tasteRating,
          visualRating: data.visualRating,
          textureRating: data.textureRating,
          tasteTags: data.tasteTags,
          textureTags: data.textureTags,
        });
      } finally {
        setIsSavingMetrics(false);
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
            />
            <EditableField
              label="Goal"
              value={recipeDescription}
              onChange={setRecipeDescription}
              onBlur={() => handleRecipeBlur("description")}
              placeholder="Describe the goal for this recipe iteration."
              multiline
              rows={3}
            />
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
        />

        <IngredientEditor
          version={selectedVersion}
          recipeId={selectedRecipe.id}
          suggestions={ingredientSuggestions}
          onAdd={addIngredient}
          onUpdate={updateIngredient}
          onRemove={deleteIngredient}
        />

        {categoryConfig?.enableBakersPercent && (
          <BreadTools
            version={selectedVersion}
            flourTotal={flourTotal}
            totalWeight={totalWeight}
            hydration={hydrationPercent}
            isScalingOpen={isScalingOpen}
            setIsScalingOpen={setIsScalingOpen}
            scalingFactor={scalingFactor}
            setScalingFactor={setScalingFactor}
            onScale={handleVersionScaling}
            targetWeight={targetWeight}
            setTargetWeight={setTargetWeight}
            onTargetWeight={handleTargetWeight}
          />
        )}

        {categoryConfig?.fields?.length ? (
          <MetadataFields
            fields={categoryConfig.fields}
            metadata={metadataDraft}
            onChange={(fieldId, value) =>
              setMetadataDraft((prev) => ({ ...prev, [fieldId]: value }))
            }
            onSave={handleMetadataSave}
            savingField={savingMetaField}
          />
        ) : null}

        <VersionNotes
          notesDraft={notesDraft}
          onChange={setNotesDraft}
          onSave={handleNotesSave}
        />

        <PhotoSection
          version={selectedVersion}
          onUpload={handlePhotoUpload}
          onRemove={removePhoto}
          isUploading={isUploading}
        />

        <section className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
          <IterationTracking
            version={selectedVersion}
            onSave={handleSaveIteration}
            isSaving={isSavingIteration}
          />
        </section>

        <section className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
          <SuccessMetrics
            version={selectedVersion}
            onSave={handleSaveMetrics}
            isSaving={isSavingMetrics}
          />
        </section>

        <IterationIntentModal
          isOpen={isIntentModalOpen}
          baseVersion={selectedVersion}
          onConfirm={handleCreateVersionWithIntent}
          onCancel={() => setIsIntentModalOpen(false)}
          isLoading={isCreatingVersion}
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
}

function VersionTabs({
  recipe,
  activeVersion,
  onSelect,
  onDuplicate,
  onDelete,
}: VersionTabsProps) {
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  return (
    <section className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-1 gap-2 overflow-x-auto">
          {recipe.versions.map((version) => {
            const isActive = version.id === activeVersion.id;
            return (
              <button
                key={version.id}
                type="button"
                onClick={() => onSelect(recipe.id, version.id)}
                className={cn(
                  "flex-shrink-0 rounded-xl border px-3 py-2 text-sm font-medium transition",
                  isActive
                    ? "border-neutral-900 bg-neutral-900 text-white dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-900"
                    : "border-neutral-200 bg-white hover:border-neutral-400 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:border-neutral-500",
                )}
              >
                <div className="flex flex-col text-left">
                  <span>{version.title || "Untitled"}</span>
                  <span className="text-xs font-normal text-neutral-400 dark:text-neutral-500">
                    {new Date(version.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onDuplicate}
            className="rounded-lg border border-neutral-200 px-3 py-2 text-xs font-medium text-neutral-700 transition hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
          >
            Duplicate version
          </button>
          {recipe.versions.length > 1 && (
            <button
              type="button"
              onClick={async () => {
                setIsDeleting(activeVersion.id);
                await onDelete(activeVersion.id);
                setIsDeleting(null);
              }}
              disabled={isDeleting === activeVersion.id}
              className="rounded-lg border border-red-200 px-3 py-2 text-xs font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-70 dark:border-red-800/60 dark:text-red-300 dark:hover:bg-red-900/30"
            >
              {isDeleting === activeVersion.id ? "Removing…" : "Delete version"}
            </button>
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
  suggestions: string[];
  onAdd: IngredientsOperations["add"];
  onUpdate: IngredientsOperations["update"];
  onRemove: IngredientsOperations["remove"];
}

function IngredientEditor({
  version,
  recipeId,
  suggestions,
  onAdd,
  onUpdate,
  onRemove,
}: IngredientEditorProps) {
  const [draft, setDraft] = useState({
    name: "",
    quantity: "",
    unit: "",
    role: "other" as Ingredient["role"],
    notes: "",
  });

  useEffect(() => {
    setDraft({ name: "", quantity: "", unit: "", role: "other", notes: "" });
  }, [version.id]);

  const submitDraft = async () => {
    if (!draft.name.trim() || !draft.unit.trim()) {
      return;
    }
    const parsed = Number(draft.quantity);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return;
    }
    await onAdd(recipeId, version.id, {
      name: draft.name.trim(),
      quantity: parsed,
      unit: draft.unit.trim(),
      role: draft.role,
      notes: draft.notes?.trim() || undefined,
    });
    setDraft({ name: "", quantity: "", unit: "", role: "other", notes: "" });
  };

  return (
    <section className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
      <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
        Ingredients
      </h3>
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
      </div>
      <div className="mt-4 grid gap-2 rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-3 dark:border-neutral-700 dark:bg-neutral-900/60">
        <h4 className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          Add ingredient
        </h4>
        <div className="grid grid-cols-12 gap-2 text-sm">
          <div className="col-span-4">
            <input
              list="ingredient-suggestions"
              value={draft.name}
              onChange={(event) =>
                setDraft((prev) => ({ ...prev, name: event.target.value }))
              }
              placeholder="Ingredient"
              className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-400 focus:ring-2 focus:ring-neutral-200 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50 dark:focus:border-neutral-500 dark:focus:ring-neutral-700"
            />
          </div>
          <div className="col-span-2">
            <input
              type="number"
              value={draft.quantity}
              onChange={(event) =>
                setDraft((prev) => ({ ...prev, quantity: event.target.value }))
              }
              placeholder="Qty"
              className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-400 focus:ring-2 focus:ring-neutral-200 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50 dark:focus:border-neutral-500 dark:focus:ring-neutral-700"
            />
          </div>
          <div className="col-span-2">
            <input
              value={draft.unit}
              onChange={(event) =>
                setDraft((prev) => ({ ...prev, unit: event.target.value }))
              }
              placeholder="Unit"
              className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-400 focus:ring-2 focus:ring-neutral-200 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50 dark:focus:border-neutral-500 dark:focus:ring-neutral-700"
            />
          </div>
          <div className="col-span-2">
            <select
              value={draft.role}
              onChange={(event) =>
                setDraft((prev) => ({
                  ...prev,
                  role: event.target.value as Ingredient["role"],
                }))
              }
              className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-400 focus:ring-2 focus:ring-neutral-200 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50 dark:focus:border-neutral-500 dark:focus:ring-neutral-700"
            >
              {INGREDIENT_ROLES.map((role) => (
                <option key={role} value={role}>
                  {IngredientRoleLabels[role] ?? role}
                </option>
              ))}
            </select>
          </div>
          <div className="col-span-2">
            <button
              type="button"
              onClick={submitDraft}
              className="w-full rounded-lg bg-neutral-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-neutral-700 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200"
            >
              Add
            </button>
          </div>
        </div>
        <datalist id="ingredient-suggestions">
          {suggestions.map((name) => (
            <option key={name} value={name} />
          ))}
        </datalist>
      </div>
    </section>
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
    <div className="space-y-2 rounded-xl border border-neutral-200 bg-white p-3 text-sm shadow-sm dark:border-neutral-700 dark:bg-neutral-950">
      <div className="grid grid-cols-12 items-center gap-2">
        <div className="col-span-4">
          <input
            list={`ingredient-suggestions-${ingredient.id}`}
            value={state.name}
            onChange={(event) =>
              setState((prev) => ({ ...prev, name: event.target.value }))
            }
            onBlur={commit}
            className="w-full rounded-lg border border-transparent bg-transparent px-2 py-1 outline-none focus:border-neutral-300 focus:bg-white focus:ring-2 focus:ring-neutral-200 dark:focus:border-neutral-600 dark:focus:bg-neutral-900"
          />
          <datalist id={`ingredient-suggestions-${ingredient.id}`}>
            {suggestions.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
        </div>
        <div className="col-span-2">
          <input
            type="number"
            value={state.quantity}
            onChange={(event) =>
              setState((prev) => ({ ...prev, quantity: event.target.value }))
            }
            onBlur={commit}
            className="w-full rounded-lg border border-transparent bg-transparent px-2 py-1 outline-none focus:border-neutral-300 focus:bg-white focus:ring-2 focus:ring-neutral-200 dark:focus:border-neutral-600 dark:focus:bg-neutral-900"
          />
        </div>
        <div className="col-span-2">
          <input
            value={state.unit}
            onChange={(event) =>
              setState((prev) => ({ ...prev, unit: event.target.value }))
            }
            onBlur={commit}
            className="w-full rounded-lg border border-transparent bg-transparent px-2 py-1 outline-none focus:border-neutral-300 focus:bg-white focus:ring-2 focus:ring-neutral-200 dark:focus:border-neutral-600 dark:focus:bg-neutral-900"
          />
        </div>
        <div className="col-span-2">
          <select
            value={state.role}
            onChange={(event) =>
              setState((prev) => ({
                ...prev,
                role: event.target.value as Ingredient["role"],
              }))
            }
            onBlur={commit}
            className="w-full rounded-lg border border-transparent bg-transparent px-2 py-1 outline-none focus:border-neutral-300 focus:bg-white focus:ring-2 focus:ring-neutral-200 dark:focus:border-neutral-600 dark:focus:bg-neutral-900"
          >
            {INGREDIENT_ROLES.map((role) => (
              <option key={role} value={role}>
                {IngredientRoleLabels[role] ?? role}
              </option>
            ))}
          </select>
        </div>
        <div className="col-span-1">
          <button
            type="button"
            onClick={onRemove}
            className="rounded-lg border border-neutral-200 px-2 py-1 text-xs text-neutral-500 transition hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
          >
            ✕
          </button>
        </div>
      </div>
      <textarea
        value={state.notes}
        onChange={(event) => setState((prev) => ({ ...prev, notes: event.target.value }))}
        onBlur={commit}
        rows={2}
        placeholder="Notes on ingredient tweaks"
        className="w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs outline-none focus:border-neutral-400 focus:bg-white focus:ring-2 focus:ring-neutral-200 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:focus:border-neutral-500 dark:focus:ring-neutral-700"
      />
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
  scalingFactor: number;
  setScalingFactor: (value: number) => void;
  onScale: (factor: number) => Promise<void>;
  targetWeight: string;
  setTargetWeight: (value: string) => void;
  onTargetWeight: () => void;
}

function BreadTools({
  version,
  flourTotal,
  totalWeight,
  hydration,
  isScalingOpen,
  setIsScalingOpen,
  scalingFactor,
  setScalingFactor,
  onScale,
  targetWeight,
  setTargetWeight,
  onTargetWeight,
}: BreadToolsProps) {
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
                <span className="font-mono">
                  {flourTotal
                    ? formatPercent((ingredient.quantity / flourTotal) * 100)
                    : "–"}
                </span>
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
                <label className="text-neutral-500 dark:text-neutral-400">
                  Scale by factor
                </label>
                <div className="mt-1 flex gap-2">
                  <input
                    type="number"
                    min={0.1}
                    step={0.1}
                    value={scalingFactor}
                    onChange={(event) => setScalingFactor(Number(event.target.value))}
                    className="flex-1 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-400 focus:ring-2 focus:ring-neutral-200 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-50 dark:focus:border-neutral-500 dark:focus:ring-neutral-700"
                  />
                  <button
                    type="button"
                    onClick={() => onScale(scalingFactor)}
                    className="rounded-lg bg-neutral-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-neutral-700 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200"
                  >
                    Duplicate scaled
                  </button>
                </div>
              </div>
              <div>
                <label className="text-neutral-500 dark:text-neutral-400">
                  Scale to total weight (g)
                </label>
                <div className="mt-1 flex gap-2">
                  <input
                    type="number"
                    value={targetWeight}
                    onChange={(event) => setTargetWeight(event.target.value)}
                    className="flex-1 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-400 focus:ring-2 focus:ring-neutral-200 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-50 dark:focus:border-neutral-500 dark:focus:ring-neutral-700"
                  />
                  <button
                    type="button"
                    onClick={onTargetWeight}
                    className="rounded-lg bg-neutral-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-neutral-700 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200"
                  >
                    Duplicate
                  </button>
                </div>
              </div>
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
    <section className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
      <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
        Category notes
      </h3>
      <div className="mt-4 grid gap-3">
        {fields.map((field) => (
          <div key={field.id} className="grid gap-1">
            <label className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
              {field.label}
            </label>
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
            {savingField === field.id && (
              <span className="text-xs text-neutral-400">Saving…</span>
            )}
          </div>
        ))}
      </div>
    </section>
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
}

function VersionNotes({ notesDraft, onChange, onSave }: VersionNotesProps) {
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
      key: "tastingNotes",
      label: "Tasting review",
      help: "What worked? Where did it fall short?",
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
            <label className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
              {label}
            </label>
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
}

function PhotoSection({ version, onUpload, onRemove, isUploading }: PhotoSectionProps) {
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
            className="text-xs text-red-500 hover:underline"
          >
            Remove photo
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
