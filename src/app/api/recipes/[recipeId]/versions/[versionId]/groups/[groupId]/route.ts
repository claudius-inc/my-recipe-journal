import { NextResponse } from "next/server";
import {
  updateIngredientGroup,
  deleteIngredientGroup,
  getRecipe,
} from "@/server/recipesService";

export async function PATCH(
  request: Request,
  { params }: { params: { recipeId: string; versionId: string; groupId: string } },
) {
  const { recipeId, versionId, groupId } = params;

  const recipe = await getRecipe(recipeId);
  if (!recipe) {
    return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
  }

  const payload = (await request.json().catch(() => ({}))) as {
    name?: string;
    enableBakersPercent?: boolean;
    orderIndex?: number;
  };

  const updatedRecipe = await updateIngredientGroup(recipeId, groupId, {
    ...(payload.name !== undefined && { name: payload.name.trim() }),
    ...(payload.enableBakersPercent !== undefined && {
      enableBakersPercent: payload.enableBakersPercent,
    }),
    ...(payload.orderIndex !== undefined && { orderIndex: payload.orderIndex }),
  });

  return NextResponse.json({ data: updatedRecipe });
}

export async function DELETE(
  request: Request,
  { params }: { params: { recipeId: string; versionId: string; groupId: string } },
) {
  const { recipeId, versionId, groupId } = params;

  const recipe = await getRecipe(recipeId);
  if (!recipe) {
    return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
  }

  const updatedRecipe = await deleteIngredientGroup(recipeId, groupId);

  return NextResponse.json({ data: updatedRecipe });
}
