import { NextResponse } from "next/server";
import { createIngredientGroup, getRecipe } from "@/server/recipesService";

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
    enableBakersPercent?: boolean;
  };

  if (!payload.name?.trim()) {
    return NextResponse.json({ error: "Group name is required" }, { status: 400 });
  }

  const updatedRecipe = await createIngredientGroup({
    recipeId,
    versionId,
    name: payload.name.trim(),
    enableBakersPercent: payload.enableBakersPercent,
  });

  return NextResponse.json({ data: updatedRecipe }, { status: 201 });
}
