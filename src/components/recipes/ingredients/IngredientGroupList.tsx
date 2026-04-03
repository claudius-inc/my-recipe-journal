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
import { getIngredientGroups } from "@/lib/migration-utils";
import { suggestGroupNames } from "@/lib/migration-utils";

interface IngredientGroupListProps {
  version: RecipeVersion;
  recipeId: string;
  recipeCategory: RecipeCategory;
  // Group operations
  onAddGroup: (name: string, enableBakersPercent: boolean) => Promise<void>;
  onUpdateGroup: (groupId: string, data: Partial<IngredientGroupType>) => Promise<void>;
  onDeleteGroup: (groupId: string) => Promise<void>;
  onReorderGroups?: (groupIds: string[]) => Promise<void>;
  // Ingredient operations (group-aware)
  onAddIngredient: (
    groupId: string,
    data: {
      name: string;
      quantity: number | null;
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
      quantity: number | null;
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
  onReorderGroups,
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
  // Get ingredient groups (auto-migrates if needed)
  const groups = getIngredientGroups(version, recipeCategory);

  // Track collapsed state for each group
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  // Track if add group modal is open
  const [isAddingGroup, setIsAddingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupBakersPercent, setNewGroupBakersPercent] = useState(false);
  const [isSavingGroup, setIsSavingGroup] = useState(false);
  const [showGroupMenu, setShowGroupMenu] = useState(false);
  const [showRearrangeModal, setShowRearrangeModal] = useState(false);
  const [reorderList, setReorderList] = useState<IngredientGroupType[]>([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [isSavingOrder, setIsSavingOrder] = useState(false);
  const [showScalingModal, setShowScalingModal] = useState(false);

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
    <section className="bg-white overflow-visible rounded-2xl border border-neutral-200">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 flex-wrap px-4 py-3">
        <h3 className="text-sm font-medium text-neutral-900">
          Ingredients ({totalIngredients})
        </h3>
        
        {/* Actions Menu (three-dot icon) */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowGroupMenu(!showGroupMenu)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-600"
            aria-label="Ingredient options"
          >
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
              <path
                d="M3.625 7.5C3.625 8.12132 3.12132 8.625 2.5 8.625C1.87868 8.625 1.375 8.12132 1.375 7.5C1.375 6.87868 1.87868 6.375 2.5 6.375C3.12132 6.375 3.625 6.87868 3.625 7.5ZM8.625 7.5C8.625 8.12132 8.12132 8.625 7.5 8.625C6.87868 8.625 6.375 8.12132 6.375 7.5C6.375 6.87868 6.87868 6.375 7.5 6.375C8.12132 6.375 8.625 6.87868 8.625 7.5ZM13.625 7.5C13.625 8.12132 13.1213 8.625 12.5 8.625C11.8787 8.625 11.375 8.12132 11.375 7.5C11.375 6.87868 11.8787 6.375 12.5 6.375C13.1213 6.375 13.625 6.87868 13.625 7.5Z"
                fill="currentColor"
              />
            </svg>
          </button>
          
          {showGroupMenu && (
            <>
              <div className="fixed inset-0 z-20" onClick={() => setShowGroupMenu(false)} />
              <div className="absolute right-0 top-full z-30 mt-1 w-48 rounded-lg border border-neutral-200 bg-white shadow-lg py-1">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingGroup(true);
                    setShowGroupMenu(false);
                  }}
                  disabled={isSavingGroup}
                  className="w-full px-4 py-2 text-left text-sm text-neutral-700 transition hover:bg-neutral-50 disabled:opacity-50"
                >
                  Add Group
                </button>
                {groups.length > 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowRearrangeModal(true);
                      setShowGroupMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-neutral-700 transition hover:bg-neutral-50"
                  >
                    Rearrange Groups
                  </button>
                )}
                {onSelectScalingIngredient && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowScalingModal(true);
                      setShowGroupMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-neutral-700 transition hover:bg-neutral-50"
                  >
                    Scale Ingredients
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Groups */}
      <div className="overflow-visible space-y-3">
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

      {/* Scaling Modal */}
      {showScalingModal && onSelectScalingIngredient && onTargetQuantityChange && onPreviewScaling && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-neutral-900">Scale Ingredients</h3>
            <p className="mt-1 text-sm text-neutral-500">
              Scale all ingredients based on a target amount.
            </p>
            
            <div className="mt-4 space-y-4">
              <div>
                <label className="mb-1 block text-sm text-neutral-600">Scale by ingredient</label>
                <select
                  value={selectedScalingIngredient}
                  onChange={(e) => onSelectScalingIngredient(e.target.value)}
                  className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-400 focus:ring-2 focus:ring-neutral-200"
                >
                  <option value="">Select ingredient...</option>
                  {version.ingredients.map((ing) => (
                    <option key={ing.id} value={ing.id}>
                      {ing.name}
                    </option>
                  ))}
                </select>
              </div>
              
              {selectedScalingIngredient && (
                <div>
                  <label className="mb-1 block text-sm text-neutral-600">
                    Target amount ({version.ingredients.find(i => i.id === selectedScalingIngredient)?.unit})
                  </label>
                  <input
                    type="number"
                    value={targetQuantity}
                    onChange={(e) => onTargetQuantityChange(e.target.value)}
                    placeholder={`Current: ${version.ingredients.find(i => i.id === selectedScalingIngredient)?.quantity?.toFixed(1) ?? ""}`}
                    className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-400 focus:ring-2 focus:ring-neutral-200"
                  />
                </div>
              )}
            </div>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowScalingModal(false);
                }}
                className="flex-1 rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onPreviewScaling();
                  setShowScalingModal(false);
                }}
                disabled={!selectedScalingIngredient || !targetQuantity || isPreviewingScaling}
                className="flex-1 rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-700 disabled:opacity-50"
              >
                {isPreviewingScaling ? "Scaling..." : "Scale"}
              </button>
            </div>
          </div>
        </div>
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

      {/* Rearrange Groups Modal */}
      {showRearrangeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-neutral-900">
              Rearrange Groups
            </h3>
            <p className="mt-2 text-sm text-neutral-500">
              Drag groups to reorder them.
            </p>
            
            <div className="mt-4 space-y-2">
              {(reorderList.length > 0 ? reorderList : groups).map((group, index) => (
                <div
                  key={group.id}
                  draggable
                  onDragStart={() => {
                    setDraggedIndex(index);
                    if (reorderList.length === 0) setReorderList([...groups]);
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (draggedIndex === null || draggedIndex === index) return;
                    
                    const list = reorderList.length > 0 ? [...reorderList] : [...groups];
                    const draggedItem = list[draggedIndex];
                    list.splice(draggedIndex, 1);
                    list.splice(index, 0, draggedItem);
                    setReorderList(list);
                    setDraggedIndex(index);
                  }}
                  onDragEnd={() => setDraggedIndex(null)}
                  className={`flex items-center gap-3 rounded-lg border px-4 py-3 cursor-grab active:cursor-grabbing transition-colors ${
                    draggedIndex === index 
                      ? "border-blue-400 bg-blue-50" 
                      : "border-neutral-200 bg-neutral-50 hover:bg-neutral-100"
                  }`}
                >
                  <svg width="12" height="12" viewBox="0 0 15 15" fill="none" className="text-neutral-400 flex-shrink-0">
                    <path d="M5.5 4.625C6.12132 4.625 6.625 4.12132 6.625 3.5C6.625 2.87868 6.12132 2.375 5.5 2.375C4.87868 2.375 4.375 2.87868 4.375 3.5C4.375 4.12132 4.87868 4.625 5.5 4.625ZM9.5 4.625C10.1213 4.625 10.625 4.12132 10.625 3.5C10.625 2.87868 10.1213 2.375 9.5 2.375C8.87868 2.375 8.375 2.87868 8.375 3.5C8.375 4.12132 8.87868 4.625 9.5 4.625ZM6.625 7.5C6.625 8.12132 6.12132 8.625 5.5 8.625C4.87868 8.625 4.375 8.12132 4.375 7.5C4.375 6.87868 4.87868 6.375 5.5 6.375C6.12132 6.375 6.625 6.87868 6.625 7.5ZM9.5 8.625C10.1213 8.625 10.625 8.12132 10.625 7.5C10.625 6.87868 10.1213 6.375 9.5 6.375C8.87868 6.375 8.375 6.87868 8.375 7.5C8.375 8.12132 8.87868 8.625 9.5 8.625ZM6.625 11.5C6.625 12.1213 6.12132 12.625 5.5 12.625C4.87868 12.625 4.375 12.1213 4.375 11.5C4.375 10.8787 4.87868 10.375 5.5 10.375C6.12132 10.375 6.625 10.8787 6.625 11.5ZM9.5 12.625C10.1213 12.625 10.625 12.1213 10.625 11.5C10.625 10.8787 10.1213 10.375 9.5 10.375C8.87868 10.375 8.375 10.8787 8.375 11.5C8.375 12.1213 8.87868 12.625 9.5 12.625Z" fill="currentColor" />
                  </svg>
                  <span className="text-sm font-medium text-neutral-900 flex-1">{group.name}</span>
                  <span className="text-xs text-neutral-400">({group.ingredients.length})</span>
                </div>
              ))}
            </div>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowRearrangeModal(false);
                  setReorderList([]);
                  setDraggedIndex(null);
                }}
                disabled={isSavingOrder}
                className="flex-1 rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!onReorderGroups || reorderList.length === 0) {
                    setShowRearrangeModal(false);
                    return;
                  }
                  setIsSavingOrder(true);
                  try {
                    await onReorderGroups(reorderList.map(g => g.id));
                    setShowRearrangeModal(false);
                    setReorderList([]);
                  } finally {
                    setIsSavingOrder(false);
                  }
                }}
                disabled={isSavingOrder || reorderList.length === 0}
                className="flex-1 rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-700 disabled:opacity-50"
              >
                {isSavingOrder ? "Saving..." : "Save Order"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

// Exported component
export function IngredientGroupList(props: IngredientGroupListProps) {
  return <IngredientGroupListInner {...props} />;
}
