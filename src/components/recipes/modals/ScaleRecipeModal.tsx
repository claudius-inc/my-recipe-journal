"use client";

import { useMemo, useState } from "react";
import { ArrowRightIcon } from "@radix-ui/react-icons";
import type { Ingredient } from "@/types/recipes";
import { Modal } from "@/components/ui/Modal";
import { useRecipeStore } from "@/store/RecipeStore";
import { useToast } from "@/context/ToastContext";
import { cn } from "@/lib/utils";
import { formatGrams } from "@/lib/formatting";
import {
  computeScaleFactor,
  countNonMassIngredients,
  getTotalDoughWeight,
  previewScaled,
  type ScaleMode,
} from "@/lib/scaling";

interface ScaleRecipeModalProps {
  open: boolean;
  onClose: () => void;
  recipeId: string;
  versionId: string;
  /** Every ingredient across all groups. */
  ingredients: Ingredient[];
}

const MODES: Array<{ key: ScaleMode; label: string }> = [
  { key: "ingredient", label: "By ingredient" },
  { key: "weight", label: "By total weight" },
];

function formatFactor(factor: number): string {
  return `×${factor >= 10 ? factor.toFixed(1) : factor.toFixed(2)}`;
}

export function ScaleRecipeModal({
  open,
  onClose,
  recipeId,
  versionId,
  ingredients,
}: ScaleRecipeModalProps) {
  const { batchUpdateIngredients } = useRecipeStore();
  const { addToast } = useToast();

  const [mode, setMode] = useState<ScaleMode>("ingredient");
  const [anchorId, setAnchorId] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [targetWeight, setTargetWeight] = useState("");
  const [isApplying, setIsApplying] = useState(false);

  const currentWeight = useMemo(() => getTotalDoughWeight(ingredients), [ingredients]);
  const nonMassCount = useMemo(() => countNonMassIngredients(ingredients), [ingredients]);
  const canScaleByWeight = currentWeight > 0;

  const anchor = ingredients.find((ing) => ing.id === anchorId);

  const factor = useMemo(
    () =>
      computeScaleFactor({
        mode,
        ingredients,
        anchorId,
        targetAmount: targetAmount === "" ? undefined : Number(targetAmount),
        targetWeight: targetWeight === "" ? undefined : Number(targetWeight),
      }),
    [mode, ingredients, anchorId, targetAmount, targetWeight],
  );

  const preview = useMemo(
    () => (factor != null ? previewScaled(ingredients, factor) : []),
    [ingredients, factor],
  );

  const newWeight = factor != null ? currentWeight * factor : null;

  const reset = () => {
    setMode("ingredient");
    setAnchorId("");
    setTargetAmount("");
    setTargetWeight("");
  };

  const handleClose = () => {
    if (isApplying) return;
    reset();
    onClose();
  };

  const handleApply = async () => {
    if (factor == null || preview.length === 0) return;
    // Snapshot the pre-scale quantities so the change can be reversed.
    const undo = ingredients.map((ing) => ({ id: ing.id, quantity: ing.quantity }));
    const updates = preview.map((p) => ({ id: p.id, quantity: p.newQuantity }));
    setIsApplying(true);
    try {
      await batchUpdateIngredients(recipeId, versionId, updates);
      const count = updates.length;
      reset();
      onClose();
      addToast(`Scaled ${count} ingredient${count === 1 ? "" : "s"}`, "success", 6000, {
        label: "Undo",
        onClick: () => {
          void batchUpdateIngredients(recipeId, versionId, undo);
        },
      });
    } catch (error) {
      console.error("Failed to apply scaling:", error);
      addToast("Failed to scale ingredients", "error");
    } finally {
      setIsApplying(false);
    }
  };

  if (!open) {
    return null;
  }

  return (
    <Modal
      open
      onClose={handleClose}
      closeOnBackdrop={!isApplying}
      labelledBy="scale-recipe-title"
      className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-xl bg-white shadow-lg"
    >
      {/* Header */}
      <div className="border-b border-neutral-200 px-6 pb-4 pt-6">
        <h3 id="scale-recipe-title" className="text-lg font-semibold text-neutral-900">
          Scale recipe
        </h3>
        <p className="mt-1 text-sm text-neutral-500">
          {currentWeight > 0 ? (
            <>
              This formula makes{" "}
              <span className="font-medium text-neutral-700">
                {formatGrams(currentWeight)}
              </span>{" "}
              of dough. Pick a target to rescale every ingredient.
            </>
          ) : (
            "Pick a target to rescale every ingredient proportionally."
          )}
        </p>

        {/* Mode tabs */}
        <div className="mt-4 inline-flex rounded-lg bg-neutral-100 p-1">
          {MODES.map((m) => {
            const disabled = m.key === "weight" && !canScaleByWeight;
            const active = mode === m.key;
            return (
              <button
                key={m.key}
                type="button"
                disabled={disabled}
                onClick={() => setMode(m.key)}
                title={disabled ? "No weight-based ingredients to total" : undefined}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-white text-neutral-900 shadow-sm"
                    : "text-neutral-500 hover:text-neutral-800",
                  disabled && "cursor-not-allowed opacity-40 hover:text-neutral-500",
                )}
              >
                {m.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Inputs */}
      <div className="space-y-4 px-6 py-4">
        {mode === "ingredient" && (
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-sm text-neutral-600">
                Scale by ingredient
              </label>
              <select
                value={anchorId}
                onChange={(e) => setAnchorId(e.target.value)}
                className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-400 focus:ring-2 focus:ring-neutral-200"
              >
                <option value="">Select ingredient...</option>
                {ingredients.map((ing) => (
                  <option key={ing.id} value={ing.id}>
                    {ing.name}
                  </option>
                ))}
              </select>
            </div>
            {anchor && (
              <div>
                <label className="mb-1 block text-sm text-neutral-600">
                  Target amount ({anchor.unit})
                </label>
                <input
                  type="number"
                  inputMode="decimal"
                  value={targetAmount}
                  onChange={(e) => setTargetAmount(e.target.value)}
                  placeholder={`Current: ${anchor.quantity?.toFixed(1) ?? ""}`}
                  className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-400 focus:ring-2 focus:ring-neutral-200"
                />
              </div>
            )}
          </div>
        )}

        {mode === "weight" && (
          <div>
            <label className="mb-1 block text-sm text-neutral-600">
              Target total dough weight (g)
            </label>
            <input
              type="number"
              inputMode="decimal"
              value={targetWeight}
              onChange={(e) => setTargetWeight(e.target.value)}
              placeholder={`Current: ${Math.round(currentWeight)}`}
              className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-400 focus:ring-2 focus:ring-neutral-200"
            />
            <p className="mt-1 text-xs text-neutral-500">
              Useful for dividing a batch into known portions.
            </p>
          </div>
        )}

        {/* Summary */}
        {factor != null && (
          <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-900">
            <span className="font-mono">{formatGrams(currentWeight)}</span>
            <ArrowRightIcon className="mx-1 inline h-3.5 w-3.5 text-blue-400" />
            <span className="font-mono font-semibold">
              {newWeight != null ? formatGrams(newWeight) : "—"}
            </span>
            <span className="ml-2 font-mono text-blue-500">{formatFactor(factor)}</span>
          </div>
        )}

        {factor != null && nonMassCount > 0 && (
          <p className="text-xs text-neutral-500">
            {nonMassCount} count/volume {nonMassCount === 1 ? "item is" : "items are"}{" "}
            scaled by the same factor but not included in the weight total.
          </p>
        )}
      </div>

      {/* Preview list */}
      {factor != null && (
        <div className="min-h-0 flex-1 overflow-y-auto border-t border-neutral-200 px-6 py-3">
          <div className="space-y-1.5">
            {preview.map((ing) => (
              <div
                key={ing.id}
                className="flex items-center justify-between gap-2 text-sm"
              >
                <span className="min-w-0 flex-1 truncate text-neutral-700">
                  {ing.name}
                </span>
                <span className="flex items-center gap-1.5 whitespace-nowrap text-neutral-500">
                  <span className="font-mono line-through">
                    {ing.originalQuantity?.toFixed(1) ?? "—"}
                  </span>
                  <ArrowRightIcon className="h-3 w-3 text-neutral-300" />
                  <span className="font-mono font-semibold text-neutral-900">
                    {ing.newQuantity?.toFixed(1) ?? "—"} {ing.unit}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 border-t border-neutral-200 px-6 py-4">
        <button
          type="button"
          onClick={handleClose}
          disabled={isApplying}
          className="flex-1 rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleApply}
          disabled={factor == null || isApplying}
          className="flex-1 rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isApplying ? "Applying..." : "Apply scaling"}
        </button>
      </div>
    </Modal>
  );
}
