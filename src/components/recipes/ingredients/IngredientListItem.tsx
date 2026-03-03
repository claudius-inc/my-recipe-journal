"use client";

import { useState, useEffect, useRef, KeyboardEvent } from "react";
import { Checkbox, TextField } from "@radix-ui/themes";
import { cn } from "@/lib/utils";
import type { Ingredient } from "@/types/recipes";
import { SaveIndicator } from "@/components/ui/SaveIndicator";
import { InteractivePercentageEditor } from "./InteractivePercentageEditor";
import { ChevronDownIcon, InfoCircledIcon } from "@radix-ui/react-icons";
import { IngredientRoleLabels, IngredientRoleColors, INGREDIENT_ROLES } from "./constants";

interface IngredientListItemProps {
  ingredient: Ingredient;
  isChecked: boolean;
  isExpanded: boolean;
  onToggleCheck: (id: string) => void;
  onToggleExpand: (id: string) => void;
  onSave: (
    id: string,
    data: Partial<{
      name: string;
      quantity: number;
      unit: string;
      role: Ingredient["role"];
      notes: string | null;
    }>,
  ) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  enableBakersPercent?: boolean;
  flourTotal?: number;
  isSaving?: boolean;
  suggestions?: string[];
}

export function IngredientListItem({
  ingredient,
  isChecked,
  isExpanded,
  onToggleCheck,
  onToggleExpand,
  onSave,
  onDelete,
  enableBakersPercent = false,
  flourTotal = 0,
  isSaving = false,
  suggestions = [],
}: IngredientListItemProps) {
  const [editState, setEditState] = useState({
    name: ingredient.name,
    quantity: ingredient.quantity.toString(),
    unit: ingredient.unit,
    role: ingredient.role,
    notes: ingredient.notes ?? "",
  });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showNotePopover, setShowNotePopover] = useState(false);
  
  // Inline editing states
  const [isEditingQuantity, setIsEditingQuantity] = useState(false);
  const [inlineQuantity, setInlineQuantity] = useState(ingredient.quantity.toString());
  const [inlineUnit, setInlineUnit] = useState(ingredient.unit);
  const quantityInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setEditState({
      name: ingredient.name,
      quantity: ingredient.quantity.toString(),
      unit: ingredient.unit,
      role: ingredient.role,
      notes: ingredient.notes ?? "",
    });
    setInlineQuantity(ingredient.quantity.toString());
    setInlineUnit(ingredient.unit);
  }, [ingredient]);

  // Focus input when inline editing starts
  useEffect(() => {
    if (isEditingQuantity && quantityInputRef.current) {
      quantityInputRef.current.focus();
      quantityInputRef.current.select();
    }
  }, [isEditingQuantity]);

  const handleSave = async () => {
    const parsed = Number(editState.quantity);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return;
    }
    if (!editState.name.trim() || !editState.unit.trim()) {
      return;
    }

    const payload = {
      name: editState.name.trim(),
      quantity: parsed,
      unit: editState.unit.trim(),
      role: editState.role,
      notes: editState.notes.trim() ? editState.notes.trim() : null,
    };

    await onSave(ingredient.id, payload);
    onToggleExpand(ingredient.id);
  };

  const handleCancel = () => {
    setEditState({
      name: ingredient.name,
      quantity: ingredient.quantity.toString(),
      unit: ingredient.unit,
      role: ingredient.role,
      notes: ingredient.notes ?? "",
    });
    onToggleExpand(ingredient.id);
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete(ingredient.id);
      setShowDeleteConfirm(false);
    } finally {
      setIsDeleting(false);
    }
  };

  // Inline quantity editing handlers
  const handleInlineQuantityClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditingQuantity(true);
  };

  const handleInlineSave = async () => {
    const parsed = Number(inlineQuantity);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      // Reset to original
      setInlineQuantity(ingredient.quantity.toString());
      setInlineUnit(ingredient.unit);
      setIsEditingQuantity(false);
      return;
    }

    if (parsed !== ingredient.quantity || inlineUnit !== ingredient.unit) {
      await onSave(ingredient.id, { 
        quantity: parsed, 
        unit: inlineUnit.trim() || ingredient.unit 
      });
    }
    setIsEditingQuantity(false);
  };

  const handleInlineCancel = () => {
    setInlineQuantity(ingredient.quantity.toString());
    setInlineUnit(ingredient.unit);
    setIsEditingQuantity(false);
  };

  const handleInlineKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleInlineSave();
    } else if (e.key === "Escape") {
      e.preventDefault();
      handleInlineCancel();
    }
  };

  const bakerPercentage =
    enableBakersPercent && flourTotal > 0
      ? ((ingredient.quantity / flourTotal) * 100).toFixed(1)
      : null;

  return (
    <div
      className={cn(
        "rounded-md bg-white text-sm transition-all",
        isChecked
          ? "bg-green-50"
          : isExpanded
            ? ""
            : "border-transparent hover:border-neutral-300 hover:bg-neutral-50",
      )}
    >
      {/* Main Row */}
      <div
        className={cn(
          "flex items-center gap-2 md:grid md:grid-cols-11 md:gap-3",
          !isExpanded && !isEditingQuantity && "cursor-pointer",
        )}
        onClick={() => !isExpanded && !isEditingQuantity && onToggleExpand(ingredient.id)}
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
        aria-label={`${isExpanded ? "Collapse" : "Expand"} ${ingredient.name}`}
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === " ") && !isExpanded && !isEditingQuantity) {
            e.preventDefault();
            onToggleExpand(ingredient.id);
          }
        }}
      >
        {/* Checkbox */}
        <div
          onClick={(e) => e.stopPropagation()}
          className="flex h-8 w-5 flex-shrink-0 items-center justify-center rounded transition hover:bg-neutral-100 md:col-span-1"
        >
          <Checkbox
            checked={isChecked}
            onCheckedChange={(checked) => {
              if (checked !== "indeterminate") {
                onToggleCheck(ingredient.id);
              }
            }}
            aria-label={`Mark ${ingredient.name} as ${isChecked ? "not used" : "used"}`}
          />
        </div>

        {/* Ingredient Name with Notes Popover */}
        <div
          className={cn(
            "relative min-w-0 flex-1 md:col-span-3",
            isChecked && "opacity-60 line-through",
          )}
        >
          <div className="flex items-center gap-1">
            <span className="font-medium">{ingredient.name}</span>
            {ingredient.notes && (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowNotePopover(!showNotePopover);
                  }}
                  className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded text-blue-600 transition hover:bg-blue-50"
                  aria-label="View ingredient notes"
                >
                  <InfoCircledIcon className="w-4 h-4 text-gray-600" />
                </button>
                {showNotePopover && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowNotePopover(false);
                      }}
                    />
                    <div className="absolute left-0 top-full z-20 mt-2 w-64 rounded-lg border border-neutral-200 bg-white p-3 shadow-lg">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                          Notes
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowNotePopover(false);
                            onToggleExpand(ingredient.id);
                          }}
                          className="text-xs text-blue-600 hover:underline"
                        >
                          Edit
                        </button>
                      </div>
                      <p className="text-xs text-neutral-700">{ingredient.notes}</p>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>

        {/* Amount + Unit - INLINE EDITABLE */}
        {isEditingQuantity ? (
          // Inline edit mode
          <div 
            className="flex items-center gap-1 md:col-span-3"
            onClick={(e) => e.stopPropagation()}
          >
            <input
              ref={quantityInputRef}
              type="number"
              inputMode="decimal"
              value={inlineQuantity}
              onChange={(e) => setInlineQuantity(e.target.value)}
              onBlur={handleInlineSave}
              onKeyDown={handleInlineKeyDown}
              className="w-16 rounded border border-neutral-300 px-2 py-1 text-sm text-center focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-300"
            />
            <input
              type="text"
              value={inlineUnit}
              onChange={(e) => setInlineUnit(e.target.value)}
              onBlur={handleInlineSave}
              onKeyDown={handleInlineKeyDown}
              className="w-12 rounded border border-neutral-300 px-2 py-1 text-sm text-center focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-300"
            />
            {isSaving && <SaveIndicator isSaving={true} />}
          </div>
        ) : (
          // Display mode - tap to edit
          <>
            {/* Mobile: Combined display */}
            <button
              type="button"
              onClick={handleInlineQuantityClick}
              className={cn(
                "flex-shrink-0 rounded px-2 py-0.5 text-sm text-neutral-600 transition hover:bg-neutral-100 md:hidden",
                isChecked && "opacity-60",
              )}
              title="Tap to edit"
            >
              {ingredient.quantity}{ingredient.unit}
            </button>
            
            {/* Desktop: Separate columns */}
            <button
              type="button"
              onClick={handleInlineQuantityClick}
              className={cn(
                "hidden rounded px-2 py-0.5 text-sm text-neutral-500 transition hover:bg-neutral-100 md:col-span-2 md:inline md:text-center",
                isChecked && "opacity-60",
              )}
              title="Click to edit"
            >
              {ingredient.quantity}
            </button>
            <button
              type="button"
              onClick={handleInlineQuantityClick}
              className={cn(
                "hidden rounded px-1 py-0.5 text-sm text-neutral-500 transition hover:bg-neutral-100 md:col-span-1 md:inline md:text-center",
                isChecked && "opacity-60",
              )}
              title="Click to edit"
            >
              {ingredient.unit}
            </button>
          </>
        )}

        {/* Role badge (mobile + desktop) */}
        <span
          className={cn(
            "hidden text-xs md:col-span-2 md:inline md:text-center",
            isChecked && "opacity-60",
          )}
        >
          <span className={cn("rounded-full px-2 py-0.5", IngredientRoleColors[ingredient.role])}>
            {IngredientRoleLabels[ingredient.role]}
          </span>
        </span>

        {/* Baker's Percentage */}
        {bakerPercentage && (
          <span
            className={cn(
              "flex-shrink-0 font-mono text-xs text-neutral-400 md:col-span-1 md:text-center",
              isChecked && "opacity-60",
            )}
          >
            {bakerPercentage}%
          </span>
        )}

        {!bakerPercentage && enableBakersPercent && (
          <span className="hidden md:col-span-1 md:inline"></span>
        )}

        {/* Expand Arrow */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleExpand(ingredient.id);
          }}
          className={cn(
            "flex h-8 w-6 flex-shrink-0 items-center justify-center rounded text-neutral-400 transition-transform duration-300 hover:bg-neutral-100 md:col-span-1",
            isExpanded && "rotate-180",
          )}
          aria-label={isExpanded ? "Collapse" : "Expand"}
        >
          <ChevronDownIcon className="w-4 h-4" />
        </button>
      </div>

      {/* Expanded Edit Section */}
      {isExpanded && (
        <div className="animate-slideDown border-t border-neutral-200 px-4 pb-4 pt-3">
          <div className="space-y-3">
            {/* Name Input */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-neutral-500">
                Ingredient Name
              </label>
              <div className="flex items-center gap-2">
                <input
                  autoFocus
                  list={`ingredient-suggestions-${ingredient.id}`}
                  value={editState.name}
                  onChange={(e) =>
                    setEditState((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="Ingredient name"
                  className="flex-1 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-400 focus:ring-2 focus:ring-neutral-200"
                />
                <SaveIndicator isSaving={isSaving} />
              </div>
              {suggestions.length > 0 && (
                <datalist id={`ingredient-suggestions-${ingredient.id}`}>
                  {suggestions.map((name) => (
                    <option key={name} value={name} />
                  ))}
                </datalist>
              )}
            </div>

            {/* Quantity + Unit Row */}
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-neutral-500">Quantity</label>
                <TextField.Root
                  type="number"
                  value={editState.quantity}
                  onChange={(e) =>
                    setEditState((prev) => ({ ...prev, quantity: e.target.value }))
                  }
                  placeholder="Amount"
                  className="w-full"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-neutral-500">Unit</label>
                <TextField.Root
                  value={editState.unit}
                  onChange={(e) =>
                    setEditState((prev) => ({ ...prev, unit: e.target.value }))
                  }
                  placeholder="Unit"
                  className="w-full"
                />
              </div>
            </div>

            {/* Role Selector - Chips */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-neutral-500">Role</label>
              <div className="flex flex-wrap gap-1.5">
                {INGREDIENT_ROLES.map((role) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => setEditState((prev) => ({ ...prev, role }))}
                    className={cn(
                      "rounded-full px-2.5 py-1 text-xs font-medium transition-all",
                      editState.role === role
                        ? IngredientRoleColors[role]
                        : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200",
                    )}
                  >
                    {IngredientRoleLabels[role]}
                  </button>
                ))}
              </div>
            </div>

            {/* Interactive Percentage Editor */}
            {enableBakersPercent && flourTotal > 0 && (
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-neutral-500">
                  Baker&apos;s Percentage
                </label>
                <div className="flex items-center gap-2">
                  <InteractivePercentageEditor
                    ingredient={ingredient}
                    flourTotal={flourTotal}
                    onSave={async (newQuantity) => {
                      setEditState((prev) => ({
                        ...prev,
                        quantity: newQuantity.toString(),
                      }));
                      await onSave(ingredient.id, { quantity: newQuantity });
                    }}
                    isSaving={isSaving}
                  />
                  <span className="text-xs text-neutral-500">
                    (Click percentage to edit)
                  </span>
                </div>
              </div>
            )}

            {/* Notes */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-neutral-500">
                Notes (optional)
              </label>
              <textarea
                value={editState.notes}
                onChange={(e) =>
                  setEditState((prev) => ({ ...prev, notes: e.target.value }))
                }
                placeholder="Optional notes"
                rows={2}
                className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-400 focus:ring-2 focus:ring-neutral-200"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="flex-1 rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSaving ? "Saving..." : "Save"}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                disabled={isSaving}
                className="flex-1 rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={isSaving}
                className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-neutral-900">Delete ingredient?</h3>
            <p className="mt-2 text-sm text-neutral-600">
              Are you sure you want to delete <strong>{ingredient.name}</strong>? This
              action cannot be undone.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="flex-1 rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
