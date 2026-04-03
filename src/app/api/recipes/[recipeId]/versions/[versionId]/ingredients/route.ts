import { NextResponse } from "next/server";

import { INGREDIENT_ROLES, type IngredientRole } from "@/types/recipes";
import {
  addIngredientToVersion,
  batchUpdateIngredients,
  getRecipe,
} from "@/server/recipesService";

export async function POST(
  request: Request,
  { params }: { params: { recipeId: string; versionId: string } },
) {
  const { recipeId, versionId } = params;

  const recipe = await getRecipe(recipeId);

  if (!recipe) {
    return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
  }

  const versionExists = recipe.versions.some((version) => version.id === versionId);

  if (!versionExists) {
    return NextResponse.json({ error: "Version not found" }, { status: 404 });
  }

  const payload = (await request.json().catch(() => ({}))) as {
    name?: string;
    quantity?: number | null;
    unit?: string;
    role?: IngredientRole;
    notes?: string | null;
    sortOrder?: number;
    groupId?: string;
  };

  if (!payload.name?.trim()) {
    return NextResponse.json({ error: "Ingredient name is required" }, { status: 400 });
  }

  // Allow null quantity for "to taste" ingredients, but validate if provided
  if (payload.quantity !== null && payload.quantity !== undefined) {
    if (typeof payload.quantity !== "number" || Number.isNaN(payload.quantity)) {
      return NextResponse.json(
        { error: "Ingredient quantity must be a number" },
        { status: 400 },
      );
    }
  }

  if (!payload.unit?.trim()) {
    return NextResponse.json({ error: "Ingredient unit is required" }, { status: 400 });
  }

  if (!payload.role || !INGREDIENT_ROLES.includes(payload.role)) {
    return NextResponse.json({ error: "Invalid ingredient role" }, { status: 400 });
  }

  const updatedRecipe = await addIngredientToVersion({
    recipeId,
    versionId,
    groupId: payload.groupId,
    ingredient: {
      name: payload.name.trim(),
      quantity: payload.quantity ?? null,
      unit: payload.unit.trim(),
      role: payload.role,
      notes: payload.notes?.trim() || null,
      sortOrder: payload.sortOrder,
    },
  });

  return NextResponse.json({ data: updatedRecipe }, { status: 201 });
}

export async function PATCH(
  request: Request,
  { params }: { params: { recipeId: string; versionId: string } },
) {
  const { recipeId, versionId } = params;

  const recipe = await getRecipe(recipeId);

  if (!recipe) {
    return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
  }

  const versionExists = recipe.versions.some((version) => version.id === versionId);

  if (!versionExists) {
    return NextResponse.json({ error: "Version not found" }, { status: 404 });
  }

  const payload = (await request.json().catch(() => ({}))) as {
    updates?: Array<{
      id: string;
      quantity?: number;
      name?: string;
      unit?: string;
      role?: IngredientRole;
      notes?: string | null;
      sortOrder?: number;
    }>;
  };

  if (!Array.isArray(payload.updates) || payload.updates.length === 0) {
    return NextResponse.json(
      { error: "Updates array is required and must not be empty" },
      { status: 400 },
    );
  }

  // Validate each update
  for (const update of payload.updates) {
    if (!update.id) {
      return NextResponse.json({ error: "Each update must have an id" }, { status: 400 });
    }

    if (update.quantity !== undefined) {
      if (typeof update.quantity !== "number" || Number.isNaN(update.quantity)) {
        return NextResponse.json(
          { error: `Invalid quantity for ingredient ${update.id}` },
          { status: 400 },
        );
      }
    }

    if (update.name !== undefined && !update.name.trim()) {
      return NextResponse.json(
        { error: `Invalid name for ingredient ${update.id}` },
        { status: 400 },
      );
    }

    if (update.unit !== undefined && !update.unit.trim()) {
      return NextResponse.json(
        { error: `Invalid unit for ingredient ${update.id}` },
        { status: 400 },
      );
    }

    if (update.role !== undefined && !INGREDIENT_ROLES.includes(update.role)) {
      return NextResponse.json(
        { error: `Invalid role for ingredient ${update.id}` },
        { status: 400 },
      );
    }
  }

  const updatedRecipe = await batchUpdateIngredients(recipeId, payload.updates);

  return NextResponse.json({ data: updatedRecipe });
}
