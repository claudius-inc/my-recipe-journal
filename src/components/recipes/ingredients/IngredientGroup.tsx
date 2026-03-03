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
import { GroupHeaderMinimal } from "./GroupHeaderMinimal";
import { getGroupFlourTotal } from "@/lib/migration-utils";
import { IngredientRoleDotColors } from "./constants";
import type { IngredientDesignMode } from "./IngredientDesignContext";

interface IngredientGroupProps {
  group: IngredientGroupType;
  recipeId: string;
  recipeCategory: RecipeCategory;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onUpdateGroup: (data: Partial<IngredientGroupType>) => Promise<void>;
  onDeleteGroup: () => void;
  canDelete: boolean;
  designMode?: IngredientDesignMode;
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
  designMode = "card",
  onAddIngredient,
  onUpdateIngredient,
  onDeleteIngredient,
  savingIngredient = {},
  suggestions = [],
  isLoadingSuggestions = false,
  checkedIngredients = new Set(),
  onToggleIngredientCheck,
  onToggleAllIngredients,
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
    setLocalPendingIngredients((prev) => [
      ...prev,
      { ...payload, tempId: `pending-${Date.now()}` },
    ]);

    try {
      await onAddIngredient(payload);
    } catch (error) {
      console.error("Failed to add ingredient:", error);
      setLocalPendingIngredients((prev) => prev.filter((p) => p.name !== payload.name));
    }
  };

  // Get dominant role color for edge mode accent
  const getDominantRoleColor = () => {
    if (group.ingredients.length === 0) return "bg-neutral-300";
    const roleCounts: Record<string, number> = {};
    group.ingredients.forEach((ing) => {
      roleCounts[ing.role] = (roleCounts[ing.role] || 0) + 1;
    });
    const dominantRole = Object.entries(roleCounts).sort((a, b) => b[1] - a[1])[0]?.[0] as Ingredient["role"] || "other";
    return IngredientRoleDotColors[dominantRole];
  };

  const ingredientList = (
    <>
      {/* Check All Button */}
      {onToggleAllIngredients && group.ingredients.length > 0 && (
        <div className="mb-2 flex justify-end">
          <button
            type="button"
            onClick={onToggleAllIngredients}
            className="text-xs text-blue-600 hover:underline"
          >
            {group.ingredients.every((ing) => checkedIngredients.has(ing.id))
              ? "Uncheck all"
              : "Check all"}
          </button>
        </div>
      )}

      {/* Ingredient List */}
      <div className={cn(designMode === "minimal" ? "space-y-1" : "space-y-2")}>
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

        {/* Pending Ingredients */}
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

        {/* Empty State */}
        {group.ingredients.length === 0 && localPendingIngredients.length === 0 && (
          <div className="rounded-lg border border-dashed border-neutral-300 p-6 text-center">
            <p className="text-sm text-neutral-500">
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
    </>
  );

  // Design Mode: Card (Default)
  if (designMode === "card") {
    return (
      <div className="overflow-visible rounded-lg border border-neutral-200 bg-white">
        <div className="sticky top-0 z-10 bg-neutral-50 rounded-t-lg">
          <GroupHeader
            group={group}
            isCollapsed={isCollapsed}
            onToggleCollapse={onToggleCollapse}
            onUpdateGroup={onUpdateGroup}
            onDeleteGroup={onDeleteGroup}
            canDelete={canDelete}
            isBakingCategory={isBakingCategory}
          />
        </div>
        {!isCollapsed && <div className="p-4">{ingredientList}</div>}
      </div>
    );
  }

  // Design Mode: Edge-to-Edge (clean, no colors)
  if (designMode === "edge") {
    return (
      <div className="overflow-visible bg-white">
        {/* Full-width header - sticky */}
        <div className="sticky top-0 z-10 bg-neutral-50 border-b border-neutral-200">
          <GroupHeader
            group={group}
            isCollapsed={isCollapsed}
            onToggleCollapse={onToggleCollapse}
            onUpdateGroup={onUpdateGroup}
            onDeleteGroup={onDeleteGroup}
            canDelete={canDelete}
            isBakingCategory={isBakingCategory}
          />
        </div>
        {!isCollapsed && (
          <div className="px-3 py-3">
            {ingredientList}
          </div>
        )}
      </div>
    );
  }

  // Design Mode: Minimal (typography hierarchy only)
  if (designMode === "minimal") {
    return (
      <div className="py-2">
        {/* Minimal header - just text */}
        <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm pb-2">
          <GroupHeaderMinimal
            group={group}
            isCollapsed={isCollapsed}
            onToggleCollapse={onToggleCollapse}
            onUpdateGroup={onUpdateGroup}
            onDeleteGroup={onDeleteGroup}
            canDelete={canDelete}
            isBakingCategory={isBakingCategory}
          />
        </div>
        {!isCollapsed && (
          <div className="mt-1">
            {ingredientList}
          </div>
        )}
      </div>
    );
  }

  return null;
}
