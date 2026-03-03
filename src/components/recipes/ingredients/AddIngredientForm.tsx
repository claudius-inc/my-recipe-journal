"use client";

import { useState, useRef, KeyboardEvent } from "react";
import { Button, TextField } from "@radix-ui/themes";
import { PlusIcon, Cross2Icon } from "@radix-ui/react-icons";
import type { Ingredient } from "@/types/recipes";
import { suggestIngredientDefaults } from "@/lib/ingredient-helpers";
import { IngredientRoleLabels, INGREDIENT_ROLES, IngredientRoleColors } from "./constants";
import { cn } from "@/lib/utils";
import { IngredientAutocomplete } from "@/components/ui/IngredientAutocomplete";

interface AddIngredientFormProps {
  onAdd: (payload: {
    name: string;
    quantity: number;
    unit: string;
    role: Ingredient["role"];
    notes?: string;
  }) => void;
  suggestions: string[];
  isLoadingSuggestions: boolean;
}

export function AddIngredientForm({
  onAdd,
  suggestions,
  isLoadingSuggestions,
}: AddIngredientFormProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [draft, setDraft] = useState({
    name: "",
    quantity: "",
    unit: "",
    role: "other" as Ingredient["role"],
    notes: "",
  });
  const ingredientNameInputRef = useRef<HTMLInputElement>(null);

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

  const isFormValid =
    draft.name.trim() && draft.unit.trim() && Number(draft.quantity) > 0;

  const setQuickUnit = (unit: string) => {
    setDraft((prev) => ({ ...prev, unit }));
  };

  const handleSubmit = () => {
    if (!isFormValid) return;

    const parsed = Number(draft.quantity);
    if (!Number.isFinite(parsed) || parsed <= 0) return;

    onAdd({
      name: draft.name.trim(),
      quantity: parsed,
      unit: draft.unit.trim(),
      role: draft.role,
      notes: draft.notes?.trim() || undefined,
    });

    // Reset form but keep it expanded for rapid entry
    setDraft({ name: "", quantity: "", unit: "", role: "other", notes: "" });

    setTimeout(() => {
      ingredientNameInputRef.current?.focus();
    }, 0);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter" && isFormValid) {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === "Escape") {
      setIsExpanded(false);
    }
  };

  const handleExpand = () => {
    setIsExpanded(true);
    setTimeout(() => {
      ingredientNameInputRef.current?.focus();
    }, 100);
  };

  const handleCollapse = () => {
    setIsExpanded(false);
    setDraft({ name: "", quantity: "", unit: "", role: "other", notes: "" });
  };

  // Collapsed state - just show the add button
  if (!isExpanded) {
    return (
      <button
        type="button"
        onClick={handleExpand}
        className="mt-3 flex items-center gap-2 w-full px-3 py-2.5 rounded-lg border border-dashed border-neutral-300 text-neutral-500 hover:border-neutral-400 hover:text-neutral-700 hover:bg-neutral-50 transition-colors"
      >
        <PlusIcon className="w-4 h-4" />
        <span className="text-sm">Add ingredient</span>
      </button>
    );
  }

  // Expanded state - full form
  return (
    <div className="mt-3 border border-neutral-200 rounded-lg p-3 bg-neutral-50">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-medium uppercase tracking-wide text-neutral-500">
          Add ingredient
        </h4>
        <button
          type="button"
          onClick={handleCollapse}
          className="p-1 rounded hover:bg-neutral-200 text-neutral-400 hover:text-neutral-600"
        >
          <Cross2Icon className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-3" onKeyDown={handleKeyDown}>
        {/* Name Input */}
        <IngredientAutocomplete
          value={draft.name}
          onChange={handleNameChange}
          suggestions={suggestions}
          isLoading={isLoadingSuggestions}
          placeholder="Ingredient name"
          inputRef={ingredientNameInputRef}
        />

        {/* Quantity & Unit Row */}
        <div className="flex gap-2">
          <TextField.Root
            type="number"
            inputMode="decimal"
            value={draft.quantity}
            onChange={(event) =>
              setDraft((prev) => ({ ...prev, quantity: event.target.value }))
            }
            placeholder="Qty"
            className="w-24 shrink-0"
            size="2"
          />
          <TextField.Root
            value={draft.unit}
            onChange={(event) =>
              setDraft((prev) => ({ ...prev, unit: event.target.value }))
            }
            placeholder="Unit"
            className="w-24 shrink-0"
            size="2"
          />
          
          {/* Quick Units - show only when name entered but no unit */}
          {draft.name && !draft.unit && (
            <div className="flex items-center gap-1 overflow-x-auto">
              {["g", "ml", "pc", "tbsp", "tsp"].map((unit) => (
                <button
                  key={unit}
                  type="button"
                  onClick={() => setQuickUnit(unit)}
                  className="shrink-0 rounded border border-neutral-200 px-2 py-1 text-xs font-medium text-neutral-600 hover:bg-white"
                >
                  {unit}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Role Selection - Compact Chips */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs text-neutral-400 mr-1">Role:</span>
          {INGREDIENT_ROLES.map((role) => (
            <button
              key={role}
              type="button"
              onClick={() => setDraft((prev) => ({ ...prev, role }))}
              className={cn(
                "rounded-full px-2 py-0.5 text-xs font-medium transition-all",
                draft.role === role
                  ? IngredientRoleColors[role]
                  : "bg-white text-neutral-500 border border-neutral-200 hover:border-neutral-300",
              )}
            >
              {IngredientRoleLabels[role]}
            </button>
          ))}
        </div>

        {/* Add Button */}
        <Button
          type="button"
          onClick={handleSubmit}
          disabled={!isFormValid}
          variant="solid"
          size="2"
          className="w-full"
        >
          <PlusIcon /> Add
        </Button>
      </div>
    </div>
  );
}
