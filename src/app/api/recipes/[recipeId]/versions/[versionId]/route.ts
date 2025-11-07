import { NextResponse } from "next/server";

import { deleteVersion, getRecipe, updateVersionDetails } from "@/server/recipesService";
import type { RecipeVersionMetadata } from "@/types/recipes";

const normalizeMetadata = (value: unknown): RecipeVersionMetadata | undefined => {
  if (value === null) {
    return {};
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  return Object.entries(value as Record<string, unknown>).reduce((acc, [key, entry]) => {
    if (typeof entry === "string" || typeof entry === "number") {
      acc[key] = entry;
    }
    return acc;
  }, {} as RecipeVersionMetadata);
};

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
    tastingNotes?: string;
    nextSteps?: string;
    metadata?: Record<string, unknown> | null;
    photoUrl?: string | null;
    tasteRating?: number | null;
    visualRating?: number | null;
    textureRating?: number | null;
    tasteTags?: string[];
    textureTags?: string[];
  };

  const updateData: Parameters<typeof updateVersionDetails>[2] = {};

  if (payload.title !== undefined) {
    updateData.title = payload.title?.trim() || "";
  }
  if (payload.notes !== undefined) {
    updateData.notes = payload.notes;
  }
  if (payload.tastingNotes !== undefined) {
    updateData.tastingNotes = payload.tastingNotes;
  }
  if (payload.nextSteps !== undefined) {
    updateData.nextSteps = payload.nextSteps;
  }
  if (payload.metadata !== undefined) {
    if (payload.metadata === null) {
      updateData.metadata = {};
    } else {
      const normalized = normalizeMetadata(payload.metadata);
      if (normalized !== undefined) {
        updateData.metadata = normalized;
      }
    }
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
  if (payload.tasteTags !== undefined) {
    updateData.tasteTags = Array.isArray(payload.tasteTags) ? payload.tasteTags : [];
  }
  if (payload.textureTags !== undefined) {
    updateData.textureTags = Array.isArray(payload.textureTags)
      ? payload.textureTags
      : [];
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
