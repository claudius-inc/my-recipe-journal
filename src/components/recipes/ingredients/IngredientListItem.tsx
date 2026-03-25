"use client";

import { useState, useEffect, useRef, KeyboardEvent, TouchEvent } from "react";
import { createPortal } from "react-dom";
import { Checkbox, DropdownMenu } from "@radix-ui/themes";
import { cn } from "@/lib/utils";
import type { Ingredient } from "@/types/recipes";
import { SaveIndicator } from "@/components/ui/SaveIndicator";
import { InfoCircledIcon, Pencil1Icon, TrashIcon } from "@radix-ui/react-icons";
import {
  IngredientRoleLabels,
  IngredientRoleColors,
  INGREDIENT_ROLES,
} from "./constants";

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
  const [popoverPos, setPopoverPos] = useState<{ top: number; left: number }>({
    top: 0,
    left: 0,
  });
  const infoButtonRef = useRef<HTMLButtonElement>(null);

  // Inline editing states
  const [isEditingQuantity, setIsEditingQuantity] = useState(false);
  const [isEditingPercent, setIsEditingPercent] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [inlineQuantity, setInlineQuantity] = useState(ingredient.quantity.toString());
  const [inlineUnit, setInlineUnit] = useState(ingredient.unit);
  const [inlinePercent, setInlinePercent] = useState("");
  const [inlineName, setInlineName] = useState(ingredient.name);
  const quantityInputRef = useRef<HTMLInputElement>(null);
  const percentInputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Modal states
  const [showEditModal, setShowEditModal] = useState(false);

  // Swipe state
  const [swipeX, setSwipeX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const touchStartX = useRef(0);
  const rowRef = useRef<HTMLDivElement>(null);

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
    setInlineName(ingredient.name);
  }, [ingredient]);

  // Focus input when inline editing starts
  useEffect(() => {
    if (isEditingQuantity && quantityInputRef.current) {
      quantityInputRef.current.focus();
      quantityInputRef.current.select();
    }
  }, [isEditingQuantity]);

  useEffect(() => {
    if (isEditingPercent && percentInputRef.current) {
      const currentPercent =
        flourTotal > 0 ? ((ingredient.quantity / flourTotal) * 100).toFixed(1) : "0";
      setInlinePercent(currentPercent);
      percentInputRef.current.focus();
      percentInputRef.current.select();
    }
  }, [isEditingPercent, flourTotal, ingredient.quantity]);

  useEffect(() => {
    if (isEditingName && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [isEditingName]);

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
      setInlineQuantity(ingredient.quantity.toString());
      setInlineUnit(ingredient.unit);
      setIsEditingQuantity(false);
      return;
    }

    if (parsed !== ingredient.quantity || inlineUnit !== ingredient.unit) {
      await onSave(ingredient.id, {
        quantity: parsed,
        unit: inlineUnit.trim() || ingredient.unit,
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

  // Inline percentage editing
  const handlePercentClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (enableBakersPercent && flourTotal > 0) {
      setIsEditingPercent(true);
    }
  };

  const handlePercentSave = async () => {
    const parsed = Number(inlinePercent);
    if (!Number.isFinite(parsed) || parsed <= 0 || flourTotal <= 0) {
      setIsEditingPercent(false);
      return;
    }

    const newQuantity = Math.round((parsed / 100) * flourTotal);
    if (newQuantity !== ingredient.quantity) {
      await onSave(ingredient.id, { quantity: newQuantity });
    }
    setIsEditingPercent(false);
  };

  const handlePercentKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handlePercentSave();
    } else if (e.key === "Escape") {
      e.preventDefault();
      setIsEditingPercent(false);
    }
  };

  // Inline name editing
  const handleNameClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditingName(true);
  };

  const handleNameSave = async () => {
    const trimmedName = inlineName.trim();
    if (!trimmedName) {
      setInlineName(ingredient.name);
      setIsEditingName(false);
      return;
    }

    if (trimmedName !== ingredient.name) {
      await onSave(ingredient.id, { name: trimmedName });
    }
    setIsEditingName(false);
  };

  const handleNameKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleNameSave();
    } else if (e.key === "Escape") {
      e.preventDefault();
      setInlineName(ingredient.name);
      setIsEditingName(false);
    }
  };

  // Swipe handlers
  const handleTouchStart = (e: TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    setIsSwiping(true);
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (!isSwiping) return;
    const currentX = e.touches[0].clientX;
    const diff = touchStartX.current - currentX;
    // Only allow left swipe (positive diff), max 100px
    const newSwipeX = Math.min(Math.max(diff, 0), 100);
    setSwipeX(newSwipeX);
  };

  const handleTouchEnd = () => {
    setIsSwiping(false);
    // If swiped more than 50px, keep actions visible
    if (swipeX > 50) {
      setSwipeX(100);
    } else {
      setSwipeX(0);
    }
  };

  const handleSwipeAction = (action: "edit" | "delete") => {
    setSwipeX(0);
    if (action === "edit") {
      onToggleExpand(ingredient.id);
    } else {
      setShowDeleteConfirm(true);
    }
  };

  const bakerPercentage =
    enableBakersPercent && flourTotal > 0
      ? ((ingredient.quantity / flourTotal) * 100).toFixed(1)
      : null;

  return (
    <div className="relative overflow-hidden">
      {/* Swipe action buttons (revealed on swipe) */}
      <div className="absolute right-0 top-0 bottom-0 flex">
        <button
          type="button"
          onClick={() => handleSwipeAction("edit")}
          className="flex w-12 items-center justify-center bg-blue-500 text-white"
        >
          <Pencil1Icon className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={() => handleSwipeAction("delete")}
          className="flex w-12 items-center justify-center bg-red-500 text-white"
        >
          <TrashIcon className="h-5 w-5" />
        </button>
      </div>

      {/* Main row content */}
      <div
        ref={rowRef}
        className={cn(
          "relative bg-white text-sm transition-transform",
          isChecked ? "bg-green-50" : isExpanded ? "" : "hover:bg-neutral-50",
        )}
        style={{ transform: `translateX(-${swipeX}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Main Row */}
        <div
          className={cn(
            "flex items-center gap-2 py-2 md:grid md:grid-cols-12 md:gap-3",
            !isExpanded && !isEditingQuantity && !isEditingPercent && "cursor-pointer",
          )}
          onClick={() =>
            !isExpanded &&
            !isEditingQuantity &&
            !isEditingPercent &&
            onToggleExpand(ingredient.id)
          }
          role="button"
          tabIndex={0}
          aria-expanded={isExpanded}
          aria-label={`${isExpanded ? "Collapse" : "Expand"} ${ingredient.name}`}
          onKeyDown={(e) => {
            if (
              (e.key === "Enter" || e.key === " ") &&
              !isExpanded &&
              !isEditingQuantity &&
              !isEditingPercent
            ) {
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

          {/* Ingredient Name - INLINE EDITABLE */}
          <div
            className={cn(
              "relative min-w-0 flex-1 md:col-span-4",
              isChecked && "opacity-60 line-through",
            )}
          >
            {isEditingName ? (
              <input
                ref={nameInputRef}
                type="text"
                value={inlineName}
                onChange={(e) => setInlineName(e.target.value)}
                onBlur={handleNameSave}
                onKeyDown={handleNameKeyDown}
                onClick={(e) => e.stopPropagation()}
                className="w-full rounded border border-neutral-300 px-2 py-1 text-sm font-medium focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-300"
              />
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleNameClick}
                  className="font-medium truncate text-left hover:text-neutral-600"
                >
                  {ingredient.name}
                </button>
                {ingredient.notes && (
                  <button
                    ref={infoButtonRef}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!showNotePopover && infoButtonRef.current) {
                        const rect = infoButtonRef.current.getBoundingClientRect();
                        setPopoverPos({ top: rect.bottom + 8, left: rect.left });
                      }
                      setShowNotePopover(!showNotePopover);
                    }}
                    className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded text-blue-600 transition hover:bg-blue-50"
                    aria-label="View ingredient notes"
                  >
                    <InfoCircledIcon className="w-4 h-4 text-gray-600" />
                  </button>
                )}
              </div>
            )}
            {/* Notes popover - rendered via portal to escape overflow-hidden */}
            {showNotePopover &&
              ingredient.notes &&
              createPortal(
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowNotePopover(false);
                    }}
                  />
                  <div
                    className="fixed z-50 w-64 rounded-lg border border-neutral-200 bg-white p-3 shadow-lg"
                    style={{ top: popoverPos.top, left: popoverPos.left }}
                  >
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
                </>,
                document.body,
              )}
          </div>

          {/* Amount + Unit - INLINE EDITABLE */}
          {isEditingQuantity ? (
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
                className="w-14 rounded border border-neutral-300 px-2 py-1 text-sm text-center focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-300"
              />
              <input
                type="text"
                value={inlineUnit}
                onChange={(e) => setInlineUnit(e.target.value)}
                onBlur={handleInlineSave}
                onKeyDown={handleInlineKeyDown}
                className="w-10 rounded border border-neutral-300 px-1 py-1 text-sm text-center focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-300"
              />
              {isSaving && <SaveIndicator isSaving={true} />}
            </div>
          ) : (
            <button
              type="button"
              onClick={handleInlineQuantityClick}
              className={cn(
                "flex-shrink-0 rounded px-1.5 py-0.5 text-sm text-neutral-600 transition hover:bg-neutral-100 md:col-span-3 md:text-center",
                isChecked && "opacity-60",
              )}
              title="Tap to edit"
            >
              {ingredient.quantity}
              {ingredient.unit}
            </button>
          )}

          {/* Baker's Percentage - INLINE EDITABLE */}
          {bakerPercentage &&
            (isEditingPercent ? (
              <div
                className="flex items-center gap-0.5 md:col-span-2"
                onClick={(e) => e.stopPropagation()}
              >
                <input
                  ref={percentInputRef}
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  value={inlinePercent}
                  onChange={(e) => setInlinePercent(e.target.value)}
                  onBlur={handlePercentSave}
                  onKeyDown={handlePercentKeyDown}
                  className="w-14 rounded border border-neutral-300 px-1 py-0.5 text-xs text-center font-mono focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-300"
                />
                <span className="text-xs text-neutral-400">%</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={handlePercentClick}
                className={cn(
                  "flex-shrink-0 rounded px-1 py-0.5 font-mono text-xs text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-600 md:col-span-2 md:text-center",
                  isChecked && "opacity-60",
                )}
                title="Tap to edit percentage"
              >
                {bakerPercentage}%
              </button>
            ))}

          {!bakerPercentage && enableBakersPercent && (
            <span className="hidden md:col-span-2 md:inline"></span>
          )}

          {/* Three-dot Menu */}
          <div className="md:col-span-1" onClick={(e) => e.stopPropagation()}>
            <DropdownMenu.Root>
              <DropdownMenu.Trigger>
                <button
                  type="button"
                  className="flex h-8 w-6 flex-shrink-0 items-center justify-center rounded text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-600"
                  aria-label="Ingredient options"
                >
                  <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                    <path
                      d="M3.625 7.5C3.625 8.12132 3.12132 8.625 2.5 8.625C1.87868 8.625 1.375 8.12132 1.375 7.5C1.375 6.87868 1.87868 6.375 2.5 6.375C3.12132 6.375 3.625 6.87868 3.625 7.5ZM8.625 7.5C8.625 8.12132 8.12132 8.625 7.5 8.625C6.87868 8.625 6.375 8.12132 6.375 7.5C6.375 6.87868 6.87868 6.375 7.5 6.375C8.12132 6.375 8.625 6.87868 8.625 7.5ZM13.625 7.5C13.625 8.12132 13.1213 8.625 12.5 8.625C11.8787 8.625 11.375 8.12132 11.375 7.5C11.375 6.87868 11.8787 6.375 12.5 6.375C13.1213 6.375 13.625 6.87868 13.625 7.5Z"
                      fill="currentColor"
                    />
                  </svg>
                </button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Content align="end">
                <DropdownMenu.Item onSelect={() => setShowEditModal(true)}>
                  Edit
                </DropdownMenu.Item>
                <DropdownMenu.Item
                  color="red"
                  onSelect={() => setShowDeleteConfirm(true)}
                >
                  Delete
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Root>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-lg max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-neutral-900">Edit Ingredient</h3>

            <div className="mt-4 space-y-4">
              {/* Name Input */}
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-neutral-600">Name</label>
                <input
                  autoFocus
                  list={`ingredient-suggestions-${ingredient.id}`}
                  value={editState.name}
                  onChange={(e) =>
                    setEditState((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="Ingredient name"
                  className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-400 focus:ring-2 focus:ring-neutral-200"
                />
                {suggestions.length > 0 && (
                  <datalist id={`ingredient-suggestions-${ingredient.id}`}>
                    {suggestions.map((name) => (
                      <option key={name} value={name} />
                    ))}
                  </datalist>
                )}
              </div>

              {/* Quantity + Unit Row */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-neutral-600">Quantity</label>
                  <input
                    type="number"
                    value={editState.quantity}
                    onChange={(e) =>
                      setEditState((prev) => ({ ...prev, quantity: e.target.value }))
                    }
                    placeholder="Amount"
                    className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-400 focus:ring-2 focus:ring-neutral-200"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-neutral-600">Unit</label>
                  <input
                    value={editState.unit}
                    onChange={(e) =>
                      setEditState((prev) => ({ ...prev, unit: e.target.value }))
                    }
                    placeholder="Unit"
                    className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-400 focus:ring-2 focus:ring-neutral-200"
                  />
                </div>
              </div>

              {/* Role Selector - Chips */}
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-neutral-600">Category</label>
                <div className="flex flex-wrap gap-1.5">
                  {INGREDIENT_ROLES.map((role) => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => setEditState((prev) => ({ ...prev, role }))}
                      className={cn(
                        "rounded-full px-2.5 py-1 text-xs font-medium transition-all",
                        editState.role === role
                          ? "bg-neutral-900 text-white"
                          : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200",
                      )}
                    >
                      {IngredientRoleLabels[role]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-neutral-600">Notes</label>
                <textarea
                  value={editState.notes}
                  onChange={(e) =>
                    setEditState((prev) => ({ ...prev, notes: e.target.value }))
                  }
                  placeholder="Optional notes"
                  rows={2}
                  className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-400 focus:ring-2 focus:ring-neutral-200"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => {
                  handleCancel();
                  setShowEditModal(false);
                }}
                disabled={isSaving}
                className="flex-1 rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  await handleSave();
                  setShowEditModal(false);
                }}
                disabled={isSaving}
                className="flex-1 rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-700 disabled:opacity-50"
              >
                {isSaving ? "Saving..." : "Save"}
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
