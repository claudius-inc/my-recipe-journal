import type { Ingredient } from "@/types/recipes";

interface BakersPercentageSummaryProps {
  flourTotal: number;
  ingredients: Ingredient[];
}

export function BakersPercentageSummary({
  flourTotal,
  ingredients,
}: BakersPercentageSummaryProps) {
  const totalWeight = ingredients.reduce(
    (sum, ingredient) => sum + (ingredient.quantity ?? 0),
    0,
  );

  const liquidTotal = ingredients
    .filter((ingredient) => ingredient.role === "liquid")
    .reduce((sum, ingredient) => sum + (ingredient.quantity ?? 0), 0);

  const hydration = flourTotal > 0 ? (liquidTotal / flourTotal) * 100 : 0;

  return (
    <div className="mt-4 rounded-xl border border-neutral-200 bg-neutral-50 p-3 text-sm">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <div className="flex flex-col">
          <span className="text-xs text-neutral-500">Total flour</span>
          <span className="font-semibold text-neutral-800">
            {flourTotal.toFixed(1)} g
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-xs text-neutral-500">Total weight</span>
          <span className="font-semibold text-neutral-800">
            {totalWeight.toFixed(1)} g
          </span>
        </div>
        <div className="col-span-2 flex flex-col md:col-span-1">
          <span className="text-xs text-neutral-500">Hydration</span>
          <span className="font-semibold text-neutral-800">{hydration.toFixed(1)}%</span>
        </div>
      </div>
    </div>
  );
}
