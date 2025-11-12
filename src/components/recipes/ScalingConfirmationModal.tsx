"use client";

import React from "react";
import { Button, Dialog } from "@radix-ui/themes";
import { ArrowRightIcon } from "@radix-ui/react-icons";
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
  return (
    <Dialog.Root
      open={isOpen}
      onOpenChange={(open) => !open && !isApplying && onCancel()}
    >
      <Dialog.Content className="max-w-2xl max-h-[90vh]">
        <Dialog.Title>Confirm Scaled Ingredients</Dialog.Title>
        <Dialog.Description>{scalingMethod}</Dialog.Description>

        <div className="max-h-[60vh] overflow-y-auto mt-4">
          <div className="space-y-2">
            {scaledIngredients.map((ingredient) => (
              <div
                key={ingredient.id}
                className="grid grid-cols-3 gap-2 rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm dark:border-neutral-700 dark:bg-neutral-800/50"
              >
                <div className="col-span-3 font-medium text-neutral-900 dark:text-neutral-100 sm:col-span-1">
                  {ingredient.name}
                </div>
                <div className="flex items-center justify-between gap-2 text-neutral-600 dark:text-neutral-400 sm:col-span-2 flex-nowrap">
                  <span className="font-mono whitespace-nowrap">
                    {ingredient.originalQuantity.toFixed(1)} {ingredient.unit}
                  </span>
                  <ArrowRightIcon className="w-4 h-4 text-neutral-400 dark:text-neutral-500" />
                  <span className="font-mono font-semibold text-blue-600 dark:text-blue-400 whitespace-nowrap">
                    {ingredient.newQuantity.toFixed(1)} {ingredient.unit}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-neutral-200 dark:border-neutral-800">
          <Dialog.Close>
            <Button variant="outline" size="2" onClick={onCancel} disabled={isApplying}>
              Cancel
            </Button>
          </Dialog.Close>
          <Button size="2" onClick={onConfirm} disabled={isApplying}>
            {isApplying ? "Applying..." : "Apply Scaling"}
          </Button>
        </div>
      </Dialog.Content>
    </Dialog.Root>
  );
}
