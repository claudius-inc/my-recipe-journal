"use client";

import { useState, useEffect } from "react";
import type { Ingredient, Recipe } from "@/types/recipes";
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

interface AddIngredientFormProps {
  recipeId: string;
  versionId: string;
  recipeCategory: Recipe["category"];
  suggestions: string[];
  isLoadingSuggestions?: boolean;
  onAdd: (
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
  onPendingChange?: (
    pending: Array<{
      tempId: string;
      name: string;
      quantity: number;
      unit: string;
      role: Ingredient["role"];
    }>,
  ) => void;
}

export function AddIngredientForm({
  recipeId,
  versionId,
  recipeCategory,
  suggestions,
  isLoadingSuggestions = false,
  onAdd,
  onPendingChange,
}: AddIngredientFormProps) {
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
  }, [versionId]);

  useEffect(() => {
    onPendingChange?.(pendingIngredients);
  }, [pendingIngredients, onPendingChange]);

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
      await onAdd(recipeId, versionId, payload);
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
      <h4 className="mb-3 text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
        Add ingredient
      </h4>
      <div className="grid gap-3 text-sm" onKeyDown={handleKeyDown}>
        <div className="flex flex-col gap-2">
          <div className="relative">
            <input
              list="ingredient-suggestions"
              value={draft.name}
              onChange={(event) => handleNameChange(event.target.value)}
              placeholder="Ingredient name"
              disabled={isLoadingSuggestions}
              className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-400 focus:ring-2 focus:ring-neutral-200 disabled:cursor-not-allowed disabled:opacity-60 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50 dark:focus:border-neutral-500 dark:focus:ring-neutral-700"
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
            <span className="text-xs text-neutral-500 dark:text-neutral-400">Quick:</span>
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
        <div className="mt-3 rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-700 dark:bg-blue-900/20 dark:text-blue-300">
          ⏳ Loading ingredient suggestions…
        </div>
      )}
      <datalist id="ingredient-suggestions">
        {allSuggestions.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>
    </section>
  );
}
