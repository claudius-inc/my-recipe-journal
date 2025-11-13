import { NextResponse } from "next/server";

import { pinRecipe, getRecipe } from "@/server/recipesService";

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ recipeId: string }> },
) {
  const { recipeId } = await params;

  const recipe = await getRecipe(recipeId);
  if (!recipe) {
    return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
  }

  const updatedRecipe = await pinRecipe(recipeId);

  return NextResponse.json({ data: updatedRecipe });
}
