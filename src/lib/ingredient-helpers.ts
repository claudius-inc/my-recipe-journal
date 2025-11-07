import type { IngredientRole } from "@/types/recipes";

interface IngredientDefaults {
  role: IngredientRole;
  unit: string;
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

// Common ingredients database for autocomplete
export const COMMON_INGREDIENTS = [
  // Flours
  "All-purpose flour",
  "Bread flour",
  "Whole wheat flour",
  "Rye flour",
  "Spelt flour",
  "Cake flour",
  "Pastry flour",

  // Liquids
  "Water",
  "Milk",
  "Whole milk",
  "Buttermilk",
  "Heavy cream",
  "Sour cream",

  // Preferments
  "Sourdough starter",
  "Levain",
  "Poolish",
  "Biga",

  // Fats
  "Butter",
  "Unsalted butter",
  "Olive oil",
  "Vegetable oil",
  "Coconut oil",
  "Canola oil",

  // Sweeteners
  "Sugar",
  "White sugar",
  "Brown sugar",
  "Honey",
  "Maple syrup",
  "Molasses",

  // Salt
  "Salt",
  "Sea salt",
  "Kosher salt",

  // Yeast & Leaveners
  "Active dry yeast",
  "Instant yeast",
  "Fresh yeast",
  "Baking powder",
  "Baking soda",

  // Eggs & Dairy
  "Eggs",
  "Egg yolks",
  "Egg whites",
  "Yogurt",
  "Greek yogurt",
  "Cream cheese",

  // Nuts & Seeds
  "Walnuts",
  "Almonds",
  "Pecans",
  "Sunflower seeds",
  "Sesame seeds",
  "Pumpkin seeds",
  "Flax seeds",
  "Chia seeds",

  // Chocolate & Cocoa
  "Cocoa powder",
  "Chocolate chips",
  "Dark chocolate",
  "Milk chocolate",

  // Fruits
  "Raisins",
  "Dried cranberries",
  "Dried apricots",
  "Blueberries",
  "Strawberries",

  // Spices
  "Cinnamon",
  "Vanilla extract",
  "Nutmeg",
  "Cardamom",
  "Ginger",
  "Cloves",

  // Other
  "Olives",
  "Herbs",
  "Rosemary",
  "Thyme",
  "Basil",
];
