import { useState, useRef, KeyboardEvent } from "react";
import { Button, Spinner, TextField } from "@radix-ui/themes";
import { ChevronDownIcon } from "@radix-ui/react-icons";
import type { Ingredient } from "@/types/recipes";
import { suggestIngredientDefaults } from "@/lib/ingredient-helpers";
import { IngredientRoleLabels, INGREDIENT_ROLES } from "./constants";

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
  const [draft, setDraft] = useState({
    name: "",
    quantity: "",
    unit: "",
    role: "other" as Ingredient["role"],
    notes: "",
  });
  const [showRoleSelector, setShowRoleSelector] = useState(false);
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
    setShowRoleSelector(false);

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
    <div className="mt-4 border-t border-neutral-200 pt-4 dark:border-neutral-700">
      <h4 className="mb-3 text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
        Add ingredient
      </h4>
      <div className="grid gap-3 text-sm" onKeyDown={handleKeyDown}>
        <div className="flex flex-col gap-2">
          <div className="relative">
            <TextField.Root
              ref={ingredientNameInputRef}
              list="ingredient-suggestions"
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

          {/* Role badge/chip */}
          <div className="flex items-center gap-2">
            <Button
              type="button"
              onClick={() => setShowRoleSelector(!showRoleSelector)}
              variant="outline"
              size="1"
              radius="full"
            >
              {IngredientRoleLabels[draft.role]}
              <ChevronDownIcon className="w-3 h-3 ml-1" />
            </Button>
            {showRoleSelector && (
              <div className="flex flex-wrap gap-1">
                {INGREDIENT_ROLES.filter((r) => r !== draft.role).map((role) => (
                  <Button
                    key={role}
                    type="button"
                    onClick={() => {
                      setDraft((prev) => ({ ...prev, role }));
                      setShowRoleSelector(false);
                    }}
                    variant="soft"
                    size="1"
                    radius="full"
                  >
                    {IngredientRoleLabels[role]}
                  </Button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <TextField.Root
            type="number"
            value={draft.quantity}
            onChange={(event) =>
              setDraft((prev) => ({ ...prev, quantity: event.target.value }))
            }
            placeholder="Quantity"
            className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-400 focus:ring-2 focus:ring-neutral-200 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50 dark:focus:border-neutral-500 dark:focus:ring-neutral-700"
          />
          <TextField.Root
            value={draft.unit}
            onChange={(event) =>
              setDraft((prev) => ({ ...prev, unit: event.target.value }))
            }
            placeholder="Unit"
            className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-400 focus:ring-2 focus:ring-neutral-200 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50 dark:focus:border-neutral-500 dark:focus:ring-neutral-700"
          />
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={!isFormValid}
            variant="solid"
            size="2"
            className="w-full"
          >
            <span className="hidden sm:inline">Add</span>
            <span className="sm:hidden">+</span>
          </Button>
        </div>

        {/* Quick unit shortcuts */}
        {!draft.unit && draft.name && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-neutral-500 dark:text-neutral-400">Quick:</span>
            {["g", "ml", "pc"].map((unit) => (
              <Button
                key={unit}
                type="button"
                onClick={() => setQuickUnit(unit)}
                variant="soft"
                size="1"
              >
                {unit}
              </Button>
            ))}
          </div>
        )}
      </div>
      {isLoadingSuggestions && (
        <div className="mt-3 rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-700 dark:bg-blue-900/20 dark:text-blue-300">
          ⏳ Loading ingredient suggestions…
        </div>
      )}
      <datalist id="ingredient-suggestions">
        {suggestions.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>
    </div>
  );
}
