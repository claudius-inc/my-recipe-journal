"use client";

import React from "react";
import type { Ingredient } from "@/types/recipes";

interface ScalingConfirmationModalProps {
  isOpen: boolean;
  scaledIngredients: Array<{
    id: string;
    name: string;
    originalQuantity: number;
    newQuantity: number;
    unit: string;
  }>;
  scalingMethod: string;
  onConfirm: () => void;
  onCancel: () => void;
  isApplying?: boolean;
}

export function ScalingConfirmationModal({
  isOpen,
  scaledIngredients,
  scalingMethod,
  onConfirm,
  onCancel,
  isApplying = false,
}: ScalingConfirmationModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-xl dark:border-neutral-800 dark:bg-neutral-900">
        <div className="border-b border-neutral-200 px-6 py-4 dark:border-neutral-800">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            Confirm Scaled Ingredients
          </h2>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
            {scalingMethod}
          </p>
        </div>

        <div className="max-h-[60vh] overflow-y-auto px-6 py-4">
          <div className="space-y-2">
            {scaledIngredients.map((ingredient) => (
              <div
                key={ingredient.id}
                className="grid grid-cols-3 gap-4 rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm dark:border-neutral-700 dark:bg-neutral-800/50"
              >
                <div className="col-span-3 font-medium text-neutral-900 dark:text-neutral-100 sm:col-span-1">
                  {ingredient.name}
                </div>
                <div className="flex items-center justify-between gap-2 text-neutral-600 dark:text-neutral-400 sm:col-span-2">
                  <span className="font-mono">
                    {ingredient.originalQuantity.toFixed(1)} {ingredient.unit}
                  </span>
                  <span className="text-neutral-400 dark:text-neutral-500">→</span>
                  <span className="font-mono font-semibold text-blue-600 dark:text-blue-400">
                    {ingredient.newQuantity.toFixed(1)} {ingredient.unit}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-neutral-200 px-6 py-4 dark:border-neutral-800">
          <button
            type="button"
            onClick={onCancel}
            disabled={isApplying}
            className="rounded-lg border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isApplying}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-blue-700 dark:hover:bg-blue-600"
          >
            {isApplying ? "Applying..." : "Apply Scaling"}
          </button>
        </div>
      </div>
    </div>
  );
}
