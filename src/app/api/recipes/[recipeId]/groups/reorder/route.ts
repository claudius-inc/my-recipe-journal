import { NextResponse } from "next/server";
import { reorderIngredientGroups, getRecipe } from "@/server/recipesService";

export async function PUT(
  request: Request,
  { params }: { params: { recipeId: string } },
) {
  const { recipeId } = params;

  const recipe = await getRecipe(recipeId);
  if (!recipe) {
    return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
  }

  const payload = (await request.json().catch(() => ({}))) as {
    groupIds?: string[];
  };

  if (!payload.groupIds || !Array.isArray(payload.groupIds) || payload.groupIds.length === 0) {
    return NextResponse.json({ error: "groupIds array is required" }, { status: 400 });
  }

  const updatedRecipe = await reorderIngredientGroups(recipeId, payload.groupIds);

  return NextResponse.json({ data: updatedRecipe });
}
