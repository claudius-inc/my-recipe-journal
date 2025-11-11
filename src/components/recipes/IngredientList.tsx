"use client";

import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import type { Ingredient, RecipeVersion } from "@/types/recipes";
import { IngredientListItem } from "./IngredientListItem";

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
  enableBakersPercent?: boolean;
  flourTotal?: number;
  savingIngredient?: Record<string, boolean>;
  suggestions?: string[];
  checkedIngredients?: Set<string>;
  onToggleIngredientCheck?: (id: string) => void;
  onToggleAllIngredients?: () => void;
  pendingIngredients?: PendingIngredient[];
}

export function IngredientList({
  version,
  recipeId,
  onUpdateIngredient,
  onDeleteIngredient,
  enableBakersPercent = false,
  flourTotal = 0,
  savingIngredient = {},
  suggestions = [],
  checkedIngredients = new Set(),
  onToggleIngredientCheck,
  onToggleAllIngredients,
  pendingIngredients = [],
}: IngredientListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleToggleExpand = useCallback((id: string) => {
    setExpandedId((current) => (current === id ? null : id));
  }, []);

  const handleToggleCheck = useCallback(
    (id: string) => {
      onToggleIngredientCheck?.(id);
    },
    [onToggleIngredientCheck],
  );

  const allChecked =
    version.ingredients.length > 0 &&
    version.ingredients.every((ing) => checkedIngredients.has(ing.id));
  const checkedCount = version.ingredients.filter((ing) =>
    checkedIngredients.has(ing.id),
  ).length;

  return (
    <section className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
          Ingredient List
        </h3>
        {version.ingredients.length > 0 && (
          <button
            type="button"
            onClick={onToggleAllIngredients}
            className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-neutral-600 transition hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
            aria-label={allChecked ? "Uncheck all ingredients" : "Check all ingredients"}
          >
            <span className="text-base">{allChecked ? "☑" : "☐"}</span>
            <span>
              {allChecked ? "Uncheck all" : "Check all"}
              {checkedCount > 0 && ` (${checkedCount}/${version.ingredients.length})`}
            </span>
          </button>
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
        {pendingIngredients.map((pending) => (
          <PendingIngredientListItem key={pending.tempId} ingredient={pending} />
        ))}

        {/* Empty state */}
        {version.ingredients.length === 0 && pendingIngredients.length === 0 && (
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
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-600 dark:border-neutral-600 dark:border-t-neutral-300" />
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
