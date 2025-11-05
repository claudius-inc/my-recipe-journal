import type {
  Ingredient,
  IngredientRole,
  Recipe,
  RecipeCategory,
  RecipeVersion,
  RecipeVersionMetadata,
} from "@/types/recipes";

export const recipeWithRelations = {
  versions: {
    include: {
      ingredients: true,
    },
  },
} as const;

type PrismaIngredientRecord = {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  role: IngredientRole;
  notes: string | null;
  sortOrder: number;
};

type PrismaRecipeVersionRecord = {
  id: string;
  title: string;
  createdAt: Date;
  notes: string;
  tastingNotes: string;
  nextSteps: string;
  metadata: Record<string, unknown> | null;
  photoUrl: string | null;
  ingredients: PrismaIngredientRecord[];
};

type PrismaRecipeRecord = {
  id: string;
  name: string;
  category: RecipeCategory;
  description: string | null;
  tags: unknown;
  activeVersionId: string | null;
  createdAt: Date;
  updatedAt: Date;
  versions: PrismaRecipeVersionRecord[];
};

export type RecipeWithRelations = PrismaRecipeRecord;

const toRecipeVersionMetadata = (
  metadata: Record<string, unknown> | null,
): RecipeVersionMetadata | undefined => {
  if (!metadata) {
    return undefined;
  }

  return Object.entries(metadata).reduce((acc, [key, value]) => {
    if (typeof value === "string" || typeof value === "number") {
      acc[key] = value;
    }
    return acc;
  }, {} as RecipeVersionMetadata);
};

export const toIngredient = (ingredient: PrismaIngredientRecord): Ingredient => ({
  id: ingredient.id,
  name: ingredient.name,
  quantity: Number(ingredient.quantity),
  unit: ingredient.unit,
  role: ingredient.role,
  notes: ingredient.notes ?? undefined,
});

export const toRecipeVersion = (version: PrismaRecipeVersionRecord): RecipeVersion => ({
  id: version.id,
  title: version.title,
  createdAt: version.createdAt.toISOString(),
  ingredients: [...version.ingredients]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((ingredient) => toIngredient(ingredient)),
  notes: version.notes,
  tastingNotes: version.tastingNotes,
  nextSteps: version.nextSteps,
  metadata: toRecipeVersionMetadata(version.metadata),
  photoUrl: version.photoUrl ?? undefined,
});

export const toRecipe = (recipe: PrismaRecipeRecord): Recipe => ({
  id: recipe.id,
  name: recipe.name,
  category: recipe.category,
  description: recipe.description ?? undefined,
  tags: (recipe.tags as string[] | null) ?? undefined,
  versions: recipe.versions
    .slice()
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .map((version) => toRecipeVersion(version)),
  activeVersionId: recipe.activeVersionId,
  createdAt: recipe.createdAt.toISOString(),
  updatedAt: recipe.updatedAt.toISOString(),
});

export const toRecipes = (recipes: PrismaRecipeRecord[]): Recipe[] =>
  recipes.map((recipe) => toRecipe(recipe));
