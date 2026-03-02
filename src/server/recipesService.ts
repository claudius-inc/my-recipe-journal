import { eq, desc, and, gt, sql, asc } from "drizzle-orm";
import { db, recipes, recipeVersions, ingredients, ingredientGroups, versionPhotos } from "@/db";
import type { 
  RecipeCategory as RecipeCategoryType, 
  PrimaryCategory as PrimaryCategoryType, 
  SecondaryCategory as SecondaryCategoryType,
  IngredientRole 
} from "@/db/schema";
import type { Recipe, RecipeVersion, RecipeCategory } from "@/types/recipes";

// ID generator
const createId = () => crypto.randomUUID();

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;

// ============ TRANSFORMERS ============

type DbRecipe = typeof recipes.$inferSelect;
type DbVersion = typeof recipeVersions.$inferSelect;
type DbIngredient = typeof ingredients.$inferSelect;
type DbIngredientGroup = typeof ingredientGroups.$inferSelect;
type DbVersionPhoto = typeof versionPhotos.$inferSelect;

interface RecipeWithRelations extends DbRecipe {
  versions: Array<DbVersion & {
    ingredients: DbIngredient[];
    ingredientGroups: Array<DbIngredientGroup & { ingredients: DbIngredient[] }>;
    photos: DbVersionPhoto[];
  }>;
}

function toISOString(date: Date | null): string | null {
  return date ? date.toISOString() : null;
}

function toRecipe(record: RecipeWithRelations): Recipe {
  const category: RecipeCategory = {
    primary: record.primaryCategory || "other",
    secondary: record.secondaryCategory || "other",
  };

  return {
    id: record.id,
    name: record.name,
    category,
    description: record.description ?? undefined,
    tags: record.tags || undefined,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    archivedAt: toISOString(record.archivedAt),
    pinnedAt: toISOString(record.pinnedAt),
    activeVersionId: record.activeVersionId,
    versions: record.versions.map((v) => ({
      id: v.id,
      title: v.title,
      steps: Array.isArray(v.steps) ? v.steps as { order: number; text: string }[] : [],
      notes: v.notes,
      nextSteps: v.nextSteps,
      photoUrl: v.photoUrl ?? undefined,
      r2Key: v.r2Key ?? undefined,
      photos: v.photos.map((p) => ({
        id: p.id,
        photoUrl: p.photoUrl,
        r2Key: p.r2Key ?? undefined,
        order: p.order,
        createdAt: p.createdAt.toISOString(),
      })),
      tasteRating: v.tasteRating ?? undefined,
      visualRating: v.visualRating ?? undefined,
      textureRating: v.textureRating ?? undefined,
      tasteNotes: v.tasteNotes ?? undefined,
      visualNotes: v.visualNotes ?? undefined,
      textureNotes: v.textureNotes ?? undefined,
      createdAt: v.createdAt.toISOString(),
      ingredients: v.ingredients.filter((i) => !i.groupId).map((i) => ({
        id: i.id,
        name: i.name,
        quantity: i.quantity,
        unit: i.unit,
        role: i.role,
        notes: i.notes ?? undefined,
      })),
      ingredientGroups: v.ingredientGroups.map((g) => ({
        id: g.id,
        name: g.name,
        order: g.orderIndex,
        enableBakersPercent: g.enableBakersPercent,
        ingredients: g.ingredients.map((i) => ({
          id: i.id,
          name: i.name,
          quantity: i.quantity,
          unit: i.unit,
          role: i.role,
          notes: i.notes ?? undefined,
        })),
      })),
    })),
  };
}

// ============ RECIPE QUERIES ============

async function fetchRecipeWithRelations(recipeId: string): Promise<RecipeWithRelations | null> {
  const recipe = await db.query.recipes.findFirst({
    where: eq(recipes.id, recipeId),
    with: {
      versions: {
        with: {
          ingredients: true,
          ingredientGroups: {
            with: { ingredients: true },
            orderBy: [asc(ingredientGroups.orderIndex)],
          },
          photos: {
            orderBy: [asc(versionPhotos.order)],
          },
        },
      },
    },
  });
  return recipe as RecipeWithRelations | null;
}

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

  // Build conditions
  const conditions = [eq(recipes.userId, userId)];
  
  if (cursor) {
    // Get cursor recipe's updatedAt for pagination
    const cursorRecipe = await db.query.recipes.findFirst({
      where: eq(recipes.id, cursor),
      columns: { updatedAt: true },
    });
    if (cursorRecipe) {
      conditions.push(sql`(${recipes.updatedAt} < ${cursorRecipe.updatedAt} OR (${recipes.updatedAt} = ${cursorRecipe.updatedAt} AND ${recipes.id} < ${cursor}))`);
    }
  }

  const records = await db.query.recipes.findMany({
    where: and(...conditions),
    with: {
      versions: {
        with: {
          ingredients: true,
          ingredientGroups: {
            with: { ingredients: true },
            orderBy: [asc(ingredientGroups.orderIndex)],
          },
          photos: {
            orderBy: [asc(versionPhotos.order)],
          },
        },
      },
    },
    orderBy: [desc(recipes.updatedAt), desc(recipes.id)],
    limit: take + 1,
  });

  const hasNext = records.length > take;
  const page = hasNext ? records.slice(0, take) : records;
  const nextCursor = hasNext ? (page[page.length - 1]?.id ?? null) : null;

  return {
    recipes: page.map((r) => toRecipe(r as RecipeWithRelations)),
    nextCursor,
  };
}

export async function getRecipe(
  recipeId: string,
  userId?: string,
): Promise<Recipe | null> {
  const record = await fetchRecipeWithRelations(recipeId);
  
  if (userId && record && record.userId !== userId) {
    return null;
  }

  return record ? toRecipe(record) : null;
}

// ============ RECIPE MUTATIONS ============

export interface CreateRecipeInput {
  userId: string;
  name: string;
  category: RecipeCategory;
  description?: string | null;
  tags?: string[];
}

export async function createRecipe(input: CreateRecipeInput): Promise<Recipe> {
  const recipeId = createId();
  const versionId = createId();

  // Insert recipe
  await db.insert(recipes).values({
    id: recipeId,
    userId: input.userId,
    name: input.name.trim(),
    category: "other" as RecipeCategoryType, // Legacy field
    primaryCategory: input.category.primary as PrimaryCategoryType,
    secondaryCategory: input.category.secondary as SecondaryCategoryType,
    description: input.description?.trim() || null,
    tags: input.tags?.length ? input.tags : null,
    activeVersionId: versionId,
  });

  // Insert initial version
  await db.insert(recipeVersions).values({
    id: versionId,
    recipeId,
    title: "Ver. 1",
    notes: "",
    nextSteps: "",
  });

  const recipe = await getRecipe(recipeId);
  if (!recipe) throw new Error("Recipe not found after creation");
  return recipe;
}

export async function updateRecipeDetails(
  recipeId: string,
  data: Partial<Pick<Recipe, "name" | "description" | "category" | "tags">>,
): Promise<Recipe | null> {
  const updates: Partial<typeof recipes.$inferInsert> = {
    updatedAt: new Date(),
  };

  if (data.name !== undefined) {
    const trimmed = data.name.trim();
    if (trimmed) updates.name = trimmed;
  }
  if (data.description !== undefined) {
    updates.description = data.description?.trim() || null;
  }
  if (data.category !== undefined) {
    updates.category = "other" as RecipeCategoryType;
    updates.primaryCategory = data.category.primary as PrimaryCategoryType;
    updates.secondaryCategory = data.category.secondary as SecondaryCategoryType;
  }
  if (data.tags !== undefined) {
    updates.tags = data.tags?.length ? data.tags : null;
  }

  await db.update(recipes).set(updates).where(eq(recipes.id, recipeId));
  return getRecipe(recipeId);
}

export async function setActiveVersion(
  recipeId: string,
  versionId: string | null,
): Promise<Recipe | null> {
  await db.update(recipes)
    .set({ activeVersionId: versionId, updatedAt: new Date() })
    .where(eq(recipes.id, recipeId));
  return getRecipe(recipeId);
}

// ============ VERSION MUTATIONS ============

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

export async function createVersion(input: CreateVersionInput): Promise<Recipe> {
  const versionId = createId();

  // Insert version
  await db.insert(recipeVersions).values({
    id: versionId,
    recipeId: input.recipeId,
    title: input.title,
    steps: input.steps || [],
    notes: input.notes,
    nextSteps: input.nextSteps,
  });

  // Insert ingredients if provided
  if (input.ingredients?.length) {
    await db.insert(ingredients).values(
      input.ingredients.map((ing, index) => ({
        id: createId(),
        versionId,
        name: ing.name,
        quantity: ing.quantity,
        unit: ing.unit,
        role: ing.role,
        notes: ing.notes ?? null,
        sortOrder: ing.sortOrder ?? index,
      }))
    );
  }

  // Set as active if requested
  if (input.setActive ?? true) {
    await db.update(recipes)
      .set({ activeVersionId: versionId, updatedAt: new Date() })
      .where(eq(recipes.id, input.recipeId));
  }

  const recipe = await getRecipe(input.recipeId);
  if (!recipe) throw new Error("Recipe not found after version creation");
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
  let baseVersion: (DbVersion & { ingredients: DbIngredient[] }) | null = null;

  if (input.baseVersionId) {
    const version = await db.query.recipeVersions.findFirst({
      where: and(
        eq(recipeVersions.id, input.baseVersionId),
        eq(recipeVersions.recipeId, input.recipeId)
      ),
      with: { ingredients: true },
    });
    
    if (!version) throw new Error("Base version not found");
    baseVersion = version;
  }

  const factor = input.scalingFactor && input.scalingFactor > 0 ? input.scalingFactor : 1;
  const newTitle = input.title?.trim()
    ? input.title.trim()
    : baseVersion
      ? `${baseVersion.title}${factor !== 1 ? ` x${factor}` : " copy"}`
      : "New version";

  const newIngredients = (baseVersion?.ingredients ?? []).map((ing, index) => ({
    name: ing.name,
    quantity: ing.quantity * factor,
    unit: ing.unit,
    role: ing.role as IngredientRole,
    notes: ing.notes ?? null,
    sortOrder: ing.sortOrder ?? index,
  }));

  return createVersion({
    recipeId: input.recipeId,
    title: newTitle,
    notes: input.notes ?? "",
    nextSteps: input.nextSteps ?? "",
    ingredients: newIngredients,
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
  const updates: Partial<typeof recipeVersions.$inferInsert> = {
    updatedAt: new Date(),
  };

  if (data.title !== undefined) updates.title = data.title;
  if (data.notes !== undefined) updates.notes = data.notes;
  if (data.nextSteps !== undefined) updates.nextSteps = data.nextSteps;
  if (data.photoUrl !== undefined) updates.photoUrl = data.photoUrl;
  if (data.steps !== undefined) updates.steps = data.steps;
  if (data.tasteRating !== undefined) updates.tasteRating = data.tasteRating;
  if (data.visualRating !== undefined) updates.visualRating = data.visualRating;
  if (data.textureRating !== undefined) updates.textureRating = data.textureRating;
  if (data.tasteNotes !== undefined) updates.tasteNotes = data.tasteNotes;
  if (data.visualNotes !== undefined) updates.visualNotes = data.visualNotes;
  if (data.textureNotes !== undefined) updates.textureNotes = data.textureNotes;

  await db.update(recipeVersions).set(updates).where(eq(recipeVersions.id, versionId));
  return getRecipe(recipeId);
}

export async function deleteVersion(
  recipeId: string,
  versionId: string,
): Promise<Recipe> {
  await db.delete(recipeVersions).where(eq(recipeVersions.id, versionId));

  // Find next version to set as active
  const nextVersion = await db.query.recipeVersions.findFirst({
    where: eq(recipeVersions.recipeId, recipeId),
    orderBy: [desc(recipeVersions.createdAt)],
    columns: { id: true },
  });

  await db.update(recipes)
    .set({ activeVersionId: nextVersion?.id ?? null, updatedAt: new Date() })
    .where(eq(recipes.id, recipeId));

  const recipe = await getRecipe(recipeId);
  if (!recipe) throw new Error("Recipe not found after version deletion");
  return recipe;
}

// ============ INGREDIENT MUTATIONS ============

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

export async function addIngredientToVersion(input: UpsertIngredientInput): Promise<Recipe> {
  // Get highest sort order
  const highest = await db.query.ingredients.findFirst({
    where: eq(ingredients.versionId, input.versionId),
    orderBy: [desc(ingredients.sortOrder)],
    columns: { sortOrder: true },
  });

  const sortOrder = input.ingredient.sortOrder ?? ((highest?.sortOrder ?? 0) + 1);

  await db.insert(ingredients).values({
    id: createId(),
    versionId: input.versionId,
    groupId: input.groupId ?? null,
    name: input.ingredient.name,
    quantity: input.ingredient.quantity,
    unit: input.ingredient.unit,
    role: input.ingredient.role,
    notes: input.ingredient.notes ?? null,
    sortOrder,
  });

  const recipe = await getRecipe(input.recipeId);
  if (!recipe) throw new Error("Recipe not found after ingredient creation");
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
  const updates: Partial<typeof ingredients.$inferInsert> = {
    updatedAt: new Date(),
  };

  if (data.name !== undefined) updates.name = data.name;
  if (data.quantity !== undefined) updates.quantity = data.quantity;
  if (data.unit !== undefined) updates.unit = data.unit;
  if (data.role !== undefined) updates.role = data.role;
  if (data.notes !== undefined) updates.notes = data.notes;
  if (data.sortOrder !== undefined) updates.sortOrder = data.sortOrder;
  if (data.groupId !== undefined) updates.groupId = data.groupId;

  await db.update(ingredients).set(updates).where(eq(ingredients.id, ingredientId));

  const recipe = await getRecipe(recipeId);
  if (!recipe) throw new Error("Recipe not found after ingredient update");
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
  // Batch update using Promise.all (Turso handles concurrent requests well)
  await Promise.all(
    updates.map((update) => {
      const data: Partial<typeof ingredients.$inferInsert> = { updatedAt: new Date() };
      if (update.quantity !== undefined) data.quantity = update.quantity;
      if (update.name !== undefined) data.name = update.name;
      if (update.unit !== undefined) data.unit = update.unit;
      if (update.role !== undefined) data.role = update.role;
      if (update.notes !== undefined) data.notes = update.notes;
      if (update.sortOrder !== undefined) data.sortOrder = update.sortOrder;
      if (update.groupId !== undefined) data.groupId = update.groupId;
      
      return db.update(ingredients).set(data).where(eq(ingredients.id, update.id));
    })
  );

  const recipe = await getRecipe(recipeId);
  if (!recipe) throw new Error("Recipe not found after batch ingredient update");
  return recipe;
}

export async function deleteIngredient(recipeId: string, ingredientId: string): Promise<Recipe> {
  await db.delete(ingredients).where(eq(ingredients.id, ingredientId));

  const recipe = await getRecipe(recipeId);
  if (!recipe) throw new Error("Recipe not found after ingredient deletion");
  return recipe;
}

// ============ INGREDIENT GROUP MUTATIONS ============

export interface CreateIngredientGroupInput {
  recipeId: string;
  versionId: string;
  name: string;
  enableBakersPercent?: boolean;
}

export async function createIngredientGroup(input: CreateIngredientGroupInput): Promise<Recipe> {
  const highest = await db.query.ingredientGroups.findFirst({
    where: eq(ingredientGroups.versionId, input.versionId),
    orderBy: [desc(ingredientGroups.orderIndex)],
    columns: { orderIndex: true },
  });

  const orderIndex = (highest?.orderIndex ?? -1) + 1;

  await db.insert(ingredientGroups).values({
    id: createId(),
    versionId: input.versionId,
    name: input.name,
    enableBakersPercent: input.enableBakersPercent ?? false,
    orderIndex,
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
  const updates: Partial<typeof ingredientGroups.$inferInsert> = { updatedAt: new Date() };
  if (data.name !== undefined) updates.name = data.name;
  if (data.enableBakersPercent !== undefined) updates.enableBakersPercent = data.enableBakersPercent;
  if (data.orderIndex !== undefined) updates.orderIndex = data.orderIndex;

  await db.update(ingredientGroups).set(updates).where(eq(ingredientGroups.id, groupId));

  const recipe = await getRecipe(recipeId);
  if (!recipe) throw new Error("Recipe not found");
  return recipe;
}

export async function deleteIngredientGroup(recipeId: string, groupId: string): Promise<Recipe> {
  await db.delete(ingredientGroups).where(eq(ingredientGroups.id, groupId));

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
  const groupId = createId();

  // Create group
  await db.insert(ingredientGroups).values({
    id: groupId,
    versionId,
    name: groupName,
    enableBakersPercent,
    orderIndex: 0,
  });

  // Update all ingredients for this version
  await db.update(ingredients)
    .set({ groupId })
    .where(eq(ingredients.versionId, versionId));

  const recipe = await getRecipe(recipeId);
  if (!recipe) throw new Error("Recipe not found");
  return recipe;
}

export async function getIngredientSuggestions(recipeId?: string): Promise<string[]> {
  let query;
  if (recipeId) {
    // Get ingredients for this recipe's versions
    const versions = await db.query.recipeVersions.findMany({
      where: eq(recipeVersions.recipeId, recipeId),
      columns: { id: true },
    });
    const versionIds = versions.map((v) => v.id);
    
    query = await db.query.ingredients.findMany({
      where: sql`${ingredients.versionId} IN (${sql.join(versionIds.map(id => sql`${id}`), sql`, `)})`,
      columns: { name: true },
    });
  } else {
    query = await db.query.ingredients.findMany({
      columns: { name: true },
    });
  }

  const names = query.map((i) => i.name);
  const unique = Array.from(new Set(names));
  return unique.sort((a, b) => a.localeCompare(b));
}

// ============ ARCHIVE/PIN ============

export async function archiveRecipe(recipeId: string): Promise<Recipe> {
  await db.update(recipes)
    .set({ archivedAt: new Date(), updatedAt: new Date() })
    .where(eq(recipes.id, recipeId));

  const recipe = await getRecipe(recipeId);
  if (!recipe) throw new Error("Recipe not found");
  return recipe;
}

export async function unarchiveRecipe(recipeId: string): Promise<Recipe> {
  await db.update(recipes)
    .set({ archivedAt: null, updatedAt: new Date() })
    .where(eq(recipes.id, recipeId));

  const recipe = await getRecipe(recipeId);
  if (!recipe) throw new Error("Recipe not found");
  return recipe;
}

export async function pinRecipe(recipeId: string): Promise<Recipe> {
  await db.update(recipes)
    .set({ pinnedAt: new Date(), updatedAt: new Date() })
    .where(eq(recipes.id, recipeId));

  const recipe = await getRecipe(recipeId);
  if (!recipe) throw new Error("Recipe not found");
  return recipe;
}

export async function unpinRecipe(recipeId: string): Promise<Recipe> {
  await db.update(recipes)
    .set({ pinnedAt: null, updatedAt: new Date() })
    .where(eq(recipes.id, recipeId));

  const recipe = await getRecipe(recipeId);
  if (!recipe) throw new Error("Recipe not found");
  return recipe;
}

// ============ DUPLICATE ============

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
  const sourceRecipe = await fetchRecipeWithRelations(input.sourceRecipeId);
  if (!sourceRecipe) throw new Error("Source recipe not found");
  if (sourceRecipe.userId !== input.userId) throw new Error("Unauthorized");

  const activeVersion = sourceRecipe.versions.find((v) => v.id === sourceRecipe.activeVersionId);
  if (!activeVersion) throw new Error("Source recipe has no active version");

  const newRecipeId = createId();
  const newVersionId = createId();

  // Create new recipe
  await db.insert(recipes).values({
    id: newRecipeId,
    userId: input.userId,
    name: input.name.trim(),
    category: "other" as RecipeCategoryType,
    primaryCategory: input.category.primary as PrimaryCategoryType,
    secondaryCategory: input.category.secondary as SecondaryCategoryType,
    description: sourceRecipe.description,
    tags: input.copyTags && sourceRecipe.tags ? sourceRecipe.tags : null,
    activeVersionId: newVersionId,
  });

  // Create version
  await db.insert(recipeVersions).values({
    id: newVersionId,
    recipeId: newRecipeId,
    title: "Ver. 1",
    notes: input.copyNotes ? activeVersion.notes : "",
    nextSteps: input.copyNotes ? activeVersion.nextSteps : "",
    tasteRating: input.copyRatings ? activeVersion.tasteRating : null,
    visualRating: input.copyRatings ? activeVersion.visualRating : null,
    textureRating: input.copyRatings ? activeVersion.textureRating : null,
    tasteNotes: input.copyRatings ? activeVersion.tasteNotes : null,
    visualNotes: input.copyRatings ? activeVersion.visualNotes : null,
    textureNotes: input.copyRatings ? activeVersion.textureNotes : null,
  });

  // Copy ingredients if requested
  if (input.copyIngredients && activeVersion.ingredients.length) {
    await db.insert(ingredients).values(
      activeVersion.ingredients.map((ing) => ({
        id: createId(),
        versionId: newVersionId,
        name: ing.name,
        quantity: ing.quantity,
        unit: ing.unit,
        role: ing.role,
        notes: ing.notes,
        sortOrder: ing.sortOrder,
      }))
    );
  }

  const recipe = await getRecipe(newRecipeId);
  if (!recipe) throw new Error("Recipe not found after duplication");
  return recipe;
}

// ============ VERSION PHOTOS ============

const MAX_PHOTOS_PER_VERSION = 10;

export interface AddVersionPhotoInput {
  recipeId: string;
  versionId: string;
  photoUrl: string;
  r2Key?: string;
}

export async function addVersionPhoto(input: AddVersionPhotoInput): Promise<Recipe> {
  const photoCount = await db.select({ count: sql<number>`count(*)` })
    .from(versionPhotos)
    .where(eq(versionPhotos.versionId, input.versionId));

  if (photoCount[0].count >= MAX_PHOTOS_PER_VERSION) {
    throw new Error(`Maximum ${MAX_PHOTOS_PER_VERSION} photos per version allowed`);
  }

  const highest = await db.query.versionPhotos.findFirst({
    where: eq(versionPhotos.versionId, input.versionId),
    orderBy: [desc(versionPhotos.order)],
    columns: { order: true },
  });

  const order = (highest?.order ?? -1) + 1;

  await db.insert(versionPhotos).values({
    id: createId(),
    versionId: input.versionId,
    photoUrl: input.photoUrl,
    r2Key: input.r2Key ?? null,
    order,
  });

  const recipe = await getRecipe(input.recipeId);
  if (!recipe) throw new Error("Recipe not found after adding photo");
  return recipe;
}

export async function removeVersionPhoto(
  recipeId: string,
  photoId: string,
): Promise<{ recipe: Recipe; r2Key: string | null }> {
  const photo = await db.query.versionPhotos.findFirst({
    where: eq(versionPhotos.id, photoId),
    columns: { r2Key: true },
  });

  await db.delete(versionPhotos).where(eq(versionPhotos.id, photoId));

  const recipe = await getRecipe(recipeId);
  if (!recipe) throw new Error("Recipe not found after removing photo");
  return { recipe, r2Key: photo?.r2Key ?? null };
}

export async function reorderVersionPhotos(
  recipeId: string,
  versionId: string,
  photoIds: string[],
): Promise<Recipe> {
  await Promise.all(
    photoIds.map((id, index) =>
      db.update(versionPhotos)
        .set({ order: index })
        .where(eq(versionPhotos.id, id))
    )
  );

  const recipe = await getRecipe(recipeId);
  if (!recipe) throw new Error("Recipe not found after reordering photos");
  return recipe;
}
