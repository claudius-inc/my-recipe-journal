/**
 * Client-side storage utilities for recipe preferences
 * Handles localStorage operations with SSR safety
 */

const LAST_VIEWED_RECIPE_KEY = "lastViewedRecipeId";

/**
 * Get the last viewed recipe ID from localStorage
 * @returns The recipe ID or null if not found or on server
 */
export function getLastViewedRecipe(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return localStorage.getItem(LAST_VIEWED_RECIPE_KEY);
  } catch (error) {
    console.error("Failed to read from localStorage:", error);
    return null;
  }
}

/**
 * Save the last viewed recipe ID to localStorage
 * @param recipeId - The recipe ID to store
 */
export function setLastViewedRecipe(recipeId: string | null): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    if (recipeId === null) {
      localStorage.removeItem(LAST_VIEWED_RECIPE_KEY);
    } else {
      localStorage.setItem(LAST_VIEWED_RECIPE_KEY, recipeId);
    }
  } catch (error) {
    console.error("Failed to write to localStorage:", error);
  }
}

/**
 * Clear the last viewed recipe from localStorage
 */
export function clearLastViewedRecipe(): void {
  setLastViewedRecipe(null);
}
