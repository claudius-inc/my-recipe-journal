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

export interface CategoryField {
  id: string;
  label: string;
  type: "text" | "textarea" | "number" | "select";
  helpText?: string;
  placeholder?: string;
  options?: string[];
  unit?: string;
}

export interface CategoryConfig {
  id: RecipeCategory;
  name: string;
  description: string;
  enableBakersPercent?: boolean;
  fields?: CategoryField[];
}

export interface RecipeVersionMetadata {
  [fieldId: string]: string | number | undefined;
}

export interface RecipeVersion {
  id: string;
  title: string;
  createdAt: string;
  ingredients: Ingredient[];
  notes: string;
  tastingNotes: string;
  nextSteps: string;
  metadata?: RecipeVersionMetadata;
  photoUrl?: string;
  tasteRating?: number;
  visualRating?: number;
  textureRating?: number;
  tasteTags?: string[];
  textureTags?: string[];
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

export const CATEGORY_CONFIGS: Record<RecipeCategory, CategoryConfig> = {
  bread: {
    id: "bread",
    name: "Bread",
    description:
      "Track dough performance, hydration, and fermentation cues with baker's percentages.",
    enableBakersPercent: true,
    fields: [
      {
        id: "bulkFermentation",
        label: "Bulk fermentation notes",
        type: "textarea",
        placeholder: "Describe dough strength, temperature, or timing cues.",
      },
      {
        id: "proofing",
        label: "Final proofing notes",
        type: "textarea",
        placeholder: "How did the dough respond during final proof?",
      },
    ],
  },
  dessert: {
    id: "dessert",
    name: "Dessert",
    description: "Capture sweetness, texture, and finishing ideas.",
    fields: [
      {
        id: "sweetnessLevel",
        label: "Sweetness level (1-10)",
        type: "number",
        helpText: "Rate perceived sweetness to dial in future adjustments.",
      },
      {
        id: "texture",
        label: "Texture notes",
        type: "textarea",
        placeholder: "Describe crumb, chew, crunch, or creaminess.",
      },
    ],
  },
  drink: {
    id: "drink",
    name: "Drink",
    description: "Track brew variables and serving preferences.",
    fields: [
      {
        id: "brewTime",
        label: "Brew time (seconds)",
        type: "number",
        helpText: "Record extraction timing for repeatability.",
      },
      {
        id: "servingTemp",
        label: "Serving temperature",
        type: "text",
        placeholder: "e.g. iced, 60°C, room temp",
      },
    ],
  },
  main: {
    id: "main",
    name: "Main",
    description: "Note serving size, cook time, and plating ideas.",
    fields: [
      {
        id: "servings",
        label: "Servings",
        type: "number",
      },
      {
        id: "cookTime",
        label: "Cook time",
        type: "text",
        placeholder: "e.g. 45 min oven, 10 min rest",
      },
    ],
  },
  sauce: {
    id: "sauce",
    name: "Sauce",
    description: "Dial in viscosity, balance, and pairings.",
    fields: [
      {
        id: "viscosity",
        label: "Viscosity notes",
        type: "textarea",
        placeholder: "Thickness, cling, reduction cues",
      },
      {
        id: "pairings",
        label: "Pairings",
        type: "text",
        placeholder: "Best with grilled vegetables, roast chicken…",
      },
    ],
  },
  other: {
    id: "other",
    name: "Other",
    description: "Flexible space for experimental recipes.",
  },
};
