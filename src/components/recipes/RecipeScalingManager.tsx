"use client";

import { useState } from "react";
import { useRecipeStore } from "@/store/RecipeStore";
import { useToast } from "@/context/ToastContext";
import { ScalingConfirmationModal } from "./modals";

interface RecipeScalingManagerProps {
  isOpen: boolean;
  onClose: () => void;
  scaledIngredients: Array<{
    id: string;
    name: string;
    originalQuantity: number | null;
    newQuantity: number | null;
    unit: string;
  }>;
  recipeId: string;
  versionId: string;
  onSuccess: () => void;
  scalingMethod: string;
}

export function RecipeScalingManager({
  isOpen,
  onClose,
  scaledIngredients,
  recipeId,
  versionId,
  onSuccess,
  scalingMethod,
}: RecipeScalingManagerProps) {
  const { batchUpdateIngredients } = useRecipeStore();
  const { addToast } = useToast();
  const [isApplying, setIsApplying] = useState(false);

  const handleConfirm = async () => {
    if (scaledIngredients.length === 0) return;

    setIsApplying(true);
    try {
      await batchUpdateIngredients(
        recipeId,
        versionId,
        scaledIngredients.map((ingredient) => ({
          id: ingredient.id,
          quantity: ingredient.newQuantity,
        })),
      );
      // Snapshot the pre-scale quantities so the change can be reversed.
      const undoUpdates = scaledIngredients.map((ingredient) => ({
        id: ingredient.id,
        quantity: ingredient.originalQuantity,
      }));
      const count = scaledIngredients.length;
      onSuccess();
      onClose();
      addToast(`Scaled ${count} ingredient${count === 1 ? "" : "s"}`, "success", 6000, {
        label: "Undo",
        onClick: () => {
          void batchUpdateIngredients(recipeId, versionId, undoUpdates);
        },
      });
    } catch (error) {
      console.error("Failed to apply scaling:", error);
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <ScalingConfirmationModal
      isOpen={isOpen}
      onCancel={onClose}
      onConfirm={handleConfirm}
      scaledIngredients={scaledIngredients}
      scalingMethod={scalingMethod}
      isApplying={isApplying}
    />
  );
}
