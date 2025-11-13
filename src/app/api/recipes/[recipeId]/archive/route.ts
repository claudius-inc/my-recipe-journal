import { NextResponse } from "next/server";

import { archiveRecipe, getRecipe } from "@/server/recipesService";

export async function PATCH(
  _request: Request,
  { params }: { params: { recipeId: string } },
) {
  const { recipeId } = params;

  const recipe = await getRecipe(recipeId);

  if (!recipe) {
    return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
  }

  const updatedRecipe = await archiveRecipe(recipeId);

  return NextResponse.json({ data: updatedRecipe });
}
