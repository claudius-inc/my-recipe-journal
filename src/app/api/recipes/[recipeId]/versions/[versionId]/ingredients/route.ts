import { NextResponse } from "next/server";

import { INGREDIENT_ROLES, type IngredientRole } from "@/types/recipes";
import { addIngredientToVersion, getRecipe } from "@/server/recipesService";

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
    quantity?: number;
    unit?: string;
    role?: IngredientRole;
    notes?: string | null;
    sortOrder?: number;
  };

  if (!payload.name?.trim()) {
    return NextResponse.json({ error: "Ingredient name is required" }, { status: 400 });
  }

  if (typeof payload.quantity !== "number" || Number.isNaN(payload.quantity)) {
    return NextResponse.json(
      { error: "Ingredient quantity must be a number" },
      { status: 400 },
    );
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
    ingredient: {
      name: payload.name.trim(),
      quantity: payload.quantity,
      unit: payload.unit.trim(),
      role: payload.role,
      notes: payload.notes?.trim() || null,
      sortOrder: payload.sortOrder,
    },
  });

  return NextResponse.json({ data: updatedRecipe }, { status: 201 });
}
