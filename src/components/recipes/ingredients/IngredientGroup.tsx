"use client";

import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import type {
  Ingredient,
  IngredientGroup as IngredientGroupType,
  PendingIngredient,
  RecipeCategory,
} from "@/types/recipes";
import { IngredientListItem } from "./IngredientListItem";
import { AddIngredientForm } from "./AddIngredientForm";
import { BakersPercentageSummary } from "./BakersPercentageSummary";
import { GroupHeader } from "./GroupHeader";
import { getGroupFlourTotal } from "@/lib/migration-utils";

interface IngredientGroupProps {
  group: IngredientGroupType;
  recipeId: string;
  recipeCategory: RecipeCategory;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onUpdateGroup: (data: Partial<IngredientGroupType>) => Promise<void>;
  onDeleteGroup: () => void;
  canDelete: boolean;
  // Ingredient operations
  onAddIngredient: (data: {
    name: string;
    quantity: number;
    unit: string;
    role: Ingredient["role"];
    notes?: string;
  }) => Promise<void>;
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
  // UI state
  savingIngredient?: Record<string, boolean>;
  suggestions?: string[];
  isLoadingSuggestions?: boolean;
  checkedIngredients?: Set<string>;
  onToggleIngredientCheck?: (id: string) => void;
  onToggleAllIngredients?: () => void;
  pendingIngredients?: PendingIngredient[];
  onPendingIngredientsChange?: (ingredients: PendingIngredient[]) => void;
}

export function IngredientGroup({
  group,
  recipeId,
  recipeCategory,
  isCollapsed,
  onToggleCollapse,
  onUpdateGroup,
  onDeleteGroup,
  canDelete,
  onAddIngredient,
  onUpdateIngredient,
  onDeleteIngredient,
  savingIngredient = {},
  suggestions = [],
  isLoadingSuggestions = false,
  checkedIngredients = new Set(),
  onToggleIngredientCheck,
  onToggleAllIngredients,
  pendingIngredients = [],
  onPendingIngredientsChange,
}: IngredientGroupProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [localPendingIngredients, setLocalPendingIngredients] = useState<
    PendingIngredient[]
  >([]);

  const isBakingCategory =
    recipeCategory.primary === "baking" &&
    ["bread", "sourdough", "cookies", "cakes", "pastries", "pies"].includes(
      recipeCategory.secondary,
    );

  const flourTotal = getGroupFlourTotal(group);

  const handleToggleExpand = useCallback((id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  }, []);

  const handleToggleCheck = useCallback(
    (id: string) => {
      onToggleIngredientCheck?.(id);
    },
    [onToggleIngredientCheck],
  );

  // Sync local pending ingredients with prop if provided
  useEffect(() => {
    if (onPendingIngredientsChange) {
      onPendingIngredientsChange(localPendingIngredients);
    }
  }, [localPendingIngredients, onPendingIngredientsChange]);

  // Clear pending ingredients when real ingredients update
  useEffect(() => {
    if (localPendingIngredients.length > 0) {
      setLocalPendingIngredients([]);
    }
  }, [group.ingredients.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAddIngredient = async (payload: {
    name: string;
    quantity: number;
    unit: string;
    role: Ingredient["role"];
    notes?: string;
  }) => {
    // Add to pending ingredients immediately
    setLocalPendingIngredients((prev) => [
      ...prev,
      { ...payload, tempId: `pending-${Date.now()}` },
    ]);

    try {
      await onAddIngredient(payload);
      // Success handled by useEffect clearing pending
    } catch (error) {
      console.error("Failed to add ingredient:", error);
      // Remove from pending on error
      setLocalPendingIngredients((prev) => prev.filter((p) => p.name !== payload.name));
    }
  };

  return (
    <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
      {/* Group Header */}
      <GroupHeader
        group={group}
        isCollapsed={isCollapsed}
        onToggleCollapse={onToggleCollapse}
        onUpdateGroup={onUpdateGroup}
        onDeleteGroup={onDeleteGroup}
        canDelete={canDelete}
        isBakingCategory={isBakingCategory}
      />

      {/* Group Content (collapsible) */}
      {!isCollapsed && (
        <div className="p-4">
          {/* Check All Button */}
          {onToggleAllIngredients && group.ingredients.length > 0 && (
            <div className="mb-2 flex justify-end">
              <button
                type="button"
                onClick={onToggleAllIngredients}
                className="text-xs text-blue-600 hover:underline dark:text-blue-400"
              >
                {group.ingredients.every((ing) => checkedIngredients.has(ing.id))
                  ? "Uncheck all"
                  : "Check all"}
              </button>
            </div>
          )}

          {/* Ingredient List */}
          <div className="space-y-2">
            {group.ingredients.map((ingredient) => (
              <IngredientListItem
                key={ingredient.id}
                ingredient={ingredient}
                isChecked={checkedIngredients.has(ingredient.id)}
                isExpanded={expandedId === ingredient.id}
                onToggleCheck={handleToggleCheck}
                onToggleExpand={handleToggleExpand}
                onSave={onUpdateIngredient}
                onDelete={onDeleteIngredient}
                enableBakersPercent={group.enableBakersPercent}
                flourTotal={flourTotal}
                isSaving={savingIngredient[ingredient.id]}
                suggestions={suggestions}
              />
            ))}

            {/* Pending Ingredients (Optimistic UI) */}
            {localPendingIngredients.map((pending) => (
              <div
                key={pending.tempId}
                className="animate-pulse rounded-md border border-neutral-200 bg-neutral-50 p-3 opacity-70 dark:border-neutral-800 dark:bg-neutral-900"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{pending.name}</span>
                  <span className="text-sm text-neutral-500">Adding...</span>
                </div>
              </div>
            ))}

            {/* Empty State */}
            {group.ingredients.length === 0 && localPendingIngredients.length === 0 && (
              <div className="rounded-lg border border-dashed border-neutral-300 p-6 text-center dark:border-neutral-700">
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  No ingredients in this group yet
                </p>
              </div>
            )}
          </div>

          {/* Add Ingredient Form */}
          <div className="mt-3">
            <AddIngredientForm
              onAdd={handleAddIngredient}
              suggestions={suggestions}
              isLoadingSuggestions={isLoadingSuggestions}
            />
          </div>

          {/* Baker's Percentage Summary */}
          {group.enableBakersPercent && flourTotal > 0 && (
            <BakersPercentageSummary
              flourTotal={flourTotal}
              ingredients={group.ingredients}
            />
          )}
        </div>
      )}
    </div>
  );
}
