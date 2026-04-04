import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getRecipe,
  addVersionPhoto,
  removeVersionPhoto,
  reorderVersionPhotos,
  updatePhotoCaption,
} from "@/server/recipesService";

// POST: Add a photo to the version
export async function POST(
  request: NextRequest,
  { params }: { params: { recipeId: string; versionId: string } },
) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { recipeId, versionId } = params;

    // Verify recipe ownership
    const recipe = await getRecipe(recipeId, session.user.id);
    if (!recipe) {
      return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
    }

    const body = await request.json();
    const { photoUrl, r2Key } = body;

    if (!photoUrl) {
      return NextResponse.json({ error: "photoUrl is required" }, { status: 400 });
    }

    const updatedRecipe = await addVersionPhoto({
      recipeId,
      versionId,
      photoUrl,
      r2Key,
    });

    return NextResponse.json({ data: updatedRecipe });
  } catch (error) {
    console.error("Error adding photo:", error);

    if (error instanceof Error && error.message.includes("Maximum")) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ error: "Failed to add photo" }, { status: 500 });
  }
}

// DELETE: Remove a photo from the version
export async function DELETE(
  request: NextRequest,
  { params }: { params: { recipeId: string; versionId: string } },
) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { recipeId } = params;

    // Verify recipe ownership
    const recipe = await getRecipe(recipeId, session.user.id);
    if (!recipe) {
      return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
    }

    const body = await request.json();
    const { photoId } = body;

    if (!photoId) {
      return NextResponse.json({ error: "photoId is required" }, { status: 400 });
    }

    const result = await removeVersionPhoto(recipeId, photoId);

    return NextResponse.json({
      data: result.recipe,
      r2Key: result.r2Key,
    });
  } catch (error) {
    console.error("Error removing photo:", error);
    return NextResponse.json({ error: "Failed to remove photo" }, { status: 500 });
  }
}

// PATCH: Reorder photos
export async function PATCH(
  request: NextRequest,
  { params }: { params: { recipeId: string; versionId: string } },
) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { recipeId, versionId } = params;

    // Verify recipe ownership
    const recipe = await getRecipe(recipeId, session.user.id);
    if (!recipe) {
      return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
    }

    const body = await request.json();
    const { photoIds } = body;

    if (!Array.isArray(photoIds)) {
      return NextResponse.json({ error: "photoIds array is required" }, { status: 400 });
    }

    const updatedRecipe = await reorderVersionPhotos(recipeId, versionId, photoIds);

    return NextResponse.json({ data: updatedRecipe });
  } catch (error) {
    console.error("Error reordering photos:", error);
    return NextResponse.json({ error: "Failed to reorder photos" }, { status: 500 });
  }
}

// PUT: Update a photo's caption
export async function PUT(
  request: NextRequest,
  { params }: { params: { recipeId: string; versionId: string } },
) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { recipeId } = params;

    const recipe = await getRecipe(recipeId, session.user.id);
    if (!recipe) {
      return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
    }

    const body = await request.json();
    const { photoId, caption } = body;

    if (!photoId) {
      return NextResponse.json({ error: "photoId is required" }, { status: 400 });
    }

    const updatedRecipe = await updatePhotoCaption(
      recipeId,
      photoId,
      typeof caption === "string" && caption.trim() ? caption.trim() : null,
    );

    return NextResponse.json({ data: updatedRecipe });
  } catch (error) {
    console.error("Error updating photo caption:", error);
    return NextResponse.json({ error: "Failed to update caption" }, { status: 500 });
  }
}
