import { NextResponse } from "next/server";

import { INGREDIENT_ROLES, type IngredientRole } from "@/types/recipes";
import {
  deleteIngredient,
  getRecipe,
  updateIngredientDetails,
} from "@/server/recipesService";

export async function PATCH(
  request: Request,
  { params }: { params: { recipeId: string; versionId: string; ingredientId: string } },
) {
  const { recipeId, versionId, ingredientId } = params;

  const recipe = await getRecipe(recipeId);

  if (!recipe) {
    return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
  }

  const version = recipe.versions.find((item) => item.id === versionId);

  if (!version) {
    return NextResponse.json({ error: "Version not found" }, { status: 404 });
  }

  const groupedIngredients =
    version.ingredientGroups?.flatMap((g) => g.ingredients) ?? [];
  const allIngredients = [...version.ingredients, ...groupedIngredients];
  const ingredientExists = allIngredients.some((item) => item.id === ingredientId);

  if (!ingredientExists) {
    return NextResponse.json({ error: "Ingredient not found" }, { status: 404 });
  }

  const payload = (await request.json().catch(() => ({}))) as {
    name?: string;
    quantity?: number | null;
    unit?: string;
    role?: IngredientRole;
    notes?: string | null;
    sortOrder?: number;
  };

  const updateData: Parameters<typeof updateIngredientDetails>[2] = {};

  if (payload.name !== undefined) {
    if (!payload.name?.trim()) {
      return NextResponse.json(
        { error: "Ingredient name cannot be empty" },
        { status: 400 },
      );
    }
    updateData.name = payload.name.trim();
  }

  if (payload.quantity !== undefined) {
    // Allow null quantity for "to taste" ingredients
    if (
      payload.quantity !== null &&
      (typeof payload.quantity !== "number" || Number.isNaN(payload.quantity))
    ) {
      return NextResponse.json({ error: "Quantity must be a number" }, { status: 400 });
    }
    updateData.quantity = payload.quantity;
  }

  if (payload.unit !== undefined) {
    if (!payload.unit?.trim()) {
      return NextResponse.json({ error: "Unit cannot be empty" }, { status: 400 });
    }
    updateData.unit = payload.unit.trim();
  }

  if (payload.role !== undefined) {
    if (!INGREDIENT_ROLES.includes(payload.role)) {
      return NextResponse.json({ error: "Invalid ingredient role" }, { status: 400 });
    }
    updateData.role = payload.role;
  }

  if (payload.notes !== undefined) {
    updateData.notes = payload.notes?.trim() || null;
  }

  if (payload.sortOrder !== undefined) {
    updateData.sortOrder = payload.sortOrder;
  }

  const updatedRecipe = await updateIngredientDetails(recipeId, ingredientId, updateData);

  return NextResponse.json({ data: updatedRecipe });
}

export async function DELETE(
  _request: Request,
  { params }: { params: { recipeId: string; versionId: string; ingredientId: string } },
) {
  const { recipeId, versionId, ingredientId } = params;

  const recipe = await getRecipe(recipeId);

  if (!recipe) {
    return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
  }

  const version = recipe.versions.find((item) => item.id === versionId);

  if (!version) {
    return NextResponse.json({ error: "Version not found" }, { status: 404 });
  }

  const groupedIngredients =
    version.ingredientGroups?.flatMap((g) => g.ingredients) ?? [];
  const allIngredients = [...version.ingredients, ...groupedIngredients];
  const ingredientExists = allIngredients.some((item) => item.id === ingredientId);

  if (!ingredientExists) {
    return NextResponse.json({ error: "Ingredient not found" }, { status: 404 });
  }

  const updatedRecipe = await deleteIngredient(recipeId, ingredientId);

  return NextResponse.json({ data: updatedRecipe });
}
