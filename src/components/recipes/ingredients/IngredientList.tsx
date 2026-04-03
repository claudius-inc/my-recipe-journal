"use client";

import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/context/ToastContext";
import type {
  Ingredient,
  PendingIngredient,
  RecipeCategory,
  RecipeVersion,
} from "@/types/recipes";
import { IngredientListItem } from "./IngredientListItem";
import { AddIngredientForm } from "./AddIngredientForm";
import { BakersPercentageSummary } from "./BakersPercentageSummary";
import { ScalingControls } from "./ScalingControls";

interface IngredientListProps {
  version: RecipeVersion;
  recipeId: string;
  recipeCategory: RecipeCategory;
  onUpdateIngredient: (
    id: string,
    data: Partial<{
      name: string;
      quantity: number | null;
      unit: string;
      role: Ingredient["role"];
      notes: string | null;
    }>,
  ) => Promise<void>;
  onDeleteIngredient: (id: string) => Promise<void>;
  onAddIngredient: (data: {
    name: string;
    quantity: number | null;
    unit: string;
    role: Ingredient["role"];
    notes?: string;
  }) => Promise<void>;
  enableBakersPercent?: boolean;
  flourTotal?: number;
  savingIngredient?: Record<string, boolean>;
  suggestions?: string[];
  isLoadingSuggestions?: boolean;
  checkedIngredients?: Set<string>;
  onToggleIngredientCheck?: (id: string) => void;
  onToggleAllIngredients?: () => void;
  // Scaling props
  isScalingOpen?: boolean;
  onToggleScaling?: () => void;
  selectedScalingIngredient?: string;
  onSelectScalingIngredient?: (id: string) => void;
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
  const [localPendingIngredients, setLocalPendingIngredients] = useState<
    PendingIngredient[]
  >([]);

  const handleToggleExpand = useCallback((id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  }, []);

  const handleToggleCheck = useCallback(
    (id: string) => {
      onToggleIngredientCheck?.(id);
    },
    [onToggleIngredientCheck],
  );

  // Clear pending ingredients when real ingredients update (optimistic UI success)
  useEffect(() => {
    if (localPendingIngredients.length > 0) {
      setLocalPendingIngredients([]);
    }
  }, [version.ingredients.length]); // eslint-disable-line react-hooks/exhaustive-deps

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
      addToast("Failed to add ingredient", "error");
      // Remove from pending on error
      setLocalPendingIngredients((prev) => prev.filter((p) => p.name !== payload.name));
    }
  };

  return (
    <section className="space-y-1 rounded-2xl border border-neutral-200 bg-white p-5">
      {/* Header Row */}
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-medium text-neutral-900">
          Ingredients ({version.ingredients.length})
        </h3>
        {onToggleAllIngredients && version.ingredients.length > 0 && (
          <button
            type="button"
            onClick={onToggleAllIngredients}
            className="text-xs text-blue-600 hover:underline"
          >
            {checkedIngredients.size === version.ingredients.length
              ? "Uncheck all"
              : "Check all"}
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
            isSaving={savingIngredient[ingredient.id]}
            suggestions={suggestions}
          />
        ))}

        {/* Pending Ingredients (Optimistic UI) */}
        {localPendingIngredients.map((pending) => (
          <div
            key={pending.tempId}
            className="animate-pulse rounded-md border border-neutral-200 bg-neutral-50 p-3 opacity-70"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{pending.name}</span>
              <span className="text-sm text-neutral-500">Adding...</span>
            </div>
          </div>
        ))}

        {version.ingredients.length === 0 && localPendingIngredients.length === 0 && (
          <div className="rounded-lg border border-dashed border-neutral-300 p-8 text-center">
            <p className="text-sm text-neutral-500">
              No ingredients yet. Add some below!
            </p>
          </div>
        )}
      </div>

      {/* Add Ingredient Form */}
      <AddIngredientForm
        onAdd={handleAddIngredient}
        suggestions={suggestions}
        isLoadingSuggestions={isLoadingSuggestions}
      />

      {/* Baker's Percentage Summary */}
      {enableBakersPercent && (
        <BakersPercentageSummary
          flourTotal={flourTotal}
          ingredients={version.ingredients}
        />
      )}

      {/* Scaling Controls */}
      {onToggleScaling &&
        onSelectScalingIngredient &&
        onTargetQuantityChange &&
        onPreviewScaling && (
          <ScalingControls
            isOpen={isScalingOpen}
            onToggle={onToggleScaling}
            ingredients={version.ingredients}
            selectedIngredientId={selectedScalingIngredient}
            onSelectIngredient={onSelectScalingIngredient}
            targetQuantity={targetQuantity}
            onTargetQuantityChange={onTargetQuantityChange}
            onPreview={onPreviewScaling}
            isPreviewing={isPreviewingScaling}
          />
        )}
    </section>
  );
}
