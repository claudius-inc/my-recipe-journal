import { NextResponse } from "next/server";

import { getIngredientSuggestions } from "@/server/recipesService";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const recipeId = searchParams.get("recipeId") ?? undefined;

  const data = await getIngredientSuggestions(recipeId ?? undefined);

  return NextResponse.json({ data });
}
