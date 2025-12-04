import type {
  Ingredient,
  IngredientGroup,
  IngredientRole,
  Recipe,
  RecipeCategory,
  RecipeVersion,
  RecipeStep,
  PrimaryCategoryKey,
  SecondaryCategoryKey,
} from "@/types/recipes";
import type { PrimaryCategory, SecondaryCategory } from "@prisma/client";
import { validateSteps } from "./recipe-steps-helpers";

export const recipeWithRelations = {
  versions: {
    include: {
      ingredients: true,
      ingredientGroups: {
        include: {
          ingredients: true,
        },
        orderBy: {
          orderIndex: "asc",
        },
      },
      photos: {
        orderBy: {
          order: "asc",
        },
      },
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

type PrismaIngredientGroupRecord = {
  id: string;
  name: string;
  orderIndex: number;
  enableBakersPercent: boolean;
  ingredients: PrismaIngredientRecord[];
};

type PrismaVersionPhotoRecord = {
  id: string;
  photoUrl: string;
  r2Key: string | null;
  order: number;
  createdAt: Date;
};

type PrismaRecipeVersionRecord = {
  id: string;
  title: string;
  steps: unknown;
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
  ingredientGroups: PrismaIngredientGroupRecord[];
  photos?: PrismaVersionPhotoRecord[];
};

type PrismaRecipeRecord = {
  id: string;
  name: string;
  primaryCategory: PrimaryCategory | null;
  secondaryCategory: SecondaryCategory | null;
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

export const toRecipeVersion = (version: PrismaRecipeVersionRecord): RecipeVersion => {
  // Parse and validate steps from JSON
  let steps: RecipeStep[] | undefined;
  if (version.steps && validateSteps(version.steps)) {
    steps = version.steps as RecipeStep[];
  } else if (Array.isArray(version.steps) && version.steps.length === 0) {
    steps = undefined;
  }

  return {
    id: version.id,
    title: version.title,
    createdAt: version.createdAt.toISOString(),
    ingredientGroups: version.ingredientGroups?.map((group) => ({
      id: group.id,
      name: group.name,
      order: group.orderIndex,
      enableBakersPercent: group.enableBakersPercent,
      ingredients: group.ingredients
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((ingredient) => toIngredient(ingredient)),
    })),
    ingredients: [...version.ingredients]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((ingredient) => toIngredient(ingredient)),
    steps,
    notes: version.notes,
    nextSteps: version.nextSteps,
    // Multi-photo support
    photos: (version.photos ?? []).map((photo) => ({
      id: photo.id,
      photoUrl: photo.photoUrl,
      r2Key: photo.r2Key ?? undefined,
      order: photo.order,
      createdAt: photo.createdAt.toISOString(),
    })),
    // Legacy single photo field
    photoUrl: version.photoUrl ?? undefined,
    tasteRating: version.tasteRating ?? undefined,
    visualRating: version.visualRating ?? undefined,
    textureRating: version.textureRating ?? undefined,
    tasteNotes: version.tasteNotes ?? undefined,
    visualNotes: version.visualNotes ?? undefined,
    textureNotes: version.textureNotes ?? undefined,
  };
};

export const toRecipe = (recipe: PrismaRecipeRecord): Recipe => {
  // Convert Prisma enum categories to hierarchical TypeScript type
  const category: RecipeCategory = {
    primary: (recipe.primaryCategory as PrimaryCategoryKey) || "other",
    secondary: (recipe.secondaryCategory as SecondaryCategoryKey) || "other",
  };

  return {
    id: recipe.id,
    name: recipe.name,
    category,
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
  };
};

export const toRecipes = (recipes: PrismaRecipeRecord[]): Recipe[] =>
  recipes.map((recipe) => toRecipe(recipe));
