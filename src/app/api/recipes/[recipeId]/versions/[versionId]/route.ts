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
    photoUrl?: string | null;
    tasteRating?: number | null;
    visualRating?: number | null;
    textureRating?: number | null;
    tasteNotes?: string;
    visualNotes?: string;
    textureNotes?: string;
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
