import type { IngredientRole } from "@/types/recipes";

export const IngredientRoleLabels: Record<IngredientRole, string> = {
  flour: "Flour",
  liquid: "Liquid",
  leavening: "Leavening",
  salt: "Salt",
  sweetener: "Sweetener",
  fat: "Fat",
  other: "Other",
};

export const INGREDIENT_ROLES: IngredientRole[] = [
  "flour",
  "liquid",
  "leavening",
  "salt",
  "sweetener",
  "fat",
  "other",
];

// Role colors for visual distinction
export const IngredientRoleColors: Record<IngredientRole, string> = {
  flour: "bg-amber-100 text-amber-800",
  liquid: "bg-blue-100 text-blue-800",
  leavening: "bg-green-100 text-green-800",
  salt: "bg-gray-100 text-gray-800",
  sweetener: "bg-pink-100 text-pink-800",
  fat: "bg-yellow-100 text-yellow-800",
  other: "bg-neutral-100 text-neutral-600",
};
