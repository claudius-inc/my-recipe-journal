import { NextResponse } from "next/server";

import { deleteVersion, getRecipe, updateVersionDetails } from "@/server/recipesService";

export async function PATCH(
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
    title?: string;
    notes?: string;
    nextSteps?: string;
    portionWeight?: number | null;
    portionLabel?: string | null;
    servings?: number | null;
    prepTime?: string | null;
    cookTime?: string | null;
    totalTime?: string | null;
    restTime?: string | null;
    ovenTempC?: number | null;
    difficulty?: "easy" | "medium" | "hard" | null;
    metadata?: Record<string, string | number> | null;
    photoUrl?: string | null;
    tasteRating?: number | null;
    visualRating?: number | null;
    textureRating?: number | null;
    tasteNotes?: string;
    visualNotes?: string;
    textureNotes?: string;
    steps?: Array<{ order: number; text: string }>;
  };

  const updateData: Parameters<typeof updateVersionDetails>[2] = {};

  if (payload.title !== undefined) {
    updateData.title = payload.title?.trim() || "";
  }
  if (payload.notes !== undefined) {
    updateData.notes = payload.notes;
  }
  if (payload.nextSteps !== undefined) {
    updateData.nextSteps = payload.nextSteps;
  }
  if (payload.portionWeight !== undefined) {
    updateData.portionWeight = payload.portionWeight;
  }
  if (payload.portionLabel !== undefined) {
    updateData.portionLabel = payload.portionLabel;
  }
  if (payload.servings !== undefined) {
    updateData.servings = payload.servings;
  }
  if (payload.prepTime !== undefined) {
    updateData.prepTime = payload.prepTime;
  }
  if (payload.cookTime !== undefined) {
    updateData.cookTime = payload.cookTime;
  }
  if (payload.totalTime !== undefined) {
    updateData.totalTime = payload.totalTime;
  }
  if (payload.restTime !== undefined) {
    updateData.restTime = payload.restTime;
  }
  if (payload.ovenTempC !== undefined) {
    updateData.ovenTempC = payload.ovenTempC;
  }
  if (payload.difficulty !== undefined) {
    updateData.difficulty = payload.difficulty;
  }
  if (payload.metadata !== undefined) {
    updateData.metadata = payload.metadata;
  }
  if (payload.photoUrl !== undefined) {
    updateData.photoUrl = payload.photoUrl ?? null;
  }
  if (payload.tasteRating !== undefined) {
    updateData.tasteRating = payload.tasteRating ?? undefined;
  }
  if (payload.visualRating !== undefined) {
    updateData.visualRating = payload.visualRating ?? undefined;
  }
  if (payload.textureRating !== undefined) {
    updateData.textureRating = payload.textureRating ?? undefined;
  }
  if (payload.tasteNotes !== undefined) {
    updateData.tasteNotes = payload.tasteNotes;
  }
  if (payload.visualNotes !== undefined) {
    updateData.visualNotes = payload.visualNotes;
  }
  if (payload.textureNotes !== undefined) {
    updateData.textureNotes = payload.textureNotes;
  }
  if (payload.steps !== undefined) {
    updateData.steps = payload.steps;
  }

  const updatedRecipe = await updateVersionDetails(recipeId, versionId, updateData);

  if (!updatedRecipe) {
    return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
  }

  return NextResponse.json({ data: updatedRecipe });
}

export async function DELETE(
  _request: Request,
  { params }: { params: { recipeId: string; versionId: string } },
) {
  const { recipeId, versionId } = params;

  const recipe = await getRecipe(recipeId);

  if (!recipe) {
    return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
  }

  const versionExists = recipe.versions.some((item) => item.id === versionId);

  if (!versionExists) {
    return NextResponse.json({ error: "Version not found" }, { status: 404 });
  }

  const updatedRecipe = await deleteVersion(recipeId, versionId);

  return NextResponse.json({ data: updatedRecipe });
}
