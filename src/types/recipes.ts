export type IngredientRole =
  | "flour"
  | "liquid"
  | "preferment"
  | "salt"
  | "sweetener"
  | "fat"
  | "add_in"
  | "spice"
  | "other";

export interface Ingredient {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  role: IngredientRole;
  notes?: string;
}

export type RecipeCategory = "bread" | "dessert" | "drink" | "main" | "sauce" | "other";

export const RECIPE_CATEGORIES: RecipeCategory[] = [
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
  "preferment",
  "salt",
  "sweetener",
  "fat",
  "add_in",
  "spice",
  "other",
];

export interface RecipeVersion {
  id: string;
  title: string;
  createdAt: string;
  ingredients: Ingredient[];
  notes: string;
  nextSteps: string;
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
  category: RecipeCategory;
  description?: string;
  tags?: string[];
  versions: RecipeVersion[];
  activeVersionId: string | null;
  createdAt: string;
  updatedAt: string;
}
