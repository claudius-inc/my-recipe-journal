export type IngredientRole =
  | "flour"
  | "liquid"
  | "leavening"
  | "salt"
  | "sweetener"
  | "fat"
  | "other";

export interface Ingredient {
  id: string;
  name: string;
  quantity: number | null;
  unit: string;
  role: IngredientRole;
  notes?: string;
}

export interface PendingIngredient {
  tempId: string;
  name: string;
  quantity: number | null;
  unit: string;
  role: IngredientRole;
  notes?: string;
}

// Hierarchical category types
export type PrimaryCategoryKey = "baking" | "cooking" | "beverages" | "other";

export type SecondaryCategoryKey =
  // Baking subcategories
  | "bread"
  | "sourdough"
  | "cookies"
  | "cakes"
  | "pastries"
  | "pies"
  // Cooking subcategories
  | "main_dish"
  | "appetizer"
  | "side_dish"
  | "sauce"
  | "condiment"
  // Beverages subcategories
  | "coffee"
  | "tea"
  | "cocktail"
  | "smoothie"
  | "fermented"
  // Other
  | "other";

export interface RecipeCategory {
  primary: PrimaryCategoryKey;
  secondary: SecondaryCategoryKey;
}

// Category hierarchy mapping
export const CATEGORY_HIERARCHY: Record<PrimaryCategoryKey, SecondaryCategoryKey[]> = {
  baking: ["bread", "sourdough", "cookies", "cakes", "pastries", "pies"],
  cooking: ["main_dish", "appetizer", "side_dish", "sauce", "condiment"],
  beverages: ["coffee", "tea", "cocktail", "smoothie", "fermented"],
  other: ["other"],
};

// Human-readable labels
export const PRIMARY_LABELS: Record<PrimaryCategoryKey, string> = {
  baking: "Baking",
  cooking: "Cooking",
  beverages: "Beverages",
  other: "Other",
};

export const SECONDARY_LABELS: Record<SecondaryCategoryKey, string> = {
  bread: "Bread",
  sourdough: "Sourdough",
  cookies: "Cookies",
  cakes: "Cakes",
  pastries: "Pastries",
  pies: "Pies & Tarts",
  main_dish: "Main Dishes",
  appetizer: "Appetizers",
  side_dish: "Side Dishes",
  sauce: "Sauces & Gravies",
  condiment: "Condiments",
  coffee: "Coffee",
  tea: "Tea",
  cocktail: "Cocktails",
  smoothie: "Smoothies",
  fermented: "Fermented Drinks",
  other: "Miscellaneous",
};

// Helper functions
export function formatCategoryLabel(category: RecipeCategory): string {
  return `${SECONDARY_LABELS[category.secondary]}`;
}

export function isValidCategory(category: RecipeCategory): boolean {
  const validSecondaries = CATEGORY_HIERARCHY[category.primary];
  return validSecondaries?.includes(category.secondary) ?? false;
}

// Legacy support (deprecated - will be removed after migration)
export type LegacyRecipeCategory =
  | "bread"
  | "dessert"
  | "drink"
  | "main"
  | "sauce"
  | "other";

export const LEGACY_RECIPE_CATEGORIES: LegacyRecipeCategory[] = [
  "bread",
  "dessert",
  "drink",
  "main",
  "sauce",
  "other",
];

export const INGREDIENT_ROLES: IngredientRole[] = [
  "flour",
  "liquid",
  "leavening",
  "salt",
  "sweetener",
  "fat",
  "other",
];

// Ingredient Groups - for organizing ingredients into sections
export interface IngredientGroup {
  id: string;
  name: string;
  order: number;
  enableBakersPercent: boolean;
  ingredients: Ingredient[];
}

export interface RecipeStep {
  order: number;
  text: string;
}

export type RecipeSteps = RecipeStep[];

// Version Photo for multi-photo support
export interface VersionPhoto {
  id: string;
  photoUrl: string;
  r2Key?: string;
  order: number;
  createdAt: string;
}

export interface RecipeVersion {
  id: string;
  title: string;
  createdAt: string;
  // NEW: Ingredient groups for organized recipes
  ingredientGroups?: IngredientGroup[];
  // LEGACY: Flat ingredients array (kept for backward compatibility)
  // Will be migrated to ingredientGroups on first load
  ingredients: Ingredient[];
  steps?: RecipeSteps;
  notes: string;
  nextSteps: string;
  // Multi-photo support
  photos: VersionPhoto[];
  // Legacy single photo fields (kept for backward compatibility)
  photoUrl?: string;
  r2Key?: string;
  tasteRating?: number;
  visualRating?: number;
  textureRating?: number;
  tasteNotes?: string;
  visualNotes?: string;
  textureNotes?: string;
}

export interface Recipe {
  id: string;
  name: string;
  category: RecipeCategory; // Now hierarchical: { primary, secondary }
  description?: string;
  tags?: string[];
  versions: RecipeVersion[];
  activeVersionId: string | null;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
  pinnedAt: string | null;
}

export interface DuplicateRecipeData {
  name: string;
  category: RecipeCategory;
  copyTags: boolean;
  copyIngredients: boolean;
  copyNotes: boolean;
  copyRatings: boolean;
}
