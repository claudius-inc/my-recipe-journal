import type { IngredientRole, RecipeCategory } from "@/types/recipes";

/**
 * Human-readable labels for ingredient roles
 */
export const IngredientRoleLabels: Record<IngredientRole, string> = {
  flour: "Flour",
  liquid: "Liquid",
  leavening: "Leavening",
  salt: "Salt",
  sweetener: "Sweetener",
  fat: "Fat",
  other: "Other",
};

interface IngredientDefaults {
  role: IngredientRole;
  unit: string;
}

interface IngredientDefinition {
  name: string;
  role: IngredientRole;
  unit: string;
  categories?: RecipeCategory[];
}

// Smart role detection patterns - order matters (more specific first)
const INGREDIENT_PATTERNS: Array<{
  pattern: RegExp;
  defaults: IngredientDefaults;
}> = [
  // === FLOUR (most important for baker's percentages) ===
  { pattern: /\bflour\b/i, defaults: { role: "flour", unit: "g" } },
  { pattern: /\b(bread|ap|all.?purpose|whole\s*wheat|rye|spelt|semolina|durum)\b.*flour/i, defaults: { role: "flour", unit: "g" } },
  { pattern: /\b(cake|pastry|00|tipo)\s*flour\b/i, defaults: { role: "flour", unit: "g" } },

  // === LIQUID ===
  { pattern: /\bwater\b/i, defaults: { role: "liquid", unit: "g" } },
  { pattern: /\b(milk|buttermilk|cream|half.?and.?half)\b/i, defaults: { role: "liquid", unit: "g" } },
  { pattern: /\b(juice|stock|broth)\b/i, defaults: { role: "liquid", unit: "ml" } },
  { pattern: /\b(yogurt|yoghurt|kefir)\b/i, defaults: { role: "liquid", unit: "g" } },

  // === LEAVENING (yeast + preferments combined) ===
  { pattern: /\b(yeast|instant\s*yeast|active\s*dry|fresh\s*yeast)\b/i, defaults: { role: "leavening", unit: "g" } },
  { pattern: /\b(starter|levain|sourdough|poolish|biga|preferment)\b/i, defaults: { role: "leavening", unit: "g" } },
  { pattern: /\b(baking\s*powder|baking\s*soda|bicarbonate)\b/i, defaults: { role: "leavening", unit: "g" } },

  // === SALT ===
  { pattern: /\b(salt|sea\s*salt|kosher\s*salt|fleur\s*de\s*sel|maldon)\b/i, defaults: { role: "salt", unit: "g" } },

  // === FAT (before sweetener to catch "butter" before "brown butter") ===
  { pattern: /\b(butter|unsalted\s*butter|salted\s*butter)\b/i, defaults: { role: "fat", unit: "g" } },
  { pattern: /\b(oil|olive\s*oil|vegetable\s*oil|canola|coconut\s*oil)\b/i, defaults: { role: "fat", unit: "g" } },
  { pattern: /\b(lard|shortening|ghee|margarine)\b/i, defaults: { role: "fat", unit: "g" } },
  { pattern: /\bcream\s*cheese\b/i, defaults: { role: "fat", unit: "g" } },

  // === SWEETENER ===
  { pattern: /\b(sugar|white\s*sugar|caster|granulated)\b/i, defaults: { role: "sweetener", unit: "g" } },
  { pattern: /\b(brown\s*sugar|muscovado|demerara)\b/i, defaults: { role: "sweetener", unit: "g" } },
  { pattern: /\b(honey|maple|syrup|molasses|agave|treacle)\b/i, defaults: { role: "sweetener", unit: "g" } },
  { pattern: /\b(powdered\s*sugar|icing\s*sugar|confectioner)/i, defaults: { role: "sweetener", unit: "g" } },
];

/**
 * Suggests role and unit based on ingredient name using smart pattern matching
 */
export function suggestIngredientDefaults(
  ingredientName: string,
): Partial<IngredientDefaults> | null {
  const normalized = ingredientName.trim().toLowerCase();

  if (!normalized) {
    return null;
  }

  for (const { pattern, defaults } of INGREDIENT_PATTERNS) {
    if (pattern.test(normalized)) {
      return defaults;
    }
  }

  // Default to "other" with grams
  return { role: "other", unit: "g" };
}

/**
 * Get default unit based on role
 */
export function getDefaultUnitForRole(role: IngredientRole): string {
  return "g";
}

// Structured ingredient database with metadata
const INGREDIENT_DATABASE: IngredientDefinition[] = [
  // Flours
  { name: "All-purpose flour", role: "flour", unit: "g" },
  { name: "Bread flour", role: "flour", unit: "g" },
  { name: "Whole wheat flour", role: "flour", unit: "g" },
  { name: "Rye flour", role: "flour", unit: "g" },
  { name: "Spelt flour", role: "flour", unit: "g" },
  { name: "Cake flour", role: "flour", unit: "g" },
  { name: "Pastry flour", role: "flour", unit: "g" },
  { name: "Semolina flour", role: "flour", unit: "g" },
  { name: "00 flour", role: "flour", unit: "g" },

  // Liquids
  { name: "Water", role: "liquid", unit: "g" },
  { name: "Milk", role: "liquid", unit: "g" },
  { name: "Whole milk", role: "liquid", unit: "g" },
  { name: "Buttermilk", role: "liquid", unit: "g" },
  { name: "Heavy cream", role: "liquid", unit: "g" },
  { name: "Sour cream", role: "liquid", unit: "g" },
  { name: "Yogurt", role: "liquid", unit: "g" },

  // Leavening (yeast + preferments)
  { name: "Active dry yeast", role: "leavening", unit: "g" },
  { name: "Instant yeast", role: "leavening", unit: "g" },
  { name: "Fresh yeast", role: "leavening", unit: "g" },
  { name: "Sourdough starter", role: "leavening", unit: "g" },
  { name: "Levain", role: "leavening", unit: "g" },
  { name: "Poolish", role: "leavening", unit: "g" },
  { name: "Biga", role: "leavening", unit: "g" },
  { name: "Baking powder", role: "leavening", unit: "g" },
  { name: "Baking soda", role: "leavening", unit: "g" },

  // Fats
  { name: "Butter", role: "fat", unit: "g" },
  { name: "Unsalted butter", role: "fat", unit: "g" },
  { name: "Olive oil", role: "fat", unit: "g" },
  { name: "Vegetable oil", role: "fat", unit: "g" },
  { name: "Coconut oil", role: "fat", unit: "g" },
  { name: "Lard", role: "fat", unit: "g" },
  { name: "Shortening", role: "fat", unit: "g" },

  // Sweeteners
  { name: "Sugar", role: "sweetener", unit: "g" },
  { name: "White sugar", role: "sweetener", unit: "g" },
  { name: "Brown sugar", role: "sweetener", unit: "g" },
  { name: "Honey", role: "sweetener", unit: "g" },
  { name: "Maple syrup", role: "sweetener", unit: "g" },
  { name: "Molasses", role: "sweetener", unit: "g" },

  // Salt
  { name: "Salt", role: "salt", unit: "g" },
  { name: "Sea salt", role: "salt", unit: "g" },
  { name: "Kosher salt", role: "salt", unit: "g" },

  // Other common ingredients
  { name: "Eggs", role: "other", unit: "pc" },
  { name: "Egg yolks", role: "other", unit: "pc" },
  { name: "Egg whites", role: "other", unit: "pc" },
  { name: "Vanilla extract", role: "other", unit: "ml" },
  { name: "Cinnamon", role: "other", unit: "g" },
  { name: "Chocolate chips", role: "other", unit: "g" },
  { name: "Cocoa powder", role: "other", unit: "g" },
  { name: "Walnuts", role: "other", unit: "g" },
  { name: "Almonds", role: "other", unit: "g" },
  { name: "Raisins", role: "other", unit: "g" },
];

/**
 * Get category-filtered ingredient suggestions
 */
export function getCategoryIngredients(
  category?: RecipeCategory,
  role?: IngredientRole,
): string[] {
  let filtered = INGREDIENT_DATABASE;

  if (category) {
    filtered = filtered.filter(
      (ing) => !ing.categories || ing.categories.includes(category),
    );
  }

  if (role) {
    filtered = filtered.filter((ing) => ing.role === role);
  }

  return filtered.map((ing) => ing.name).sort();
}

/**
 * Simple fuzzy search
 */
function fuzzyMatch(search: string, target: string): boolean {
  const searchLower = search.toLowerCase();
  const targetLower = target.toLowerCase();

  let searchIndex = 0;
  for (let i = 0; i < targetLower.length && searchIndex < searchLower.length; i++) {
    if (targetLower[i] === searchLower[searchIndex]) {
      searchIndex++;
    }
  }

  return searchIndex === searchLower.length;
}

/**
 * Search ingredients with fuzzy matching
 */
export function searchIngredients(
  query: string,
  category?: RecipeCategory,
  limit = 20,
): string[] {
  if (!query.trim()) {
    return getCategoryIngredients(category).slice(0, limit);
  }

  const categoryFiltered = category
    ? INGREDIENT_DATABASE.filter(
        (ing) => !ing.categories || ing.categories.includes(category),
      )
    : INGREDIENT_DATABASE;

  const matches = categoryFiltered.filter((ing) => fuzzyMatch(query, ing.name));

  const queryLower = query.toLowerCase();
  matches.sort((a, b) => {
    const aLower = a.name.toLowerCase();
    const bLower = b.name.toLowerCase();

    if (aLower === queryLower) return -1;
    if (bLower === queryLower) return 1;

    if (aLower.startsWith(queryLower) && !bLower.startsWith(queryLower)) return -1;
    if (bLower.startsWith(queryLower) && !aLower.startsWith(queryLower)) return 1;

    return aLower.localeCompare(bLower);
  });

  return matches.slice(0, limit).map((ing) => ing.name);
}

export const COMMON_INGREDIENTS = INGREDIENT_DATABASE.map((ing) => ing.name).sort();
