import { prisma } from "@/lib/prisma";
import {
  Prisma,
  PrimaryCategory,
  SecondaryCategory,
  RecipeCategory as PrismaRecipeCategory,
} from "@prisma/client";
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
} from "@/types/recipes";

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;

export interface ListRecipesOptions {
  userId: string;
  cursor?: string | null;
  limit?: number;
}

export interface ListRecipesResult {
  recipes: Recipe[];
  nextCursor: string | null;
}

export async function listRecipes({
  userId,
  cursor,
  limit,
}: ListRecipesOptions): Promise<ListRecipesResult> {
  const take = Math.min(Math.max(limit ?? DEFAULT_PAGE_SIZE, 1), MAX_PAGE_SIZE);

  const query: {
    where: { userId: string };
    include: typeof recipeWithRelations;
    orderBy: ({ updatedAt: "desc" } | { id: "desc" })[];
    take: number;
    cursor?: { id: string };
    skip?: number;
  } = {
    where: { userId },
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

export async function getRecipe(
  recipeId: string,
  userId?: string,
): Promise<Recipe | null> {
  const record = await prisma.recipe.findUnique({
    where: { id: recipeId },
    include: recipeWithRelations,
  });

  // If userId is provided, verify the recipe belongs to the user
  if (userId && record && record.userId !== userId) {
    return null;
  }

  return record ? toRecipe(record as RecipeWithRelations) : null;
}

export interface CreateRecipeInput {
  userId: string;
  name: string;
  category: RecipeCategory;
  description?: string | null;
  tags?: string[];
}

export async function createRecipe(input: CreateRecipeInput): Promise<Recipe> {
  const recipeId = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const recipe = await tx.recipe.create({
      data: {
        userId: input.userId,
        name: input.name.trim(),
        category: PrismaRecipeCategory.other, // Legacy field, will be removed
        primaryCategory: input.category.primary as PrimaryCategory,
        secondaryCategory: input.category.secondary as SecondaryCategory,
        description: input.description?.trim() || null,
        tags: input.tags?.length ? input.tags : undefined,
      },
    });

    const version = await tx.recipeVersion.create({
      data: {
        recipeId: recipe.id,
        title: "Ver. 1",
        notes: "",
        nextSteps: "",
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
    category?: PrismaRecipeCategory;
    primaryCategory?: PrimaryCategory;
    secondaryCategory?: SecondaryCategory;
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
    payload.category = PrismaRecipeCategory.other; // Legacy field
    payload.primaryCategory = data.category.primary as PrimaryCategory;
    payload.secondaryCategory = data.category.secondary as SecondaryCategory;
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
  steps?: Array<{ order: number; text: string }>;
  notes: string;
  nextSteps: string;
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
        steps: input.steps || [],
        notes: input.notes,
        nextSteps: input.nextSteps,
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
  nextSteps?: string;
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

  return createVersion({
    recipeId: input.recipeId,
    title: newTitle,
    notes: input.notes ?? "",
    nextSteps: input.nextSteps ?? "",
    ingredients,
    setActive: input.setActive,
  });
}

export async function updateVersionDetails(
  recipeId: string,
  versionId: string,
  data: Partial<
    Pick<
      RecipeVersion,
      | "title"
      | "notes"
      | "nextSteps"
      | "tasteRating"
      | "visualRating"
      | "textureRating"
      | "tasteNotes"
      | "visualNotes"
      | "textureNotes"
    >
  > & {
    photoUrl?: string | null;
    steps?: Array<{ order: number; text: string }>;
  },
): Promise<Recipe | null> {
  await prisma.recipeVersion.update({
    where: { id: versionId },
    data,
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
  groupId?: string;
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
      groupId: input.groupId,
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
    groupId: string | null;
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

export async function batchUpdateIngredients(
  recipeId: string,
  updates: Array<{
    id: string;
    quantity?: number;
    name?: string;
    unit?: string;
    role?: IngredientRole;
    notes?: string | null;
    sortOrder?: number;
    groupId?: string | null;
  }>,
): Promise<Recipe> {
  // Use Prisma transaction to update all ingredients atomically
  await prisma.$transaction(
    updates.map((update) =>
      prisma.ingredient.update({
        where: { id: update.id },
        data: {
          ...(update.quantity !== undefined && { quantity: update.quantity }),
          ...(update.name !== undefined && { name: update.name }),
          ...(update.unit !== undefined && { unit: update.unit }),
          ...(update.role !== undefined && { role: update.role }),
          ...(update.notes !== undefined && { notes: update.notes }),
          ...(update.sortOrder !== undefined && { sortOrder: update.sortOrder }),
          ...(update.groupId !== undefined && { groupId: update.groupId }),
        },
      }),
    ),
  );

  const recipe = await getRecipe(recipeId);
  if (!recipe) {
    throw new Error("Recipe not found after batch ingredient update");
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

export interface CreateIngredientGroupInput {
  recipeId: string;
  versionId: string;
  name: string;
  enableBakersPercent?: boolean;
}

export async function createIngredientGroup(
  input: CreateIngredientGroupInput,
): Promise<Recipe> {
  const highestOrder = await prisma.ingredientGroup.findFirst({
    where: { versionId: input.versionId },
    orderBy: { orderIndex: "desc" },
    select: { orderIndex: true },
  });

  const orderIndex = (highestOrder?.orderIndex ?? -1) + 1;

  await prisma.ingredientGroup.create({
    data: {
      versionId: input.versionId,
      name: input.name,
      enableBakersPercent: input.enableBakersPercent ?? false,
      orderIndex,
    },
  });

  const recipe = await getRecipe(input.recipeId);
  if (!recipe) throw new Error("Recipe not found");
  return recipe;
}

export async function updateIngredientGroup(
  recipeId: string,
  groupId: string,
  data: Partial<{ name: string; enableBakersPercent: boolean; orderIndex: number }>,
): Promise<Recipe> {
  await prisma.ingredientGroup.update({
    where: { id: groupId },
    data,
  });

  const recipe = await getRecipe(recipeId);
  if (!recipe) throw new Error("Recipe not found");
  return recipe;
}

export async function deleteIngredientGroup(
  recipeId: string,
  groupId: string,
): Promise<Recipe> {
  await prisma.ingredientGroup.delete({
    where: { id: groupId },
  });

  const recipe = await getRecipe(recipeId);
  if (!recipe) throw new Error("Recipe not found");
  return recipe;
}

export async function migrateIngredientsToGroup(
  recipeId: string,
  versionId: string,
  groupName: string,
  enableBakersPercent: boolean,
): Promise<Recipe> {
  await prisma.$transaction(async (tx) => {
    // Create group
    const group = await tx.ingredientGroup.create({
      data: {
        versionId,
        name: groupName,
        enableBakersPercent,
        orderIndex: 0,
      },
    });

    // Update all ingredients for this version to have this groupId
    await tx.ingredient.updateMany({
      where: { versionId },
      data: { groupId: group.id },
    });
  });

  const recipe = await getRecipe(recipeId);
  if (!recipe) throw new Error("Recipe not found");
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

export async function archiveRecipe(recipeId: string): Promise<Recipe> {
  const updated = await prisma.recipe.update({
    where: { id: recipeId },
    data: { archivedAt: new Date() },
    include: recipeWithRelations,
  });

  return toRecipe(updated);
}

export async function unarchiveRecipe(recipeId: string): Promise<Recipe> {
  const updated = await prisma.recipe.update({
    where: { id: recipeId },
    data: { archivedAt: null },
    include: recipeWithRelations,
  });

  return toRecipe(updated);
}

export async function pinRecipe(recipeId: string): Promise<Recipe> {
  const updated = await prisma.recipe.update({
    where: { id: recipeId },
    data: { pinnedAt: new Date() },
    include: recipeWithRelations,
  });

  return toRecipe(updated);
}

export async function unpinRecipe(recipeId: string): Promise<Recipe> {
  const updated = await prisma.recipe.update({
    where: { id: recipeId },
    data: { pinnedAt: null },
    include: recipeWithRelations,
  });

  return toRecipe(updated);
}

export interface DuplicateRecipeInput {
  userId: string;
  sourceRecipeId: string;
  name: string;
  category: RecipeCategory;
  copyTags: boolean;
  copyIngredients: boolean;
  copyNotes: boolean;
  copyRatings: boolean;
}

export async function duplicateRecipe(input: DuplicateRecipeInput): Promise<Recipe> {
  // Fetch source recipe with active version and ingredients
  const sourceRecipe = await prisma.recipe.findUnique({
    where: { id: input.sourceRecipeId },
    include: {
      versions: {
        include: {
          ingredients: {
            orderBy: { sortOrder: "asc" },
          },
        },
      },
    },
  });

  if (!sourceRecipe) {
    throw new Error("Source recipe not found");
  }

  // Verify user owns the source recipe
  if (sourceRecipe.userId !== input.userId) {
    throw new Error("Unauthorized to duplicate this recipe");
  }

  // Find the active version
  const activeVersion = sourceRecipe.versions.find(
    (v) => v.id === sourceRecipe.activeVersionId,
  );

  if (!activeVersion) {
    throw new Error("Source recipe has no active version");
  }

  // Create new recipe in a transaction
  const newRecipeId = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    // Create the new recipe
    const newRecipe = await tx.recipe.create({
      data: {
        userId: input.userId,
        name: input.name.trim(),
        category: PrismaRecipeCategory.other, // Legacy field
        primaryCategory: input.category.primary as PrimaryCategory,
        secondaryCategory: input.category.secondary as SecondaryCategory,
        description: sourceRecipe.description,
        tags: input.copyTags && sourceRecipe.tags ? sourceRecipe.tags : undefined,
      },
    });

    // Create the initial version with data from source's active version
    const newVersion = await tx.recipeVersion.create({
      data: {
        recipeId: newRecipe.id,
        title: "Ver. 1",
        notes: input.copyNotes ? activeVersion.notes : "",
        nextSteps: input.copyNotes ? activeVersion.nextSteps : "",
        tasteRating: input.copyRatings ? activeVersion.tasteRating : null,
        visualRating: input.copyRatings ? activeVersion.visualRating : null,
        textureRating: input.copyRatings ? activeVersion.textureRating : null,
        tasteNotes: input.copyRatings ? activeVersion.tasteNotes : null,
        visualNotes: input.copyRatings ? activeVersion.visualNotes : null,
        textureNotes: input.copyRatings ? activeVersion.textureNotes : null,
        ingredients: input.copyIngredients
          ? {
              create: activeVersion.ingredients.map((ingredient) => ({
                name: ingredient.name,
                quantity: ingredient.quantity,
                unit: ingredient.unit,
                role: ingredient.role,
                notes: ingredient.notes,
                sortOrder: ingredient.sortOrder,
              })),
            }
          : undefined,
      },
    });

    // Set the active version
    await tx.recipe.update({
      where: { id: newRecipe.id },
      data: { activeVersionId: newVersion.id },
    });

    return newRecipe.id;
  });

  // Fetch and return the complete new recipe
  const newRecipe = await getRecipe(newRecipeId);
  if (!newRecipe) {
    throw new Error("Recipe not found after duplication");
  }

  return newRecipe;
}

// ============================================
// Version Photo Functions (Multi-Photo Support)
// ============================================

const MAX_PHOTOS_PER_VERSION = 10;

export interface AddVersionPhotoInput {
  recipeId: string;
  versionId: string;
  photoUrl: string;
  r2Key?: string;
}

export async function addVersionPhoto(input: AddVersionPhotoInput): Promise<Recipe> {
  // Check current photo count
  const photoCount = await prisma.versionPhoto.count({
    where: { versionId: input.versionId },
  });

  if (photoCount >= MAX_PHOTOS_PER_VERSION) {
    throw new Error(`Maximum ${MAX_PHOTOS_PER_VERSION} photos per version allowed`);
  }

  // Get the highest order
  const highestOrder = await prisma.versionPhoto.findFirst({
    where: { versionId: input.versionId },
    orderBy: { order: "desc" },
    select: { order: true },
  });

  const order = (highestOrder?.order ?? -1) + 1;

  await prisma.versionPhoto.create({
    data: {
      versionId: input.versionId,
      photoUrl: input.photoUrl,
      r2Key: input.r2Key ?? null,
      order,
    },
  });

  const recipe = await getRecipe(input.recipeId);
  if (!recipe) {
    throw new Error("Recipe not found after adding photo");
  }
  return recipe;
}

export async function removeVersionPhoto(
  recipeId: string,
  photoId: string,
): Promise<{ recipe: Recipe; r2Key: string | null }> {
  // Get the photo to return r2Key for deletion
  const photo = await prisma.versionPhoto.findUnique({
    where: { id: photoId },
    select: { r2Key: true },
  });

  await prisma.versionPhoto.delete({
    where: { id: photoId },
  });

  const recipe = await getRecipe(recipeId);
  if (!recipe) {
    throw new Error("Recipe not found after removing photo");
  }
  return { recipe, r2Key: photo?.r2Key ?? null };
}

export async function reorderVersionPhotos(
  recipeId: string,
  versionId: string,
  photoIds: string[],
): Promise<Recipe> {
  // Update order for each photo
  await prisma.$transaction(
    photoIds.map((id, index) =>
      prisma.versionPhoto.update({
        where: { id },
        data: { order: index },
      }),
    ),
  );

  const recipe = await getRecipe(recipeId);
  if (!recipe) {
    throw new Error("Recipe not found after reordering photos");
  }
  return recipe;
}
