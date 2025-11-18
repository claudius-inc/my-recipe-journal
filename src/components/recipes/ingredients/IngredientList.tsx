"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Checkbox, Spinner, Button, TextField, Select } from "@radix-ui/themes";
import { ChevronDownIcon } from "@radix-ui/react-icons";
import { cn } from "@/lib/utils";
import type { Ingredient, RecipeVersion, Recipe } from "@/types/recipes";
import { IngredientListItem } from "./IngredientListItem";
import {
  suggestIngredientDefaults,
  getCategoryIngredients,
} from "@/lib/ingredient-helpers";
import { useToast } from "@/context/ToastContext";

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

const INGREDIENT_ROLES = [
  "flour",
  "liquid",
  "preferment",
  "salt",
  "sweetener",
  "fat",
  "add_in",
  "spice",
  "other",
] as const;

interface PendingIngredient {
  tempId: string;
  name: string;
  quantity: number;
  unit: string;
  role: Ingredient["role"];
}

interface IngredientListProps {
  version: RecipeVersion;
  recipeId: string;
  recipeCategory: Recipe["category"];
  onUpdateIngredient: (
    ingredientId: string,
    data: Partial<{
      name: string;
      quantity: number;
      unit: string;
      role: Ingredient["role"];
      notes: string | null;
    }>,
  ) => Promise<void>;
  onDeleteIngredient: (ingredientId: string) => Promise<void>;
  onAddIngredient: (
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
  enableBakersPercent?: boolean;
  flourTotal?: number;
  savingIngredient?: Record<string, boolean>;
  suggestions?: string[];
  isLoadingSuggestions?: boolean;
  checkedIngredients?: Set<string>;
  onToggleIngredientCheck?: (id: string) => void;
  onToggleAllIngredients?: () => void;
  pendingIngredients?: PendingIngredient[];
  onPendingIngredientsChange?: (pending: PendingIngredient[]) => void;
  // Scaling props
  isScalingOpen?: boolean;
  onToggleScaling?: () => void;
  selectedScalingIngredient?: string;
  onSelectScalingIngredient?: (value: string) => void;
  targetQuantity?: string;
  onTargetQuantityChange?: (value: string) => void;
  onPreviewScaling?: () => void;
  isPreviewingScaling?: boolean;
}

export function IngredientList({
  version,
  recipeId,
  recipeCategory,
  onUpdateIngredient,
  onDeleteIngredient,
  onAddIngredient,
  enableBakersPercent = false,
  flourTotal = 0,
  savingIngredient = {},
  suggestions = [],
  isLoadingSuggestions = false,
  checkedIngredients = new Set(),
  onToggleIngredientCheck,
  onToggleAllIngredients,
  pendingIngredients = [],
  onPendingIngredientsChange,
  // Scaling props
  isScalingOpen = false,
  onToggleScaling,
  selectedScalingIngredient = "",
  onSelectScalingIngredient,
  targetQuantity = "",
  onTargetQuantityChange,
  onPreviewScaling,
  isPreviewingScaling = false,
}: IngredientListProps) {
  const { addToast } = useToast();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [draft, setDraft] = useState({
    name: "",
    quantity: "",
    unit: "",
    role: "other" as Ingredient["role"],
    notes: "",
  });
  const [showRoleSelector, setShowRoleSelector] = useState(false);
  const [localPendingIngredients, setLocalPendingIngredients] = useState<
    PendingIngredient[]
  >([]);

  // Ref for ingredient name input to restore focus after submission
  const ingredientNameInputRef = useRef<HTMLInputElement>(null);

  const handleToggleExpand = useCallback((id: string) => {
    setExpandedId((current) => (current === id ? null : id));
  }, []);

  const handleToggleCheck = useCallback(
    (id: string) => {
      onToggleIngredientCheck?.(id);
    },
    [onToggleIngredientCheck],
  );

  // Sync local pending with external pending
  useEffect(() => {
    onPendingIngredientsChange?.(localPendingIngredients);
  }, [localPendingIngredients, onPendingIngredientsChange]);

  // Reset form when version changes
  useEffect(() => {
    setDraft({ name: "", quantity: "", unit: "", role: "other", notes: "" });
  }, [version.id]);

  // Auto-remove pending ingredients when they appear in version.ingredients
  useEffect(() => {
    setLocalPendingIngredients((currentPending) => {
      // Filter out pending ingredients that now exist in the actual ingredient list
      // Match by name, quantity, and unit to ensure we're removing the right one
      return currentPending.filter((pending) => {
        const existsInActual = version.ingredients.some(
          (actual) =>
            actual.name.toLowerCase().trim() === pending.name.toLowerCase().trim() &&
            Math.abs(actual.quantity - pending.quantity) < 0.001 && // Account for floating point
            actual.unit.toLowerCase().trim() === pending.unit.toLowerCase().trim(),
        );
        return !existsInActual;
      });
    });
  }, [version.ingredients]);

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
    setLocalPendingIngredients((prev) => [
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

    // Restore focus to ingredient name input for quick consecutive entries
    setTimeout(() => {
      ingredientNameInputRef.current?.focus();
    }, 0);

    try {
      // Fire the API call asynchronously
      await onAddIngredient(recipeId, version.id, payload);
      // Note: Don't remove from pending here - the useEffect will automatically
      // remove it when the ingredient appears in version.ingredients
    } catch (error) {
      console.error("Failed to add ingredient:", error);
      // Remove from pending on error
      setLocalPendingIngredients((prev) => prev.filter((ing) => ing.tempId !== tempId));
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

  const allChecked =
    version.ingredients.length > 0 &&
    version.ingredients.every((ing) => checkedIngredients.has(ing.id));
  const checkedCount = version.ingredients.filter((ing) =>
    checkedIngredients.has(ing.id),
  ).length;

  // Use only local pending ingredients (they're already synced to parent via useEffect)
  // Merging with pendingIngredients from parent would create duplicates
  const allPendingIngredients = localPendingIngredients;

  return (
    <section className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
          Ingredient List
        </h3>
        {version.ingredients.length > 0 && (
          <label className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-neutral-600 transition hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800 cursor-pointer">
            <Checkbox
              checked={allChecked}
              onCheckedChange={(checked) => {
                if (checked !== "indeterminate") {
                  onToggleAllIngredients?.();
                }
              }}
              aria-label={
                allChecked ? "Uncheck all ingredients" : "Check all ingredients"
              }
            />
            <span>
              {allChecked ? "Uncheck all" : "Check all"}
              {checkedCount > 0 && ` (${checkedCount}/${version.ingredients.length})`}
            </span>
          </label>
        )}
      </div>

      {/* Ingredient List */}
      <div className="space-y-2">
        {version.ingredients.map((ingredient) => (
          <IngredientListItem
            key={ingredient.id}
            ingredient={ingredient}
            isChecked={checkedIngredients.has(ingredient.id)}
            isExpanded={expandedId === ingredient.id}
            onToggleCheck={handleToggleCheck}
            onToggleExpand={handleToggleExpand}
            onSave={onUpdateIngredient}
            onDelete={onDeleteIngredient}
            enableBakersPercent={enableBakersPercent}
            flourTotal={flourTotal}
            isSaving={savingIngredient[ingredient.id] ?? false}
            suggestions={suggestions}
          />
        ))}

        {/* Pending ingredients (optimistic UI) */}
        {allPendingIngredients.map((pending) => (
          <PendingIngredientListItem key={pending.tempId} ingredient={pending} />
        ))}

        {/* Empty state */}
        {version.ingredients.length === 0 && allPendingIngredients.length === 0 && (
          <div className="rounded-lg border border-dashed border-neutral-300 bg-neutral-50 px-4 py-8 text-center dark:border-neutral-700 dark:bg-neutral-900/60">
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              No ingredients yet. Add your first ingredient below.
            </p>
          </div>
        )}
      </div>

      {/* Baker's Percentage Summary (if enabled) */}
      {enableBakersPercent && version.ingredients.length > 0 && (
        <div className="mt-4 rounded-xl border border-neutral-200 bg-neutral-50 p-3 text-sm dark:border-neutral-700 dark:bg-neutral-900/60">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            <div className="flex flex-col">
              <span className="text-xs text-neutral-500 dark:text-neutral-400">
                Total flour
              </span>
              <span className="font-semibold text-neutral-800 dark:text-neutral-100">
                {flourTotal.toFixed(1)} g
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-neutral-500 dark:text-neutral-400">
                Total weight
              </span>
              <span className="font-semibold text-neutral-800 dark:text-neutral-100">
                {version.ingredients
                  .reduce((sum, ing) => sum + ing.quantity, 0)
                  .toFixed(1)}{" "}
                g
              </span>
            </div>
            <div className="col-span-2 flex flex-col md:col-span-1">
              <span className="text-xs text-neutral-500 dark:text-neutral-400">
                Hydration
              </span>
              <span className="font-semibold text-neutral-800 dark:text-neutral-100">
                {flourTotal > 0
                  ? (
                      (version.ingredients
                        .filter((ing) => ing.role === "liquid")
                        .reduce((sum, ing) => sum + ing.quantity, 0) /
                        flourTotal) *
                      100
                    ).toFixed(1)
                  : "0.0"}
                %
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Scaling Controls */}
      {enableBakersPercent && version.ingredients.length > 0 && (
        <div className="mt-4">
          <Button
            type="button"
            onClick={onToggleScaling}
            variant="soft"
            size="2"
            className="w-full"
          >
            {isScalingOpen ? "Hide scaling tools" : "Scale ingredients"}
          </Button>
          {isScalingOpen && (
            <div className="mt-3 space-y-3 rounded-xl border border-neutral-200 bg-neutral-50 p-3 text-xs dark:border-neutral-700 dark:bg-neutral-900/60">
              <div>
                <label className="mb-1 block text-neutral-500 dark:text-neutral-400">
                  Scale by ingredient
                </label>
                <Select.Root
                  value={selectedScalingIngredient}
                  onValueChange={(value) => onSelectScalingIngredient?.(value)}
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
              {selectedScalingIngredient && (
                <div>
                  <label className="mb-1 block text-neutral-500 dark:text-neutral-400">
                    Target amount (
                    {
                      version.ingredients.find(
                        (ing) => ing.id === selectedScalingIngredient,
                      )?.unit
                    }
                    )
                  </label>
                  <div className="flex gap-2">
                    <TextField.Root
                      type="number"
                      value={targetQuantity}
                      onChange={(event) => onTargetQuantityChange?.(event.target.value)}
                      placeholder={`Current: ${
                        version.ingredients
                          .find((ing) => ing.id === selectedScalingIngredient)
                          ?.quantity.toFixed(1) ?? ""
                      }`}
                      className="flex-1 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-400 focus:ring-2 focus:ring-neutral-200 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-50 dark:focus:border-neutral-500 dark:focus:ring-neutral-700"
                    />
                    <Button
                      type="button"
                      onClick={onPreviewScaling}
                      disabled={
                        !targetQuantity ||
                        Number(targetQuantity) <= 0 ||
                        isPreviewingScaling
                      }
                      variant="solid"
                      size="2"
                    >
                      {isPreviewingScaling ? "..." : "Preview"}
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
      )}

      {/* Add Ingredient Form */}
      <div className="mt-4 border-t border-neutral-200 pt-4 dark:border-neutral-700">
        <h4 className="mb-3 text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          Add ingredient
        </h4>
        <div className="grid gap-3 text-sm" onKeyDown={handleKeyDown}>
          <div className="flex flex-col gap-2">
            <div className="relative">
              <TextField.Root
                ref={ingredientNameInputRef}
                list="ingredient-suggestions"
                value={draft.name}
                onChange={(event) => handleNameChange(event.target.value)}
                placeholder="Ingredient name"
                disabled={isLoadingSuggestions}
                className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-400 focus:ring-2 focus:ring-neutral-200 disabled:cursor-not-allowed disabled:opacity-60 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50 dark:focus:border-neutral-500 dark:focus:ring-neutral-700"
              />
              {isLoadingSuggestions && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Spinner size="1" />
                </div>
              )}
            </div>

            {/* Role badge/chip */}
            <div className="flex items-center gap-2">
              <Button
                type="button"
                onClick={() => setShowRoleSelector(!showRoleSelector)}
                variant="outline"
                size="1"
                radius="full"
              >
                {IngredientRoleLabels[draft.role]}
                <ChevronDownIcon className="w-3 h-3 ml-1" />
              </Button>
              {showRoleSelector && (
                <div className="flex flex-wrap gap-1">
                  {INGREDIENT_ROLES.filter((r) => r !== draft.role).map((role) => (
                    <Button
                      key={role}
                      type="button"
                      onClick={() => {
                        setDraft((prev) => ({ ...prev, role }));
                        setShowRoleSelector(false);
                      }}
                      variant="soft"
                      size="1"
                      radius="full"
                    >
                      {IngredientRoleLabels[role]}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <TextField.Root
              type="number"
              value={draft.quantity}
              onChange={(event) =>
                setDraft((prev) => ({ ...prev, quantity: event.target.value }))
              }
              placeholder="Quantity"
              className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-400 focus:ring-2 focus:ring-neutral-200 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50 dark:focus:border-neutral-500 dark:focus:ring-neutral-700"
            />
            <TextField.Root
              value={draft.unit}
              onChange={(event) =>
                setDraft((prev) => ({ ...prev, unit: event.target.value }))
              }
              placeholder="Unit"
              className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-400 focus:ring-2 focus:ring-neutral-200 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50 dark:focus:border-neutral-500 dark:focus:ring-neutral-700"
            />
            <Button
              type="button"
              onClick={submitDraft}
              disabled={!isFormValid}
              variant="solid"
              size="2"
              className="w-full"
            >
              <span className="hidden sm:inline">Add</span>
              <span className="sm:hidden">+</span>
            </Button>
          </div>

          {/* Quick unit shortcuts */}
          {!draft.unit && draft.name && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-neutral-500 dark:text-neutral-400">
                Quick:
              </span>
              {["g", "ml", "pc"].map((unit) => (
                <Button
                  key={unit}
                  type="button"
                  onClick={() => setQuickUnit(unit)}
                  variant="soft"
                  size="1"
                >
                  {unit}
                </Button>
              ))}
            </div>
          )}
        </div>
        {isLoadingSuggestions && (
          <div className="mt-3 rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-700 dark:bg-blue-900/20 dark:text-blue-300">
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

interface PendingIngredientListItemProps {
  ingredient: PendingIngredient;
}

function PendingIngredientListItem({ ingredient }: PendingIngredientListItemProps) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 p-3 text-sm opacity-60 dark:border-neutral-700 dark:bg-neutral-900/50">
      {/* Loading spinner */}
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center">
        <Spinner size="1" />
      </div>

      {/* Name */}
      <span className="min-w-0 flex-1 truncate font-medium text-neutral-600 dark:text-neutral-400">
        {ingredient.name}
      </span>

      {/* Amount + Unit */}
      <span className="flex-shrink-0 text-sm text-neutral-500 dark:text-neutral-400">
        {ingredient.quantity}
        {ingredient.unit}
      </span>

      {/* Placeholder for other columns */}
      <span className="w-8"></span>
    </div>
  );
}
