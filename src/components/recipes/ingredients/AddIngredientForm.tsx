import { useState, useRef, KeyboardEvent, useId } from "react";
import { Button, Spinner, TextField } from "@radix-ui/themes";
import { PlusIcon } from "@radix-ui/react-icons";
import type { Ingredient } from "@/types/recipes";
import { suggestIngredientDefaults } from "@/lib/ingredient-helpers";
import { IngredientRoleLabels, INGREDIENT_ROLES } from "./constants";
import { cn } from "@/lib/utils";

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
  const datalistId = useId();
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

    setDraft({ name: "", quantity: "", unit: "", role: "other", notes: "" });

    // Keep focus on name input for rapid entry
    setTimeout(() => {
      ingredientNameInputRef.current?.focus();
    }, 0);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter" && isFormValid) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="mt-6 border-t border-neutral-200 pt-6 dark:border-neutral-800">
      <div className="mb-3 flex items-center justify-between">
        <h4 className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          Add ingredient
        </h4>
      </div>

      <div className="space-y-4" onKeyDown={handleKeyDown}>
        {/* Desktop: Horizontal Layout / Mobile: Stacked */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
          {/* Name Input */}
          <div className="relative flex-1">
            <input
              ref={ingredientNameInputRef}
              list={datalistId}
              value={draft.name}
              onChange={(event) => handleNameChange(event.target.value)}
              placeholder="Ingredient name"
              disabled={isLoadingSuggestions}
              className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-400 focus:ring-2 focus:ring-neutral-200 disabled:cursor-not-allowed disabled:opacity-60 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50 dark:focus:border-neutral-500 dark:focus:ring-neutral-700"
            />
            {isLoadingSuggestions && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <Spinner size="1" />
              </div>
            )}
          </div>

          {/* Quantity & Unit Row */}
          <div className="flex gap-2 sm:w-auto">
            <TextField.Root
              type="number"
              inputMode="decimal"
              value={draft.quantity}
              onChange={(event) =>
                setDraft((prev) => ({ ...prev, quantity: event.target.value }))
              }
              placeholder="Qty"
              className="w-20 shrink-0 sm:w-24"
              size="2"
            />
            <TextField.Root
              value={draft.unit}
              onChange={(event) =>
                setDraft((prev) => ({ ...prev, unit: event.target.value }))
              }
              placeholder="Unit"
              className="w-20 shrink-0 sm:w-24"
              size="2"
            />
          </div>

          {/* Add Button (Desktop) */}
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={!isFormValid}
            variant="solid"
            size="2"
            className="hidden sm:flex"
          >
            Add
          </Button>
        </div>

        {/* Role Selection - Horizontal Scrollable Chips */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
            <span className="text-xs text-neutral-500 dark:text-neutral-400 shrink-0">
              Role:
            </span>
            {INGREDIENT_ROLES.map((role) => (
              <button
                key={role}
                type="button"
                onClick={() => setDraft((prev) => ({ ...prev, role }))}
                className={cn(
                  "flex shrink-0 items-center rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
                  draft.role === role
                    ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
                    : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700",
                )}
              >
                {IngredientRoleLabels[role]}
              </button>
            ))}
          </div>
        </div>

        {/* Quick Units & Mobile Add Button */}
        <div className="flex items-center justify-between gap-3 sm:justify-start">
          {/* Quick Units */}
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
            {!draft.unit && draft.name && (
              <>
                <span className="text-xs text-neutral-400 shrink-0">Quick units:</span>
                {["g", "ml", "cup", "tbsp", "tsp", "pc"].map((unit) => (
                  <button
                    key={unit}
                    type="button"
                    onClick={() => setQuickUnit(unit)}
                    className="shrink-0 rounded-md border border-neutral-200 px-2 py-1 text-xs font-medium text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800"
                  >
                    {unit}
                  </button>
                ))}
              </>
            )}
          </div>

          {/* Add Button (Mobile) */}
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={!isFormValid}
            variant="solid"
            size="3"
            className="w-full sm:hidden"
          >
            <PlusIcon /> Add Ingredient
          </Button>
        </div>
      </div>

      <datalist id={datalistId}>
        {suggestions.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>
    </div>
  );
}
