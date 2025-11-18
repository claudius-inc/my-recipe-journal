import type { RecipeVersion } from "@/types/recipes";
import { cn } from "@/lib/utils";
import { Button, Checkbox, Select, TextField } from "@radix-ui/themes";
import { InteractivePercentageEditor } from "./InteractivePercentageEditor";
import { formatPercent } from "@/lib/formatting";

export interface BakerPercentageToolsProps {
  version: RecipeVersion;
  flourTotal: number;
  totalWeight: number;
  hydration: number;
  isScalingOpen: boolean;
  setIsScalingOpen: (open: boolean) => void;
  selectedScalingIngredient: string;
  setSelectedScalingIngredient: (value: string) => void;
  targetQuantity: string;
  setTargetQuantity: (value: string) => void;
  onPreviewScaling: () => void;
  onUpdateIngredientQuantity: (
    ingredientId: string,
    newQuantity: number,
  ) => Promise<void>;
  checkedIngredients: Set<string>;
  onToggleIngredientCheck: (ingredientId: string) => void;
  onToggleAllIngredients: () => void;
}

export function BakerPercentageTools({
  version,
  flourTotal,
  totalWeight,
  hydration,
  isScalingOpen,
  setIsScalingOpen,
  selectedScalingIngredient,
  setSelectedScalingIngredient,
  targetQuantity,
  setTargetQuantity,
  onPreviewScaling,
  onUpdateIngredientQuantity,
  checkedIngredients,
  onToggleIngredientCheck,
  onToggleAllIngredients,
}: BakerPercentageToolsProps) {
  const selectedIngredient = version.ingredients.find(
    (ing) => ing.id === selectedScalingIngredient,
  );
  const allChecked = version.ingredients.every((ing) => checkedIngredients.has(ing.id));
  const checkedCount = version.ingredients.filter((ing) =>
    checkedIngredients.has(ing.id),
  ).length;

  return (
    <section className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-6">
        <div className="space-y-2 lg:flex-1 lg:max-w-xl">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
              Baker&apos;s percentages
            </h3>
            <div
              onClick={onToggleAllIngredients}
              className="inline-flex items-center gap-2 rounded-lg px-2 py-1 text-xs font-medium text-neutral-600 transition hover:bg-neutral-100 cursor-pointer dark:text-neutral-400 dark:hover:bg-neutral-800"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onToggleAllIngredients();
                }
              }}
              aria-label={
                allChecked ? "Uncheck all ingredients" : "Check all ingredients"
              }
            >
              <Checkbox
                checked={allChecked}
                onCheckedChange={(checked) => {
                  if (checked !== "indeterminate") {
                    onToggleAllIngredients();
                  }
                }}
              />
              <span>
                {allChecked ? "Uncheck all" : "Check all"}{" "}
                {checkedCount > 0 && `(${checkedCount}/${version.ingredients.length})`}
              </span>
            </div>
          </div>
          <ul className="space-y-1 text-sm text-neutral-600 dark:text-neutral-300">
            {version.ingredients.map((ingredient) => {
              const isChecked = checkedIngredients.has(ingredient.id);
              return (
                <li
                  key={ingredient.id}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-2 py-1.5 transition",
                    isChecked
                      ? "bg-green-50 dark:bg-green-900/20"
                      : "hover:bg-neutral-50 dark:hover:bg-neutral-800/50",
                  )}
                >
                  <Checkbox
                    checked={isChecked}
                    onCheckedChange={(checked) => {
                      if (checked !== "indeterminate") {
                        onToggleIngredientCheck(ingredient.id);
                      }
                    }}
                    className="flex-shrink-0"
                    aria-label={`Mark ${ingredient.name} as ${isChecked ? "not added" : "added"}`}
                  />
                  <span
                    className={cn(
                      "flex-1 min-w-0",
                      isChecked && "line-through opacity-60",
                    )}
                  >
                    {ingredient.name}
                  </span>
                  <span
                    className={cn(
                      "text-sm whitespace-nowrap",
                      isChecked
                        ? "text-neutral-400 dark:text-neutral-500"
                        : "text-neutral-500 dark:text-neutral-400",
                    )}
                  >
                    {ingredient.quantity} {ingredient.unit}
                  </span>
                  {flourTotal > 0 ? (
                    <InteractivePercentageEditor
                      ingredient={ingredient}
                      flourTotal={flourTotal}
                      onSave={(newQuantity: number) =>
                        onUpdateIngredientQuantity(ingredient.id, newQuantity)
                      }
                    />
                  ) : (
                    <span className="font-mono">–</span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
        <div className="space-y-3 rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-sm lg:w-72 lg:flex-shrink-0 dark:border-neutral-700 dark:bg-neutral-900/60">
          <p className="flex items-center justify-between">
            <span className="text-neutral-500 dark:text-neutral-400">Total flour</span>
            <span className="font-semibold text-neutral-800 dark:text-neutral-100">
              {flourTotal.toFixed(1)} g
            </span>
          </p>
          <p className="flex items-center justify-between">
            <span className="text-neutral-500 dark:text-neutral-400">
              Total dough weight
            </span>
            <span className="font-semibold text-neutral-800 dark:text-neutral-100">
              {totalWeight.toFixed(1)} g
            </span>
          </p>
          <p className="flex items-center justify-between">
            <span className="text-neutral-500 dark:text-neutral-400">Hydration</span>
            <span className="font-semibold text-neutral-800 dark:text-neutral-100">
              {formatPercent(hydration)}
            </span>
          </p>
          <Button
            onClick={() => setIsScalingOpen(!isScalingOpen)}
            variant="soft"
            className="w-full"
          >
            {isScalingOpen ? "Hide scaling tools" : "Scale this formula"}
          </Button>
          {isScalingOpen && (
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-neutral-500 dark:text-neutral-400 mb-1">
                  Scale by ingredient
                </label>
                <Select.Root
                  value={selectedScalingIngredient}
                  onValueChange={(value) => setSelectedScalingIngredient(value)}
                >
                  <Select.Trigger className="w-full" placeholder="Select ingredient..." />
                  <Select.Content>
                    {version.ingredients.map((ing) => (
                      <Select.Item key={ing.id} value={ing.id}>
                        {ing.name}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select.Root>
              </div>
              {selectedIngredient && (
                <div>
                  <label className="block text-neutral-500 dark:text-neutral-400 mb-1">
                    Target amount ({selectedIngredient.unit})
                  </label>
                  <div className="flex gap-2">
                    <TextField.Root
                      type="number"
                      value={targetQuantity}
                      onChange={(event) => setTargetQuantity(event.target.value)}
                      placeholder={`Current: ${selectedIngredient.quantity.toFixed(1)}`}
                      className="flex-1 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-400 focus:ring-2 focus:ring-neutral-200 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-50 dark:focus:border-neutral-500 dark:focus:ring-neutral-700"
                    />
                    <Button
                      onClick={onPreviewScaling}
                      disabled={!targetQuantity || Number(targetQuantity) <= 0}
                      variant="solid"
                    >
                      Preview
                    </Button>
                  </div>
                  <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                    All other ingredients will be scaled proportionally
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
