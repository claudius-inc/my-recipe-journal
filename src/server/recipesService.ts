import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import {
  recipeWithRelations,
  toRecipe,
  toRecipes,
  type RecipeWithRelations,
} from "@/lib/recipeTransformer";
import type {
  IngredientRole,
  Recipe,
  RecipeCategory,
  RecipeVersion,
  RecipeVersionMetadata,
} from "@/types/recipes";

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;

const sanitizeMetadata = (
  metadata?: RecipeVersionMetadata | null,
): RecipeVersionMetadata => {
  if (!metadata) {
    return {};
  }

  return Object.entries(metadata).reduce((acc, [key, value]) => {
    if (typeof value === "string" || typeof value === "number") {
      acc[key] = value;
    }
    return acc;
  }, {} as RecipeVersionMetadata);
};

const parseStoredMetadata = (metadata: unknown): RecipeVersionMetadata => {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return {};
  }

  return Object.entries(metadata as Record<string, unknown>).reduce(
    (acc, [key, value]) => {
      if (typeof value === "string" || typeof value === "number") {
        acc[key] = value;
      }
      return acc;
    },
    {} as RecipeVersionMetadata,
  );
};

export interface ListRecipesOptions {
  cursor?: string | null;
  limit?: number;
}

export interface ListRecipesResult {
  recipes: Recipe[];
  nextCursor: string | null;
}

export async function listRecipes({
  cursor,
  limit,
}: ListRecipesOptions = {}): Promise<ListRecipesResult> {
  const take = Math.min(Math.max(limit ?? DEFAULT_PAGE_SIZE, 1), MAX_PAGE_SIZE);

  const query: {
    include: typeof recipeWithRelations;
    orderBy: ({ updatedAt: "desc" } | { id: "desc" })[];
    take: number;
    cursor?: { id: string };
    skip?: number;
  } = {
    include: recipeWithRelations,
    orderBy: [{ updatedAt: "desc" as const }, { id: "desc" as const }],
    take: take + 1,
  };

  if (cursor) {
    query.cursor = { id: cursor };
    query.skip = 1;
  }

  const records = await prisma.recipe.findMany(query);
  const hasNext = records.length > take;
  const page = hasNext ? records.slice(0, take) : records;
  const nextCursor = hasNext ? (page[page.length - 1]?.id ?? null) : null;

  return {
    recipes: toRecipes(page as RecipeWithRelations[]),
    nextCursor,
  };
}

export async function getRecipe(recipeId: string): Promise<Recipe | null> {
  const record = await prisma.recipe.findUnique({
    where: { id: recipeId },
    include: recipeWithRelations,
  });
  return record ? toRecipe(record as RecipeWithRelations) : null;
}

export interface CreateRecipeInput {
  name: string;
  category: RecipeCategory;
  description?: string | null;
  tags?: string[];
}

export async function createRecipe(input: CreateRecipeInput): Promise<Recipe> {
  const recipeId = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const recipe = await tx.recipe.create({
      data: {
        name: input.name.trim(),
        category: input.category,
        description: input.description?.trim() || null,
        tags: input.tags?.length ? input.tags : undefined,
      },
    });

    const version = await tx.recipeVersion.create({
      data: {
        recipeId: recipe.id,
        title: "Initial version",
        notes: "",
        tastingNotes: "",
        nextSteps: "",
        metadata: {},
      },
    });

    await tx.recipe.update({
      where: { id: recipe.id },
      data: { activeVersionId: version.id },
    });

    return recipe.id;
  });

  const recipe = await getRecipe(recipeId);
  if (!recipe) {
    throw new Error("Recipe not found after creation");
  }
  return recipe;
}

export async function updateRecipeDetails(
  recipeId: string,
  data: Partial<Pick<Recipe, "name" | "description" | "category" | "tags">>,
): Promise<Recipe | null> {
  const payload: {
    name?: string;
    description?: string | null;
    category?: RecipeCategory;
    tags?: string[];
  } = {};

  if (data.name !== undefined) {
    const trimmed = data.name.trim();
    if (trimmed) {
      payload.name = trimmed;
    }
  }

  if (data.description !== undefined) {
    payload.description = data.description?.trim() || null;
  }

  if (data.category !== undefined) {
    payload.category = data.category;
  }

  if (data.tags !== undefined) {
    payload.tags = data.tags?.length ? data.tags : undefined;
  }

  const updated = await prisma.recipe.update({
    where: { id: recipeId },
    data: payload,
    include: recipeWithRelations,
  });
  return updated ? toRecipe(updated as RecipeWithRelations) : null;
}

export async function setActiveVersion(
  recipeId: string,
  versionId: string | null,
): Promise<Recipe | null> {
  const updated = await prisma.recipe.update({
    where: { id: recipeId },
    data: { activeVersionId: versionId },
    include: recipeWithRelations,
  });
  return updated ? toRecipe(updated as RecipeWithRelations) : null;
}

export interface CreateVersionInput {
  recipeId: string;
  title: string;
  notes: string;
  tastingNotes: string;
  nextSteps: string;
  metadata?: RecipeVersionMetadata;
  ingredients?: Array<{
    name: string;
    quantity: number;
    unit: string;
    role: IngredientRole;
    notes?: string | null;
    sortOrder?: number;
  }>;
  setActive?: boolean;
}

type CreateVersionIngredientInput = NonNullable<
  CreateVersionInput["ingredients"]
>[number];

export async function createVersion(input: CreateVersionInput): Promise<Recipe> {
  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const createdVersion = await tx.recipeVersion.create({
      data: {
        recipeId: input.recipeId,
        title: input.title,
        notes: input.notes,
        tastingNotes: input.tastingNotes,
        nextSteps: input.nextSteps,
        metadata: sanitizeMetadata(input.metadata),
        ingredients: {
          create: (input.ingredients ?? []).map(
            (ingredient: CreateVersionIngredientInput, index: number) => ({
              name: ingredient.name,
              quantity: ingredient.quantity,
              unit: ingredient.unit,
              role: ingredient.role,
              notes: ingredient.notes ?? null,
              sortOrder: ingredient.sortOrder ?? index,
            }),
          ),
        },
      },
    });

    if (input.setActive ?? true) {
      await tx.recipe.update({
        where: { id: input.recipeId },
        data: { activeVersionId: createdVersion.id },
      });
    }
  });

  const recipe = await getRecipe(input.recipeId);
  if (!recipe) {
    throw new Error("Recipe not found after version creation");
  }
  return recipe;
}

export interface CloneVersionInput {
  recipeId: string;
  baseVersionId?: string;
  scalingFactor?: number;
  title?: string;
  notes?: string;
  tastingNotes?: string;
  nextSteps?: string;
  metadata?: RecipeVersionMetadata;
  setActive?: boolean;
}

export async function createVersionFromBase(input: CloneVersionInput): Promise<Recipe> {
  const baseVersion = input.baseVersionId
    ? await prisma.recipeVersion.findFirst({
        where: { id: input.baseVersionId, recipeId: input.recipeId },
        include: { ingredients: true },
      })
    : null;

  if (input.baseVersionId && !baseVersion) {
    throw new Error("Base version not found");
  }

  const factor = input.scalingFactor && input.scalingFactor > 0 ? input.scalingFactor : 1;
  const newTitle = input.title?.trim()
    ? input.title.trim()
    : baseVersion
      ? `${baseVersion.title}${factor !== 1 ? ` x${factor}` : " copy"}`
      : "New version";

  const ingredients = (baseVersion?.ingredients ?? []).map(
    (ingredient: any, index: number) => ({
      name: ingredient.name,
      quantity: Number(ingredient.quantity) * factor,
      unit: ingredient.unit,
      role: ingredient.role as IngredientRole,
      notes: ingredient.notes ?? null,
      sortOrder: ingredient.sortOrder ?? index,
    }),
  );

  const baseMetadata = baseVersion ? parseStoredMetadata(baseVersion.metadata) : {};
  const metadata =
    input.metadata !== undefined ? sanitizeMetadata(input.metadata) : baseMetadata;

  return createVersion({
    recipeId: input.recipeId,
    title: newTitle,
    notes: input.notes ?? baseVersion?.notes ?? "",
    tastingNotes: input.tastingNotes ?? baseVersion?.tastingNotes ?? "",
    nextSteps: input.nextSteps ?? baseVersion?.nextSteps ?? "",
    metadata,
    ingredients,
    setActive: input.setActive,
  });
}

export async function updateVersionDetails(
  recipeId: string,
  versionId: string,
  data: Partial<Pick<RecipeVersion, "title" | "notes" | "tastingNotes" | "nextSteps">> & {
    metadata?: RecipeVersionMetadata | null;
    photoUrl?: string | null;
  },
): Promise<Recipe | null> {
  const { metadata: _, ...restData } = data;
  const updatePayload = {
    ...restData,
    ...(data.metadata !== undefined
      ? { metadata: data.metadata ? sanitizeMetadata(data.metadata) : {} }
      : {}),
  };

  await prisma.recipeVersion.update({
    where: { id: versionId },
    data: updatePayload,
  });
  return getRecipe(recipeId);
}

export async function deleteVersion(
  recipeId: string,
  versionId: string,
): Promise<Recipe> {
  await prisma.recipeVersion.delete({ where: { id: versionId } });

  const [nextVersion] = await prisma.recipeVersion.findMany({
    where: { recipeId },
    orderBy: { createdAt: "desc" },
    take: 1,
  });

  await prisma.recipe.update({
    where: { id: recipeId },
    data: { activeVersionId: nextVersion?.id ?? null },
  });

  const recipe = await getRecipe(recipeId);
  if (!recipe) {
    throw new Error("Recipe not found after version deletion");
  }
  return recipe;
}

export interface UpsertIngredientInput {
  recipeId: string;
  versionId: string;
  ingredientId?: string;
  ingredient: {
    name: string;
    quantity: number;
    unit: string;
    role: IngredientRole;
    notes?: string | null;
    sortOrder?: number;
  };
}

export async function addIngredientToVersion(
  input: UpsertIngredientInput,
): Promise<Recipe> {
  const highestSortOrder = await prisma.ingredient.findFirst({
    where: { versionId: input.versionId },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });

  const sortOrder =
    input.ingredient.sortOrder ??
    (highestSortOrder?.sortOrder !== undefined ? highestSortOrder.sortOrder + 1 : 1);

  await prisma.ingredient.create({
    data: {
      versionId: input.versionId,
      name: input.ingredient.name,
      quantity: input.ingredient.quantity,
      unit: input.ingredient.unit,
      role: input.ingredient.role,
      notes: input.ingredient.notes ?? null,
      sortOrder,
    },
  });

  const recipe = await getRecipe(input.recipeId);
  if (!recipe) {
    throw new Error("Recipe not found after ingredient creation");
  }
  return recipe;
}

export async function updateIngredientDetails(
  recipeId: string,
  ingredientId: string,
  data: Partial<{
    name: string;
    quantity: number;
    unit: string;
    role: IngredientRole;
    notes: string | null;
    sortOrder: number;
  }>,
): Promise<Recipe> {
  await prisma.ingredient.update({
    where: { id: ingredientId },
    data,
  });

  const recipe = await getRecipe(recipeId);
  if (!recipe) {
    throw new Error("Recipe not found after ingredient update");
  }
  return recipe;
}

export async function deleteIngredient(
  recipeId: string,
  ingredientId: string,
): Promise<Recipe> {
  await prisma.ingredient.delete({ where: { id: ingredientId } });

  const recipe = await getRecipe(recipeId);
  if (!recipe) {
    throw new Error("Recipe not found after ingredient deletion");
  }
  return recipe;
}

export async function getIngredientSuggestions(recipeId?: string): Promise<string[]> {
  const ingredients = await prisma.ingredient.findMany({
    where: recipeId ? { version: { recipeId } } : undefined,
    select: { name: true },
  });

  const names = ingredients.map((item: { name: string }) => item.name);
  const unique = Array.from(new Set<string>(names));
  return unique.sort((a, b) => a.localeCompare(b));
}
