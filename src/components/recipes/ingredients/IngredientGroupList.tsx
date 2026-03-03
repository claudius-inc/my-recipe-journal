"use client";

import { useState, useCallback } from "react";
import type {
  Ingredient,
  IngredientGroup as IngredientGroupType,
  PendingIngredient,
  RecipeCategory,
  RecipeVersion,
} from "@/types/recipes";
import { IngredientGroup } from "./IngredientGroup";
import { ScalingControls } from "./ScalingControls";
import { DesignModeToggle } from "./DesignModeToggle";
import { IngredientDesignProvider, useIngredientDesign } from "./IngredientDesignContext";
import { getIngredientGroups } from "@/lib/migration-utils";
import { suggestGroupNames } from "@/lib/migration-utils";
import { cn } from "@/lib/utils";

interface IngredientGroupListProps {
  version: RecipeVersion;
  recipeId: string;
  recipeCategory: RecipeCategory;
  // Group operations
  onAddGroup: (name: string, enableBakersPercent: boolean) => Promise<void>;
  onUpdateGroup: (groupId: string, data: Partial<IngredientGroupType>) => Promise<void>;
  onDeleteGroup: (groupId: string) => Promise<void>;
  // Ingredient operations (group-aware)
  onAddIngredient: (
    groupId: string,
    data: {
      name: string;
      quantity: number;
      unit: string;
      role: Ingredient["role"];
      notes?: string;
    },
  ) => Promise<void>;
  onUpdateIngredient: (
    groupId: string,
    ingredientId: string,
    data: Partial<{
      name: string;
      quantity: number;
      unit: string;
      role: Ingredient["role"];
      notes: string | null;
    }>,
  ) => Promise<void>;
  onDeleteIngredient: (groupId: string, ingredientId: string) => Promise<void>;
  // UI state
  savingIngredient?: Record<string, boolean>;
  suggestions?: string[];
  isLoadingSuggestions?: boolean;
  checkedIngredients?: Set<string>;
  onToggleIngredientCheck?: (id: string) => void;
  onToggleAllIngredients?: () => void;
  // Scaling props (for future integration)
  isScalingOpen?: boolean;
  onToggleScaling?: () => void;
  selectedScalingIngredient?: string;
  onSelectScalingIngredient?: (id: string) => void;
  targetQuantity?: string;
  onTargetQuantityChange?: (value: string) => void;
  onPreviewScaling?: () => void;
  isPreviewingScaling?: boolean;
}

// Inner component that uses the design context
function IngredientGroupListInner({
  version,
  recipeId,
  recipeCategory,
  onAddGroup,
  onUpdateGroup,
  onDeleteGroup,
  onAddIngredient,
  onUpdateIngredient,
  onDeleteIngredient,
  savingIngredient = {},
  suggestions = [],
  isLoadingSuggestions = false,
  checkedIngredients = new Set(),
  onToggleIngredientCheck,
  onToggleAllIngredients,
  // Scaling props
  isScalingOpen = false,
  onToggleScaling,
  selectedScalingIngredient = "",
  onSelectScalingIngredient,
  targetQuantity = "",
  onTargetQuantityChange,
  onPreviewScaling,
  isPreviewingScaling = false,
}: IngredientGroupListProps) {
  const { designMode } = useIngredientDesign();
  // Get ingredient groups (auto-migrates if needed)
  const groups = getIngredientGroups(version, recipeCategory);

  // Track collapsed state for each group
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  // Track if add group modal is open
  const [isAddingGroup, setIsAddingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupBakersPercent, setNewGroupBakersPercent] = useState(false);
  const [isSavingGroup, setIsSavingGroup] = useState(false);

  const handleToggleCollapse = useCallback((groupId: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  }, []);

  const handleAddGroup = async () => {
    if (!newGroupName.trim()) return;
    setIsSavingGroup(true);
    try {
      await onAddGroup(newGroupName.trim(), newGroupBakersPercent);
      setIsAddingGroup(false);
      setNewGroupName("");
      setNewGroupBakersPercent(false);
    } finally {
      setIsSavingGroup(false);
    }
  };

  const handleToggleAllInGroup = useCallback(
    (group: IngredientGroupType) => {
      if (!onToggleIngredientCheck) return;

      const allChecked = group.ingredients.every((ing) => checkedIngredients.has(ing.id));

      group.ingredients.forEach((ing) => {
        if (allChecked && checkedIngredients.has(ing.id)) {
          onToggleIngredientCheck(ing.id);
        } else if (!allChecked && !checkedIngredients.has(ing.id)) {
          onToggleIngredientCheck(ing.id);
        }
      });
    },
    [checkedIngredients, onToggleIngredientCheck],
  );

  const totalIngredients = groups.reduce(
    (sum, group) => sum + group.ingredients.length,
    0,
  );

  const isBakingCategory =
    recipeCategory.primary === "baking" &&
    ["bread", "sourdough", "cookies", "cakes", "pastries", "pies"].includes(
      recipeCategory.secondary,
    );

  return (
    <section className={cn(
      "space-y-4",
      designMode === "card" && "rounded-2xl border border-neutral-200 bg-white p-5 overflow-visible",
      designMode === "edge" && "bg-white overflow-visible",
      designMode === "minimal" && "bg-white px-1 overflow-visible"
    )}>
      {/* Header */}
      <div className={cn(
        "flex items-center justify-between gap-2 flex-wrap",
        designMode !== "card" && "px-3 pt-3"
      )}>
        <h3 className="text-sm font-medium text-neutral-900">
          Ingredients ({totalIngredients})
        </h3>
        <div className="flex items-center gap-3">
          {/* Design Mode Toggle - hidden on mobile by default */}
          <div className="hidden sm:block">
            <DesignModeToggle />
          </div>
          <button
            type="button"
            onClick={() => setIsAddingGroup(true)}
            disabled={isSavingGroup}
            className="text-xs text-blue-600 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
          >
            + Add Group
          </button>
        </div>
      </div>
      
      {/* Mobile Design Toggle */}
      <div className="sm:hidden px-3">
        <DesignModeToggle />
      </div>

      {/* Groups */}
      <div className={cn(
        "overflow-visible",
        designMode === "card" && "space-y-3",
        designMode === "edge" && "divide-y divide-neutral-200",
        designMode === "minimal" && "space-y-1"
      )}>
        {groups.map((group) => (
          <IngredientGroup
            key={group.id}
            group={group}
            recipeId={recipeId}
            recipeCategory={recipeCategory}
            isCollapsed={collapsedGroups.has(group.id)}
            onToggleCollapse={() => handleToggleCollapse(group.id)}
            onUpdateGroup={(data) => onUpdateGroup(group.id, data)}
            onDeleteGroup={() => onDeleteGroup(group.id)}
            canDelete={groups.length > 1}
            designMode={designMode}
            onAddIngredient={(data) => onAddIngredient(group.id, data)}
            onUpdateIngredient={(ingredientId, data) =>
              onUpdateIngredient(group.id, ingredientId, data)
            }
            onDeleteIngredient={(ingredientId) =>
              onDeleteIngredient(group.id, ingredientId)
            }
            savingIngredient={savingIngredient}
            suggestions={suggestions}
            isLoadingSuggestions={isLoadingSuggestions}
            checkedIngredients={checkedIngredients}
            onToggleIngredientCheck={onToggleIngredientCheck}
            onToggleAllIngredients={() => handleToggleAllInGroup(group)}
          />
        ))}
      </div>

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

      {/* Add Group Modal */}
      {isAddingGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-neutral-900">
              Add Ingredient Group
            </h3>

            {/* Group Name */}
            <div className="mt-4 flex flex-col gap-1">
              <label className="text-xs font-medium text-neutral-500">Group Name</label>
              <input
                autoFocus
                type="text"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleAddGroup();
                  } else if (e.key === "Escape" && !isSavingGroup) {
                    setIsAddingGroup(false);
                  }
                }}
                disabled={isSavingGroup}
                placeholder="e.g., Pre-ferment, Main Dough, Topping"
                className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-400 focus:ring-2 focus:ring-neutral-200 disabled:opacity-50"
              />
            </div>

            {/* Suggestions */}
            <div className="mt-2 flex flex-wrap gap-2">
              {suggestGroupNames(recipeCategory).map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => setNewGroupName(suggestion)}
                  disabled={isSavingGroup}
                  className="rounded-full bg-neutral-100 px-3 py-1 text-xs text-neutral-700 transition hover:bg-neutral-200 disabled:opacity-50"
                >
                  {suggestion}
                </button>
              ))}
            </div>

            {/* Baker's Percentage Toggle */}
            {isBakingCategory && (
              <div className="mt-4 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="newGroupBakersPercent"
                  checked={newGroupBakersPercent}
                  onChange={(e) => setNewGroupBakersPercent(e.target.checked)}
                  className="h-4 w-4 rounded border-neutral-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
                />
                <label
                  htmlFor="newGroupBakersPercent"
                  className="text-sm text-neutral-700"
                >
                  Enable Baker&apos;s Percentages
                </label>
              </div>
            )}

            {/* Actions */}
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setIsAddingGroup(false);
                  setNewGroupName("");
                  setNewGroupBakersPercent(false);
                }}
                disabled={isSavingGroup}
                className="flex-1 rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddGroup}
                disabled={isSavingGroup || !newGroupName.trim()}
                className="flex-1 rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSavingGroup ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
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
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                    Adding...
                  </span>
                ) : (
                  "Add Group"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

// Exported component wrapped with provider
export function IngredientGroupList(props: IngredientGroupListProps) {
  return (
    <IngredientDesignProvider>
      <IngredientGroupListInner {...props} />
    </IngredientDesignProvider>
  );
}
