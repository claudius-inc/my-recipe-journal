import { Button, Select, TextField } from "@radix-ui/themes";
import type { Ingredient } from "@/types/recipes";

interface ScalingControlsProps {
  isOpen: boolean;
  onToggle: () => void;
  ingredients: Ingredient[];
  selectedIngredientId: string;
  onSelectIngredient: (id: string) => void;
  targetQuantity: string;
  onTargetQuantityChange: (value: string) => void;
  onPreview: () => void;
  isPreviewing: boolean;
}

export function ScalingControls({
  isOpen,
  onToggle,
  ingredients,
  selectedIngredientId,
  onSelectIngredient,
  targetQuantity,
  onTargetQuantityChange,
  onPreview,
  isPreviewing,
}: ScalingControlsProps) {
  const selectedIngredient = ingredients.find((ing) => ing.id === selectedIngredientId);

  return (
    <div className="mt-4">
      <Button type="button" onClick={onToggle} variant="soft" size="2" className="w-full">
        {isOpen ? "Hide scaling tools" : "Scale ingredients"}
      </Button>
      {isOpen && (
        <div className="mt-3 space-y-3 rounded-xl border border-neutral-200 bg-neutral-50 p-3 text-xs">
          <div>
            <label className="mb-1 block text-neutral-500">Scale by ingredient</label>
            <Select.Root value={selectedIngredientId} onValueChange={onSelectIngredient}>
              <Select.Trigger className="w-full" placeholder="Select ingredient..." />
              <Select.Content>
                {ingredients.map((ing) => (
                  <Select.Item key={ing.id} value={ing.id}>
                    {ing.name}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Root>
          </div>
          {selectedIngredientId && (
            <div>
              <label className="mb-1 block text-neutral-500">
                Target amount ({selectedIngredient?.unit})
              </label>
              <div className="flex gap-2">
                <TextField.Root
                  type="number"
                  value={targetQuantity}
                  onChange={(event) => onTargetQuantityChange(event.target.value)}
                  placeholder={`Current: ${
                    selectedIngredient?.quantity?.toFixed(1) ?? ""
                  }`}
                  className="flex-1 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-400 focus:ring-2 focus:ring-neutral-200"
                />
                <Button
                  type="button"
                  onClick={onPreview}
                  disabled={
                    !targetQuantity || Number(targetQuantity) <= 0 || isPreviewing
                  }
                  variant="solid"
                  size="2"
                >
                  {isPreviewing ? "..." : "Preview"}
                </Button>
              </div>
              <p className="mt-1 text-xs text-neutral-500">
                All other ingredients will be scaled proportionally
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
