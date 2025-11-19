"use client";

import { useState } from "react";
import { useRecipeStore } from "@/store/RecipeStore";
import { ScalingConfirmationModal } from "./modals";

interface RecipeScalingManagerProps {
  isOpen: boolean;
  onClose: () => void;
  scaledIngredients: Array<{
    id: string;
    name: string;
    originalQuantity: number;
    newQuantity: number;
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
      onSuccess();
      onClose();
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
