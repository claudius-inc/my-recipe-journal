import type {
  Ingredient,
  IngredientGroup,
  RecipeCategory,
  RecipeVersion,
} from "@/types/recipes";

/**
 * Generate a unique ID for ingredient groups
 */
function generateGroupId(): string {
  return `group_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Check if a recipe version needs migration from flat ingredients to groups
 */
export function needsMigration(version: RecipeVersion): boolean {
  // Needs migration if it has ingredients but no groups
  return !version.ingredientGroups && version.ingredients.length > 0;
}

/**
 * Migrate flat ingredients array to a single default group
 * This preserves all existing data while adding the group structure
 */
export function migrateIngredientsToGroups(
  ingredients: Ingredient[],
  recipeCategory: RecipeCategory,
): IngredientGroup[] {
  // Determine if baker's percentage should be enabled by default
  const enableBakersPercent =
    recipeCategory.primary === "baking" &&
    ["bread", "sourdough", "cookies", "cakes", "pastries", "pies"].includes(
      recipeCategory.secondary,
    );

  // Create a single default group with all ingredients
  return [
    {
      id: generateGroupId(),
      name: "Ingredients",
      order: 0,
      enableBakersPercent,
      ingredients: [...ingredients], // Clone the array to avoid mutations
    },
  ];
}

/**
 * Get all ingredients from a version, supporting both formats
 * This helper ensures backward compatibility
 */
export function getIngredients(version: RecipeVersion): Ingredient[] {
  // Prefer ingredientGroups if available
  if (version.ingredientGroups && version.ingredientGroups.length > 0) {
    return version.ingredientGroups.flatMap((group) => group.ingredients);
  }
  // Fall back to flat ingredients array
  return version.ingredients || [];
}

/**
 * Get ingredient groups from a version, auto-migrating if needed
 * This is the main function components should use
 */
export function getIngredientGroups(
  version: RecipeVersion,
  recipeCategory: RecipeCategory,
): IngredientGroup[] {
  // If groups exist, return them
  if (version.ingredientGroups && version.ingredientGroups.length > 0) {
    return version.ingredientGroups;
  }

  // Otherwise, migrate on-the-fly (read-only migration)
  if (version.ingredients && version.ingredients.length > 0) {
    return migrateIngredientsToGroups(version.ingredients, recipeCategory);
  }

  // No ingredients at all - return empty array
  return [];
}

/**
 * Calculate flour total for a specific group
 */
export function getGroupFlourTotal(group: IngredientGroup): number {
  return group.ingredients
    .filter((ingredient) => ingredient.role === "flour")
    .reduce((sum, ingredient) => sum + (ingredient.quantity ?? 0), 0);
}

/**
 * Calculate total weight for a specific group
 */
export function getGroupTotalWeight(group: IngredientGroup): number {
  return group.ingredients.reduce((sum, ingredient) => sum + (ingredient.quantity ?? 0), 0);
}

/**
 * Calculate hydration percentage for a specific group
 */
export function getGroupHydration(group: IngredientGroup): number {
  const flourTotal = getGroupFlourTotal(group);
  if (flourTotal === 0) return 0;

  const liquidTotal = group.ingredients
    .filter((ingredient) => ingredient.role === "liquid")
    .reduce((sum, ingredient) => sum + (ingredient.quantity ?? 0), 0);

  return (liquidTotal / flourTotal) * 100;
}

/**
 * Suggest group names based on recipe category
 */
export function suggestGroupNames(recipeCategory: RecipeCategory): string[] {
  const { primary, secondary } = recipeCategory;

  if (primary === "baking") {
    if (secondary === "bread" || secondary === "sourdough") {
      return ["Pre-ferment", "Main Dough", "Topping"];
    }
    if (secondary === "cakes") {
      return ["Cake Batter", "Frosting", "Filling"];
    }
    if (secondary === "pastries" || secondary === "pies") {
      return ["Dough", "Filling", "Glaze"];
    }
    if (secondary === "cookies") {
      return ["Cookie Dough", "Topping", "Glaze"];
    }
  }

  if (primary === "cooking") {
    return ["Main Components", "Sauce", "Garnish"];
  }

  // Default suggestions
  return ["Main", "Sauce", "Topping"];
}
