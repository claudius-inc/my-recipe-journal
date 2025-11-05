import { NextResponse } from "next/server";

import { CATEGORY_CONFIGS, type RecipeCategory } from "@/types/recipes";
import {
  getRecipe,
  setActiveVersion,
  updateRecipeDetails,
} from "@/server/recipesService";

const allowedCategories = Object.keys(CATEGORY_CONFIGS) as RecipeCategory[];

export async function GET(
  _request: Request,
  { params }: { params: { recipeId: string } },
) {
  const recipe = await getRecipe(params.recipeId);

  if (!recipe) {
    return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
  }

  return NextResponse.json({ data: recipe });
}

export async function PATCH(
  request: Request,
  { params }: { params: { recipeId: string } },
) {
  const recipe = await getRecipe(params.recipeId);

  if (!recipe) {
    return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
  }

  const payload = (await request.json().catch(() => ({}))) as {
    name?: string;
    description?: string | null;
    category?: RecipeCategory;
    tags?: string[] | null;
    activeVersionId?: string | null;
  };

  const updateData: Record<string, unknown> = {};

  if (typeof payload.name === "string") {
    const trimmed = payload.name.trim();
    if (!trimmed) {
      return NextResponse.json({ error: "Name cannot be empty" }, { status: 400 });
    }
    updateData.name = trimmed;
  }

  if (payload.description !== undefined) {
    const trimmed = payload.description?.trim();
    updateData.description = trimmed || null;
  }

  if (payload.category) {
    if (!allowedCategories.includes(payload.category)) {
      return NextResponse.json({ error: "Invalid recipe category" }, { status: 400 });
    }
    updateData.category = payload.category;
  }

  if (payload.tags !== undefined) {
    updateData.tags = payload.tags?.length ? payload.tags : null;
  }

  let updatedRecipe = recipe;

  if (Object.keys(updateData).length) {
    const result = await updateRecipeDetails(params.recipeId, updateData);
    if (result) {
      updatedRecipe = result;
    }
  }

  if ("activeVersionId" in payload) {
    if (!payload.activeVersionId) {
      const result = await setActiveVersion(params.recipeId, null);
      if (result) {
        updatedRecipe = result;
      }
    } else {
      const belongs = updatedRecipe.versions.some(
        (version) => version.id === payload.activeVersionId,
      );
      if (!belongs) {
        return NextResponse.json(
          { error: "Version does not belong to this recipe" },
          { status: 400 },
        );
      }
      const result = await setActiveVersion(params.recipeId, payload.activeVersionId);
      if (result) {
        updatedRecipe = result;
      }
    }
  }

  return NextResponse.json({ data: updatedRecipe });
}
