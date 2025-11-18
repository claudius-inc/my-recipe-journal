import type { IngredientRole, RecipeCategory } from "@/types/recipes";

/**
 * Human-readable labels for ingredient roles
 */
export const IngredientRoleLabels: Record<string, string> = {
  flour: "Flour",
  liquid: "Liquid",
  preferment: "Preferment",
  salt: "Salt",
  sweetener: "Sweetener",
  fat: "Fat",
  add_in: "Add-in",
  spice: "Spice",
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
  categories?: RecipeCategory[]; // If specified, only show for these categories
}

// Common ingredient name patterns mapped to their defaults
const INGREDIENT_PATTERNS: Array<{
  pattern: RegExp;
  defaults: IngredientDefaults;
}> = [
  // Flours
  { pattern: /\bflour\b/i, defaults: { role: "flour", unit: "g" } },
  {
    pattern: /\b(bread|ap|all.?purpose|whole\s*wheat|rye|spelt)\s*flour\b/i,
    defaults: { role: "flour", unit: "g" },
  },

  // Liquids
  {
    pattern: /\b(water|milk|cream|buttermilk|oil)\b/i,
    defaults: { role: "liquid", unit: "g" },
  },
  {
    pattern: /\b(olive|vegetable|canola|coconut)\s*oil\b/i,
    defaults: { role: "fat", unit: "g" },
  },

  // Preferments
  {
    pattern: /\b(starter|levain|poolish|biga|sourdough)\b/i,
    defaults: { role: "preferment", unit: "g" },
  },

  // Salt
  { pattern: /\bsalt\b/i, defaults: { role: "salt", unit: "g" } },

  // Sweeteners
  {
    pattern: /\b(sugar|honey|maple\s*syrup|molasses|agave)\b/i,
    defaults: { role: "sweetener", unit: "g" },
  },

  // Fats
  { pattern: /\b(butter|lard|shortening|ghee)\b/i, defaults: { role: "fat", unit: "g" } },

  // Spices
  {
    pattern: /\b(cinnamon|nutmeg|cardamom|ginger|clove|vanilla)\b/i,
    defaults: { role: "spice", unit: "g" },
  },
  {
    pattern: /\b(pepper|paprika|cumin|coriander|turmeric)\b/i,
    defaults: { role: "spice", unit: "g" },
  },

  // Add-ins
  {
    pattern: /\b(seed|nut|chocolate|fruit|raisin|cranberr|walnut|almond)\b/i,
    defaults: { role: "add_in", unit: "g" },
  },
  { pattern: /\b(chip|chunk|olive|herb)\b/i, defaults: { role: "add_in", unit: "g" } },
];

/**
 * Suggests role and unit based on ingredient name
 * Returns defaults only if a pattern match is found
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

  return null;
}

/**
 * Get default unit based on role
 */
export function getDefaultUnitForRole(role: IngredientRole): string {
  // Most baking ingredients use grams
  return "g";
}

// Structured ingredient database with metadata
const INGREDIENT_DATABASE: IngredientDefinition[] = [
  // Flours
  {
    name: "All-purpose flour",
    role: "flour",
    unit: "g",
    categories: [
      { primary: "baking", secondary: "bread" },
      { primary: "baking", secondary: "cookies" },
    ],
  },
  {
    name: "Bread flour",
    role: "flour",
    unit: "g",
    categories: [{ primary: "baking", secondary: "bread" }],
  },
  {
    name: "Whole wheat flour",
    role: "flour",
    unit: "g",
    categories: [{ primary: "baking", secondary: "bread" }],
  },
  {
    name: "Rye flour",
    role: "flour",
    unit: "g",
    categories: [{ primary: "baking", secondary: "bread" }],
  },
  {
    name: "Spelt flour",
    role: "flour",
    unit: "g",
    categories: [{ primary: "baking", secondary: "bread" }],
  },
  {
    name: "Cake flour",
    role: "flour",
    unit: "g",
    categories: [{ primary: "baking", secondary: "cakes" }],
  },
  {
    name: "Pastry flour",
    role: "flour",
    unit: "g",
    categories: [{ primary: "baking", secondary: "pastries" }],
  },

  // Liquids
  { name: "Water", role: "liquid", unit: "g" },
  { name: "Milk", role: "liquid", unit: "g" },
  { name: "Whole milk", role: "liquid", unit: "g" },
  {
    name: "Buttermilk",
    role: "liquid",
    unit: "g",
    categories: [
      { primary: "baking", secondary: "bread" },
      { primary: "baking", secondary: "cookies" },
    ],
  },
  {
    name: "Heavy cream",
    role: "liquid",
    unit: "g",
    categories: [
      { primary: "baking", secondary: "cakes" },
      { primary: "cooking", secondary: "sauce" },
    ],
  },
  {
    name: "Sour cream",
    role: "liquid",
    unit: "g",
    categories: [{ primary: "baking", secondary: "cookies" }],
  },
  {
    name: "Vegetable stock",
    role: "liquid",
    unit: "ml",
    categories: [
      { primary: "cooking", secondary: "main_dish" },
      { primary: "cooking", secondary: "sauce" },
    ],
  },
  {
    name: "Chicken stock",
    role: "liquid",
    unit: "ml",
    categories: [
      { primary: "cooking", secondary: "main_dish" },
      { primary: "cooking", secondary: "sauce" },
    ],
  },

  // Preferments
  {
    name: "Sourdough starter",
    role: "preferment",
    unit: "g",
    categories: [{ primary: "baking", secondary: "sourdough" }],
  },
  {
    name: "Levain",
    role: "preferment",
    unit: "g",
    categories: [{ primary: "baking", secondary: "sourdough" }],
  },
  {
    name: "Poolish",
    role: "preferment",
    unit: "g",
    categories: [{ primary: "baking", secondary: "bread" }],
  },
  {
    name: "Biga",
    role: "preferment",
    unit: "g",
    categories: [{ primary: "baking", secondary: "bread" }],
  },

  // Fats
  { name: "Butter", role: "fat", unit: "g" },
  { name: "Unsalted butter", role: "fat", unit: "g" },
  { name: "Olive oil", role: "fat", unit: "g" },
  { name: "Vegetable oil", role: "fat", unit: "g" },
  {
    name: "Coconut oil",
    role: "fat",
    unit: "g",
    categories: [{ primary: "baking", secondary: "cookies" }],
  },
  { name: "Canola oil", role: "fat", unit: "g" },

  // Sweeteners
  { name: "Sugar", role: "sweetener", unit: "g" },
  { name: "White sugar", role: "sweetener", unit: "g" },
  {
    name: "Brown sugar",
    role: "sweetener",
    unit: "g",
    categories: [{ primary: "baking", secondary: "cookies" }],
  },
  { name: "Honey", role: "sweetener", unit: "g" },
  {
    name: "Maple syrup",
    role: "sweetener",
    unit: "g",
    categories: [{ primary: "baking", secondary: "cookies" }],
  },
  {
    name: "Molasses",
    role: "sweetener",
    unit: "g",
    categories: [
      { primary: "baking", secondary: "bread" },
      { primary: "baking", secondary: "cookies" },
    ],
  },

  // Salt
  { name: "Salt", role: "salt", unit: "g" },
  { name: "Sea salt", role: "salt", unit: "g" },
  { name: "Kosher salt", role: "salt", unit: "g" },

  // Yeast & Leaveners
  {
    name: "Active dry yeast",
    role: "other",
    unit: "g",
    categories: [{ primary: "baking", secondary: "bread" }],
  },
  {
    name: "Instant yeast",
    role: "other",
    unit: "g",
    categories: [{ primary: "baking", secondary: "bread" }],
  },
  {
    name: "Fresh yeast",
    role: "other",
    unit: "g",
    categories: [{ primary: "baking", secondary: "bread" }],
  },
  {
    name: "Baking powder",
    role: "other",
    unit: "g",
    categories: [
      { primary: "baking", secondary: "cookies" },
      { primary: "baking", secondary: "bread" },
    ],
  },
  {
    name: "Baking soda",
    role: "other",
    unit: "g",
    categories: [
      { primary: "baking", secondary: "cookies" },
      { primary: "baking", secondary: "bread" },
    ],
  },

  // Eggs & Dairy
  { name: "Eggs", role: "other", unit: "g" },
  {
    name: "Egg yolks",
    role: "fat",
    unit: "g",
    categories: [{ primary: "baking", secondary: "cakes" }],
  },
  {
    name: "Egg whites",
    role: "other",
    unit: "g",
    categories: [{ primary: "baking", secondary: "cakes" }],
  },
  {
    name: "Yogurt",
    role: "liquid",
    unit: "g",
    categories: [
      { primary: "baking", secondary: "cakes" },
      { primary: "cooking", secondary: "sauce" },
    ],
  },
  {
    name: "Greek yogurt",
    role: "liquid",
    unit: "g",
    categories: [
      { primary: "baking", secondary: "cakes" },
      { primary: "cooking", secondary: "sauce" },
    ],
  },
  {
    name: "Cream cheese",
    role: "fat",
    unit: "g",
    categories: [{ primary: "baking", secondary: "cakes" }],
  },

  // Nuts & Seeds
  { name: "Walnuts", role: "add_in", unit: "g" },
  { name: "Almonds", role: "add_in", unit: "g" },
  {
    name: "Pecans",
    role: "add_in",
    unit: "g",
    categories: [{ primary: "baking", secondary: "pies" }],
  },
  {
    name: "Sunflower seeds",
    role: "add_in",
    unit: "g",
    categories: [{ primary: "baking", secondary: "bread" }],
  },
  {
    name: "Sesame seeds",
    role: "add_in",
    unit: "g",
    categories: [{ primary: "baking", secondary: "bread" }],
  },
  {
    name: "Pumpkin seeds",
    role: "add_in",
    unit: "g",
    categories: [{ primary: "baking", secondary: "bread" }],
  },
  {
    name: "Flax seeds",
    role: "add_in",
    unit: "g",
    categories: [{ primary: "baking", secondary: "bread" }],
  },
  {
    name: "Chia seeds",
    role: "add_in",
    unit: "g",
    categories: [
      { primary: "baking", secondary: "bread" },
      { primary: "beverages", secondary: "smoothie" },
    ],
  },

  // Chocolate & Cocoa
  {
    name: "Cocoa powder",
    role: "other",
    unit: "g",
    categories: [
      { primary: "baking", secondary: "cookies" },
      { primary: "beverages", secondary: "coffee" },
    ],
  },
  {
    name: "Chocolate chips",
    role: "add_in",
    unit: "g",
    categories: [{ primary: "baking", secondary: "cookies" }],
  },
  {
    name: "Dark chocolate",
    role: "add_in",
    unit: "g",
    categories: [{ primary: "baking", secondary: "cookies" }],
  },
  {
    name: "Milk chocolate",
    role: "add_in",
    unit: "g",
    categories: [{ primary: "baking", secondary: "cookies" }],
  },

  // Fruits
  {
    name: "Raisins",
    role: "add_in",
    unit: "g",
    categories: [
      { primary: "baking", secondary: "cookies" },
      { primary: "baking", secondary: "bread" },
    ],
  },
  {
    name: "Dried cranberries",
    role: "add_in",
    unit: "g",
    categories: [
      { primary: "baking", secondary: "cookies" },
      { primary: "baking", secondary: "bread" },
    ],
  },
  {
    name: "Dried apricots",
    role: "add_in",
    unit: "g",
    categories: [{ primary: "baking", secondary: "cookies" }],
  },
  {
    name: "Blueberries",
    role: "add_in",
    unit: "g",
    categories: [{ primary: "baking", secondary: "cookies" }],
  },
  {
    name: "Strawberries",
    role: "add_in",
    unit: "g",
    categories: [{ primary: "baking", secondary: "cakes" }],
  },
  {
    name: "Lemon juice",
    role: "other",
    unit: "ml",
    categories: [
      { primary: "baking", secondary: "pies" },
      { primary: "cooking", secondary: "sauce" },
    ],
  },
  {
    name: "Lemon zest",
    role: "spice",
    unit: "g",
    categories: [{ primary: "baking", secondary: "cakes" }],
  },

  // Spices & Flavorings
  {
    name: "Cinnamon",
    role: "spice",
    unit: "g",
    categories: [
      { primary: "baking", secondary: "cookies" },
      { primary: "baking", secondary: "bread" },
    ],
  },
  {
    name: "Vanilla extract",
    role: "spice",
    unit: "ml",
    categories: [{ primary: "baking", secondary: "cookies" }],
  },
  {
    name: "Nutmeg",
    role: "spice",
    unit: "g",
    categories: [{ primary: "baking", secondary: "cookies" }],
  },
  {
    name: "Cardamom",
    role: "spice",
    unit: "g",
    categories: [
      { primary: "baking", secondary: "cookies" },
      { primary: "baking", secondary: "bread" },
      { primary: "beverages", secondary: "coffee" },
    ],
  },
  { name: "Ginger", role: "spice", unit: "g" },
  {
    name: "Cloves",
    role: "spice",
    unit: "g",
    categories: [{ primary: "baking", secondary: "cookies" }],
  },
  {
    name: "Black pepper",
    role: "spice",
    unit: "g",
    categories: [
      { primary: "cooking", secondary: "main_dish" },
      { primary: "cooking", secondary: "sauce" },
    ],
  },
  {
    name: "Paprika",
    role: "spice",
    unit: "g",
    categories: [{ primary: "cooking", secondary: "main_dish" }],
  },
  {
    name: "Cumin",
    role: "spice",
    unit: "g",
    categories: [{ primary: "cooking", secondary: "main_dish" }],
  },
  {
    name: "Coriander",
    role: "spice",
    unit: "g",
    categories: [{ primary: "cooking", secondary: "main_dish" }],
  },

  // Herbs
  {
    name: "Rosemary",
    role: "spice",
    unit: "g",
    categories: [
      { primary: "baking", secondary: "bread" },
      { primary: "cooking", secondary: "main_dish" },
    ],
  },
  {
    name: "Thyme",
    role: "spice",
    unit: "g",
    categories: [{ primary: "cooking", secondary: "main_dish" }],
  },
  {
    name: "Basil",
    role: "spice",
    unit: "g",
    categories: [
      { primary: "cooking", secondary: "main_dish" },
      { primary: "cooking", secondary: "sauce" },
    ],
  },
  {
    name: "Oregano",
    role: "spice",
    unit: "g",
    categories: [
      { primary: "cooking", secondary: "main_dish" },
      { primary: "cooking", secondary: "sauce" },
    ],
  },
  {
    name: "Parsley",
    role: "spice",
    unit: "g",
    categories: [{ primary: "cooking", secondary: "main_dish" }],
  },

  // Main dish ingredients
  {
    name: "Onion",
    role: "add_in",
    unit: "g",
    categories: [
      { primary: "cooking", secondary: "main_dish" },
      { primary: "cooking", secondary: "sauce" },
    ],
  },
  {
    name: "Garlic",
    role: "spice",
    unit: "g",
    categories: [
      { primary: "cooking", secondary: "main_dish" },
      { primary: "cooking", secondary: "sauce" },
    ],
  },
  {
    name: "Tomato paste",
    role: "add_in",
    unit: "g",
    categories: [
      { primary: "cooking", secondary: "main_dish" },
      { primary: "cooking", secondary: "sauce" },
    ],
  },
  {
    name: "Tomatoes",
    role: "add_in",
    unit: "g",
    categories: [
      { primary: "cooking", secondary: "main_dish" },
      { primary: "cooking", secondary: "sauce" },
    ],
  },
  {
    name: "Olives",
    role: "add_in",
    unit: "g",
    categories: [
      { primary: "baking", secondary: "bread" },
      { primary: "cooking", secondary: "main_dish" },
    ],
  },

  // Drink ingredients
  {
    name: "Coffee beans",
    role: "other",
    unit: "g",
    categories: [{ primary: "beverages", secondary: "coffee" }],
  },
  {
    name: "Tea leaves",
    role: "other",
    unit: "g",
    categories: [{ primary: "beverages", secondary: "tea" }],
  },
  {
    name: "Ice",
    role: "other",
    unit: "g",
    categories: [{ primary: "beverages", secondary: "coffee" }],
  },
];

/**
 * Get category-filtered ingredient suggestions
 */
export function getCategoryIngredients(
  category?: RecipeCategory,
  role?: IngredientRole,
): string[] {
  let filtered = INGREDIENT_DATABASE;

  // Filter by category if specified
  if (category) {
    filtered = filtered.filter(
      (ing) => !ing.categories || ing.categories.includes(category),
    );
  }

  // Filter by role if specified
  if (role) {
    filtered = filtered.filter((ing) => ing.role === role);
  }

  return filtered.map((ing) => ing.name).sort();
}

/**
 * Simple fuzzy search - checks if search term characters appear in order
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

  // Fuzzy match against query
  const matches = categoryFiltered.filter((ing) => fuzzyMatch(query, ing.name));

  // Sort by relevance (exact match first, then starts with, then fuzzy)
  const queryLower = query.toLowerCase();
  matches.sort((a, b) => {
    const aLower = a.name.toLowerCase();
    const bLower = b.name.toLowerCase();

    // Exact match
    if (aLower === queryLower) return -1;
    if (bLower === queryLower) return 1;

    // Starts with query
    if (aLower.startsWith(queryLower) && !bLower.startsWith(queryLower)) return -1;
    if (bLower.startsWith(queryLower) && !aLower.startsWith(queryLower)) return 1;

    // Alphabetical
    return aLower.localeCompare(bLower);
  });

  return matches.slice(0, limit).map((ing) => ing.name);
}

// Export simple list for backward compatibility
export const COMMON_INGREDIENTS = INGREDIENT_DATABASE.map((ing) => ing.name).sort();
