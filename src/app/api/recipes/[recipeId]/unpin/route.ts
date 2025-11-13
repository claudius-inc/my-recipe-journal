import { NextResponse } from "next/server";

import { unpinRecipe, getRecipe } from "@/server/recipesService";

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ recipeId: string }> },
) {
  const { recipeId } = await params;

  const recipe = await getRecipe(recipeId);
  if (!recipe) {
    return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
  }

  const updatedRecipe = await unpinRecipe(recipeId);

  return NextResponse.json({ data: updatedRecipe });
}
