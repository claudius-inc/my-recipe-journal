import type {
  Ingredient,
  IngredientRole,
  Recipe,
  RecipeCategory,
  RecipeVersion,
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
  nextSteps: string;
  photoUrl: string | null;
  tasteRating: number | null;
  visualRating: number | null;
  textureRating: number | null;
  tasteNotes: string | null;
  visualNotes: string | null;
  textureNotes: string | null;
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
  archivedAt: Date | null;
  pinnedAt: Date | null;
  versions: PrismaRecipeVersionRecord[];
};

export type RecipeWithRelations = PrismaRecipeRecord;

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
  nextSteps: version.nextSteps,
  photoUrl: version.photoUrl ?? undefined,
  tasteRating: version.tasteRating ?? undefined,
  visualRating: version.visualRating ?? undefined,
  textureRating: version.textureRating ?? undefined,
  tasteNotes: version.tasteNotes ?? undefined,
  visualNotes: version.visualNotes ?? undefined,
  textureNotes: version.textureNotes ?? undefined,
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
  archivedAt: recipe.archivedAt ? recipe.archivedAt.toISOString() : null,
  pinnedAt: recipe.pinnedAt ? recipe.pinnedAt.toISOString() : null,
});

export const toRecipes = (recipes: PrismaRecipeRecord[]): Recipe[] =>
  recipes.map((recipe) => toRecipe(recipe));
